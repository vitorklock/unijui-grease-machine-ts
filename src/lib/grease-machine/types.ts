/**
 * Domain contracts for the grease machine — the namespace-as-contract idiom.
 * Units everywhere: grams (g), seconds (s), degrees Celsius (°C), flow in g/s.
 */

/** Hardware ports — implemented by the simulation today, real drivers later. */
export namespace Hardware {
    export interface Motor {
        start(): void;
        stop(): void;
        isRunning(): boolean;
    }

    export interface Scale {
        /** Current measured mass, in grams. */
        readWeight(): number;
    }

    export interface Thermometer {
        /** Current temperature, in °C. */
        readTemperature(): number;
    }

    export interface Devices {
        motor: Motor;
        scale: Scale;
        thermometer: Thermometer;
    }
}

/** A time source the controllers and procedures run against (real or simulated). */
export interface Clock {
    /** Monotonic time, in seconds. */
    now(): number;
    /** Resolve after the given number of seconds (a real wait, or instant in sim). */
    sleep(seconds: number): Promise<void>;
}

/** The two pulse durations characterized during calibration. */
export const PULSE_REGIMES = ["SHORT", "LONG"] as const;

export namespace Calibration {
    export type Regime = (typeof PULSE_REGIMES)[number];

    /** One calibration measurement, at a single temperature and pulse regime. */
    export interface Point {
        /** °C at calibration time. */
        temperature: number;
        regime: Regime;
        /** Mass delivered while the motor ran, in grams. */
        calTarget: number;
        /** Motor on-time to reach calTarget while running, in seconds (the pulse duration). */
        motorOnTime: number;
        /** Residual mass that dripped after the motor stopped, in grams. */
        drip: number;
    }

    /** Serialized store: a flat array of points. */
    export type StoreJson = Point[];

    /** Calibration store contract (the concrete CalibrationStore implements it). */
    export interface Store {
        readonly points: readonly Point[];
        addPoint(point: Point): void;
        clear(): void;
        /** Temperatures that have BOTH a SHORT and a LONG point. */
        completeTemperatures(): number[];
        /** True once ≥2 complete temperatures exist, so interpolation is possible. */
        isReady(): boolean;
        toJSON(): StoreJson;
    }

    /**
     * Per-temperature fitted model used by the interpolator: a steady flow plus an
     * exponential drip-loading curve drip(t) = dripLimit · (1 − exp(−t / tauLoad)).
     */
    export interface TemperatureModel {
        temperature: number;
        flow: number;
        dripLimit: number;
        tauLoad: number;
    }

    export namespace SolveMotorTime {
        export interface Params {
            /** Requested pulse mass, in grams. */
            massTarget: number;
            /** Current temperature, in °C. */
            temperature: number;
        }
        /** Motor on-time for one pulse, in seconds. */
        export type Results = number;
    }
}

/** Available calibration interpolation strategies (geometric is the default). */
export const INTERPOLATOR_KEYS = ["geometric", "arrhenius", "linear"] as const;

export namespace Interpolator {
    export type Key = (typeof INTERPOLATOR_KEYS)[number];
}

/**
 * A calibration interpolation strategy. Every strategy fits the SAME
 * per-temperature model (flow + exponential drip-loading) from the store and
 * solves the same pulse equation; they differ only in how they interpolate that
 * model *between* calibrated temperatures (e.g. geometric/log-space vs linear).
 */
export interface Interpolator {
    readonly key: Interpolator.Key;
    /** Steady mass flow at a temperature, in g/s. */
    flowRate(temperature: number): number;
    /** Expected drip for a pulse of the given duration at a temperature, in grams. */
    drip(temperature: number, pulseDuration: number): number;
    /** Solve the motor on-time (seconds) for one pulse of massTarget grams. */
    solveMotorTime(params: Calibration.SolveMotorTime.Params): Calibration.SolveMotorTime.Results;
}

export namespace InterpolatorRegistry {
    export interface Entry {
        key: Interpolator.Key;
        /** English fallback label; the UI prefers the i18n name for the key. */
        label: string;
        description: string;
        /** Marks the recommended ("best") strategy — geometric. */
        recommended?: boolean;
        create(store: Calibration.Store): Interpolator;
    }
}

/** Available controllers (no AI controllers — manual + compensated automatic). */
export const CONTROLLER_KEYS = ["manual", "automatic"] as const;

export namespace Controller {
    export type Key = (typeof CONTROLLER_KEYS)[number];

    export interface Manual {
        readonly key: "manual";
        motorOn(): void;
        motorOff(): void;
        isRunning(): boolean;
    }

    export namespace Automatic {
        export namespace Pulsed {
            export interface Params {
                /** Mass per pulse, in grams. */
                massPerPulse: number;
                /** Seconds to wait between pulses. */
                intervalSeconds: number;
                /** Optional pulse count; omit for an open-ended cycle. */
                pulses?: number;
                onPulse?: (result: DispenseResult) => void;
                shouldStop?: () => boolean;
            }
        }
    }

    export interface Automatic {
        readonly key: "automatic";
        /** Dispense a single compensated pulse of massTarget grams. */
        dispense(massTarget: number): Promise<DispenseResult>;
        /** Run a repeating pulsed cycle. */
        runPulsed(params: Automatic.Pulsed.Params): Promise<void>;
    }

    export interface Map {
        manual: Manual;
        automatic: Automatic;
    }
}
export type Controller<K extends Controller.Key = Controller.Key> = Controller.Map[K];

/** Result of one automatic pulse. */
export interface DispenseResult {
    /** Requested mass, in grams. */
    massTarget: number;
    /** Temperature read at dispense time, in °C. */
    temperature: number;
    /** Seconds the motor ran. */
    motorOnTime: number;
    /** Drip the model expected for this pulse, in grams. */
    estimatedDrip: number;
}

export namespace ControllerRegistry {
    export interface Deps {
        devices: Hardware.Devices;
        store: Calibration.Store;
        clock: Clock;
        /** Interpolation strategy the automatic controller dispenses with. */
        interpolatorKey?: Interpolator.Key;
    }
    export interface Entry<K extends Controller.Key = Controller.Key> {
        key: K;
        label: string;
        description: string;
        create(deps: Deps): Controller<K>;
    }
}
