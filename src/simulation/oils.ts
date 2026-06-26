import { DEFAULT_PHYSICS, type PhysicsConfig } from "./physics";

/** A measured kinematic-viscosity point for display, in centistokes (cSt). */
export interface OilViscosityPoint {
    temperature: number;
    kinematic: number;
}

/**
 * A named oil/grease profile: descriptive data plus the physics parameters the
 * simulation runs on. Switching profile means switching the machine's fluid,
 * which is why it forces a recalibration.
 */
export interface OilProfile {
    id: string;
    name: string;
    grade: string;
    description: string;
    /** Density at 15 degC, g/cm^3. */
    density: number;
    viscosity: OilViscosityPoint[];
    physics: PhysicsConfig;
    /** Whether the physics is directly sourced or scaled from the sourced grade. */
    sourced: boolean;
    source: string;
}

export const OIL_PROFILES: Record<string, OilProfile> = {
    "iso-vg-32": {
        id: "iso-vg-32",
        name: "ISO VG 32 light machine / chain oil",
        grade: "ISO VG 32",
        description:
            "Medium-light mineral lubricating oil. The reference profile, with parameters derived directly from sourced viscosity, film, and drainage data for 3 mm ID x 40 cm tubing.",
        density: 0.87,
        viscosity: [
            { temperature: 0, kinematic: 277.7 },
            { temperature: 10, kinematic: 142.3 },
            { temperature: 20, kinematic: 80.3 },
            { temperature: 30, kinematic: 49.1 },
            { temperature: 40, kinematic: 32.0 },
        ],
        physics: DEFAULT_PHYSICS,
        sourced: true,
        source: "ISO 3448 viscosity-temperature table; Hagen-Poiseuille / Bretherton-Landau-Levich / gravity-drainage derivations.",
    },
    "iso-vg-22": {
        id: "iso-vg-22",
        name: "ISO VG 22 spindle / light hydraulic oil",
        grade: "ISO VG 22",
        description:
            "Thinner than VG 32: faster flow, less drip, quicker drainage. Parameters scaled from the VG 32 profile using flow ~ 1/viscosity, drain ~ viscosity, film ~ viscosity^(2/3).",
        density: 0.862,
        viscosity: [
            { temperature: 0, kinematic: 154.9 },
            { temperature: 10, kinematic: 84.8 },
            { temperature: 20, kinematic: 50.6 },
            { temperature: 30, kinematic: 32.4 },
            { temperature: 40, kinematic: 22.0 },
        ],
        physics: {
            baseFlow: 0.32,
            referenceTemp: 20,
            flowCoeff: 0.048,
            baseDripLimit: 0.44,
            dripCoeff: 0.04,
            baseTauLoad: 6,
            baseSettle: 25,
        },
        sourced: false,
        source: "ISO 3448 viscosity-temperature table; physics scaled from the VG 32 reference.",
    },
    "iso-vg-10": {
        id: "iso-vg-10",
        name: "ISO VG 10 spindle oil",
        grade: "ISO VG 10",
        description:
            "Very thin oil: fast flow and short drip tail. Parameters scaled from the VG 32 profile; the cold-end viscosity points are extrapolated.",
        density: 0.858,
        viscosity: [
            { temperature: 0, kinematic: 85 },
            { temperature: 10, kinematic: 44 },
            { temperature: 20, kinematic: 25 },
            { temperature: 30, kinematic: 15 },
            { temperature: 40, kinematic: 10 },
        ],
        physics: {
            baseFlow: 0.64,
            referenceTemp: 20,
            flowCoeff: 0.054,
            baseDripLimit: 0.27,
            dripCoeff: 0.045,
            baseTauLoad: 3,
            baseSettle: 13,
        },
        sourced: false,
        source: "ISO 3448 viscosity-temperature table (cold end extrapolated); physics scaled from the VG 32 reference.",
    },
};

export const DEFAULT_OIL_PROFILE_ID = "iso-vg-32";

export const OIL_PROFILE_LIST: OilProfile[] = Object.values(OIL_PROFILES);
