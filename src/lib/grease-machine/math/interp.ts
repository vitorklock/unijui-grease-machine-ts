/**
 * Piecewise-linear interpolation with endpoint clamping (no extrapolation),
 * matching the behaviour of numpy.interp. `xs` must be ascending and the same
 * length as `ys`. Below the first / above the last sample, the nearest endpoint
 * value is returned.
 */
export function interp1d(
    x: number,
    xs: readonly number[],
    ys: readonly number[],
): number {
    const n = xs.length;
    if (n === 0) throw new Error("interp1d: empty sample arrays");
    if (n !== ys.length) throw new Error("interp1d: xs and ys length mismatch");

    if (x <= xs[0]) return ys[0];
    if (x >= xs[n - 1]) return ys[n - 1];

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
