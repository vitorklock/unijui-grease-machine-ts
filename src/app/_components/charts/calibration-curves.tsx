"use client";

import { useEffect, useState } from "react";
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
import { runCalibrationScenario, type CalibrationScenarioResult } from "@/simulation";

export function CalibrationCurves() {
  const [data, setData] = useState<CalibrationScenarioResult | null>(null);

  useEffect(() => {
    let active = true;
    runCalibrationScenario().then((r) => {
      if (active) setData(r);
    });
    return () => {
      active = false;
    };
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Calibration curves</CardTitle>
        <CardDescription>
          Standard calibration at {data?.temperatures.join(", ") ?? "10, 20, 35"} °C.
          Flow rises with temperature while drip falls — and a long pulse always
          drips more than a short one.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!data ? (
          <Loading />
        ) : (
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.curve} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis
                  dataKey="temperature"
                  tickFormatter={(t: number) => `${t.toFixed(0)}°`}
                  stroke="var(--muted-foreground)"
                  fontSize={12}
                />
                <YAxis
                  yAxisId="flow"
                  stroke="var(--chart-1)"
                  fontSize={12}
                  tickFormatter={(v: number) => v.toFixed(0)}
                  label={{ value: "flow (g/s)", angle: -90, position: "insideLeft", fontSize: 12 }}
                />
                <YAxis
                  yAxisId="drip"
                  orientation="right"
                  stroke="var(--chart-3)"
                  fontSize={12}
                  tickFormatter={(v: number) => v.toFixed(1)}
                  label={{ value: "drip (g)", angle: 90, position: "insideRight", fontSize: 12 }}
                />
                <Tooltip
                  formatter={(value, name) => [Number(value).toFixed(2), name]}
                  labelFormatter={(t) => `${Number(t).toFixed(1)} °C`}
                  contentStyle={{
                    background: "var(--popover)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                {data.temperatures.map((t) => (
                  <ReferenceLine
                    key={t}
                    x={t}
                    yAxisId="flow"
                    stroke="var(--muted-foreground)"
                    strokeDasharray="2 4"
                  />
                ))}
                <Line
                  yAxisId="flow"
                  type="monotone"
                  dataKey="flow"
                  name="flow"
                  stroke="var(--chart-1)"
                  dot={false}
                  strokeWidth={2}
                />
                <Line
                  yAxisId="drip"
                  type="monotone"
                  dataKey="dripShort"
                  name="drip (short pulse)"
                  stroke="var(--chart-2)"
                  dot={false}
                  strokeWidth={2}
                />
                <Line
                  yAxisId="drip"
                  type="monotone"
                  dataKey="dripLong"
                  name="drip (long pulse)"
                  stroke="var(--chart-3)"
                  dot={false}
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
        <Legend />
      </CardContent>
    </Card>
  );
}

function Legend() {
  return (
    <div className="mt-3 flex flex-wrap gap-4 text-xs text-muted-foreground">
      <Swatch color="var(--chart-1)" label="flow (g/s)" />
      <Swatch color="var(--chart-2)" label="drip, short pulse (g)" />
      <Swatch color="var(--chart-3)" label="drip, long pulse (g)" />
    </div>
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

function Loading() {
  return (
    <div className="flex h-80 items-center justify-center text-muted-foreground">
      <Loader2 className="size-5 animate-spin" />
    </div>
  );
}
