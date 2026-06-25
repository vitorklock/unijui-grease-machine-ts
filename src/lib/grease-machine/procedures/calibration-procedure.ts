import {
    CALIBRATION_TARGETS,
    POLL_S,
    STABILIZATION_TIMEOUT_S,
    STABLE_TOLERANCE_G,
    STABLE_WINDOW_S,
} from "../consts";
import type { Calibration, Clock, Hardware } from "../types";

export interface CalibrationProcedureDeps {
    devices: Hardware.Devices;
    store: Calibration.Store;
    clock: Clock;
}

/**
 * Runs one calibration point at the current temperature for one pulse regime:
 *   1. record temperature and the scale baseline (hoses must be pre-filled);
 *   2. run the motor, polling the scale until calTarget grams are delivered;
 *   3. stop and record the motor on-time;
 *   4. wait for the weight to stabilize (≤ STABLE_TOLERANCE_G over STABLE_WINDOW_S);
 *   5. drip = final − baseline − calTarget. Store and return the point.
 */
export class CalibrationProcedure {
    constructor(private readonly deps: CalibrationProcedureDeps) { }

    async run(regime: Calibration.Regime): Promise<Calibration.Point> {
        const { devices, store, clock } = this.deps;
        const { motor, scale, thermometer } = devices;
        const calTarget = CALIBRATION_TARGETS[regime];

        const temperature = thermometer.readTemperature();
        const baseline = scale.readWeight();

        motor.start();
        const start = clock.now();
        while (scale.readWeight() - baseline < calTarget) {
            await clock.sleep(POLL_S);
        }
        motor.stop();
        const motorOnTime = clock.now() - start;

        const finalWeight = await this.waitForStabilization();
        const drip = finalWeight - baseline - calTarget;

        const point: Calibration.Point = {
            temperature,
            regime,
            calTarget,
            motorOnTime,
            drip,
        };
        store.addPoint(point);
        return point;
    }

    private async waitForStabilization(): Promise<number> {
        const { scale } = this.deps.devices;
        const { clock } = this.deps;

        let reference = scale.readWeight();
        let stableSince = clock.now();
        const deadline = clock.now() + STABILIZATION_TIMEOUT_S;

        while (clock.now() < deadline) {
            await clock.sleep(POLL_S);
            const current = scale.readWeight();
            if (Math.abs(current - reference) > STABLE_TOLERANCE_G) {
                reference = current;
                stableSince = clock.now();
            } else if (clock.now() - stableSince >= STABLE_WINDOW_S) {
                return current;
            }
        }
        return scale.readWeight();
    }
}
