import numpy as np
import pandas as pd

from bde import evaluate
from bde.clean import hampel_flags, segment
from bde.features import FEATURES, build_anchors, build_examples


def test_hampel_flags_spike_and_dropout():
    x = np.full(30, 1.5) + np.linspace(0, -0.05, 30)
    x[10], x[20] = 2.4, 0.4
    assert set(np.flatnonzero(hampel_flags(x))) == {10, 20}


def test_segment_splits_on_condition_change(cycles):
    s = segment(cycles)
    regs = s[s.cell == "B9099"].groupby("regime")["ambient_c"].unique()
    assert len(regs) == 2 and regs[1][0] == 4.0
    # the first run of every regime is never a target
    firsts = s.groupby(["cell", "regime"]).head(1)
    assert not firsts["valid"].any()


def test_features_use_only_the_past(cycles):
    s = segment(cycles)
    a1 = build_anchors(s).set_index(["cell", "regime", "anchor"])
    future = s.copy()
    late = future["cycle"] > 40
    future.loc[late, ["capacity_ah", "re_ohm", "chg_cc_s"]] *= 0.5
    a2 = build_anchors(future).set_index(["cell", "regime", "anchor"])
    early = a1.index.get_level_values("anchor") <= 40
    pd.testing.assert_frame_equal(a1[early], a2.loc[a1.index[early]])


def test_examples_target_is_capacity_h_cycles_ahead(cycles):
    s = segment(cycles)
    ex = build_examples(s)
    row = ex.iloc[17]
    truth = s[(s.cell == row.cell) & (s.cycle == row.anchor + row.h)]["capacity_ah"].item()
    assert np.isclose(row.y_ah, truth)
    assert set(FEATURES) <= set(ex.columns)
    # no target crosses into another regime
    assert ex.groupby(["cell", "regime"]).apply(lambda d: (d.anchor + d.h).max()).le(
        s.groupby(["cell", "regime"]).cycle.max()).all()


def test_weighted_quantile():
    x = np.arange(10.0)
    assert evaluate.weighted_quantile(x, np.ones(10), 0.5) == 4.0
    w = np.r_[np.zeros(9), 1.0]
    assert evaluate.weighted_quantile(x, w, 0.1) == 9.0


def test_cross_validation_is_grouped_and_complete(cycles):
    s = segment(cycles)
    anchors = build_anchors(s)
    ex = build_examples(s, anchors)
    oof, grid = evaluate.cross_validate(ex, anchors, max_iter=20, log=lambda *_: None)
    assert oof[["q10", "q50", "q90", "lo", "hi", "ridge"]].notna().all().all()
    assert (oof["lo"] <= oof["q50"]).all() and (oof["q50"] <= oof["hi"]).all()
    m = evaluate.metrics(oof)
    assert m["n_cells"] == ex["cell"].nunique()
    assert {"persistence", "linear", "ridge", "gbm"} == set(m["mae_ah"])
