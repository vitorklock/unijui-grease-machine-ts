import { describe, expect, it } from "vitest";
import { TARGET_LONG_G, TARGET_SHORT_G } from "../../consts";
import { InsufficientCalibrationError, TargetBelowDripError } from "../../errors";
import { dripAt } from "../../math/loading";
import { INTERPOLATOR_KEYS } from "../../types";
import type { Calibration } from "../../types";
import { CalibrationStore } from "../store";
import {
    ArrheniusInterpolator,
    createInterpolator,
    GeometricInterpolator,
    INTERPOLATOR_LIST,
    LinearInterpolator,
} from ".";

/** Build calibration points from a known physics (flow, L, τ) per temperature. */
function buildStore(
    rows: { T: number; flow: number; L: number; tau: number }[],
): CalibrationStore {
    const store = new CalibrationStore();
    for (const { T, flow, L, tau } of rows) {
        for (const [regime, calTarget] of [
            ["SHORT", TARGET_SHORT_G],
            ["LONG", TARGET_LONG_G],
        ] as const) {
            const motorOnTime = calTarget / flow;
            store.addPoint({
                temperature: T,
                regime,
                calTarget,
                motorOnTime,
                drip: dripAt(motorOnTime, L, tau),
            } satisfies Calibration.Point);
        }
    }
    return store;
}

const ROWS = [
    { T: 10, flow: 15.5, L: 6.7, tau: 0.95 },
    { T: 20, flow: 20.0, L: 5.0, tau: 0.7 },
    { T: 35, flow: 29.0, L: 3.2, tau: 0.45 },
];

/** A pure exponential in temperature (Arrhenius) — the case geometric nails. */
const EXP_FLOW = (T: number) => 0.2 * Math.exp(0.053 * (T - 20));
const EXP_STORE = () =>
    buildStore([10, 20, 35].map((T) => ({ T, flow: EXP_FLOW(T), L: 0.6, tau: 10 })));

describe("GeometricInterpolator", () => {
    it("requires at least two complete temperatures", () => {
        const store = new CalibrationStore();
        store.addPoint({ temperature: 20, regime: "SHORT", calTarget: 5, motorOnTime: 0.25, drip: 1.5 });
        store.addPoint({ temperature: 20, regime: "LONG", calTarget: 30, motorOnTime: 1.5, drip: 4.4 });
        // Only one complete temperature.
        expect(() => new GeometricInterpolator(store)).toThrow(InsufficientCalibrationError);
    });

    it("recovers the steady flow at calibrated temperatures", () => {
        const interp = new GeometricInterpolator(buildStore(ROWS));
        expect(interp.flowRate(10)).toBeCloseTo(15.5, 6);
        expect(interp.flowRate(20)).toBeCloseTo(20.0, 6);
        expect(interp.flowRate(35)).toBeCloseTo(29.0, 6);
    });

    it("interpolates flow geometrically — near-exact for exponential data", () => {
        const interp = new GeometricInterpolator(EXP_STORE());

        // 18 °C sits inside the 10 °C gap between calibration points.
        const trueFlow = EXP_FLOW(18);
        const linear = EXP_FLOW(10) + (8 / 10) * (EXP_FLOW(20) - EXP_FLOW(10));

        // Geometric interpolation recovers the exponential almost exactly...
        expect(interp.flowRate(18)).toBeCloseTo(trueFlow, 5);
        // ...far closer than a straight-line interpolation would be.
        expect(Math.abs(interp.flowRate(18) - trueFlow)).toBeLessThan(
            Math.abs(linear - trueFlow) / 20,
        );
    });

    it("round-trips exactly at a calibrated temperature", () => {
        const row = ROWS[1]; // 20 °C
        const interp = new GeometricInterpolator(buildStore(ROWS));
        for (const massTarget of [2, 5, 10, 30]) {
            const t = interp.solveMotorTime({ massTarget, temperature: row.T });
            // Deliver against the SAME physics the calibration came from.
            const delivered = t * row.flow + dripAt(t, row.L, row.tau);
            expect(delivered).toBeCloseTo(massTarget, 5);
        }
    });

    it("produces longer motor times for larger targets (monotonic)", () => {
        const interp = new GeometricInterpolator(buildStore(ROWS));
        const t2 = interp.solveMotorTime({ massTarget: 2, temperature: 22 });
        const t5 = interp.solveMotorTime({ massTarget: 5, temperature: 22 });
        const t30 = interp.solveMotorTime({ massTarget: 30, temperature: 22 });
        expect(t2).toBeLessThan(t5);
        expect(t5).toBeLessThan(t30);
    });

    it("converges in few iterations (returns a finite positive time)", () => {
        const interp = new GeometricInterpolator(buildStore(ROWS));
        const t = interp.solveMotorTime({ massTarget: 5, temperature: 25 });
        expect(t).toBeGreaterThan(0);
        expect(Number.isFinite(t)).toBe(true);
    });

    it("extrapolates flow beyond the band by extending the end slope in log-space", () => {
        const interp = new GeometricInterpolator(buildStore(ROWS));
        // Below the band: continue the FIRST log-space segment's slope.
        const lowSlope = Math.log(20.0 / 15.5) / (20 - 10);
        expect(interp.flowRate(-5)).toBeCloseTo(
            Math.exp(Math.log(15.5) + (-5 - 10) * lowSlope),
            6,
        );
        // Above the band: continue the LAST log-space segment's slope.
        const highSlope = Math.log(29.0 / 20.0) / (35 - 20);
        expect(interp.flowRate(80)).toBeCloseTo(
            Math.exp(Math.log(29.0) + (80 - 35) * highSlope),
            6,
        );
        // The tails follow the trend (not a flat clamp): colder dips below the
        // coldest sample, hotter rises above the hottest.
        expect(interp.flowRate(-5)).toBeLessThan(15.5);
        expect(interp.flowRate(80)).toBeGreaterThan(29.0);
    });

    it("throws TargetBelowDrip for an unachievable (drip-dominated) target", () => {
        // A pathological calibration where drip nearly equals the calibration mass:
        // a tiny target then sits at/under the drip floor.
        const store = buildStore([
            { T: 10, flow: 0.5, L: 40, tau: 0.05 },
            { T: 20, flow: 0.5, L: 40, tau: 0.05 },
        ]);
        const interp = new GeometricInterpolator(store);
        expect(() => interp.solveMotorTime({ massTarget: 0.001, temperature: 15 })).toThrow(
            TargetBelowDripError,
        );
    });
});

describe("LinearInterpolator", () => {
    it("recovers the steady flow at calibrated temperatures", () => {
        const interp = new LinearInterpolator(buildStore(ROWS));
        expect(interp.flowRate(10)).toBeCloseTo(15.5, 6);
        expect(interp.flowRate(20)).toBeCloseTo(20.0, 6);
        expect(interp.flowRate(35)).toBeCloseTo(29.0, 6);
    });

    it("is exact at calibrated points but less accurate than geometric between them", () => {
        const store = EXP_STORE();
        const geo = new GeometricInterpolator(store);
        const lin = new LinearInterpolator(store);

        const trueFlow = EXP_FLOW(18);
        const geoErr = Math.abs(geo.flowRate(18) - trueFlow);
        const linErr = Math.abs(lin.flowRate(18) - trueFlow);

        // Linear over an exponential overshoots; geometric essentially lands on it.
        expect(linErr).toBeGreaterThan(geoErr);
        expect(geoErr).toBeLessThan(linErr / 20);
    });

    it("round-trips exactly at a calibrated temperature", () => {
        const row = ROWS[1]; // 20 °C
        const interp = new LinearInterpolator(buildStore(ROWS));
        for (const massTarget of [2, 5, 10, 30]) {
            const t = interp.solveMotorTime({ massTarget, temperature: row.T });
            const delivered = t * row.flow + dripAt(t, row.L, row.tau);
            expect(delivered).toBeCloseTo(massTarget, 5);
        }
    });
});

describe("ArrheniusInterpolator", () => {
    it("recovers the steady flow at calibrated temperatures", () => {
        const interp = new ArrheniusInterpolator(buildStore(ROWS));
        expect(interp.flowRate(10)).toBeCloseTo(15.5, 6);
        expect(interp.flowRate(20)).toBeCloseTo(20.0, 6);
        expect(interp.flowRate(35)).toBeCloseTo(29.0, 6);
    });

    it("sits between geometric and linear in accuracy on exponential data", () => {
        const store = EXP_STORE();
        const geo = new GeometricInterpolator(store);
        const arr = new ArrheniusInterpolator(store);
        const lin = new LinearInterpolator(store);

        const trueFlow = EXP_FLOW(18);
        const geoErr = Math.abs(geo.flowRate(18) - trueFlow);
        const arrErr = Math.abs(arr.flowRate(18) - trueFlow);
        const linErr = Math.abs(lin.flowRate(18) - trueFlow);

        // Geometric is exact here (flow is exp in Celsius); Arrhenius (exp in 1/T)
        // is a hair off but still far tighter than a straight line.
        expect(geoErr).toBeLessThan(arrErr);
        expect(arrErr).toBeLessThan(linErr / 4);
    });

    it("round-trips exactly at a calibrated temperature", () => {
        const row = ROWS[1]; // 20 °C
        const interp = new ArrheniusInterpolator(buildStore(ROWS));
        for (const massTarget of [2, 5, 10, 30]) {
            const t = interp.solveMotorTime({ massTarget, temperature: row.T });
            const delivered = t * row.flow + dripAt(t, row.L, row.tau);
            expect(delivered).toBeCloseTo(massTarget, 5);
        }
    });
});

describe("interpolator registry", () => {
    it("builds each strategy by key, tagging it with that key", () => {
        const store = buildStore(ROWS);
        expect(createInterpolator("geometric", store).key).toBe("geometric");
        expect(createInterpolator("linear", store).key).toBe("linear");
    });

    it("lists an entry for every key, with geometric recommended as the best", () => {
        expect(INTERPOLATOR_LIST.map((e) => e.key)).toEqual([...INTERPOLATOR_KEYS]);
        const recommended = INTERPOLATOR_LIST.filter((e) => e.recommended);
        expect(recommended).toHaveLength(1);
        expect(recommended[0].key).toBe("geometric");
    });
});
