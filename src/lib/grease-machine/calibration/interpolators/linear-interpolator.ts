import { interp1d } from "../../math/interp";
import type { Interpolator } from "../../types";
import { BaseInterpolator } from "./base-interpolator";

/**
 * Straight-line interpolation of each model quantity over temperature (the
 * pre-geometric approach). Simple and exact at calibrated points, but because
 * flow and drip vary exponentially with temperature it carries a small,
 * systematic bias *between* calibration points — kept here as a baseline to
 * contrast against the geometric strategy.
 */
export class LinearInterpolator extends BaseInterpolator implements Interpolator {
    readonly key = "linear" as const;

    protected interp(temperature: number, values: readonly number[]): number {
        return interp1d(temperature, this.temps, values);
    }
}
