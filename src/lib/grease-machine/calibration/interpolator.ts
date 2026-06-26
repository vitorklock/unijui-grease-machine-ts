import { SOLVE_MAX_ITERATIONS, SOLVE_TOLERANCE_S } from "../consts";
import {
    GreaseMachineError,
    InsufficientCalibrationError,
    TargetBelowDripError,
} from "../errors";
import { interp1d } from "../math/interp";
import { dripAt, fitLoading } from "../math/loading";
import type { Calibration } from "../types";

/**
 * The compensated-control core. From the calibration store it builds, per
 * temperature, a steady flow and an exponential drip-loading curve (fitted from
 * the short + long pulse anchors). At runtime it interpolates those parameters
 * **geometrically over temperature** (linear interpolation of their logarithms,
 * then exponentiated) and solves the implicit pulse equation
 *
 *     motorOnTime = (massTarget − drip(T, motorOnTime)) / flow(T)
 *
 * by fixed-point iteration (drip depends on the very duration we are solving
 * for). The iteration is a contraction because d(drip)/dt ≪ flow.
 *
 * Geometric interpolation is used because flow, the drip limit, and the loading
 * time constant all vary roughly as exp(k·T) with temperature (Arrhenius). A
 * straight line over an exponential overshoots on the convex side and leaves a
 * percent-level bias between calibration points; interpolating in log-space is
 * exact for a pure exponential and removes almost all of that bias.
 */
export class Interpolator {
    private readonly temps: number[];
    private readonly logFlows: number[];
    private readonly logDripLimits: number[];
    private readonly logTauLoads: number[];

    constructor(store: Calibration.Store) {
        const models = Interpolator.buildModels(store);
        if (models.length < 2) {
            throw new InsufficientCalibrationError(models.length);
        }
        this.temps = models.map((m) => m.temperature);
        this.logFlows = models.map((m) => Math.log(m.flow));
        this.logDripLimits = models.map((m) => Math.log(m.dripLimit));
        this.logTauLoads = models.map((m) => Math.log(m.tauLoad));
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
        return Math.exp(interp1d(temperature, this.temps, this.logFlows));
    }

    /** Drip-loading parameters (L, τ) at a temperature. */
    private dripParams(temperature: number): { dripLimit: number; tauLoad: number } {
        return {
            dripLimit: Math.exp(interp1d(temperature, this.temps, this.logDripLimits)),
            tauLoad: Math.exp(interp1d(temperature, this.temps, this.logTauLoads)),
        };
    }

    /** Expected drip for a pulse of the given duration at a temperature, in grams. */
    drip(temperature: number, pulseDuration: number): number {
        const { dripLimit, tauLoad } = this.dripParams(temperature);
        return dripAt(pulseDuration, dripLimit, tauLoad);
    }

    /** Solve the motor on-time (seconds) for one pulse of massTarget grams. */
    solveMotorTime(
        params: Calibration.SolveMotorTime.Params,
    ): Calibration.SolveMotorTime.Results {
        const { massTarget, temperature } = params;
        const flow = this.flowRate(temperature);
        // A non-physical flow would make the motor time infinite and the dispense
        // never stop — fail loudly instead of looping forever.
        if (!Number.isFinite(flow) || flow <= 0) {
            throw new GreaseMachineError(
                `Non-physical flow (${flow} g/s) at ${temperature} °C — the calibration data looks corrupt.`,
            );
        }
        const { dripLimit, tauLoad } = this.dripParams(temperature);

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
        if (!Number.isFinite(t) || t <= 0) {
            throw new GreaseMachineError(
                `Could not solve a finite motor time for ${massTarget} g at ${temperature} °C.`,
            );
        }
        return t;
    }
}
