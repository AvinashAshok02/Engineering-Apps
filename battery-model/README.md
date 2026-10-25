# Battery capacity forecaster

A data-driven model that forecasts a lithium-ion cell's capacity 5 to 100 cycles ahead, with calibrated uncertainty bands. It is trained and tested on the [NASA Ames PCoE Li-ion Battery Aging data set](https://www.nasa.gov/intelligent-systems-division/discovery-and-systems-health/pcoe/pcoe-data-set-repository/). Its out-of-fold forecasts drive chapters 3 and 4 of the [Anatomy of an EV](../battery-explorer/) explorer.

## Results

Leave-one-cell-out cross-validation: each of the 32 cells is scored by a model trained only on the other 31. Mean absolute error is in Ah (cells are rated at 2 Ah), averaged within each cell first.

| Forecaster | MAE (Ah), cell-averaged | MAE (Ah), all rows |
| --- | ---: | ---: |
| No change (persistence) | 0.075 | 0.097 |
| Straight line (last-30-cycle slope) | 0.070 | 0.088 |
| Ridge regression, same features | 0.042 | 0.061 |
| **Gradient-boosted quantile trees** | **0.028** | **0.043** |

- The trees beat "no change" on 29 of 32 held-out cells and the straight line on 27 of 32.
- Their lead grows with horizon. At 100 cycles ahead the MAE is 0.094 Ah, against 0.188 Ah for the straight line and 0.265 Ah for no change.
- The 80% band (10th to 90th percentile) held 65% of outcomes as trained. After cell-grouped conformal calibration it holds 78% overall, from 72–77% at 5–20 cycles ahead to 80–83% at 30 or more.
- Worst cells: B0049 (4 °C, test ended by a software crash), B0006 (fastest fader) and B0033 (mid-test collapse). On B0036 the straight line wins; on the flat 44 °C regimes of B0038–40, "no change" wins.

Full numbers are in `reports/metrics.json`, which the training run writes.

## Method

1. **Load** (`bde/nasa.py`): one row per discharge, with capacity, current, voltage, temperature and energy. The most recent charge (constant-current and constant-voltage times) and impedance test (Re, Rct) are carried forward, so each row holds only information available at the end of that discharge.
2. **Clean and segment** (`bde/clean.py`). The data set's "capacity" is the charge delivered under that run's load and temperature: at 4 °C and 4 A cells deliver about 0.05 Ah. Each cell is therefore split into regimes of constant ambient temperature and current, and forecasts never cross a regime boundary. Runs under 0.3 Ah, Hampel-filter glitches and break-in runs at the start of a regime are flagged and never used as targets. Regimes with fewer than 20 clean runs are dropped, leaving 35 regimes from 32 cells.
3. **Features** (`bde/features.py`): at each anchor cycle, 23 features computed causally from past clean runs. They cover the smoothed capacity, fade so far, 10- and 30-cycle slopes and the straight-line extrapolation; conditions (temperature, current, cut-off voltage, load type, rest time); and health signals (Re, Rct and their changes, CC charge time, temperature rise). The target is the relative change C(n+h)/C_now − 1 at h ∈ {5, 10, 20, 30, 40, 50, 60, 80, 100}.
4. **Model** (`bde/models.py`): three `HistGradientBoostingRegressor` models with quantile loss (0.1, 0.5, 0.9), each cell weighted equally.
5. **Validation and calibration** (`bde/evaluate.py`): leave-one-cell-out. Band widening per horizon is learned from the other cells' out-of-fold misses (split-conformal with cells as the exchangeable unit, as in CV+).
6. **Export** (`bde/export.py`): measured curves and the out-of-fold forecast for every anchor and horizon, written to `../battery-explorer/data/model.js`.

## Running it

```bash
pip install -e ".[dev]"
pytest                       # cleaning, causality of features, grouped CV
python -m bde.train          # retrain from data/processed/nasa_cycles.csv.gz (~10 min on 4 cores)
```

To rebuild the cycle table from NASA's files, download the [Battery Data Set zip](https://phm-datasets.s3.amazonaws.com/NASA/5.+Battery+Data+Set.zip) (~200 MB), extract it and the six inner zips, then:

```bash
python -m bde.train --raw path/to/extracted
```

The final model trained on all cells is saved to `artifacts/model.joblib` (not committed).

## Limits

- **One cell type, lab conditions**: constant-current or square-wave cycling of one commercial 18650. Results don't transfer to other chemistries, formats or real driving without new data.
- **Delivered capacity, not state of health**: the target depends on the test conditions as well as on ageing.
- **Short horizons**: 100 cycles is a few months of daily use. Pack life forecasting needs multi-year field data.
- **Small data**: 32 cells. The metrics have wide confidence intervals, and a knee unlike any seen in training will be missed.
- **Quirks in the source data**: NASA's READMEs note unexplained low-capacity runs at 4 °C and a software crash ending cells 49–52.

Data citation: B. Saha and K. Goebel (2007). "Battery Data Set", NASA Prognostics Data Repository, NASA Ames Research Center, Moffett Field, CA.
