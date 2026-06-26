/**
 * Exports a reproducible dump of everything the simulator/model produces — all
 * oils, all interpolators, calibration points, physics ground-truth curves,
 * interpolation accuracy, device pulse runs across temperatures, and the
 * compensated-vs-fixed comparison — as structured JSON (paper-data/) plus tidy,
 * long-format CSV (paper-data/csv/) ready to plot the paper's figures from.
 *
 * Run: `pnpm script export-paper-data`
 *
 * Deterministic: the sim runs on an instant ManualClock, so output is byte-stable
 * except `manifest.generatedAt`. Each oil is calibrated ONCE and the store reused
 * across interpolators.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

import {
    buildModels,
    createInterpolator,
    INTERPOLATOR_LIST,
    POLL_S,
    STABILIZATION_TIMEOUT_S,
    STABLE_TOLERANCE_G,
    STABLE_WINDOW_S,
    TARGET_LONG_G,
    TARGET_SHORT_G,
} from "@/lib/grease-machine";
import type { Interpolator } from "@/lib/grease-machine";
import {
    calibrate,
    DEFAULT_CALIBRATION_TEMPS,
    GreaseMachineSimulation,
    GreasePhysicsModel,
    OIL_PROFILE_LIST,
    runCompareScenario,
    type CompareScenarioResult,
} from "@/simulation";

const OUT_DIR = resolve(process.cwd(), "paper-data");
const CSV_DIR = resolve(OUT_DIR, "csv");

/** Inclusive numeric range [min, max] with the given step. */
function range(min: number, max: number, step: number): number[] {
    const out: number[] = [];
    for (let v = min; v <= max + 1e-9; v += step) out.push(Number(v.toFixed(6)));
    return out;
}

/** All knobs in one place — tweak and re-run to regenerate the figures' data. */
const CONFIG = {
    /** Temperatures the machine is calibrated at (both SHORT + LONG pulses each). */
    calibrationTemps: DEFAULT_CALIBRATION_TEMPS,
    /** Fine grid for the physics ground-truth curves, in °C. */
    physicsGridC: range(0, 40, 1),
    /** Fine grid for the interpolated curves (within the calibrated band), in °C. */
    interpolationGridC: range(
        Math.min(...DEFAULT_CALIBRATION_TEMPS),
        Math.max(...DEFAULT_CALIBRATION_TEMPS),
        1,
    ),
    /** Intermediate temperatures (between calibration points) for the accuracy figure. */
    accuracyTempsC: [18, 25, 31],
    /** Pulse masses for the accuracy figure, in grams. */
    accuracyTargetsG: [2, 5, 10, 30],
    /** Operational grid for the pulse-run table, in °C. */
    pulseTempsC: range(10, 40, 5),
    /** Pulse masses for the pulse-run table, in grams. */
    pulseTargetsG: [2, 5, 10, 30],
    /** Representative short/long pulse durations the drip curves are sampled at, in s. */
    shortRefPulseS: 10,
    longRefPulseS: 150,
    /** Compensated-vs-fixed comparison settings. */
    compare: { massTargetG: 10, fixedCalibrationTempC: 25 },
};

const r6 = (n: number) => Number(n.toFixed(6));

const summary: { file: string; rows?: number; kind: "json" | "csv" }[] = [];

function writeJson(name: string, data: unknown): void {
    writeFileSync(resolve(OUT_DIR, name), `${JSON.stringify(data, null, 2)}\n`);
    summary.push({ file: name, kind: "json" });
}

function cell(value: unknown): string {
    if (value === null || value === undefined) return "";
    if (typeof value === "number") return Number.isFinite(value) ? String(r6(value)) : "";
    const s = String(value);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function writeCsv(name: string, columns: string[], rows: Record<string, unknown>[]): void {
    const head = columns.join(",");
    const body = rows.map((row) => columns.map((c) => cell(row[c])).join(",")).join("\n");
    writeFileSync(resolve(CSV_DIR, name), `${head}\n${body}\n`);
    summary.push({ file: `csv/${name}`, rows: rows.length, kind: "csv" });
}

interface DispenseRow {
    target: number;
    motorOnTime: number | null;
    estimatedDrip: number | null;
    delivered: number | null;
    errorAbs: number | null;
    errorPct: number | null;
    error?: string;
}

/**
 * What the compensated controller does for one pulse: interpolate the calibration
 * to solve the motor on-time, then let the physics deliver. `delivered` is the
 * physics ground truth (identical to the app's pulse-log) — the interpolation
 * residual is the error.
 */
function dispense(
    physics: GreasePhysicsModel,
    interp: Interpolator,
    temperature: number,
    target: number,
): DispenseRow {
    try {
        const motorOnTime = interp.solveMotorTime({ massTarget: target, temperature });
        const estimatedDrip = interp.drip(temperature, motorOnTime);
        const delivered =
            physics.flowRate(temperature) * motorOnTime + physics.drip(temperature, motorOnTime);
        const errorAbs = delivered - target;
        return {
            target,
            motorOnTime,
            estimatedDrip,
            delivered,
            errorAbs,
            errorPct: (errorAbs / target) * 100,
        };
    } catch (e) {
        return {
            target,
            motorOnTime: null,
            estimatedDrip: null,
            delivered: null,
            errorAbs: null,
            errorPct: null,
            error: e instanceof Error ? e.message : String(e),
        };
    }
}

export default async function exportPaperData(): Promise<void> {
    mkdirSync(CSV_DIR, { recursive: true });

    // Calibrate each oil once; reuse the store across every interpolator.
    const bundles = [];
    for (const oil of OIL_PROFILE_LIST) {
        const sim = new GreaseMachineSimulation({ physics: oil.physics });
        await calibrate(sim, CONFIG.calibrationTemps);
        bundles.push({
            oil,
            physics: sim.physics,
            points: sim.store.points.map((p) => ({ ...p })),
            models: buildModels(sim.store),
            interps: INTERPOLATOR_LIST.map((e) => ({
                key: e.key,
                interp: createInterpolator(e.key, sim.store),
            })),
        });
    }

    // ---- oils + viscosity ------------------------------------------------------
    writeJson("oils.json", OIL_PROFILE_LIST);
    writeCsv(
        "oils.csv",
        ["oil", "grade", "name", "sourced", "density", "baseFlow", "referenceTemp", "flowCoeff", "baseDripLimit", "dripCoeff", "baseTauLoad", "baseSettle"],
        OIL_PROFILE_LIST.map((o) => ({
            oil: o.id,
            grade: o.grade,
            name: o.name,
            sourced: o.sourced ? 1 : 0,
            density: o.density,
            ...o.physics,
        })),
    );
    writeCsv(
        "viscosity.csv",
        ["oil", "temperature", "kinematic"],
        OIL_PROFILE_LIST.flatMap((o) =>
            o.viscosity.map((v) => ({ oil: o.id, temperature: v.temperature, kinematic: v.kinematic })),
        ),
    );

    // ---- physics ground-truth curves ------------------------------------------
    const physicsCurves = bundles.map(({ oil, physics }) => ({
        id: oil.id,
        grade: oil.grade,
        curve: CONFIG.physicsGridC.map((temperature) => ({
            temperature,
            flow: physics.flowRate(temperature),
            dripLimit: physics.dripLimit(temperature),
            tauLoad: physics.tauLoad(temperature),
            settlingDuration: physics.dripSettlingDuration(temperature),
            dripShort: physics.drip(temperature, CONFIG.shortRefPulseS),
            dripLong: physics.drip(temperature, CONFIG.longRefPulseS),
        })),
    }));
    writeJson("physics-curves.json", physicsCurves);
    writeCsv(
        "physics-curves.csv",
        ["oil", "temperature", "flow", "dripLimit", "tauLoad", "settlingDuration", "dripShort", "dripLong"],
        physicsCurves.flatMap((o) => o.curve.map((c) => ({ oil: o.id, ...c }))),
    );

    // ---- calibration points + fitted models -----------------------------------
    const calibration = bundles.map(({ oil, points, models }) => ({
        id: oil.id,
        grade: oil.grade,
        calibrationTemps: CONFIG.calibrationTemps,
        points: points.map((p) => ({ ...p, flow: p.calTarget / p.motorOnTime })),
        models,
    }));
    writeJson("calibration.json", calibration);
    writeCsv(
        "calibration-points.csv",
        ["oil", "temperature", "regime", "calTarget", "motorOnTime", "flow", "drip"],
        calibration.flatMap((o) => o.points.map((p) => ({ oil: o.id, ...p }))),
    );
    writeCsv(
        "calibration-models.csv",
        ["oil", "temperature", "flow", "dripLimit", "tauLoad"],
        calibration.flatMap((o) => o.models.map((m) => ({ oil: o.id, ...m }))),
    );

    // ---- interpolated curves, per strategy ------------------------------------
    const interpolation = bundles.map(({ oil, interps }) => ({
        id: oil.id,
        grade: oil.grade,
        interpolators: interps.map(({ key, interp }) => ({
            key,
            curve: CONFIG.interpolationGridC.map((temperature) => ({
                temperature,
                flow: interp.flowRate(temperature),
                dripShort: interp.drip(temperature, CONFIG.shortRefPulseS),
                dripLong: interp.drip(temperature, CONFIG.longRefPulseS),
            })),
        })),
    }));
    writeJson("interpolation.json", interpolation);
    writeCsv(
        "interpolation-curves.csv",
        ["oil", "interpolator", "temperature", "flow", "dripShort", "dripLong"],
        interpolation.flatMap((o) =>
            o.interpolators.flatMap((s) => s.curve.map((c) => ({ oil: o.id, interpolator: s.key, ...c }))),
        ),
    );

    // ---- interpolation accuracy at intermediate temperatures ------------------
    const accuracy = bundles.map(({ oil, physics, interps }) => ({
        id: oil.id,
        grade: oil.grade,
        interpolators: interps.map(({ key, interp }) => ({
            key,
            temps: CONFIG.accuracyTempsC.map((temperature) => {
                const results = CONFIG.accuracyTargetsG.map((t) => dispense(physics, interp, temperature, t));
                const valid = results.filter((r) => r.errorPct !== null);
                const meanAbsErrorPct = valid.length
                    ? valid.reduce((a, r) => a + Math.abs(r.errorPct as number), 0) / valid.length
                    : null;
                return { temperature, meanAbsErrorPct, results };
            }),
        })),
    }));
    writeJson("accuracy.json", accuracy);
    writeCsv(
        "accuracy.csv",
        ["oil", "interpolator", "temperature", "target", "motorOnTime", "estimatedDrip", "delivered", "errorAbs", "errorPct"],
        accuracy.flatMap((o) =>
            o.interpolators.flatMap((s) =>
                s.temps.flatMap((tp) =>
                    tp.results.map((r) => ({ oil: o.id, interpolator: s.key, temperature: tp.temperature, ...r })),
                ),
            ),
        ),
    );

    // ---- device pulse runs across the operational grid ------------------------
    const pulseRuns = bundles.map(({ oil, physics, interps }) => ({
        id: oil.id,
        grade: oil.grade,
        interpolators: interps.map(({ key, interp }) => ({
            key,
            runs: CONFIG.pulseTempsC.flatMap((temperature) =>
                CONFIG.pulseTargetsG.map((t) => {
                    const d = dispense(physics, interp, temperature, t);
                    return {
                        temperature,
                        target: d.target,
                        motorOnTime: d.motorOnTime,
                        estimatedDrip: d.estimatedDrip,
                        delivered: d.delivered,
                        miss: d.errorAbs,
                        errorPct: d.errorPct,
                        ...(d.error ? { error: d.error } : {}),
                    };
                }),
            ),
        })),
    }));
    writeJson("pulse-runs.json", pulseRuns);
    writeCsv(
        "pulse-runs.csv",
        ["oil", "interpolator", "temperature", "target", "motorOnTime", "estimatedDrip", "delivered", "miss", "errorPct"],
        pulseRuns.flatMap((o) =>
            o.interpolators.flatMap((s) =>
                s.runs.map((run) => ({ oil: o.id, interpolator: s.key, ...run })),
            ),
        ),
    );

    // ---- compensated vs fixed-time --------------------------------------------
    const compare: { id: string; grade: string; result: CompareScenarioResult }[] = [];
    for (const { oil } of bundles) {
        const result = await runCompareScenario(
            CONFIG.compare.massTargetG,
            CONFIG.compare.fixedCalibrationTempC,
            undefined,
            CONFIG.calibrationTemps,
            { physics: oil.physics },
        );
        compare.push({ id: oil.id, grade: oil.grade, result });
    }
    writeJson("compare.json", compare);
    writeCsv(
        "compare-sweep.csv",
        ["oil", "series", "temperature", "delivered", "errorPct"],
        compare.flatMap(({ id, result }) => [
            ...result.fixed.sweep.map((p) => ({ oil: id, series: "fixed", temperature: p.temperature, delivered: p.delivered, errorPct: p.errorPct })),
            ...result.interpolators.flatMap((s) =>
                s.sweep.map((p) => ({ oil: id, series: s.key, temperature: p.temperature, delivered: p.delivered, errorPct: p.errorPct })),
            ),
        ]),
    );
    writeCsv(
        "compare-summary.csv",
        ["oil", "interpolator", "meanAbsErrorPct", "best"],
        compare.flatMap(({ id, result }) =>
            result.interpolators.map((s) => ({
                oil: id,
                interpolator: s.key,
                meanAbsErrorPct: s.meanAbsErrorPct,
                best: s.key === result.bestKey ? 1 : 0,
            })),
        ),
    );

    // ---- manifest (written last so it can list every file) --------------------
    writeJson("manifest.json", {
        generatedAt: new Date().toISOString(),
        description: "Grease-machine simulation data export for the paper.",
        config: CONFIG,
        constants: {
            TARGET_SHORT_G,
            TARGET_LONG_G,
            STABLE_TOLERANCE_G,
            STABLE_WINDOW_S,
            STABILIZATION_TIMEOUT_S,
            POLL_S,
        },
        interpolators: INTERPOLATOR_LIST.map((e) => ({
            key: e.key,
            label: e.label,
            description: e.description,
            recommended: Boolean(e.recommended),
        })),
        oils: OIL_PROFILE_LIST.map((o) => ({ id: o.id, grade: o.grade, name: o.name, sourced: o.sourced })),
        files: summary,
    });

    // ---- console summary -------------------------------------------------------
    console.log(`\nWrote ${summary.length} files to ${OUT_DIR}`);
    for (const s of summary) {
        console.log(`  ${s.file}${s.rows !== undefined ? `  (${s.rows} rows)` : ""}`);
    }
}
