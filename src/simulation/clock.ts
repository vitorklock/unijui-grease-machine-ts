import type { Clock } from "@/lib/grease-machine";

/**
 * Real-time clock for the live UI. `timeScale > 1` runs virtual time faster than
 * the wall clock so a realistic (slow) machine is watchable: both now() and
 * sleep() are scaled together, so motor on-time and drip settling stay
 * physically consistent (the motor still "runs" the full virtual duration, the
 * demo just compresses the wall-clock wait).
 */
export class SystemClock implements Clock {
    private origin = performance.now();
    private scale: number;

    constructor(timeScale = 1) {
        this.scale = timeScale;
    }

    get timeScale(): number {
        return this.scale;
    }

    /** Change the demo speed while keeping virtual time continuous (no jump). */
    setTimeScale(timeScale: number): void {
        const real = performance.now();
        const virtualNow = ((real - this.origin) / 1000) * this.scale;
        this.origin = real - (virtualNow / timeScale) * 1000;
        this.scale = timeScale;
    }

    now(): number {
        return ((performance.now() - this.origin) / 1000) * this.scale;
    }

    sleep(seconds: number): Promise<void> {
        const ms = (Math.max(0, seconds) / this.scale) * 1000;
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
}

/**
 * Deterministic virtual clock for scenarios and tests: sleeps advance time
 * instantly, so a calibration that "waits" 15 s settles in microseconds.
 */
export class ManualClock implements Clock {
    private t: number;

    constructor(start = 0) {
        this.t = start;
    }

    now(): number {
        return this.t;
    }

    async sleep(seconds: number): Promise<void> {
        this.t += Math.max(0, seconds);
    }
}
