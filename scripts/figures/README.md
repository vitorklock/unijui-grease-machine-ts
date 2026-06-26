# Paper figures

Matplotlib versions of the app's charts, plotted from the exported CSVs
(`paper-data/csv/`). Vector **PDF** (for LaTeX `\includegraphics`) + **PNG**
(preview) are written to `paper-data/figures/`.

## Run

One command does both stages — regenerate the data (TypeScript) and the figures
(Python):

```bash
pnpm script:paper
```

Or the two stages separately:

```bash
pnpm script export-paper-data            # writes paper-data/{json,csv}
python3 scripts/figures/make_figures.py  # writes paper-data/figures
```

## Python deps

Standalone toolchain (only reads the CSVs — nothing TypeScript). Needs Python 3
with:

```bash
pip install -r scripts/figures/requirements.txt   # matplotlib, numpy
```

## Figures

| File | Mirrors app tab | Source CSV |
|------|------------------|------------|
| `viscosity` | Oil · viscosity | `viscosity.csv` |
| `curves` | Curves (per oil) | `interpolation-curves.csv` (geometric) |
| `calibration_fit` | Calibrate · flow model | `calibration-points.csv` + `interpolation-curves.csv` |
| `accuracy` | Accuracy | `accuracy.csv` (25 °C) |
| `compare_delivered` | Compare · delivered | `compare-sweep.csv` |
| `compare_error` | Compare · error | `compare-sweep.csv` |

Styling is centralized in [`style.py`](./style.py) — one palette/typography so
every figure is consistent (a colour per oil and per interpolator; the
fixed-time dispenser is the muted amber baseline).
