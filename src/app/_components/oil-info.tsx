"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useMachine } from "./machine-context";

export function OilInfo() {
  const { oil } = useMachine();
  const p = oil.physics;

  const stats: { label: string; value: string }[] = [
    { label: "Density (15 °C)", value: `${oil.density.toFixed(3)} g/cm³` },
    { label: `Flow @ ${p.referenceTemp} °C`, value: `${p.baseFlow.toFixed(2)} g/s` },
    { label: "Flow sensitivity", value: `${(p.flowCoeff * 100).toFixed(1)} %/°C` },
    { label: "Drip limit", value: `${p.baseDripLimit.toFixed(2)} g` },
    { label: "Line fill time", value: `${p.baseTauLoad.toFixed(0)} s` },
    { label: "Drip settle time", value: `${p.baseSettle.toFixed(0)} s` },
  ];

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
      <Card>
        <CardHeader>
          <CardTitle className="flex flex-wrap items-center gap-2">
            {oil.grade}
            <Badge variant={oil.sourced ? "default" : "secondary"}>
              {oil.sourced ? "sourced" : "derived"}
            </Badge>
          </CardTitle>
          <CardDescription>{oil.name}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">{oil.description}</p>

          <div className="grid grid-cols-2 gap-3">
            {stats.map((s) => (
              <div key={s.label} className="rounded-lg border p-3">
                <div className="text-xs text-muted-foreground">{s.label}</div>
                <div className="font-mono text-base tabular-nums">{s.value}</div>
              </div>
            ))}
          </div>

          <p className="text-xs text-muted-foreground">
            Source: {oil.source}
          </p>
          <p className="text-xs text-muted-foreground">
            Switching oil rebuilds the machine and clears calibration — a different
            fluid means a different flow and drip, so it must be recalibrated.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Kinematic viscosity</CardTitle>
          <CardDescription>
            How thin the oil is across temperature (cSt). The steep drop is what
            makes temperature compensation necessary.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={oil.viscosity} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis
                  dataKey="temperature"
                  tickFormatter={(t) => `${t}°`}
                  stroke="var(--muted-foreground)"
                  fontSize={12}
                />
                <YAxis
                  stroke="var(--muted-foreground)"
                  fontSize={12}
                  tickFormatter={(v) => `${Number(v).toFixed(0)}`}
                  label={{ value: "cSt", angle: -90, position: "insideLeft", fontSize: 12 }}
                />
                <Tooltip
                  formatter={(value) => [`${Number(value).toFixed(1)} cSt`, "viscosity"]}
                  labelFormatter={(t) => `${t} °C`}
                  contentStyle={{
                    background: "var(--popover)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="kinematic"
                  name="viscosity"
                  stroke="var(--chart-3)"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-sm tabular-nums">
              <thead>
                <tr className="border-b text-left text-xs text-muted-foreground">
                  <th className="py-1.5 pr-3 font-medium">Temp</th>
                  {oil.viscosity.map((v) => (
                    <th key={v.temperature} className="py-1.5 pr-3 text-right font-medium">
                      {v.temperature}°
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="py-1.5 pr-3 text-muted-foreground">cSt</td>
                  {oil.viscosity.map((v) => (
                    <td key={v.temperature} className="py-1.5 pr-3 text-right">
                      {v.kinematic.toFixed(0)}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
