import { describe, expect, it } from "vitest";
import { dripAt, fitLoading } from "./loading";

describe("dripAt", () => {
    it("is 0 at t=0 and approaches the limit for long pulses", () => {
        expect(dripAt(0, 5, 0.7)).toBe(0);
        expect(dripAt(100, 5, 0.7)).toBeCloseTo(5, 6);
    });

    it("increases monotonically with pulse duration", () => {
        const a = dripAt(0.2, 5, 0.7);
        const b = dripAt(0.5, 5, 0.7);
        const c = dripAt(1.5, 5, 0.7);
        expect(a).toBeLessThan(b);
        expect(b).toBeLessThan(c);
    });
});

describe("fitLoading", () => {
    it("recovers the (L, τ) that generated the two anchors", () => {
        const L = 5;
        const tau = 0.7;
        const t1 = 0.25;
        const t2 = 1.5;
        const d1 = dripAt(t1, L, tau);
        const d2 = dripAt(t2, L, tau);

        const fit = fitLoading(t1, d1, t2, d2);
        expect(fit.dripLimit).toBeCloseTo(L, 4);
        expect(fit.tauLoad).toBeCloseTo(tau, 4);

        // And the fitted curve reproduces the anchors.
        expect(dripAt(t1, fit.dripLimit, fit.tauLoad)).toBeCloseTo(d1, 6);
        expect(dripAt(t2, fit.dripLimit, fit.tauLoad)).toBeCloseTo(d2, 6);
    });

    it("recovers parameters regardless of anchor order", () => {
        const fit = fitLoading(1.5, dripAt(1.5, 7, 0.9), 0.3, dripAt(0.3, 7, 0.9));
        expect(fit.dripLimit).toBeCloseTo(7, 4);
        expect(fit.tauLoad).toBeCloseTo(0.9, 4);
    });

    it("falls back to a near-linear curve for non-concave anchors", () => {
        // drip proportional to duration (ratio == k) cannot be a concave load.
        const fit = fitLoading(0.5, 1, 1.0, 2);
        expect(fit.tauLoad).toBeGreaterThan(100);
        expect(dripAt(1.0, fit.dripLimit, fit.tauLoad)).toBeCloseTo(2, 4);
    });
});
