import type { Controller, Hardware } from "../types";

export interface ManualControllerDeps {
    motor: Hardware.Motor;
}

/**
 * Direct, hold-to-run motor control. Used to fill hoses before calibration,
 * purge air, and dispense ad-hoc. Depends only on the motor — no calibration,
 * scale, or thermometer required.
 */
export class ManualController implements Controller.Manual {
    readonly key = "manual" as const;

    constructor(private readonly deps: ManualControllerDeps) { }

    /** Start the motor (press and hold). */
    motorOn(): void {
        this.deps.motor.start();
    }

    /** Stop the motor (release). */
    motorOff(): void {
        this.deps.motor.stop();
    }

    isRunning(): boolean {
        return this.deps.motor.isRunning();
    }
}
