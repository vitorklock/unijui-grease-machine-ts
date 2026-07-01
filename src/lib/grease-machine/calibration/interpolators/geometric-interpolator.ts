import { interp1d } from "../../math/interp";
import type { Interpolator } from "../../types";
import { BaseInterpolator } from "./base-interpolator";

/**
 * Geometric (log-space) interpolation: interpolate the logarithm of each model
 * quantity linearly over temperature (in °C), then exponentiate. Flow, the drip
 * limit, and the loading time constant all vary roughly exponentially with
 * temperature, so a straight line over the raw values overshoots on the convex
 * side and leaves a percent-level bias between calibration points; interpolating
 * in log-space removes almost all of it. This is exact for a pure exponential in
 * Celsius, and a simple, close approximation to the oil's true Arrhenius physics
 * (which is exponential in 1/T) — a hair behind the {@link ArrheniusInterpolator}
 * here, still far tighter than linear.
 */
export class GeometricInterpolator extends BaseInterpolator implements Interpolator {
    readonly key = "geometric" as const;

    protected interp(temperature: number, values: readonly number[]): number {
        // Extrapolate outside the calibrated band: extending the end slope in
        // log-space gives a smooth exponential tail tangent to the curve.
        return Math.exp(
            interp1d(temperature, this.temps, values.map(Math.log), { extrapolate: true }),
        );
    }
}
