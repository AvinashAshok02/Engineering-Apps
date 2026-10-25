"""Synthetic cells for tests. Shape only: these numbers mean nothing physically."""
import numpy as np
import pandas as pd
import pytest

from bde.nasa import COLUMNS


def fake_cell(name, n=60, c0=1.85, fade=0.003, amb=24.0, amp=2.0, seed=0, switch_at=None):
    rng = np.random.default_rng(seed)
    rows = []
    for k in range(n):
        a, i = (amb, amp) if switch_at is None or k < switch_at else (4.0, 1.0)
        cap = c0 * (1 - fade * k) + rng.normal(0, 0.004)
        rows.append(dict(
            cell=name, cycle=k + 1, t_days=k * 0.3, ambient_c=a, cutoff_v=2.7, load="cc",
            capacity_ah=cap, i_mean_a=i, i_peak_a=i, v_min=2.7, duration_s=3000 * cap,
            t_start_c=a, t_max_c=a + 10, energy_wh=3.6 * cap,
            chg_cc_s=3000 - 8 * k, chg_cv_s=8000, chg_t_max_c=a + 3,
            re_ohm=0.05 + 1e-4 * k, rct_ohm=0.08 + 2e-4 * k,
        ))
    return pd.DataFrame(rows, columns=COLUMNS)


@pytest.fixture
def cycles():
    cells = [fake_cell(f"B90{i:02d}", fade=0.002 + 0.0005 * i, seed=i) for i in range(5)]
    cells.append(fake_cell("B9099", n=70, switch_at=35, seed=9))
    return pd.concat(cells, ignore_index=True)
