import { SOLVE_MAX_ITERATIONS, SOLVE_TOLERANCE_S } from "../../consts";
import {
    GreaseMachineError,
    InsufficientCalibrationError,
    TargetBelowDripError,
} from "../../errors";
import { dripAt, fitLoading } from "../../math/loading";
import type { Calibration, Interpolator } from "../../types";

/**
 * Fit the per-temperature models from a calibration store, ascending by
 * temperature. Each model is a steady flow plus an exponential drip-loading
 * curve drip(t) = dripLimit · (1 − exp(−t / tauLoad)), fitted from the SHORT +
 * LONG pulse anchors. Strategy-independent: every interpolator shares this.
 */
export function buildModels(store: Calibration.Store): Calibration.TemperatureModel[] {
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

/**
 * The compensated-control core, shared by every interpolation strategy. From the
 * calibration store it builds, per temperature, a steady flow and an exponential
 * drip-loading curve, then solves the implicit pulse equation
 *
 *     motorOnTime = (massTarget − drip(T, motorOnTime)) / flow(T)
 *
 * by fixed-point iteration (drip depends on the very duration we are solving
 * for). The iteration is a contraction because d(drip)/dt ≪ flow.
 *
 * Subclasses supply ONLY {@link interp} — how a model quantity is interpolated
 * over temperature between calibrated points (e.g. geometric/log-space vs
 * linear). Everything downstream (drip, the solver, the guards) is identical, so
 * the strategies are a true apples-to-apples comparison of the same model.
 */
export abstract class BaseInterpolator implements Interpolator {
    abstract readonly key: Interpolator.Key;

    protected readonly temps: number[];
    protected readonly flows: number[];
    protected readonly dripLimits: number[];
    protected readonly tauLoads: number[];

    constructor(store: Calibration.Store) {
        const models = buildModels(store);
        if (models.length < 2) {
            throw new InsufficientCalibrationError(models.length);
        }
        this.temps = models.map((m) => m.temperature);
        this.flows = models.map((m) => m.flow);
        this.dripLimits = models.map((m) => m.dripLimit);
        this.tauLoads = models.map((m) => m.tauLoad);
    }

    /**
     * Interpolate one model quantity at a temperature. The single strategy seam:
     * `values` are the calibrated samples aligned with {@link temps}.
     */
    protected abstract interp(temperature: number, values: readonly number[]): number;

    flowRate(temperature: number): number {
        return this.interp(temperature, this.flows);
    }

    /** Drip-loading parameters (L, τ) at a temperature. */
    private dripParams(temperature: number): { dripLimit: number; tauLoad: number } {
        return {
            dripLimit: this.interp(temperature, this.dripLimits),
            tauLoad: this.interp(temperature, this.tauLoads),
        };
    }

    drip(temperature: number, pulseDuration: number): number {
        const { dripLimit, tauLoad } = this.dripParams(temperature);
        return dripAt(pulseDuration, dripLimit, tauLoad);
    }

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
