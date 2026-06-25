import type { Hardware } from "@/lib/grease-machine";

/** Simulated thermometer reporting a settable ambient temperature, in °C. */
export class SimulatedThermometer implements Hardware.Thermometer {
    constructor(public temperature = 20) { }

    readTemperature(): number {
        return this.temperature;
    }
}
