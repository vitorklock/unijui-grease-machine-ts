import { SOLVE_MAX_ITERATIONS, SOLVE_TOLERANCE_S } from "../consts";
import { InsufficientCalibrationError, TargetBelowDripError } from "../errors";
import { interp1d } from "../math/interp";
import { dripAt, fitLoading } from "../math/loading";
import type { Calibration } from "../types";

/**
 * The compensated-control core. From the calibration store it builds, per
 * temperature, a steady flow and an exponential drip-loading curve (fitted from
 * the short + long pulse anchors). At runtime it interpolates those parameters
 * **linearly over temperature** and solves the implicit pulse equation
 *
 *     motorOnTime = (massTarget − drip(T, motorOnTime)) / flow(T)
 *
 * by fixed-point iteration (drip depends on the very duration we are solving
 * for). The iteration is a contraction because d(drip)/dt ≪ flow.
 */
export class Interpolator {
    private readonly temps: number[];
    private readonly flows: number[];
    private readonly dripLimits: number[];
    private readonly tauLoads: number[];

    constructor(store: Calibration.Store) {
        const models = Interpolator.buildModels(store);
        if (models.length < 2) {
            throw new InsufficientCalibrationError(models.length);
        }
        this.temps = models.map((m) => m.temperature);
        this.flows = models.map((m) => m.flow);
        this.dripLimits = models.map((m) => m.dripLimit);
        this.tauLoads = models.map((m) => m.tauLoad);
    }

    /** Fitted per-temperature models, ascending by temperature. */
    static buildModels(store: Calibration.Store): Calibration.TemperatureModel[] {
        const byTemp = new Map<
            number,
            Partial<Record<Calibration.Regime, Calibration.Point>>
        >();
        for (const p of store.points) {
            const entry = byTemp.get(p.temperature) ?? {};
            entry[p.regime] = p;
            byTemp.set(p.temperature, entry);
        }

        const models: Calibration.TemperatureModel[] = [];
        for (const [temperature, entry] of byTemp) {
            const short = entry.SHORT;
            const long = entry.LONG;
            if (!short || !long) continue; // both regimes required to fit the curve

            const flowShort = short.calTarget / short.motorOnTime;
            const flowLong = long.calTarget / long.motorOnTime;
            const flow = (flowShort + flowLong) / 2;

            const { dripLimit, tauLoad } = fitLoading(
                short.motorOnTime,
                short.drip,
                long.motorOnTime,
                long.drip,
            );
            models.push({ temperature, flow, dripLimit, tauLoad });
        }

        return models.sort((a, b) => a.temperature - b.temperature);
    }

    /** Steady mass flow at a temperature, in g/s. */
    flowRate(temperature: number): number {
        return interp1d(temperature, this.temps, this.flows);
    }

    /** Expected drip for a pulse of the given duration at a temperature, in grams. */
    drip(temperature: number, pulseDuration: number): number {
        const dripLimit = interp1d(temperature, this.temps, this.dripLimits);
        const tauLoad = interp1d(temperature, this.temps, this.tauLoads);
        return dripAt(pulseDuration, dripLimit, tauLoad);
    }

    /** Solve the motor on-time (seconds) for one pulse of massTarget grams. */
    solveMotorTime(
        params: Calibration.SolveMotorTime.Params,
    ): Calibration.SolveMotorTime.Results {
        const { massTarget, temperature } = params;
        const flow = this.flowRate(temperature);
        const dripLimit = interp1d(temperature, this.temps, this.dripLimits);
        const tauLoad = interp1d(temperature, this.temps, this.tauLoads);

        let t = massTarget / flow; // seed ignoring drip (an upper bound on the time)
        for (let i = 0; i < SOLVE_MAX_ITERATIONS; i++) {
            const drip = dripAt(t, dripLimit, tauLoad);
            const next = (massTarget - drip) / flow;
            if (next <= 0) {
                throw new TargetBelowDripError(massTarget, drip, temperature);
            }
            if (Math.abs(next - t) < SOLVE_TOLERANCE_S) return next;
            t = next;
        }
        return t;
    }
}
