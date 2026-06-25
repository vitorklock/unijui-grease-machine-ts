import {
    CalibrationProcedure,
    CalibrationStore,
    createController,
} from "@/lib/grease-machine";
import type { Clock, Controller, Hardware } from "@/lib/grease-machine";
import { ManualClock } from "./clock";
import { GreasePhysicsModel, type PhysicsConfig } from "./physics";
import {
    SimulatedMotor,
    SimulatedScale,
    SimulatedThermometer,
} from "./hardware";

export interface SimulationConfig {
    physics?: Partial<PhysicsConfig>;
    ambientTemp?: number;
    /** Defaults to an instant ManualClock; pass a SystemClock for the live UI. */
    clock?: Clock;
}

/** A renderable snapshot of the machine state for the UI. */
export interface SimulationSnapshot {
    temperature: number;
    motorRunning: boolean;
    scaleWeight: number;
    calibrationPoints: number;
    completeTemperatures: number[];
    ready: boolean;
}

/**
 * Composition root for the simulated machine: wires the physics-backed devices,
 * a calibration store, and a clock, and hands out controllers and the
 * calibration procedure built against those same devices. The control library
 * is unaware it is talking to a simulation.
 */
export class GreaseMachineSimulation {
    readonly physics: GreasePhysicsModel;
    readonly clock: Clock;
    readonly motor: SimulatedMotor;
    readonly thermometer: SimulatedThermometer;
    readonly scale: SimulatedScale;
    readonly devices: Hardware.Devices;
    readonly store: CalibrationStore;

    constructor(config: SimulationConfig = {}) {
        this.physics = new GreasePhysicsModel(config.physics);
        this.clock = config.clock ?? new ManualClock();
        this.thermometer = new SimulatedThermometer(config.ambientTemp ?? 20);
        this.motor = new SimulatedMotor(this.clock);
        this.scale = new SimulatedScale(this.motor, this.thermometer, this.physics, this.clock);
        this.devices = {
            motor: this.motor,
            scale: this.scale,
            thermometer: this.thermometer,
        };
        this.store = new CalibrationStore();
    }

    /** Set the ambient temperature the thermometer reports, in °C. */
    setTemperature(temperature: number): void {
        this.thermometer.temperature = temperature;
    }

    /** Empty the measured container (resets the motor's on-time history). */
    resetContainer(): void {
        this.motor.reset();
    }

    /** Build a controller by key against this simulation's devices and store. */
    controller<K extends Controller.Key>(key: K): Controller<K> {
        return createController(key, {
            devices: this.devices,
            store: this.store,
            clock: this.clock,
        });
    }

    /** The calibration procedure bound to this simulation's devices and store. */
    calibrationProcedure(): CalibrationProcedure {
        return new CalibrationProcedure({
            devices: this.devices,
            store: this.store,
            clock: this.clock,
        });
    }

    snapshot(): SimulationSnapshot {
        return {
            temperature: this.thermometer.readTemperature(),
            motorRunning: this.motor.isRunning(),
            scaleWeight: this.scale.readWeight(),
            calibrationPoints: this.store.points.length,
            completeTemperatures: this.store.completeTemperatures(),
            ready: this.store.isReady(),
        };
    }
}
