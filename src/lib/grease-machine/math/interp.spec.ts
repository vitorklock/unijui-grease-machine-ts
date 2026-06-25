import { describe, expect, it } from "vitest";
import { interp1d } from "./interp";

describe("interp1d", () => {
    const xs = [10, 20, 35];
    const ys = [15, 20, 28];

    it("returns exact sample values at the nodes", () => {
        expect(interp1d(10, xs, ys)).toBe(15);
        expect(interp1d(20, xs, ys)).toBe(20);
        expect(interp1d(35, xs, ys)).toBe(28);
    });

    it("interpolates linearly between nodes", () => {
        // Midpoint of [10,20] -> midpoint of [15,20].
        expect(interp1d(15, xs, ys)).toBeCloseTo(17.5, 10);
        // 25 is 1/3 of the way from 20 to 35 -> 20 + (1/3)*(28-20).
        expect(interp1d(25, xs, ys)).toBeCloseTo(20 + (5 / 15) * 8, 10);
    });

    it("clamps below the first and above the last node (no extrapolation)", () => {
        expect(interp1d(-100, xs, ys)).toBe(15);
        expect(interp1d(1000, xs, ys)).toBe(28);
    });

    it("handles a single sample by returning it everywhere", () => {
        expect(interp1d(5, [20], [42])).toBe(42);
        expect(interp1d(50, [20], [42])).toBe(42);
    });

    it("throws on empty or mismatched arrays", () => {
        expect(() => interp1d(1, [], [])).toThrow();
        expect(() => interp1d(1, [1, 2], [1])).toThrow();
    });
});
