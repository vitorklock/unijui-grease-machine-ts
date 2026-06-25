import type { Clock, Hardware } from "@/lib/grease-machine";

/**
 * Simulated motor. Tracks on-time against the injected clock and remembers the
 * most recent run (its duration and stop time) so the scale can model the drip
 * that follows. Implements the Hardware.Motor port.
 */
export class SimulatedMotor implements Hardware.Motor {
    private running = false;
    private startedAt: number | null = null;
    private accumulated = 0;

    /** Clock time the motor last stopped (null until it has run). */
    lastStopTime: number | null = null;
    /** Duration of the most recent completed run, in seconds. */
    lastRunDuration = 0;

    constructor(private readonly clock: Clock) { }

    start(): void {
        if (!this.running) {
            this.running = true;
            this.startedAt = this.clock.now();
        }
    }

    stop(): void {
        if (this.running && this.startedAt !== null) {
            const runDuration = this.clock.now() - this.startedAt;
            this.accumulated += runDuration;
            this.lastRunDuration = runDuration;
            this.lastStopTime = this.clock.now();
            this.running = false;
            this.startedAt = null;
        }
    }

    isRunning(): boolean {
        return this.running;
    }

    /** Total on-time since the last reset, in seconds (includes the current run). */
    elapsedOnTime(): number {
        const current =
            this.running && this.startedAt !== null ? this.clock.now() - this.startedAt : 0;
        return this.accumulated + current;
    }

    /** Empty the measured container: forget all on-time and run history. */
    reset(): void {
        this.running = false;
        this.startedAt = null;
        this.accumulated = 0;
        this.lastStopTime = null;
        this.lastRunDuration = 0;
    }
}
