"""Shared style for the paper figures — one source of truth so every figure is
consistent (same colours per oil / interpolator / series, same fonts, grid, and
layout). Mirrors the web app's chart semantics: a colour per interpolation
strategy, the fixed-time dispenser as the muted amber baseline, etc.
"""
from pathlib import Path

import matplotlib.pyplot as plt

# --- canonical ordering (used everywhere, so panels/legends line up) ---------
OILS = ["iso-vg-32", "iso-vg-22", "iso-vg-10"]
OIL_LABELS = {"iso-vg-32": "ISO VG 32", "iso-vg-22": "ISO VG 22", "iso-vg-10": "ISO VG 10"}

INTERPS = ["geometric", "arrhenius", "linear"]
INTERP_LABELS = {"geometric": "Geometric", "arrhenius": "Arrhenius", "linear": "Linear"}

# --- palette -----------------------------------------------------------------
OIL_COLOR = {"iso-vg-32": "#1f6feb", "iso-vg-22": "#0d9488", "iso-vg-10": "#ea580c"}
INTERP_COLOR = {"geometric": "#2563eb", "arrhenius": "#7c3aed", "linear": "#9ca3af"}
FIXED_COLOR = "#d97706"  # fixed-time dispenser (the muted baseline)
CURVE_COLOR = {"flow": "#2563eb", "dripShort": "#0d9488", "dripLong": "#ea580c"}
POINT_COLOR = "#111827"  # measured calibration points
GRID_COLOR = "#e5e7eb"
ZERO_COLOR = "#9ca3af"


def apply_rc():
    """Global rcParams — applied once so all figures share typography/grid."""
    plt.rcParams.update({
        "figure.dpi": 120,
        "savefig.dpi": 300,
        "savefig.bbox": "tight",
        "font.size": 10,
        "axes.titlesize": 11,
        "axes.labelsize": 10,
        "legend.fontsize": 8,
        "legend.frameon": False,
        "axes.grid": True,
        "grid.color": GRID_COLOR,
        "grid.linewidth": 0.8,
        "axes.axisbelow": True,
        "axes.edgecolor": ZERO_COLOR,
        "lines.linewidth": 2.0,
    })


def style_ax(ax, right_spine=False):
    """Consistent spine treatment: drop the top (and right, unless twinned)."""
    ax.spines["top"].set_visible(False)
    if not right_spine:
        ax.spines["right"].set_visible(False)


def save(fig, name, out_dir):
    """Write a figure as both vector PDF (for LaTeX) and PNG (preview)."""
    out = Path(out_dir)
    out.mkdir(parents=True, exist_ok=True)
    written = []
    for ext in ("pdf", "png"):
        path = out / f"{name}.{ext}"
        fig.savefig(path)
        written.append(path.name)
    plt.close(fig)
    return written
