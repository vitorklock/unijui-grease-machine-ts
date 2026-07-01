/** 0 °C in kelvin. */
const KELVIN = 273.15;

/**
 * Physics model of a thin, low-viscosity drip oil (the simulation's source of
 * truth). Flow rises with temperature; the steady (long-pulse) drip falls with
 * temperature; and drip loads up over the pulse duration toward that steady
 * limit. The calibration procedure samples this model; the controller never
 * sees it.
 *
 * Temperature dependence follows the Arrhenius–Andrade law: viscosity is
 * exponential in INVERSE ABSOLUTE temperature (1/T in kelvin) — ln(μ) = A + B/T.
 * Flow ≈ 1/μ (Hagen–Poiseuille), and the film/drain/fill timescales all scale
 * with viscosity, so every quantity here is exp of a linear function of 1/T.
 * This is the physically-canonical form for real oils over a wide temperature
 * span, and it is why the Arrhenius interpolator is the EXACT fit for this
 * ground truth while the geometric (log-in-Celsius) strategy carries a small
 * residual (see the interpolators).
 *
 * The coefficients are reference-anchored: `baseX` is the value AT
 * `referenceTemp`, and `flowCoeff`/`dripCoeff` are the LOCAL logarithmic
 * sensitivity there (per °C). A quantity Q with signed sensitivity c is
 *
 *     Q(T) = baseQ · exp( c · T_refK² · (1/T_refK − 1/T_K) )     [T_K = T + 273.15]
 *
 * so Q(referenceTemp) = baseQ exactly and d(ln Q)/dT = c at the reference. This
 * keeps the sourced ISO-3448 anchoring (baseFlow, ~5.3 %/°C near 20 °C) intact
 * while giving the correct 1/T curvature away from the reference — the local
 * temperature sensitivity grows as the oil cools, as real viscosity does.
 *
 * Default parameters are grounded in sourced data for ISO VG 32 light machine/
 * chain oil in 3 mm ID x 40 cm tubing:
 *   - flow ~ 1/viscosity (Hagen-Poiseuille); viscosity drops ~5.3 %/degC near
 *     20 degC (ISO 3448 viscosity-temperature table), so flowCoeff = 0.053 /degC.
 *   - dripLimit ~ residual film + drainable volume (Bretherton/Landau-Levich),
 *     ~0.6 g for this geometry; dripCoeff = 0.045 /degC (mid of the mu^(2/3) film
 *     and mu^1 drain-time temperature dependences).
 *   - tauLoad ~ tube fill time (volume / flow) ~ 10 s.
 *   - baseSettle ~ gravity drain time 8*mu*L/(rho*g*R^2) ~ 12 s plus the
 *     falling-rate drip tail, ~40 s.
 * See the research note in the repo for derivations and sources.
 */
export interface PhysicsConfig {
    /** Steady mass flow at the reference temperature, in g/s. */
    baseFlow: number;
    /** Reference temperature, in °C. */
    referenceTemp: number;
    /** Flow log-sensitivity at referenceTemp, in 1/°C (local d(ln flow)/dT; flow rises with T). */
    flowCoeff: number;
    /** Steady (long-pulse) drip at the reference temperature, in grams. */
    baseDripLimit: number;
    /** Drip log-sensitivity at referenceTemp, in 1/°C (local d(ln drip)/dT; drip falls with T). */
    dripCoeff: number;
    /** Drip loading time constant at the reference temperature, in seconds. */
    baseTauLoad: number;
    /** Drip settling duration at the reference temperature, in seconds. */
    baseSettle: number;
}

/** ISO VG 32 light machine/chain oil in 3 mm ID x 40 cm tubing (sourced). */
export const DEFAULT_PHYSICS: PhysicsConfig = {
    baseFlow: 0.2,
    referenceTemp: 20,
    flowCoeff: 0.053,
    baseDripLimit: 0.6,
    dripCoeff: 0.045,
    baseTauLoad: 10,
    baseSettle: 40,
};

export class GreasePhysicsModel {
    readonly config: PhysicsConfig;

    constructor(config: Partial<PhysicsConfig> = {}) {
        this.config = { ...DEFAULT_PHYSICS, ...config };
    }

    /**
     * Arrhenius–Andrade factor for a quantity with signed local log-sensitivity
     * `coeff` (per °C) at `referenceTemp`: exp of a linear function of 1/T in
     * kelvin, normalized to 1 at the reference temperature. `coeff > 0` rises
     * with temperature; `coeff < 0` falls with it.
     */
    private arrhenius(coeff: number, temperature: number): number {
        const tRefK = this.config.referenceTemp + KELVIN;
        const tK = temperature + KELVIN;
        return Math.exp(coeff * tRefK * tRefK * (1 / tRefK - 1 / tK));
    }

    /** Steady mass flow while the motor runs, in g/s. */
    flowRate(temperature: number): number {
        return this.config.baseFlow * this.arrhenius(this.config.flowCoeff, temperature);
    }

    /** Steady (long-pulse) drip limit at a temperature, in grams. */
    dripLimit(temperature: number): number {
        return this.config.baseDripLimit * this.arrhenius(-this.config.dripCoeff, temperature);
    }

    /** Drip loading time constant — colder, more viscous oil charges slower. */
    tauLoad(temperature: number): number {
        return this.config.baseTauLoad * this.arrhenius(-this.config.flowCoeff, temperature);
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
        return this.config.baseSettle * this.arrhenius(-this.config.dripCoeff, temperature);
    }
}
