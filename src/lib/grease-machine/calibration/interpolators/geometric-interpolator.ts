import { interp1d } from "../../math/interp";
import type { Interpolator } from "../../types";
import { BaseInterpolator } from "./base-interpolator";

/**
 * Geometric (log-space) interpolation: interpolate the logarithm of each model
 * quantity linearly over temperature, then exponentiate. Flow, the drip limit,
 * and the loading time constant all vary roughly as exp(k·T) with temperature
 * (Arrhenius), so a straight line over them overshoots on the convex side and
 * leaves a percent-level bias between calibration points. Interpolating in
 * log-space is exact for a pure exponential and removes almost all of that bias
 * — this is the recommended strategy.
 */
export class GeometricInterpolator extends BaseInterpolator implements Interpolator {
    readonly key = "geometric" as const;

    protected interp(temperature: number, values: readonly number[]): number {
        return Math.exp(interp1d(temperature, this.temps, values.map(Math.log)));
    }
}
