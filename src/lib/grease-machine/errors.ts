/** Base class for all grease-machine domain errors. */
export class GreaseMachineError extends Error { }

/** Raised when the calibration store lacks enough data to interpolate. */
export class InsufficientCalibrationError extends GreaseMachineError {
    constructor(have: number, need = 2) {
        super(
            `Need at least ${need} fully-calibrated temperatures (both pulse regimes), have ${have}.`,
        );
        this.name = "InsufficientCalibrationError";
    }
}

/** Raised when a requested pulse mass is at or below the drip floor (unachievable). */
export class TargetBelowDripError extends GreaseMachineError {
    constructor(massTarget: number, drip: number, temperature: number) {
        super(
            `Target ${massTarget} g is at or below the ${drip.toFixed(3)} g drip floor at ${temperature} °C — unachievable.`,
        );
        this.name = "TargetBelowDripError";
    }
}
