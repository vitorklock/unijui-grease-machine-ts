import { describe, expect, it } from "vitest";
import { TARGET_LONG_G, TARGET_SHORT_G } from "../consts";
import { InsufficientCalibrationError, TargetBelowDripError } from "../errors";
import { dripAt } from "../math/loading";
import type { Calibration } from "../types";
import { CalibrationStore } from "./store";
import { Interpolator } from "./interpolator";

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

describe("Interpolator", () => {
    it("requires at least two complete temperatures", () => {
        const store = new CalibrationStore();
        store.addPoint({ temperature: 20, regime: "SHORT", calTarget: 5, motorOnTime: 0.25, drip: 1.5 });
        store.addPoint({ temperature: 20, regime: "LONG", calTarget: 30, motorOnTime: 1.5, drip: 4.4 });
        // Only one complete temperature.
        expect(() => new Interpolator(store)).toThrow(InsufficientCalibrationError);
    });

    it("recovers the steady flow at calibrated temperatures", () => {
        const interp = new Interpolator(buildStore(ROWS));
        expect(interp.flowRate(10)).toBeCloseTo(15.5, 6);
        expect(interp.flowRate(20)).toBeCloseTo(20.0, 6);
        expect(interp.flowRate(35)).toBeCloseTo(29.0, 6);
    });

    it("round-trips exactly at a calibrated temperature", () => {
        const row = ROWS[1]; // 20 °C
        const interp = new Interpolator(buildStore(ROWS));
        for (const massTarget of [2, 5, 10, 30]) {
            const t = interp.solveMotorTime({ massTarget, temperature: row.T });
            // Deliver against the SAME physics the calibration came from.
            const delivered = t * row.flow + dripAt(t, row.L, row.tau);
            expect(delivered).toBeCloseTo(massTarget, 5);
        }
    });

    it("produces longer motor times for larger targets (monotonic)", () => {
        const interp = new Interpolator(buildStore(ROWS));
        const t2 = interp.solveMotorTime({ massTarget: 2, temperature: 22 });
        const t5 = interp.solveMotorTime({ massTarget: 5, temperature: 22 });
        const t30 = interp.solveMotorTime({ massTarget: 30, temperature: 22 });
        expect(t2).toBeLessThan(t5);
        expect(t5).toBeLessThan(t30);
    });

    it("converges in few iterations (returns a finite positive time)", () => {
        const interp = new Interpolator(buildStore(ROWS));
        const t = interp.solveMotorTime({ massTarget: 5, temperature: 25 });
        expect(t).toBeGreaterThan(0);
        expect(Number.isFinite(t)).toBe(true);
    });

    it("clamps flow below/above the calibrated temperature band", () => {
        const interp = new Interpolator(buildStore(ROWS));
        expect(interp.flowRate(-5)).toBeCloseTo(15.5, 6); // clamp to coldest
        expect(interp.flowRate(80)).toBeCloseTo(29.0, 6); // clamp to hottest
    });

    it("throws TargetBelowDrip for an unachievable (drip-dominated) target", () => {
        // A pathological calibration where drip nearly equals the calibration mass:
        // a tiny target then sits at/under the drip floor.
        const store = buildStore([
            { T: 10, flow: 0.5, L: 40, tau: 0.05 },
            { T: 20, flow: 0.5, L: 40, tau: 0.05 },
        ]);
        const interp = new Interpolator(store);
        expect(() => interp.solveMotorTime({ massTarget: 0.001, temperature: 15 })).toThrow(
            TargetBelowDripError,
        );
    });
});
