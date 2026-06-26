import { INTERPOLATOR_LIST } from "@/lib/grease-machine";
import type { Interpolator } from "@/lib/grease-machine";
import { GreaseMachineSimulation } from "../grease-machine-simulation";
import { GreasePhysicsModel } from "../physics";
import {
    calibrate,
    DEFAULT_CALIBRATION_TEMPS,
    type ScenarioOptions,
} from "./calibration-scenario";

/** One (temperature, delivered, error) sample of a dispenser's behavior. */
export interface CompareSeriesPoint {
    temperature: number;
    /** Mass actually delivered by the physics for the chosen motor time, in grams. */
    delivered: number;
    /** (delivered − target) / target, as a percentage. */
    errorPct: number;
}

/** One interpolation strategy evaluated across temperature. */
export interface CompareInterpolatorSeries {
    key: Interpolator.Key;
    /** Coarse points (for the table). */
    rows: CompareSeriesPoint[];
    /** Fine sweep across the calibrated range (for smooth lines + the error chart). */
    sweep: CompareSeriesPoint[];
    /** Mean absolute error % over the sweep — lowest wins the "best" badge. */
    meanAbsErrorPct: number;
}

export interface CompareScenarioResult {
    massTarget: number;
    fixedCalibrationTemp: number;
    /** Coarse temperatures used for the table. */
    temps: number[];
    /** Fine temperatures used for the chart lines. */
    sweepTemps: number[];
    /** The legacy fixed-time dispenser (set once, never adjusts). */
    fixed: { rows: CompareSeriesPoint[]; sweep: CompareSeriesPoint[] };
    /** One series per registered interpolation strategy. */
    interpolators: CompareInterpolatorSeries[];
    /** Strategy with the lowest mean absolute error — the "best" one. */
    bestKey: Interpolator.Key;
}

export const DEFAULT_COMPARE_TEMPS = [10, 20, 28, 35];
const SWEEP_STEPS = 48;

/** Solve the true motor time to deliver `target` g at `T` against the physics. */
function trueMotorTime(physics: GreasePhysicsModel, T: number, target: number): number {
    const flow = physics.flowRate(T);
    let t = target / flow;
    for (let i = 0; i < 100; i++) {
        const next = (target - physics.drip(T, t)) / flow;
        if (Math.abs(next - t) < 1e-9) return next;
        t = next;
    }
    return t;
}

function point(
    physics: GreasePhysicsModel,
    temperature: number,
    motorOnTime: number,
    massTarget: number,
): CompareSeriesPoint {
    const delivered =
        motorOnTime * physics.flowRate(temperature) +
        physics.drip(temperature, motorOnTime);
    return {
        temperature,
        delivered,
        errorPct: ((delivered - massTarget) / massTarget) * 100,
    };
}

/** Evenly spaced temperatures spanning [min, max], inclusive. */
function sweepRange(min: number, max: number, steps: number): number[] {
    if (max === min) return [min];
    return Array.from({ length: steps + 1 }, (_, i) => min + ((max - min) * i) / steps);
}

/**
 * Contrast the temperature-compensated controller — run with EVERY available
 * interpolation strategy — against a legacy fixed-time dispenser set once at
 * `fixedCalibrationTemp`. As the temperature drifts, the fixed dispenser
 * over/under-dispenses badly while every interpolator holds near the target; the
 * remaining sub-percent differences between interpolators are what the error
 * chart surfaces, with the lowest-error strategy flagged as best.
 */
export async function runCompareScenario(
    massTarget = 5,
    fixedCalibrationTemp = 25,
    temps: number[] = DEFAULT_COMPARE_TEMPS,
    calibrationTemps: number[] = DEFAULT_CALIBRATION_TEMPS,
    options: ScenarioOptions = {},
): Promise<CompareScenarioResult> {
    const sim = new GreaseMachineSimulation({ physics: options.physics });
    await calibrate(sim, calibrationTemps);
    const physics = sim.physics;

    const sweepTemps = sweepRange(
        Math.min(...calibrationTemps),
        Math.max(...calibrationTemps),
        SWEEP_STEPS,
    );

    // The legacy dispenser: one motor time, fixed at its calibration temperature.
    const fixedTime = trueMotorTime(physics, fixedCalibrationTemp, massTarget);
    const fixed = {
        rows: temps.map((T) => point(physics, T, fixedTime, massTarget)),
        sweep: sweepTemps.map((T) => point(physics, T, fixedTime, massTarget)),
    };

    const interpolators: CompareInterpolatorSeries[] = INTERPOLATOR_LIST.map((entry) => {
        const interp = entry.create(sim.store);
        const at = (T: number) =>
            point(physics, T, interp.solveMotorTime({ massTarget, temperature: T }), massTarget);
        const sweep = sweepTemps.map(at);
        const meanAbsErrorPct =
            sweep.reduce((sum, p) => sum + Math.abs(p.errorPct), 0) / sweep.length;
        return { key: entry.key, rows: temps.map(at), sweep, meanAbsErrorPct };
    });

    const bestKey = interpolators.reduce((best, s) =>
        s.meanAbsErrorPct < best.meanAbsErrorPct ? s : best,
    ).key;

    return {
        massTarget,
        fixedCalibrationTemp,
        temps,
        sweepTemps,
        fixed,
        interpolators,
        bestKey,
    };
}
