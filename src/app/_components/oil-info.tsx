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
import { useTranslation } from "@/i18n";
import { useMachine } from "./machine-context";

export function OilInfo() {
  const { oil, oils } = useMachine();
  const { t } = useTranslation();
  const p = oil.physics;

  const description =
    t.oilDescriptions[oil.id as keyof typeof t.oilDescriptions] ?? oil.description;

  // Overlay every oil on a shared axis so the magnitudes and slopes differ
  // visibly; the selected oil is highlighted.
  const viscosityData = oil.viscosity.map((point, i) => {
    const row: Record<string, number> = { temperature: point.temperature };
    for (const o of oils) row[o.id] = o.viscosity[i].kinematic;
    return row;
  });

  const stats: { label: string; value: string }[] = [
    { label: t.oil.density, value: `${oil.density.toFixed(3)} g/cm³` },
    { label: t.oil.flowAt(p.referenceTemp), value: `${p.baseFlow.toFixed(2)} g/s` },
    { label: t.oil.flowSensitivity, value: `${(p.flowCoeff * 100).toFixed(1)} %/°C` },
    { label: t.oil.dripLimit, value: `${p.baseDripLimit.toFixed(2)} g` },
    { label: t.oil.fillTime, value: `${p.baseTauLoad.toFixed(0)} s` },
    { label: t.oil.settleTime, value: `${p.baseSettle.toFixed(0)} s` },
  ];

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
      <Card>
        <CardHeader>
          <CardTitle className="flex flex-wrap items-center gap-2">
            {oil.grade}
            <Badge variant={oil.sourced ? "default" : "secondary"}>
              {oil.sourced ? t.oil.sourced : t.oil.derived}
            </Badge>
          </CardTitle>
          <CardDescription>{oil.name}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">{description}</p>

          <div className="grid grid-cols-2 gap-3">
            {stats.map((stat) => (
              <div key={stat.label} className="rounded-lg border p-3">
                <div className="text-xs text-muted-foreground">{stat.label}</div>
                <div className="font-mono text-base tabular-nums">{stat.value}</div>
              </div>
            ))}
          </div>

          <p className="text-xs text-muted-foreground">{t.oil.sourceLabel(oil.source)}</p>
          <p className="text-xs text-muted-foreground">{t.oil.switchNote}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t.oil.viscosityTitle}</CardTitle>
          <CardDescription>{t.oil.viscositySubtitle}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={viscosityData} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
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
                  label={{
                    value: t.oil.viscosityUnit,
                    angle: -90,
                    position: "insideLeft",
                    fontSize: 12,
                  }}
                />
                <Tooltip
                  formatter={(value, name) => [
                    `${Number(value).toFixed(1)} ${t.oil.viscosityUnit}`,
                    name,
                  ]}
                  labelFormatter={(temp) => `${temp} °C`}
                  contentStyle={{
                    background: "var(--popover)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                {oils.map((o) => {
                  const selected = o.id === oil.id;
                  return (
                    <Line
                      key={o.id}
                      type="monotone"
                      dataKey={o.id}
                      name={o.grade}
                      stroke={selected ? "var(--chart-1)" : "var(--muted-foreground)"}
                      strokeWidth={selected ? 2.5 : 1}
                      strokeOpacity={selected ? 1 : 0.35}
                      dot={selected ? { r: 3 } : false}
                      isAnimationActive={false}
                    />
                  );
                })}
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-sm tabular-nums">
              <thead>
                <tr className="border-b text-left text-xs text-muted-foreground">
                  <th className="py-1.5 pr-3 font-medium">{t.calibrate.colTemp}</th>
                  {oil.viscosity.map((v) => (
                    <th key={v.temperature} className="py-1.5 pr-3 text-right font-medium">
                      {v.temperature}°
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="py-1.5 pr-3 text-muted-foreground">{t.oil.viscosityUnit}</td>
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
