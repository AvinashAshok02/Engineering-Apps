"""Quality control and regime segmentation for the cycle table.

Two facts about the NASA data shape everything here:

1. "Capacity" is the charge the cell delivered under that run's load and
   temperature, not a fixed-condition health check. At 4 degC and 4 A a cell
   that gives 1.5 Ah at 1 A delivers about 0.05 Ah. Cells 38-44 switch
   conditions part-way through, so a capacity series that spans a switch
   mixes ageing with a change of test. Each cell is split into regimes of
   constant ambient temperature and load current, and forecasts stay inside
   one regime.
2. Some discharges are glitches (0 Ah, or a one-off spike after a software
   restart). They are flagged with a centred Hampel filter. The flag is used
   only to choose which rows are valid forecast targets; model features are
   computed causally from past rows (see features.py).
"""
from __future__ import annotations

import numpy as np
import pandas as pd

MIN_REGIME_CYCLES = 20
MIN_CAPACITY_AH = 0.3  # below this the run is a failed or near-empty discharge


def hampel_flags(x: np.ndarray, half_window: int = 5, k: float = 4.0, floor: float = 0.01) -> np.ndarray:
    """True where x is an outlier against the median of its neighbours."""
    x = np.asarray(x, float)
    n, bad = len(x), np.zeros(len(x), bool)
    for i in range(n):
        lo, hi = max(0, i - half_window), min(n, i + half_window + 1)
        nb = np.delete(x[lo:hi], i - lo)
        if nb.size < 2:
            continue
        med = np.median(nb)
        mad = 1.4826 * np.median(np.abs(nb - med))
        bad[i] = abs(x[i] - med) > k * max(mad, floor)
    return bad


def segment(df: pd.DataFrame) -> pd.DataFrame:
    """Add `regime` (cell-local run of constant conditions) and `valid` columns."""
    out = []
    for _, d in df.sort_values(["cell", "cycle"]).groupby("cell", sort=False):
        d = d.copy()
        amp = d["i_mean_a"].round(0)
        key = d["ambient_c"].astype(str) + "/" + amp.astype(str)
        d["regime"] = (key != key.shift()).cumsum() - 1
        d["valid"] = d["capacity_ah"] > MIN_CAPACITY_AH
        for _, r in d.groupby("regime"):
            idx = r.index[r["valid"].to_numpy()]
            d.loc[idx, "valid"] = ~hampel_flags(d.loc[idx, "capacity_ah"].to_numpy())
            # the first runs of a regime are often a break-in ramp (cell not yet
            # conditioned to the new load): drop leading runs well below the regime's level
            v = d.loc[idx, "capacity_ah"].to_numpy()
            if v.size > 6:
                level = np.median(v[3:23])
                ramp = np.flatnonzero(v >= 0.95 * level)
                d.loc[idx[: max(1, ramp[0])], "valid"] = False
        out.append(d)
    out = pd.concat(out)
    n_valid = out.groupby(["cell", "regime"])["valid"].transform("sum")
    out["usable"] = n_valid >= MIN_REGIME_CYCLES
    return out.reset_index(drop=True)
