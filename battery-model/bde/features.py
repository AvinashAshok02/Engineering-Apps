"""Forecast examples: at an anchor cycle n inside a regime, predict capacity at n + h.

Every feature is computed from rows at or before the anchor, using only rows
that were already valid at that time; nothing after the anchor leaks in. The
target is relative change, C(n + h) / C_now - 1, so cells that start at
different capacities share one scale.
"""
from __future__ import annotations

import numpy as np
import pandas as pd

HORIZONS = (5, 10, 20, 30, 40, 50, 60, 80, 100)
MIN_HISTORY = 5  # valid discharges in the regime before the first anchor

FEATURES = [
    "h", "n_reg", "n_cell", "c_now", "fade_so_far",
    "slope10", "slope30", "curv", "last_vs_now", "lin_h",
    "ambient_c", "i_mean_a", "cutoff_v", "square_load",
    "re_ohm", "rct_ohm", "d_re", "d_rct",
    "chg_cc_s", "d_chg_cc", "chg_cv_s", "temp_rise_c", "rest_days",
]


def _slope(y: np.ndarray, x: np.ndarray) -> float:
    if len(y) < 3:
        return np.nan
    x = x - x.mean()
    return float(np.dot(x, y - y.mean()) / max(np.dot(x, x), 1e-9))


def anchor_state(hist: pd.DataFrame, first: pd.DataFrame, n_cell: int) -> dict:
    """Features describing a regime at its latest row. hist: valid rows so far."""
    cap = hist["capacity_ah"].to_numpy()
    cyc = hist["cycle"].to_numpy(float)
    c_now = float(np.median(cap[-5:]))
    last = hist.iloc[-1]
    s10 = _slope(cap[-10:], cyc[-10:]) / c_now
    s30 = _slope(cap[-30:], cyc[-30:]) / c_now
    gaps = np.diff(hist["t_days"].to_numpy())
    med = lambda col, k=5: float(np.nanmedian(hist[col].to_numpy()[-k:])) if hist[col].notna().any() else np.nan
    ref = lambda col: float(np.nanmedian(first[col].to_numpy())) if first[col].notna().any() else np.nan
    return dict(
        n_reg=int(last["cycle"] - first["cycle"].iloc[0]), n_cell=n_cell,
        c_now=c_now, fade_so_far=c_now / float(np.median(first["capacity_ah"])) - 1,
        slope10=s10, slope30=s30, curv=s10 - s30, last_vs_now=float(cap[-1]) / c_now - 1,
        ambient_c=float(last["ambient_c"]), i_mean_a=float(np.median(hist["i_mean_a"])),
        cutoff_v=float(last["cutoff_v"]), square_load=float(last["load"] == "square"),
        re_ohm=med("re_ohm", 1), rct_ohm=med("rct_ohm", 1),
        d_re=med("re_ohm", 1) - ref("re_ohm"), d_rct=med("rct_ohm", 1) - ref("rct_ohm"),
        chg_cc_s=med("chg_cc_s"), d_chg_cc=med("chg_cc_s") / ref("chg_cc_s") - 1,
        chg_cv_s=med("chg_cv_s"), temp_rise_c=float(np.median((hist["t_max_c"] - hist["t_start_c"]).to_numpy()[-5:])),
        rest_days=float(gaps[-1]) if gaps.size else 0.0,
    )


def build_anchors(seg: pd.DataFrame) -> pd.DataFrame:
    """One row per (regime, anchor cycle): the state a forecaster sees at that cycle."""
    rows = []
    for (cell, regime), r in seg[seg["usable"]].groupby(["cell", "regime"], sort=False):
        v = r[r["valid"]].reset_index(drop=True)
        first = v.iloc[:5]
        for k in range(MIN_HISTORY - 1, len(v)):
            hist = v.iloc[: k + 1]
            n = int(hist["cycle"].iloc[-1])
            rows.append(dict(cell=cell, regime=int(regime), anchor=n, **anchor_state(hist, first, n)))
    return pd.DataFrame(rows)


def expand(anchors: pd.DataFrame, horizons=HORIZONS) -> pd.DataFrame:
    """Cross anchors with horizons and add the linear-extrapolation feature."""
    out = anchors.merge(pd.DataFrame({"h": list(horizons)}), how="cross")
    out["lin_h"] = out["slope30"] * out["h"]
    return out


def build_examples(seg: pd.DataFrame, anchors: pd.DataFrame | None = None, horizons=HORIZONS) -> pd.DataFrame:
    """Anchor x horizon rows that have a valid measured target at anchor + h."""
    anchors = build_anchors(seg) if anchors is None else anchors
    ex = expand(anchors, horizons)
    valid = seg[seg["valid"]][["cell", "regime", "cycle", "capacity_ah"]]
    ex["cycle"] = ex["anchor"] + ex["h"]
    ex = ex.merge(valid, on=["cell", "regime", "cycle"], how="inner").drop(columns="cycle")
    ex = ex.rename(columns={"capacity_ah": "y_ah"})
    ex["y_rel"] = ex["y_ah"] / ex["c_now"] - 1
    return ex.reset_index(drop=True)
