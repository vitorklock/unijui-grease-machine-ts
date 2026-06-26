"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
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
import { runAccuracyScenario, type AccuracyScenarioResult } from "@/simulation";

export function AccuracyChart() {
  const { t } = useTranslation();
  const [data, setData] = useState<AccuracyScenarioResult | null>(null);

  useEffect(() => {
    let active = true;
    runAccuracyScenario(25).then((r) => {
      if (active) setData(r);
    });
    return () => {
      active = false;
    };
  }, []);

  const chartData =
    data?.results.map((r) => ({
      label: `${r.massTarget} g`,
      errorPct: r.errorPct,
    })) ?? [];

  const meanAbs =
    data && data.results.length > 0
      ? data.results.reduce((a, r) => a + Math.abs(r.errorPct), 0) / data.results.length
      : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t.accuracy.title}</CardTitle>
        <CardDescription>{t.accuracy.subtitle(meanAbs.toFixed(2))}</CardDescription>
      </CardHeader>
      <CardContent>
        {!data ? (
          <div className="flex h-72 items-center justify-center text-muted-foreground">
            <Loader2 className="size-5 animate-spin" />
          </div>
        ) : (
          <>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="label" stroke="var(--muted-foreground)" fontSize={12} />
                  <YAxis
                    stroke="var(--muted-foreground)"
                    fontSize={12}
                    tickFormatter={(v) => `${Number(v).toFixed(1)}%`}
                  />
                  <ReferenceLine y={0} stroke="var(--muted-foreground)" />
                  <Tooltip
                    formatter={(value) => [`${Number(value).toFixed(3)} %`, t.accuracy.error]}
                    contentStyle={{
                      background: "var(--popover)",
                      border: "1px solid var(--border)",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                  />
                  <Bar dataKey="errorPct" radius={[4, 4, 0, 0]}>
                    {chartData.map((d) => (
                      <Cell
                        key={d.label}
                        fill={d.errorPct < 0 ? "var(--chart-2)" : "var(--chart-1)"}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm tabular-nums">
                <thead>
                  <tr className="border-b text-left text-xs text-muted-foreground">
                    <th className="py-2 pr-3 font-medium">{t.accuracy.colTarget}</th>
                    <th className="py-2 pr-3 text-right font-medium">{t.accuracy.colMotorTime}</th>
                    <th className="py-2 pr-3 text-right font-medium">{t.accuracy.colDelivered}</th>
                    <th className="py-2 pr-3 text-right font-medium">{t.accuracy.colError}</th>
                    <th className="py-2 text-right font-medium">{t.accuracy.colErrorPct}</th>
                  </tr>
                </thead>
                <tbody>
                  {data.results.map((r) => (
                    <tr key={r.massTarget} className="border-b last:border-0">
                      <td className="py-1.5 pr-3">{r.massTarget} g</td>
                      <td className="py-1.5 pr-3 text-right">{r.motorOnTime.toFixed(3)} s</td>
                      <td className="py-1.5 pr-3 text-right">{r.delivered.toFixed(3)} g</td>
                      <td className="py-1.5 pr-3 text-right">{r.errorAbs.toFixed(3)} g</td>
                      <td className="py-1.5 text-right">{r.errorPct.toFixed(2)} %</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
