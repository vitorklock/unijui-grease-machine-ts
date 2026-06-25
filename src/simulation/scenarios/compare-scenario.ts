import { Interpolator } from "@/lib/grease-machine";
import { GreaseMachineSimulation } from "../grease-machine-simulation";
import { GreasePhysicsModel } from "../physics";
import { calibrate, DEFAULT_CALIBRATION_TEMPS } from "./calibration-scenario";

export interface CompareRow {
    temperature: number;
    /** Mass delivered by the compensated controller, in grams. */
    compensated: number;
    /** Mass delivered by the legacy fixed-time dispenser, in grams. */
    fixed: number;
    compensatedErrorPct: number;
    fixedErrorPct: number;
}

export interface CompareScenarioResult {
    massTarget: number;
    fixedCalibrationTemp: number;
    rows: CompareRow[];
}

export const DEFAULT_COMPARE_TEMPS = [10, 20, 28, 35];

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

/**
 * Contrast the temperature-compensated controller with a legacy fixed-time
 * dispenser that was set once (at `fixedCalibrationTemp`) and never adjusts. As
 * the temperature drifts, the fixed dispenser over/under-dispenses while the
 * compensated controller holds near the target.
 */
export async function runCompareScenario(
    massTarget = 5,
    fixedCalibrationTemp = 25,
    temps: number[] = DEFAULT_COMPARE_TEMPS,
    calibrationTemps: number[] = DEFAULT_CALIBRATION_TEMPS,
): Promise<CompareScenarioResult> {
    const sim = new GreaseMachineSimulation();
    await calibrate(sim, calibrationTemps);
    const interp = new Interpolator(sim.store);

    // The legacy dispenser: one motor time, fixed at its calibration temperature.
    const fixedTime = trueMotorTime(sim.physics, fixedCalibrationTemp, massTarget);

    const rows: CompareRow[] = temps.map((temperature) => {
        const flow = sim.physics.flowRate(temperature);

        const compTime = interp.solveMotorTime({ massTarget, temperature });
        const compensated = compTime * flow + sim.physics.drip(temperature, compTime);
        const fixed = fixedTime * flow + sim.physics.drip(temperature, fixedTime);

        return {
            temperature,
            compensated,
            fixed,
            compensatedErrorPct: ((compensated - massTarget) / massTarget) * 100,
            fixedErrorPct: ((fixed - massTarget) / massTarget) * 100,
        };
    });

    return { massTarget, fixedCalibrationTemp, rows };
}
