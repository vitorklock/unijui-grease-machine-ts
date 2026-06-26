#!/usr/bin/env python3
"""Generate the paper figures from paper-data/csv/*.csv — matplotlib versions of
the app's charts, consistently styled (see style.py). Vector PDF (for LaTeX) +
PNG (preview) into paper-data/figures/.

Runs after the data export. Use `pnpm script:paper` to do both in one go, or:
    python3 scripts/figures/make_figures.py
"""
import csv
import json
import sys
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402
import numpy as np  # noqa: E402

sys.path.insert(0, str(Path(__file__).resolve().parent))
from style import (  # noqa: E402
    CURVE_COLOR,
    FIXED_COLOR,
    INTERP_COLOR,
    INTERP_LABELS,
    INTERPS,
    OIL_COLOR,
    OIL_LABELS,
    OILS,
    POINT_COLOR,
    ZERO_COLOR,
    apply_rc,
    save,
    style_ax,
)

ROOT = Path(__file__).resolve().parents[2]
CSV = ROOT / "paper-data" / "csv"
OUT = ROOT / "paper-data" / "figures"
PANEL = (13, 4)  # three side-by-side panels (one per oil)


def load(name):
    with open(CSV / name, newline="") as f:
        return list(csv.DictReader(f))


def fcol(rows, key):
    return np.array([float(r[key]) for r in rows])


def by_temp(rows):
    return sorted(rows, key=lambda r: float(r["temperature"]))


def panels(suptitle):
    fig, axes = plt.subplots(1, 3, figsize=PANEL)
    fig.suptitle(suptitle, fontsize=12)
    return fig, axes


def finish(fig, name):
    fig.tight_layout(rect=(0, 0, 1, 0.94))
    written = save(fig, name, OUT)
    print(f"  {name}: {', '.join(written)}")


# --- figures -----------------------------------------------------------------
def fig_viscosity():
    rows = load("viscosity.csv")
    fig, ax = plt.subplots(figsize=(6.5, 4.2))
    for oil in OILS:
        rs = by_temp([r for r in rows if r["oil"] == oil])
        ax.plot(fcol(rs, "temperature"), fcol(rs, "kinematic"), "-o", ms=4,
                color=OIL_COLOR[oil], label=OIL_LABELS[oil])
    ax.set_xlabel("Temperature (°C)")
    ax.set_ylabel("Kinematic viscosity (cSt)")
    ax.set_title("Kinematic viscosity vs temperature")
    ax.legend()
    style_ax(ax)
    fig.tight_layout()
    written = save(fig, "viscosity", OUT)
    print(f"  viscosity: {', '.join(written)}")


def fig_curves():
    rows = [r for r in load("interpolation-curves.csv") if r["interpolator"] == "geometric"]
    fig, axes = panels("Interpolated calibration curves (geometric)")
    for ax, oil in zip(axes, OILS):
        rs = by_temp([r for r in rows if r["oil"] == oil])
        T = fcol(rs, "temperature")
        ax.plot(T, fcol(rs, "flow"), color=CURVE_COLOR["flow"], label="flow")
        ax.set_xlabel("Temperature (°C)")
        ax.set_ylabel("Flow (g/s)", color=CURVE_COLOR["flow"])
        ax.tick_params(axis="y", labelcolor=CURVE_COLOR["flow"])
        ax.set_title(OIL_LABELS[oil])
        ax2 = ax.twinx()
        ax2.plot(T, fcol(rs, "dripShort"), color=CURVE_COLOR["dripShort"], label="drip · short")
        ax2.plot(T, fcol(rs, "dripLong"), color=CURVE_COLOR["dripLong"], label="drip · long")
        ax2.set_ylabel("Drip (g)")
        ax2.grid(False)
        ax.spines["top"].set_visible(False)
        ax2.spines["top"].set_visible(False)
        h1, l1 = ax.get_legend_handles_labels()
        h2, l2 = ax2.get_legend_handles_labels()
        ax.legend(h1 + h2, l1 + l2, loc="upper center", ncol=3)
    finish(fig, "curves")


def fig_calibration_fit():
    pts = load("calibration-points.csv")
    curves = load("interpolation-curves.csv")
    fig, axes = panels("Calibration points vs interpolated flow")
    for ax, oil in zip(axes, OILS):
        prows = [r for r in pts if r["oil"] == oil]
        temps = sorted({float(r["temperature"]) for r in prows})
        meas = [np.mean([float(r["flow"]) for r in prows if float(r["temperature"]) == t])
                for t in temps]
        for interp in INTERPS:
            crows = by_temp([r for r in curves if r["oil"] == oil and r["interpolator"] == interp])
            ax.plot(fcol(crows, "temperature"), fcol(crows, "flow"),
                    color=INTERP_COLOR[interp], lw=2.4 if interp == "geometric" else 1.4,
                    label=INTERP_LABELS[interp])
        ax.scatter(temps, meas, color=POINT_COLOR, s=30, zorder=5, label="calibration points")
        ax.set_xlabel("Temperature (°C)")
        ax.set_ylabel("Flow (g/s)")
        ax.set_title(OIL_LABELS[oil])
        style_ax(ax)
        if oil == OILS[0]:
            ax.legend()
    finish(fig, "calibration_fit")


def fig_accuracy(temp="25"):
    rows = [r for r in load("accuracy.csv") if r["temperature"] == temp]
    targets = sorted({float(r["target"]) for r in rows})
    x = np.arange(len(targets))
    w = 0.26
    fig, axes = panels(f"Dispensing error by interpolator at {temp} °C")
    for ax, oil in zip(axes, OILS):
        for i, interp in enumerate(INTERPS):
            vals = []
            for t in targets:
                m = [r for r in rows
                     if r["oil"] == oil and r["interpolator"] == interp and float(r["target"]) == t]
                vals.append(float(m[0]["errorPct"]) if m else 0.0)
            ax.bar(x + (i - 1) * w, vals, w, color=INTERP_COLOR[interp], label=INTERP_LABELS[interp])
        ax.axhline(0, color=ZERO_COLOR, lw=0.8)
        ax.set_xticks(x)
        ax.set_xticklabels([f"{int(t)} g" for t in targets])
        ax.set_xlabel("Target mass")
        ax.set_ylabel("Error (%)")
        ax.set_title(OIL_LABELS[oil])
        style_ax(ax)
        if oil == OILS[0]:
            ax.legend()
    finish(fig, "accuracy")


def fig_compare_delivered(target):
    rows = load("compare-sweep.csv")
    fig, axes = panels(f"Compensated vs fixed-time dispenser (target {int(target)} g)")
    for ax, oil in zip(axes, OILS):
        for series in ["fixed", *INTERPS]:
            rs = by_temp([r for r in rows if r["oil"] == oil and r["series"] == series])
            if not rs:
                continue
            color = FIXED_COLOR if series == "fixed" else INTERP_COLOR[series]
            label = "fixed-time" if series == "fixed" else INTERP_LABELS[series]
            ax.plot(fcol(rs, "temperature"), fcol(rs, "delivered"), color=color, label=label)
        ax.axhline(target, ls="--", color=ZERO_COLOR, lw=1.2, label="target")
        ax.set_xlabel("Temperature (°C)")
        ax.set_ylabel("Delivered (g)")
        ax.set_title(OIL_LABELS[oil])
        style_ax(ax)
        if oil == OILS[0]:
            ax.legend()
    finish(fig, "compare_delivered")


def fig_compare_error():
    rows = load("compare-sweep.csv")
    fig, axes = panels("Interpolation error across temperature")
    for ax, oil in zip(axes, OILS):
        for series in INTERPS:
            rs = by_temp([r for r in rows if r["oil"] == oil and r["series"] == series])
            ax.plot(fcol(rs, "temperature"), fcol(rs, "errorPct"),
                    color=INTERP_COLOR[series], label=INTERP_LABELS[series])
        ax.axhline(0, ls="--", color=ZERO_COLOR, lw=1.2)
        ax.set_xlabel("Temperature (°C)")
        ax.set_ylabel("Error (%)")
        ax.set_title(OIL_LABELS[oil])
        style_ax(ax)
        if oil == OILS[0]:
            ax.legend()
    finish(fig, "compare_error")


def main():
    if not CSV.exists():
        sys.exit("No paper-data/csv found — run `pnpm script export-paper-data` first "
                 "(or `pnpm script:paper`).")
    manifest = json.loads((ROOT / "paper-data" / "manifest.json").read_text())
    target = manifest["config"]["compare"]["massTargetG"]

    apply_rc()
    print(f"Writing figures to {OUT}")
    fig_viscosity()
    fig_curves()
    fig_calibration_fit()
    fig_accuracy()
    fig_compare_delivered(target)
    fig_compare_error()
    print("Done.")


if __name__ == "__main__":
    main()
