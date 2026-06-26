import type { Clock, Hardware } from "@/lib/grease-machine";
import type { GreasePhysicsModel } from "../physics";
import type { SimulatedMotor } from "./simulated-motor";

/**
 * Simulated scale. Derives the container mass from the motor's on-time and the
 * physics model: while running, mass = onTime · flow(T); after the motor stops,
 * the residual drip for that pulse accrues over the settling duration. Stateless
 * (everything comes from the motor + clock), so it reads correctly whether or
 * not it was polled across the stop. Implements the Hardware.Scale port.
 */
export class SimulatedScale implements Hardware.Scale {
    constructor(
        private readonly motor: SimulatedMotor,
        private readonly physics: GreasePhysicsModel,
        private readonly clock: Clock,
    ) { }

    readWeight(): number {
        // Use the temperature the pulse was dispensed at (locked by the motor),
        // not the live thermometer, so sliding the temperature doesn't change
        // mass that is already in the container.
        const temperature = this.motor.runTemperature;
        const flow = this.physics.flowRate(temperature);
        const dispensed = this.motor.elapsedOnTime() * flow;

        if (this.motor.isRunning() || this.motor.lastStopTime === null) {
            return dispensed;
        }

        const totalDrip = this.physics.drip(temperature, this.motor.lastRunDuration);
        const settle = this.physics.dripSettlingDuration(temperature);
        const sinceStop = this.clock.now() - this.motor.lastStopTime;
        const fraction = settle > 0 ? Math.min(1, Math.max(0, sinceStop / settle)) : 1;
        return dispensed + totalDrip * fraction;
    }
}
