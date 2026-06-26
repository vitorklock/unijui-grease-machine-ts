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
            "Thinner than VG 32 and modelled with a higher viscosity index, so its viscosity curve is noticeably flatter: less drop with temperature, faster flow, less drip. Illustrative profile.",
        density: 0.862,
        viscosity: [
            { temperature: 0, kinematic: 133 },
            { temperature: 10, kinematic: 85 },
            { temperature: 20, kinematic: 54 },
            { temperature: 30, kinematic: 35 },
            { temperature: 40, kinematic: 22 },
        ],
        physics: {
            baseFlow: 0.3,
            referenceTemp: 20,
            flowCoeff: 0.045,
            baseDripLimit: 0.46,
            dripCoeff: 0.038,
            baseTauLoad: 7,
            baseSettle: 27,
        },
        sourced: false,
        source: "ISO VG 22 grade (22 cSt at 40 °C) with an illustrative higher viscosity index; physics scaled from the VG 32 reference.",
    },
    "iso-vg-10": {
        id: "iso-vg-10",
        name: "ISO VG 10 spindle oil",
        grade: "ISO VG 10",
        description:
            "Very thin oil modelled with the highest viscosity index of the three, so it has the flattest curve and the fastest, shortest-drip behaviour. Illustrative profile.",
        density: 0.858,
        viscosity: [
            { temperature: 0, kinematic: 46 },
            { temperature: 10, kinematic: 31 },
            { temperature: 20, kinematic: 21 },
            { temperature: 30, kinematic: 15 },
            { temperature: 40, kinematic: 10 },
        ],
        physics: {
            baseFlow: 0.76,
            referenceTemp: 20,
            flowCoeff: 0.038,
            baseDripLimit: 0.25,
            dripCoeff: 0.032,
            baseTauLoad: 3,
            baseSettle: 11,
        },
        sourced: false,
        source: "ISO VG 10 grade (10 cSt at 40 °C) with an illustrative high viscosity index; physics scaled from the VG 32 reference.",
    },
};

export const DEFAULT_OIL_PROFILE_ID = "iso-vg-32";

export const OIL_PROFILE_LIST: OilProfile[] = Object.values(OIL_PROFILES);
