import { describe, expect, it } from "vitest";
import { Interpolator } from "@/lib/grease-machine";
import { GreaseMachineSimulation } from "./grease-machine-simulation";
import { calibrate } from "./scenarios/calibration-scenario";
import { runAccuracyScenario, runCompareScenario } from "./scenarios";

describe("GreaseMachineSimulation", () => {
    it("calibrates to a ready store with plausible flow", async () => {
        const sim = new GreaseMachineSimulation();
        await calibrate(sim, [10, 20, 35]);

        expect(sim.store.isReady()).toBe(true);
        expect(sim.store.completeTemperatures()).toEqual([10, 20, 35]);

        const interp = new Interpolator(sim.store);
        expect(interp.flowRate(20)).toBeCloseTo(20, 1);
        expect(interp.flowRate(10)).toBeLessThan(interp.flowRate(35));
    });

    it("dispenses within a small, consistent error at calibrated and intermediate temps", async () => {
        const sim = new GreaseMachineSimulation();
        await calibrate(sim, [10, 20, 35]);
        const interp = new Interpolator(sim.store);

        for (const temperature of [20, 25]) {
            for (const massTarget of [2, 5, 10, 30]) {
                const t = interp.solveMotorTime({ massTarget, temperature });
                const delivered =
                    t * sim.physics.flowRate(temperature) + sim.physics.drip(temperature, t);
                const errorPct = Math.abs((delivered - massTarget) / massTarget) * 100;
                expect(errorPct).toBeLessThan(3);
            }
        }
    });

    it("full device path: an automatic pulse delivers ~target after settling", async () => {
        const sim = new GreaseMachineSimulation();
        await calibrate(sim, [10, 20, 35]);
        sim.setTemperature(25);
        sim.resetContainer();

        const auto = sim.controller("automatic");
        const result = await auto.dispense(5);
        await sim.clock.sleep(sim.physics.dripSettlingDuration(25) + 1);
        const delivered = sim.scale.readWeight();

        expect(result.motorOnTime).toBeGreaterThan(0);
        expect(Math.abs(delivered - 5)).toBeLessThan(0.25);
    });

    it("manual controller drives the motor directly", () => {
        const sim = new GreaseMachineSimulation();
        const manual = sim.controller("manual");
        expect(manual.isRunning()).toBe(false);
        manual.motorOn();
        expect(manual.isRunning()).toBe(true);
        manual.motorOff();
        expect(manual.isRunning()).toBe(false);
    });
});

describe("scenarios", () => {
    it("accuracy scenario reports a small, roughly constant error band", async () => {
        const result = await runAccuracyScenario(25);
        expect(result.results).toHaveLength(4);
        for (const row of result.results) {
            expect(Math.abs(row.errorPct)).toBeLessThan(3);
        }
    });

    it("compare scenario: compensated beats fixed-time across temperature", async () => {
        const result = await runCompareScenario(5, 25);
        const coldest = result.rows[0];
        const hottest = result.rows[result.rows.length - 1];

        // Fixed-time dispenser swings hard with temperature...
        expect(Math.abs(coldest.fixedErrorPct)).toBeGreaterThan(10);
        expect(Math.abs(hottest.fixedErrorPct)).toBeGreaterThan(10);
        // ...while the compensated controller stays tight everywhere.
        for (const row of result.rows) {
            expect(Math.abs(row.compensatedErrorPct)).toBeLessThan(3);
        }
    });
});
