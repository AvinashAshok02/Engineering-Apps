"""Forecasters. All predict relative change y_rel = C(n + h) / C_now - 1."""
from __future__ import annotations

import numpy as np
import pandas as pd
from sklearn.ensemble import HistGradientBoostingRegressor
from sklearn.impute import SimpleImputer
from sklearn.linear_model import RidgeCV
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler

from .features import FEATURES

QUANTILES = (0.1, 0.5, 0.9)


def persistence(X: pd.DataFrame) -> np.ndarray:
    """No change: capacity stays where it is now."""
    return np.zeros(len(X))


def linear_extrapolation(X: pd.DataFrame) -> np.ndarray:
    """Carry the last-30-cycle slope forward (clipped so early noisy slopes can't run away)."""
    return np.clip(X["lin_h"].to_numpy(), -0.6, 0.2)


def ridge() -> object:
    return make_pipeline(SimpleImputer(strategy="median"), StandardScaler(), RidgeCV(alphas=np.logspace(-2, 3, 12)))


def gbm(q: float, max_iter: int = 300) -> HistGradientBoostingRegressor:
    return HistGradientBoostingRegressor(
        loss="quantile", quantile=q, max_iter=max_iter, learning_rate=0.05,
        max_leaf_nodes=15, min_samples_leaf=40, l2_regularization=1.0, random_state=0,
    )


def cell_weights(cells: pd.Series) -> np.ndarray:
    """Weight rows so each cell counts equally; long-running cells would otherwise dominate."""
    return 1.0 / cells.map(cells.value_counts()).to_numpy(float)


class QuantileForecaster:
    """Three gradient-boosted quantile models (10th, 50th, 90th percentile)."""

    def __init__(self, max_iter: int = 300):
        self.models = {q: gbm(q, max_iter) for q in QUANTILES}

    def fit(self, ex: pd.DataFrame) -> "QuantileForecaster":
        w = cell_weights(ex["cell"])
        for m in self.models.values():
            m.fit(ex[FEATURES], ex["y_rel"], sample_weight=w)
        return self

    def predict(self, X: pd.DataFrame) -> np.ndarray:
        """Array of shape (n, 3); columns sorted so quantiles never cross."""
        P = np.column_stack([self.models[q].predict(X[FEATURES]) for q in QUANTILES])
        return np.sort(P, axis=1)
