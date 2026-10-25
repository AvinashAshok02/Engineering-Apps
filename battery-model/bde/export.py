"""Compact JSON for the browser explorer: measured curves plus out-of-fold forecasts.

Forecasts shipped to the page are the cross-validated ones, so whatever cell
a visitor picks, the fan they see came from a model that never trained on it.
"""
from __future__ import annotations

import numpy as np
import pandas as pd

from .features import HORIZONS
from .nasa import CELLS

LABELS = {
    "h": "Forecast horizon (cycles)", "n_reg": "Cycles run in this regime", "n_cell": "Cycles run in total",
    "c_now": "Capacity now", "fade_so_far": "Fade so far", "slope10": "Recent slope (10 cycles)",
    "slope30": "Slope (30 cycles)", "curv": "Slope change", "last_vs_now": "Last run vs smoothed",
    "lin_h": "Straight-line extrapolation", "ambient_c": "Ambient temperature", "i_mean_a": "Discharge current",
    "cutoff_v": "Cut-off voltage", "square_load": "Square-wave load", "re_ohm": "Electrolyte resistance Re",
    "rct_ohm": "Charge-transfer resistance Rct", "d_re": "Change in Re", "d_rct": "Change in Rct",
    "chg_cc_s": "Constant-current charge time", "d_chg_cc": "Change in CC charge time",
    "chg_cv_s": "Constant-voltage charge time", "temp_rise_c": "Temperature rise on discharge",
    "rest_days": "Rest before this run",
}

r3 = lambda x: None if x is None or not np.isfinite(x) else round(float(x), 3)


def explorer_payload(seg: pd.DataFrame, anchors: pd.DataFrame, grid: pd.DataFrame, met: dict) -> dict:
    cells = []
    for cell, d in seg.groupby("cell", sort=True):
        regimes = []
        for reg, r in d.groupby("regime"):
            g = grid[(grid["cell"] == cell) & (grid["regime"] == reg)]
            a = anchors[(anchors["cell"] == cell) & (anchors["regime"] == reg)]
            fc = None
            if len(a):
                piv = {k: g.pivot(index="anchor", columns="h", values=k).loc[a["anchor"]] for k in ("q50", "lo", "hi")}
                cnow = a["c_now"].to_numpy()
                # stored in Ah: [anchor][horizon]
                fc = {
                    "anchor": a["anchor"].astype(int).tolist(),
                    "c_now": [r3(x) for x in cnow],
                    "slope30": [None if not np.isfinite(x) else round(float(x), 6) for x in a["slope30"]],
                    **{k: [[r3(c * (1 + x)) for x in row] for c, row in zip(cnow, v.to_numpy())] for k, v in piv.items()},
                }
            regimes.append({
                "regime": int(reg), "usable": bool(r["usable"].iloc[0]),
                "ambient_c": float(r["ambient_c"].median()), "current_a": round(float(r["i_mean_a"].median()), 2),
                "cycle": r["cycle"].astype(int).tolist(),
                "cap": [r3(x) for x in r["capacity_ah"]],
                "valid": r["valid"].astype(int).tolist(),
                "re": [r3(x) for x in r["re_ohm"]],
                "forecast": fc,
            })
        meta = CELLS.get(cell, {})
        cells.append({"id": cell, "cutoff_v": meta.get("cutoff_v"), "load": meta.get("load"),
                      "eol_ah": meta.get("eol_ah"), "days": r3(d["t_days"].max()), "regimes": regimes})
    return {
        "dataset": "NASA Ames PCoE Li-ion Battery Aging (18650, 2 Ah rated)",
        "horizons": list(HORIZONS),
        "labels": LABELS,
        "metrics": {k: v for k, v in met.items() if k != "widen_rel"},
        "cells": cells,
    }
