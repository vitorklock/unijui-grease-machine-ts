import { INTERPOLATOR_KEYS } from "../../types";
import type { Calibration, Interpolator, InterpolatorRegistry } from "../../types";
import { ArrheniusInterpolator } from "./arrhenius-interpolator";
import { GeometricInterpolator } from "./geometric-interpolator";
import { LinearInterpolator } from "./linear-interpolator";

/** The default (recommended/best) interpolation strategy. */
export const DEFAULT_INTERPOLATOR_KEY: Interpolator.Key = "arrhenius";

/**
 * Interpolator registry: key → factory(store). The UI iterates this to build a
 * selector and to compare strategies; the controller and scenarios construct the
 * chosen one by key. Adding a strategy means adding an entry here (and its key to
 * INTERPOLATOR_KEYS).
 */
export const INTERPOLATORS: { [K in Interpolator.Key]: InterpolatorRegistry.Entry } = {
    arrhenius: {
        key: "arrhenius",
        label: "Arrhenius-Andrade (1/T)",
        recommended: true,
        description:
            "Interpolates the logarithm of flow and drip against inverse absolute temperature (1/T in kelvin) — the textbook Arrhenius-Andrade viscosity law the oil physics follows, so it is the exact fit here and the physically-canonical choice for real oils.",
        create: (store) => new ArrheniusInterpolator(store),
    },
    geometric: {
        key: "geometric",
        label: "Geometric (log-space)",
        description:
            "Interpolates the logarithm of flow and drip linearly over temperature (in °C), then exponentiates. A simple, close approximation to the Arrhenius physics — exact only for an exponential in Celsius, so it carries a small residual between calibration points.",
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
