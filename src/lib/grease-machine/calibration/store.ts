import type { Calibration } from "../types";
import { PULSE_REGIMES } from "../types";

/**
 * In-memory calibration store. Keeps points sorted by temperature (then regime)
 * — the ascending-temperature invariant the interpolator relies on — and is
 * serialized to / from a flat JSON array. Persistence (localStorage, a file, an
 * API) is the caller's concern via toJSON / fromJSON, keeping the lib portable.
 */
export class CalibrationStore implements Calibration.Store {
    private _points: Calibration.Point[] = [];

    get points(): readonly Calibration.Point[] {
        return this._points;
    }

    addPoint(point: Calibration.Point): void {
        this._points.push({ ...point });
        this._points.sort(
            (a, b) => a.temperature - b.temperature || a.regime.localeCompare(b.regime),
        );
    }

    clear(): void {
        this._points = [];
    }

    completeTemperatures(): number[] {
        const byTemp = new Map<number, Set<Calibration.Regime>>();
        for (const p of this._points) {
            const regimes = byTemp.get(p.temperature) ?? new Set<Calibration.Regime>();
            regimes.add(p.regime);
            byTemp.set(p.temperature, regimes);
        }
        const complete: number[] = [];
        for (const [temperature, regimes] of byTemp) {
            if (PULSE_REGIMES.every((r) => regimes.has(r))) complete.push(temperature);
        }
        return complete.sort((a, b) => a - b);
    }

    isReady(): boolean {
        return this.completeTemperatures().length >= 2;
    }

    toJSON(): Calibration.StoreJson {
        return this._points.map((p) => ({ ...p }));
    }

    static fromJSON(json: Calibration.StoreJson): CalibrationStore {
        const store = new CalibrationStore();
        for (const p of json) store.addPoint(p);
        return store;
    }
}
