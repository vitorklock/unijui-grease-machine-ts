import {
    buildModels,
    createInterpolator,
    DEFAULT_INTERPOLATOR_KEY,
    PULSE_REGIMES,
} from "@/lib/grease-machine";
import type { Calibration, Interpolator } from "@/lib/grease-machine";
import { GreaseMachineSimulation } from "../grease-machine-simulation";
import type { PhysicsConfig } from "../physics";

/** Selects the fluid + interpolation strategy a scenario runs against. */
export interface ScenarioOptions {
    physics?: Partial<PhysicsConfig>;
    interpolatorKey?: Interpolator.Key;
}

export interface CalibrationCurvePoint {
    temperature: number;
    flow: number;
    dripShort: number;
    dripLong: number;
}

export interface CalibrationScenarioResult {
    temperatures: number[];
    points: Calibration.Point[];
    models: Calibration.TemperatureModel[];
    curve: CalibrationCurvePoint[];
}

// The real viscosity-temperature curve is steep (~5 %/degC), so a few extra
// calibration points keep the linear interpolation tight across the range.
export const DEFAULT_CALIBRATION_TEMPS = [10, 16, 22, 28, 34, 40];

/** Reference pulse durations for the drip curves (short vs long), in seconds,
 *  representative of a small (~2 g) and a large (~30 g) dose at this flow. */
const SHORT_REF_PULSE = 10;
const LONG_REF_PULSE = 150;

/** Calibrate a simulation at the given temperatures (both regimes at each). */
export async function calibrate(
    sim: GreaseMachineSimulation,
    temperatures: number[],
): Promise<void> {
    for (const temperature of temperatures) {
        sim.setTemperature(temperature);
        for (const regime of PULSE_REGIMES) {
            sim.resetContainer();
            await sim.calibrationProcedure().run(regime);
        }
    }
}

export async function runCalibrationScenario(
    temperatures: number[] = DEFAULT_CALIBRATION_TEMPS,
    options: ScenarioOptions = {},
): Promise<CalibrationScenarioResult> {
    const sim = new GreaseMachineSimulation({ physics: options.physics });
    await calibrate(sim, temperatures);

    const models = buildModels(sim.store);
    const interp = createInterpolator(
        options.interpolatorKey ?? DEFAULT_INTERPOLATOR_KEY,
        sim.store,
    );

    const minT = Math.min(...temperatures);
    const maxT = Math.max(...temperatures);
    const span = maxT - minT;
    const steps = 40;

    const curve: CalibrationCurvePoint[] = [];
    for (let i = 0; i <= steps; i++) {
        const temperature = span === 0 ? minT : minT + (span * i) / steps;
        curve.push({
            temperature,
            flow: interp.flowRate(temperature),
            dripShort: interp.drip(temperature, SHORT_REF_PULSE),
            dripLong: interp.drip(temperature, LONG_REF_PULSE),
        });
        if (span === 0) break;
    }

    return { temperatures, points: sim.store.toJSON(), models, curve };
}
