/**
 * Drip loading model.
 *
 * As a pulse runs, the fluid column charges and the residual drip approaches a
 * temperature-dependent limit. We model that loading as
 *
 *     drip(t) = dripLimit · (1 − exp(−t / tauLoad))
 *
 * Two calibration durations (a short and a long pulse) at one temperature give
 * two (pulseDuration, drip) anchors, which uniquely fix dripLimit and tauLoad.
 * Recovering the curve (rather than linearly interpolating between the two
 * anchors) is what keeps short-pulse dispensing precise: a linear chord across a
 * concave loading curve mis-estimates drip by several percent.
 */

/** Evaluate drip(t) = L · (1 − exp(−t / τ)) for a single pulse duration. */
export function dripAt(
    pulseDuration: number,
    dripLimit: number,
    tauLoad: number,
): number {
    if (tauLoad <= 0) return dripLimit;
    if (pulseDuration <= 0) return 0;
    return dripLimit * (1 - Math.exp(-pulseDuration / tauLoad));
}

export interface LoadingFit {
    /** dripLimit (L) — steady-state drip as the pulse grows long. */
    dripLimit: number;
    /** tauLoad (τ) — loading time constant. */
    tauLoad: number;
}

/**
 * Recover (dripLimit, tauLoad) of the loading curve from two
 * (pulseDuration, drip) anchors. Falls back to a near-linear curve (very large
 * τ, anchored at the longer pulse) when the anchors do not describe a concave
 * loading curve (e.g. noisy or degenerate calibration).
 */
export function fitLoading(
    pulseA: number,
    dripA: number,
    pulseB: number,
    dripB: number,
): LoadingFit {
    // Order so t1 < t2.
    let t1 = pulseA;
    let d1 = dripA;
    let t2 = pulseB;
    let d2 = dripB;
    if (t1 > t2) {
        [t1, d1, t2, d2] = [t2, d2, t1, d1];
    }

    const linearFallback = (): LoadingFit => {
        const tau = 1e6;
        const dripLimit = d2 / (1 - Math.exp(-t2 / tau));
        return { dripLimit, tauLoad: tau };
    };

    if (t1 <= 0 || t2 <= t1 || d1 <= 0 || d2 <= d1) return linearFallback();

    const ratio = d2 / d1; // > 1
    const k = t2 / t1; // > 1
    // A concave loading curve requires drip to grow slower than the duration:
    // ratio < k. Otherwise the data is ~linear (or convex) — fall back.
    if (ratio >= k) return linearFallback();

    // Solve g(a) = (1 − a^k) / (1 − a) = ratio for a = exp(−t1/τ) ∈ (0, 1).
    // g is increasing from 1 (a→0) to k (a→1), so a unique root exists.
    const g = (a: number) => (1 - Math.pow(a, k)) / (1 - a);
    let lo = 1e-12;
    let hi = 1 - 1e-12;
    for (let i = 0; i < 200; i++) {
        const mid = 0.5 * (lo + hi);
        if (g(mid) > ratio) hi = mid;
        else lo = mid;
    }
    const a = 0.5 * (lo + hi);
    const tauLoad = -t1 / Math.log(a);
    const dripLimit = d1 / (1 - a);
    return { dripLimit, tauLoad };
}
