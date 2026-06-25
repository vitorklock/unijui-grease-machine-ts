import { Interpolator } from "../calibration/interpolator";
import type { Calibration, Clock, Controller, DispenseResult, Hardware } from "../types";

export interface AutomaticControllerDeps {
    motor: Hardware.Motor;
    thermometer: Hardware.Thermometer;
    store: Calibration.Store;
    clock: Clock;
}

/**
 * Temperature-compensated pulsed dispenser — the project's solution. For each
 * pulse it reads the temperature, interpolates the calibration to get flow and
 * drip, solves the exact motor on-time, and runs the motor for precisely that
 * long. The scale is not used during operation, only during calibration.
 */
export class AutomaticController implements Controller.Automatic {
    readonly key = "automatic" as const;

    constructor(private readonly deps: AutomaticControllerDeps) { }

    async dispense(massTarget: number): Promise<DispenseResult> {
        const { motor, thermometer, store, clock } = this.deps;
        const temperature = thermometer.readTemperature();

        const interpolator = new Interpolator(store);
        const motorOnTime = interpolator.solveMotorTime({ massTarget, temperature });
        const estimatedDrip = interpolator.drip(temperature, motorOnTime);

        motor.start();
        await clock.sleep(motorOnTime);
        motor.stop();

        return { massTarget, temperature, motorOnTime, estimatedDrip };
    }

    async runPulsed(params: Controller.Automatic.Pulsed.Params): Promise<void> {
        const { massPerPulse, intervalSeconds, pulses, onPulse, shouldStop } = params;
        let count = 0;

        while (!shouldStop?.() && (pulses === undefined || count < pulses)) {
            const result = await this.dispense(massPerPulse);
            onPulse?.(result);
            count += 1;

            if (shouldStop?.() || (pulses !== undefined && count >= pulses)) break;
            await this.deps.clock.sleep(intervalSeconds);
        }
    }
}
