"""Leave-one-cell-out evaluation and interval calibration.

Every number reported comes from a model that never saw the cell it is
scored on. Rows from the same cell are strongly correlated, so a random row
split would let the model memorise each cell's curve and look far better
than it is.
"""
from __future__ import annotations

import numpy as np
import pandas as pd

from . import models
from .features import FEATURES, expand

NOMINAL = 0.8  # the 10th-90th percentile band should hold 80% of outcomes


def weighted_quantile(x: np.ndarray, w: np.ndarray, q: float) -> float:
    o = np.argsort(x)
    cw = np.cumsum(w[o])
    return float(x[o][np.searchsorted(cw, q * cw[-1])])


def conformity(ex: pd.DataFrame, lo: np.ndarray, hi: np.ndarray) -> np.ndarray:
    """How far each outcome fell outside its band (negative when inside), in y_rel units."""
    return np.maximum(lo - ex["y_rel"].to_numpy(), ex["y_rel"].to_numpy() - hi)


def widen(scores: pd.DataFrame, exclude: str | None = None) -> dict[int, float]:
    """Per-horizon band widening from out-of-fold scores, each cell weighted equally.

    This is split-conformal calibration with cells as the exchangeable unit,
    as in CV+: the widening for a cell is learned only from the other cells.
    """
    s = scores if exclude is None else scores[scores["cell"] != exclude]
    out = {}
    for h, d in s.groupby("h"):
        out[int(h)] = max(0.0, weighted_quantile(d["score"].to_numpy(), models.cell_weights(d["cell"]), NOMINAL))
    return out


def cross_validate(ex: pd.DataFrame, anchors: pd.DataFrame, max_iter: int = 300, log=print) -> tuple[pd.DataFrame, pd.DataFrame]:
    """Out-of-fold predictions for every example and for the full anchor x horizon grid."""
    ex = ex.copy()
    grid = expand(anchors)
    cols = ["ridge", "q10", "q50", "q90"]
    for c in cols:
        ex[c] = np.nan
        grid[c] = np.nan
    cells = sorted(ex["cell"].unique())
    for i, cell in enumerate(cells):
        tr, te, ge = ex["cell"] != cell, ex["cell"] == cell, grid["cell"] == cell
        fc = models.QuantileForecaster(max_iter).fit(ex[tr])
        rg = models.ridge().fit(ex.loc[tr, FEATURES], ex.loc[tr, "y_rel"])
        ex.loc[te, ["q10", "q50", "q90"]] = fc.predict(ex[te])
        grid.loc[ge, ["q10", "q50", "q90"]] = fc.predict(grid[ge])
        ex.loc[te, "ridge"] = rg.predict(ex.loc[te, FEATURES])
        log(f"  fold {i + 1:2d}/{len(cells)}  held out {cell}")
    ex["score"] = conformity(ex, ex["q10"].to_numpy(), ex["q90"].to_numpy())
    # calibrate each held-out cell's band using only the other cells' scores
    for cell in cells:
        w = widen(ex[["cell", "h", "score"]], exclude=cell)
        for frame in (ex, grid):
            m = frame["cell"] == cell
            pad = frame.loc[m, "h"].map(w).fillna(max(w.values()))
            frame.loc[m, "lo"] = frame.loc[m, "q10"] - pad
            frame.loc[m, "hi"] = frame.loc[m, "q90"] + pad
    return ex, grid


def metrics(ex: pd.DataFrame) -> dict:
    """Error in Ah for each forecaster, overall, per horizon and per cell, plus band coverage."""
    c, y = ex["c_now"].to_numpy(), ex["y_ah"].to_numpy()
    preds = {
        "persistence": models.persistence(ex),
        "linear": models.linear_extrapolation(ex),
        "ridge": ex["ridge"].to_numpy(),
        "gbm": ex["q50"].to_numpy(),
    }
    err = pd.DataFrame({k: np.abs(c * (1 + v) - y) for k, v in preds.items()})
    err["h"], err["cell"] = ex["h"].to_numpy(), ex["cell"].to_numpy()
    raw_in = (y >= c * (1 + ex["q10"])) & (y <= c * (1 + ex["q90"]))
    cal_in = (y >= c * (1 + ex["lo"])) & (y <= c * (1 + ex["hi"]))
    band = pd.DataFrame({"h": ex["h"], "cell": ex["cell"], "raw": raw_in, "cal": cal_in,
                         "width": c * (ex["hi"] - ex["lo"])})
    per_cell = err.groupby("cell")[list(preds)].mean()
    return {
        "n_examples": int(len(ex)), "n_cells": int(ex["cell"].nunique()),
        "mae_ah": err[list(preds)].mean().round(4).to_dict(),
        "mae_ah_cell_avg": per_cell.mean().round(4).to_dict(),
        "cells_gbm_beats_persistence": int((per_cell["gbm"] < per_cell["persistence"]).sum()),
        "cells_gbm_beats_linear": int((per_cell["gbm"] < per_cell["linear"]).sum()),
        "by_h": [
            {"h": int(h), **d[list(preds)].mean().round(4).to_dict(),
             "coverage_raw": round(float(b["raw"].mean()), 3), "coverage": round(float(b["cal"].mean()), 3),
             "width_ah": round(float(b["width"].mean()), 4), "n": int(len(d))}
            for (h, d), (_, b) in zip(err.groupby("h"), band.groupby("h"))
        ],
        "per_cell": per_cell.round(4).reset_index().to_dict(orient="records"),
        "coverage_raw": round(float(raw_in.mean()), 3),
        "coverage": round(float(cal_in.mean()), 3),
        "coverage_cell_avg": round(float(band.groupby("cell")["cal"].mean().mean()), 3),
        "nominal": NOMINAL,
    }
