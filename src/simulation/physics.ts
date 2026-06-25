/**
 * Physics model of a thin, low-viscosity drip oil — the simulation's source of
 * truth. Flow rises with temperature; the steady (long-pulse) drip falls with
 * temperature; and drip loads up over the pulse duration toward that steady
 * limit. Parameters are chosen for realistic, monotone, smooth behaviour in the
 * thin-oil regime — not to reproduce any external table. The calibration
 * procedure samples this model; the controller never sees it.
 */
export interface PhysicsConfig {
    /** Steady mass flow at the reference temperature, in g/s. */
    baseFlow: number;
    /** Reference temperature, in °C. */
    referenceTemp: number;
    /** Flow Arrhenius exponent, in 1/°C (flow ∝ exp(+flowCoeff·ΔT)). */
    flowCoeff: number;
    /** Steady (long-pulse) drip at the reference temperature, in grams. */
    baseDripLimit: number;
    /** Drip Arrhenius exponent, in 1/°C (drip ∝ exp(−dripCoeff·ΔT)). */
    dripCoeff: number;
    /** Drip loading time constant at the reference temperature, in seconds. */
    baseTauLoad: number;
    /** Drip settling duration at the reference temperature, in seconds. */
    baseSettle: number;
}

export const DEFAULT_PHYSICS: PhysicsConfig = {
    baseFlow: 20,
    referenceTemp: 20,
    flowCoeff: 0.025,
    baseDripLimit: 5,
    dripCoeff: 0.029,
    baseTauLoad: 0.7,
    baseSettle: 3,
};

export class GreasePhysicsModel {
    readonly config: PhysicsConfig;

    constructor(config: Partial<PhysicsConfig> = {}) {
        this.config = { ...DEFAULT_PHYSICS, ...config };
    }

    /** Steady mass flow while the motor runs, in g/s. */
    flowRate(temperature: number): number {
        const { baseFlow, referenceTemp, flowCoeff } = this.config;
        return baseFlow * Math.exp(flowCoeff * (temperature - referenceTemp));
    }

    /** Steady (long-pulse) drip limit at a temperature, in grams. */
    dripLimit(temperature: number): number {
        const { baseDripLimit, referenceTemp, dripCoeff } = this.config;
        return baseDripLimit * Math.exp(-dripCoeff * (temperature - referenceTemp));
    }

    /** Drip loading time constant — colder, more viscous oil charges slower. */
    tauLoad(temperature: number): number {
        const { baseTauLoad, referenceTemp, flowCoeff } = this.config;
        return baseTauLoad * Math.exp(-flowCoeff * (temperature - referenceTemp));
    }

    /** Total residual drip after a pulse of the given run duration, in grams. */
    drip(temperature: number, pulseDuration: number): number {
        if (pulseDuration <= 0) return 0;
        const limit = this.dripLimit(temperature);
        const tau = this.tauLoad(temperature);
        return limit * (1 - Math.exp(-pulseDuration / tau));
    }

    /** Seconds for the drip to fully settle after the motor stops. */
    dripSettlingDuration(temperature: number): number {
        const { baseSettle, referenceTemp, dripCoeff } = this.config;
        return baseSettle * Math.exp(-dripCoeff * (temperature - referenceTemp));
    }
}
