"use client";

import { Loader2 } from "lucide-react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
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
import { useTranslation } from "@/i18n";
import { runCalibrationScenario } from "@/simulation";
import { useMachine } from "../machine-context";
import { RunConfig } from "./run-config";
import { useChartData } from "./use-chart-data";

export function CalibrationCurves() {
  const { t } = useTranslation();
  const { oil, interpolatorKey } = useMachine();
  const data = useChartData(`Curves · ${oil.id} · ${interpolatorKey}`, () =>
    runCalibrationScenario(undefined, { physics: oil.physics, interpolatorKey }),
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t.curves.title}</CardTitle>
        <CardDescription>
          {t.curves.subtitle((data?.temperatures ?? [10, 20, 35]).join(", "))}
        </CardDescription>
        <RunConfig />
      </CardHeader>
      <CardContent>
        {!data ? (
          <div className="flex h-80 items-center justify-center text-muted-foreground">
            <Loader2 className="size-5 animate-spin" />
          </div>
        ) : (
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.curve} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis
                  dataKey="temperature"
                  tickFormatter={(t) => `${Number(t).toFixed(0)}°`}
                  stroke="var(--muted-foreground)"
                  fontSize={12}
                />
                <YAxis
                  yAxisId="flow"
                  stroke="var(--chart-1)"
                  fontSize={12}
                  tickFormatter={(v) => Number(v).toFixed(0)}
                />
                <YAxis
                  yAxisId="drip"
                  orientation="right"
                  stroke="var(--chart-3)"
                  fontSize={12}
                  tickFormatter={(v) => Number(v).toFixed(1)}
                />
                <Tooltip
                  formatter={(value, name) => [Number(value).toFixed(2), name]}
                  labelFormatter={(temp) => `${Number(temp).toFixed(1)} °C`}
                  contentStyle={{
                    background: "var(--popover)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                {data.temperatures.map((temp) => (
                  <ReferenceLine
                    key={temp}
                    x={temp}
                    yAxisId="flow"
                    stroke="var(--muted-foreground)"
                    strokeDasharray="2 4"
                  />
                ))}
                <Line
                  yAxisId="flow"
                  type="monotone"
                  dataKey="flow"
                  name={t.curves.flowLegend}
                  stroke="var(--chart-1)"
                  dot={false}
                  strokeWidth={2}
                  isAnimationActive={false}
                />
                <Line
                  yAxisId="drip"
                  type="monotone"
                  dataKey="dripShort"
                  name={t.curves.dripShortLegend}
                  stroke="var(--chart-2)"
                  dot={false}
                  strokeWidth={2}
                  isAnimationActive={false}
                />
                <Line
                  yAxisId="drip"
                  type="monotone"
                  dataKey="dripLong"
                  name={t.curves.dripLongLegend}
                  stroke="var(--chart-3)"
                  dot={false}
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
        <div className="mt-3 flex flex-wrap gap-4 text-xs text-muted-foreground">
          <Swatch color="var(--chart-1)" label={t.curves.flowLegend} />
          <Swatch color="var(--chart-2)" label={t.curves.dripShortLegend} />
          <Swatch color="var(--chart-3)" label={t.curves.dripLongLegend} />
        </div>
      </CardContent>
    </Card>
  );
}

function Swatch({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className="size-2.5 rounded-full" style={{ background: color }} />
      {label}
    </span>
  );
}
