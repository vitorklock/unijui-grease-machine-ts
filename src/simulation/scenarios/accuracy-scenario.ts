import { Interpolator } from "@/lib/grease-machine";
import { GreaseMachineSimulation } from "../grease-machine-simulation";
import { calibrate, DEFAULT_CALIBRATION_TEMPS } from "./calibration-scenario";

export interface AccuracyResult {
    massTarget: number;
    motorOnTime: number;
    delivered: number;
    errorAbs: number;
    errorPct: number;
}

export interface AccuracyScenarioResult {
    temperature: number;
    calibrationTemps: number[];
    results: AccuracyResult[];
}

export const DEFAULT_ACCURACY_TARGETS = [2, 5, 10, 30];

/**
 * Dispense a range of pulse masses at a temperature *between* calibration points
 * and measure the residual error — the cost of interpolating linearly over a
 * non-linear physics. Delivered mass is the physics ground truth for the motor
 * time the controller chose.
 */
export async function runAccuracyScenario(
    temperature = 25,
    targets: number[] = DEFAULT_ACCURACY_TARGETS,
    calibrationTemps: number[] = DEFAULT_CALIBRATION_TEMPS,
): Promise<AccuracyScenarioResult> {
    const sim = new GreaseMachineSimulation();
    await calibrate(sim, calibrationTemps);

    const interp = new Interpolator(sim.store);
    const results: AccuracyResult[] = targets.map((massTarget) => {
        const motorOnTime = interp.solveMotorTime({ massTarget, temperature });
        const delivered =
            motorOnTime * sim.physics.flowRate(temperature) +
            sim.physics.drip(temperature, motorOnTime);
        const errorAbs = delivered - massTarget;
        return {
            massTarget,
            motorOnTime,
            delivered,
            errorAbs,
            errorPct: (errorAbs / massTarget) * 100,
        };
    });

    return { temperature, calibrationTemps, results };
}
