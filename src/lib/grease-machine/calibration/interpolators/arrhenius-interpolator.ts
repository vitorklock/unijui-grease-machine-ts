import { interp1d } from "../../math/interp";
import type { Interpolator } from "../../types";
import { BaseInterpolator } from "./base-interpolator";

/** 0 °C in kelvin. */
const KELVIN = 273.15;

/**
 * Arrhenius interpolation: interpolate the logarithm of each model quantity
 * linearly against the INVERSE ABSOLUTE temperature (1/T in kelvin), then
 * exponentiate. This is the textbook Andrade/Arrhenius law for viscosity —
 * ln(μ) = A + B/T — and since flow ≈ 1/μ, ln(flow) is linear in 1/T. It is the
 * physically-canonical fit for real oils across a wide temperature span.
 *
 * Note: this simulator's flow is exp(k·T) in *Celsius*, for which the geometric
 * strategy is exact and Arrhenius carries a tiny residual; on real Arrhenius
 * data the ranking flips. Which interpolator is "best" tracks the physics.
 */
export class ArrheniusInterpolator extends BaseInterpolator implements Interpolator {
    readonly key = "arrhenius" as const;

    protected interp(temperature: number, values: readonly number[]): number {
        // 1/T(K) decreases as Celsius rises, so reverse both arrays to keep
        // interp1d's sample points ascending (it needs xs sorted). Extrapolating
        // the end slope in this space gives a physical Arrhenius tail outside the
        // calibrated band.
        const invKelvin = this.temps.map((c) => 1 / (c + KELVIN)).reverse();
        const logs = values.map((v) => Math.log(v)).reverse();
        return Math.exp(
            interp1d(1 / (temperature + KELVIN), invKelvin, logs, { extrapolate: true }),
        );
    }
}
