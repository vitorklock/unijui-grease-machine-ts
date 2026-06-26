"use client";

import { memo, useMemo } from "react";
import {
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Scatter,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { buildModels, CalibrationStore, createInterpolator } from "@/lib/grease-machine";
import { useTranslation } from "@/i18n";
import { useMachine } from "../machine-context";
import { RunConfig } from "./run-config";

/**
 * Visualizes the LIVE calibration store: the measured flow at each calibrated
 * temperature (dots) overlaid on the flow curve the selected interpolator draws
 * between them (line). Reads only `points` + `interpolatorKey` (both stable) and
 * is memoized, so it does NOT re-render on the 12x/sec live-scale tick.
 */
export const CalibrationFitChart = memo(function CalibrationFitChart() {
  const { points, interpolatorKey } = useMachine();
  const { t } = useTranslation();

  const data = useMemo(() => {
    const store = new CalibrationStore();
    for (const p of points) store.addPoint(p);
    const models = buildModels(store);
    if (models.length < 2) return null; // interpolation needs >= 2 complete temps

    const interp = createInterpolator(interpolatorKey, store);
    const temps = models.map((m) => m.temperature);
    const maxT = Math.max(...temps);
    // Fixed, generous window so the predicted curve reads well regardless of
    // where the calibration points sit: a static -10 °C floor up to 30 °C past
    // the hottest calibration point. Outside the calibrated band the
    // interpolators extrapolate (extend the end-segment trend in their own
    // space), so these tails show the model's real prediction, not a flat clamp.
    const lowT = -10;
    const highT = maxT + 30;
    const steps = 80;
    const flowByTemp = new Map(models.map((m) => [m.temperature, m.flow]));

    const sweep = Array.from(
      { length: steps + 1 },
      (_, i) => lowT + ((highT - lowT) * i) / steps,
    );
    // Include the exact calibration temps so the curve passes through the
    // breakpoints and the clamp kinks render crisply.
    const allTemps = Array.from(new Set([...sweep, ...temps])).sort((a, b) => a - b);

    const series = allTemps.map((temperature) => ({
      temperature,
      flowInterp: interp.flowRate(temperature),
      flowMeasured: flowByTemp.get(temperature) ?? null,
    }));

    return { series, domain: [lowT, highT] as [number, number] };
  }, [points, interpolatorKey]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t.calibrate.fitTitle}</CardTitle>
        <CardDescription>{t.calibrate.fitSubtitle}</CardDescription>
        <RunConfig />
      </CardHeader>
      <CardContent>
        {!data ? (
          <p className="text-sm text-muted-foreground">{t.calibrate.fitHint}</p>
        ) : (
          <>
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={data.series} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis
                    dataKey="temperature"
                    type="number"
                    domain={data.domain}
                    tickFormatter={(v) => `${Number(v).toFixed(0)}°`}
                    stroke="var(--muted-foreground)"
                    fontSize={12}
                  />
                  <YAxis
                    stroke="var(--muted-foreground)"
                    fontSize={12}
                    domain={["auto", "auto"]}
                    tickFormatter={(v) => Number(v).toFixed(2)}
                    label={{
                      value: t.calibrate.fitFlowUnit,
                      angle: -90,
                      position: "insideLeft",
                      fontSize: 12,
                    }}
                  />
                  <Tooltip
                    formatter={(value, name) => [`${Number(value).toFixed(3)} g/s`, name]}
                    labelFormatter={(v) => `${Number(v).toFixed(1)} °C`}
                    contentStyle={{
                      background: "var(--popover)",
                      border: "1px solid var(--border)",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="flowInterp"
                    name={t.calibrate.fitInterpLegend}
                    stroke="var(--chart-1)"
                    strokeWidth={2}
                    dot={false}
                    isAnimationActive={false}
                  />
                  <Scatter
                    dataKey="flowMeasured"
                    name={t.calibrate.fitMeasuredLegend}
                    fill="var(--chart-5)"
                    isAnimationActive={false}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>

            <div className="mt-3 flex flex-wrap gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="h-0.5 w-3.5 rounded-full" style={{ background: "var(--chart-1)" }} />
                {t.calibrate.fitInterpLegend}
              </span>
              <span className="flex items-center gap-1.5">
                <span className="size-2.5 rounded-full" style={{ background: "var(--chart-5)" }} />
                {t.calibrate.fitMeasuredLegend}
              </span>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
});
