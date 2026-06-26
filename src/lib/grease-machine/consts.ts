import type { Calibration } from "./types";

/** Calibration target mass for the SHORT pulse regime, in grams. */
export const TARGET_SHORT_G = 5;

/** Calibration target mass for the LONG pulse regime, in grams. */
export const TARGET_LONG_G = 30;

/** Calibration target mass per pulse regime, in grams. */
export const CALIBRATION_TARGETS: Record<Calibration.Regime, number> = {
    SHORT: TARGET_SHORT_G,
    LONG: TARGET_LONG_G,
};

/** The scale is "stable" when it varies less than this within the window, in grams. */
export const STABLE_TOLERANCE_G = 0.1;

/** Weight must hold within tolerance this long to count as stabilized, in seconds. */
export const STABLE_WINDOW_S = 15;

/** Poll interval for the calibration scale loops, in seconds. Fine enough that
 *  the per-poll overshoot (flow x POLL_S) stays well under the scale tolerance. */
export const POLL_S = 0.001;

/** Safety cap on how long to wait for the drip to settle, in seconds. */
export const STABILIZATION_TIMEOUT_S = 120;

/** Fixed-point solver tolerance, in seconds. */
export const SOLVE_TOLERANCE_S = 1e-7;

/** Fixed-point solver iteration cap. */
export const SOLVE_MAX_ITERATIONS = 100;
