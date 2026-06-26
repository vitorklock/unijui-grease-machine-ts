import { describe, expect, it } from "vitest";
import { GreasePhysicsModel } from "./physics";

describe("GreasePhysicsModel", () => {
    const physics = new GreasePhysicsModel();

    it("flow rises with temperature", () => {
        expect(physics.flowRate(10)).toBeLessThan(physics.flowRate(20));
        expect(physics.flowRate(20)).toBeLessThan(physics.flowRate(35));
    });

    it("steady drip limit falls with temperature", () => {
        expect(physics.dripLimit(10)).toBeGreaterThan(physics.dripLimit(20));
        expect(physics.dripLimit(20)).toBeGreaterThan(physics.dripLimit(35));
    });

    it("drip grows with pulse duration toward the limit", () => {
        const short = physics.drip(20, 5);
        const long = physics.drip(20, 50);
        expect(physics.drip(20, 0)).toBe(0);
        expect(short).toBeLessThan(long);
        expect(long).toBeLessThan(physics.dripLimit(20));
        expect(physics.drip(20, 10000)).toBeCloseTo(physics.dripLimit(20), 5);
    });

    it("lands in a plausible thin-oil regime at the reference temperature", () => {
        // Micro-dosing pump (~0.2 g/s): a multi-gram pulse runs tens of seconds.
        expect(physics.flowRate(20)).toBeCloseTo(0.2, 6);
        const shortRun = 5 / physics.flowRate(20); // run to deliver 5 g while running
        const longRun = 30 / physics.flowRate(20);
        expect(shortRun).toBeGreaterThan(10);
        expect(shortRun).toBeLessThan(60);
        expect(longRun).toBeGreaterThan(60);
        expect(longRun).toBeLessThan(300);
    });

    it("drip settling is shorter when warmer", () => {
        expect(physics.dripSettlingDuration(10)).toBeGreaterThan(
            physics.dripSettlingDuration(35),
        );
    });
});
