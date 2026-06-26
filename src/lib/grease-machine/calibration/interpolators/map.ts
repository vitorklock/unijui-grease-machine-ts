import { INTERPOLATOR_KEYS } from "../../types";
import type { Calibration, Interpolator, InterpolatorRegistry } from "../../types";
import { GeometricInterpolator } from "./geometric-interpolator";
import { LinearInterpolator } from "./linear-interpolator";

/** The default (recommended/best) interpolation strategy. */
export const DEFAULT_INTERPOLATOR_KEY: Interpolator.Key = "geometric";

/**
 * Interpolator registry: key → factory(store). The UI iterates this to build a
 * selector and to compare strategies; the controller and scenarios construct the
 * chosen one by key. Adding a strategy means adding an entry here (and its key to
 * INTERPOLATOR_KEYS).
 */
export const INTERPOLATORS: { [K in Interpolator.Key]: InterpolatorRegistry.Entry } = {
    geometric: {
        key: "geometric",
        label: "Geometric (log-space)",
        recommended: true,
        description:
            "Interpolates the logarithm of flow and drip linearly over temperature, then exponentiates. Exact for the exp(k·T) physics, so it is near-perfect between calibration points.",
        create: (store) => new GeometricInterpolator(store),
    },
    linear: {
        key: "linear",
        label: "Linear",
        description:
            "Straight-line interpolation of flow and drip over temperature. Exact at calibrated points but carries a small systematic bias between them, since the real curves are exponential.",
        create: (store) => new LinearInterpolator(store),
    },
};

/** Registry entries in declared order, for selectors and comparison charts. */
export const INTERPOLATOR_LIST = INTERPOLATOR_KEYS.map((k) => INTERPOLATORS[k]);

/** Build an interpolator by key from a calibration store. */
export function createInterpolator(
    key: Interpolator.Key,
    store: Calibration.Store,
): Interpolator {
    return INTERPOLATORS[key].create(store);
}
