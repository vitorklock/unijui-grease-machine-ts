import type { Clock } from "@/lib/grease-machine";

/**
 * Real-time clock for the live UI. `timeScale > 1` makes waits complete faster
 * (e.g. to fast-forward the long inter-pulse interval during a demo).
 */
export class SystemClock implements Clock {
    constructor(private readonly timeScale = 1) { }

    now(): number {
        return performance.now() / 1000;
    }

    sleep(seconds: number): Promise<void> {
        const ms = (Math.max(0, seconds) / this.timeScale) * 1000;
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
