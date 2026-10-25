"""Loader for the NASA PCoE Li-ion Battery Aging data set (34 cells, 18650, 2 Ah rated).

Each .mat file holds one cell as a list of operations (charge, discharge,
impedance) in time order. `load_cell` turns that into one row per discharge,
carrying forward the most recent charge and impedance measurement, so every
row only uses information available when that discharge ended.
"""
from __future__ import annotations

from pathlib import Path

import numpy as np
import pandas as pd

RATED_AH = 2.0

# Test conditions from the READMEs shipped with each archive. Ambient
# temperature is also stored per operation and is taken from the file.
# load: "cc" constant current, "square" 0.05 Hz 4 A square wave, "multi" varied per cycle.
CELLS = {
    "B0005": dict(cutoff_v=2.7, load="cc", eol_ah=1.4),
    "B0006": dict(cutoff_v=2.5, load="cc", eol_ah=1.4),
    "B0007": dict(cutoff_v=2.2, load="cc", eol_ah=1.4),
    "B0018": dict(cutoff_v=2.5, load="cc", eol_ah=1.4),
    "B0025": dict(cutoff_v=2.0, load="square", eol_ah=None),
    "B0026": dict(cutoff_v=2.2, load="square", eol_ah=None),
    "B0027": dict(cutoff_v=2.5, load="square", eol_ah=None),
    "B0028": dict(cutoff_v=2.7, load="square", eol_ah=None),
    "B0029": dict(cutoff_v=2.0, load="cc", eol_ah=None),
    "B0030": dict(cutoff_v=2.2, load="cc", eol_ah=None),
    "B0031": dict(cutoff_v=2.5, load="cc", eol_ah=None),
    "B0032": dict(cutoff_v=2.7, load="cc", eol_ah=None),
    "B0033": dict(cutoff_v=2.0, load="cc", eol_ah=1.6),
    "B0034": dict(cutoff_v=2.2, load="cc", eol_ah=1.6),
    "B0036": dict(cutoff_v=2.7, load="cc", eol_ah=1.6),
    "B0038": dict(cutoff_v=2.2, load="multi", eol_ah=1.6),
    "B0039": dict(cutoff_v=2.5, load="multi", eol_ah=1.6),
    "B0040": dict(cutoff_v=2.7, load="multi", eol_ah=1.6),
    "B0041": dict(cutoff_v=2.0, load="multi", eol_ah=1.4),
    "B0042": dict(cutoff_v=2.2, load="multi", eol_ah=1.4),
    "B0043": dict(cutoff_v=2.5, load="multi", eol_ah=1.4),
    "B0044": dict(cutoff_v=2.7, load="multi", eol_ah=1.4),
    "B0045": dict(cutoff_v=2.0, load="cc", eol_ah=1.4),
    "B0046": dict(cutoff_v=2.2, load="cc", eol_ah=1.4),
    "B0047": dict(cutoff_v=2.5, load="cc", eol_ah=1.4),
    "B0048": dict(cutoff_v=2.7, load="cc", eol_ah=1.4),
    "B0049": dict(cutoff_v=2.0, load="cc", eol_ah=None),
    "B0050": dict(cutoff_v=2.2, load="cc", eol_ah=None),
    "B0051": dict(cutoff_v=2.5, load="cc", eol_ah=None),
    "B0052": dict(cutoff_v=2.7, load="cc", eol_ah=None),
    "B0053": dict(cutoff_v=2.0, load="cc", eol_ah=1.4),
    "B0054": dict(cutoff_v=2.2, load="cc", eol_ah=1.4),
    "B0055": dict(cutoff_v=2.5, load="cc", eol_ah=1.4),
    "B0056": dict(cutoff_v=2.7, load="cc", eol_ah=1.4),
}

COLUMNS = [
    "cell", "cycle", "t_days", "ambient_c", "cutoff_v", "load",
    "capacity_ah", "i_mean_a", "i_peak_a", "v_min", "duration_s",
    "t_start_c", "t_max_c", "energy_wh",
    "chg_cc_s", "chg_cv_s", "chg_t_max_c",
    "re_ohm", "rct_ohm",
]


def _datenum(v) -> float:
    """MATLAB date vector [y, m, d, H, M, S] to days since epoch."""
    y, mo, d, h, mi, s = (float(x) for x in v)
    ts = pd.Timestamp(int(y), int(mo), int(d)) + pd.to_timedelta(h * 3600 + mi * 60 + s, unit="s")
    return ts.value / 86_400e9


def _charge_features(d: dict) -> tuple[float, float, float]:
    """Seconds in constant current and constant voltage, and peak temperature."""
    t = np.asarray(d["Time"], float)
    v = np.asarray(d["Voltage_measured"], float)
    temp = np.asarray(d["Temperature_measured"], float)
    if t.size < 5:
        return np.nan, np.nan, np.nan
    # CC phase ends when the terminal voltage first reaches the 4.2 V limit
    hit = np.flatnonzero(v >= 4.195)
    t_cc = t[hit[0]] - t[0] if hit.size else t[-1] - t[0]
    return float(t_cc), float(t[-1] - t[0] - t_cc), float(np.nanmax(temp))


def _discharge_features(d: dict) -> dict:
    t = np.asarray(d["Time"], float)
    v = np.asarray(d["Voltage_measured"], float)
    i = np.abs(np.asarray(d["Current_measured"], float))
    temp = np.asarray(d["Temperature_measured"], float)
    if t.size < 5:
        return {}
    dt = np.diff(t, prepend=t[0])
    loaded = i > 0.1
    return dict(
        i_mean_a=float(i[loaded].mean()) if loaded.any() else np.nan,
        i_peak_a=float(np.percentile(i, 99)),
        v_min=float(np.nanmin(v)),
        duration_s=float(t[-1] - t[0]),
        t_start_c=float(temp[0]),
        t_max_c=float(np.nanmax(temp)),
        energy_wh=float(np.sum(v * i * dt) / 3600.0),
    )


def load_cell(path: str | Path) -> pd.DataFrame:
    from scipy.io import loadmat

    path = Path(path)
    name = path.stem
    meta = CELLS[name]
    m = loadmat(path, simplify_cells=True)
    ops = m[name]["cycle"]

    rows, last_chg, last_imp, t0 = [], (np.nan, np.nan, np.nan), (np.nan, np.nan), None
    for op in ops:
        kind, d = op["type"], op["data"]
        if kind == "charge":
            last_chg = _charge_features(d)
        elif kind == "impedance":
            re, rct = float(np.real(d["Re"])), float(np.real(d["Rct"]))
            # a few sweeps failed and report nonsense; keep the previous good value
            if 0 < re < 1 and 0 < rct < 1:
                last_imp = (re, rct)
        elif kind == "discharge":
            cap = d.get("Capacity")
            feats = _discharge_features(d)
            if cap is None or not feats or np.size(cap) != 1:
                continue
            t = _datenum(op["time"])
            t0 = t if t0 is None else t0
            rows.append(dict(
                cell=name, cycle=len(rows) + 1, t_days=t - t0,
                ambient_c=float(op["ambient_temperature"]), cutoff_v=meta["cutoff_v"], load=meta["load"],
                capacity_ah=float(cap), **feats,
                chg_cc_s=last_chg[0], chg_cv_s=last_chg[1], chg_t_max_c=last_chg[2],
                re_ohm=last_imp[0], rct_ohm=last_imp[1],
            ))
    return pd.DataFrame(rows, columns=COLUMNS)


def load_all(raw_dir: str | Path) -> pd.DataFrame:
    """Load every known cell found under raw_dir (searched recursively; duplicates skipped)."""
    seen, frames = set(), []
    for p in sorted(Path(raw_dir).rglob("B00*.mat")):
        if p.stem in CELLS and p.stem not in seen:
            seen.add(p.stem)
            frames.append(load_cell(p))
    if not frames:
        raise FileNotFoundError(f"no NASA cell files (B00xx.mat) under {raw_dir}")
    return pd.concat(frames, ignore_index=True)
