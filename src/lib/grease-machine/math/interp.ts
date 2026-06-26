/**
 * Piecewise-linear interpolation. `xs` must be ascending and the same length as
 * `ys`. Inside [xs[0], xs[n-1]] it matches numpy.interp exactly.
 *
 * Outside the range the tail behaviour is selectable:
 *  - `extrapolate: false` (default) — clamp to the nearest endpoint value (the
 *    numpy.interp default).
 *  - `extrapolate: true` — continue the nearest boundary SEGMENT's slope, so the
 *    line extends tangent to the curve (C1 at the seam — value and slope match,
 *    no kink). With a single sample there is no slope to extend, so it clamps
 *    regardless.
 */
export function interp1d(
    x: number,
    xs: readonly number[],
    ys: readonly number[],
    { extrapolate = false }: { extrapolate?: boolean } = {},
): number {
    const n = xs.length;
    if (n === 0) throw new Error("interp1d: empty sample arrays");
    if (n !== ys.length) throw new Error("interp1d: xs and ys length mismatch");

    if (x <= xs[0]) {
        if (!extrapolate || n < 2) return ys[0];
        // Extend the first segment's slope below the range.
        return ys[0] + ((x - xs[0]) * (ys[1] - ys[0])) / (xs[1] - xs[0]);
    }
    if (x >= xs[n - 1]) {
        if (!extrapolate || n < 2) return ys[n - 1];
        // Extend the last segment's slope above the range.
        return (
            ys[n - 1] +
            ((x - xs[n - 1]) * (ys[n - 1] - ys[n - 2])) / (xs[n - 1] - xs[n - 2])
        );
    }

    // Find the bracketing interval [xs[lo], xs[hi]] with xs[lo] <= x < xs[hi].
    let hi = 1;
    while (hi < n - 1 && xs[hi] < x) hi++;
    const lo = hi - 1;

    const x0 = xs[lo];
    const x1 = xs[hi];
    if (x1 === x0) return ys[lo];

    const t = (x - x0) / (x1 - x0);
    return ys[lo] + t * (ys[hi] - ys[lo]);
}
