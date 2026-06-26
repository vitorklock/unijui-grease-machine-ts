"use client";

import { useEffect, useState } from "react";

/**
 * Memoized chart-scenario results, keyed by a string that encodes the inputs
 * (oil + interpolator). Scenarios are deterministic for a given key, so caching
 * is safe and means the ~0.5 s in-browser compute is paid ONCE per config —
 * not again on React StrictMode's dev double-invoke, nor every time a tab is
 * re-opened (radix Tabs unmount inactive content and would otherwise recompute).
 */
const cache = new Map<string, Promise<unknown>>();

/**
 * Run `run()` once per `key` and return its result (null until ready). Logs the
 * elapsed compute time so you can see, in the console, whether a chart is slow
 * because of compute (a big number here) or the recharts draw-in animation.
 */
export function useChartData<T>(key: string, run: () => Promise<T>): T | null {
  const [data, setData] = useState<T | null>(null);

  useEffect(() => {
    let active = true;
    let promise = cache.get(key) as Promise<T> | undefined;
    if (!promise) {
      const t0 = performance.now();
      console.log(`⏱ [${key}] computing…`);
      promise = run().then((result) => {
        console.log(`⏱ [${key}] done in ${(performance.now() - t0).toFixed(1)} ms`);
        return result;
      });
      cache.set(key, promise);
    } else {
      console.log(`⏱ [${key}] cached`);
    }
    promise.then((result) => {
      if (active) setData(result);
    });
    return () => {
      active = false;
    };
    // `run` is recreated each render but `key` fully encodes its inputs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return data;
}
