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
import { useTranslation } from "@/i18n";
import { runCompareScenario, type CompareScenarioResult } from "@/simulation";

/** Pulse mass both dispensers target, in grams. */
const MASS_TARGET_G = 10;
/** Temperature the legacy fixed-time dispenser was calibrated at, in °C. */
const FIXED_CALIBRATION_TEMP_C = 25;

export function CompareChart() {
  const { t } = useTranslation();
  const [data, setData] = useState<CompareScenarioResult | null>(null);

  useEffect(() => {
    let active = true;
    runCompareScenario(MASS_TARGET_G, FIXED_CALIBRATION_TEMP_C).then((r) => {
      if (active) setData(r);
    });
    return () => {
      active = false;
    };
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t.compare.title}</CardTitle>
        <CardDescription>
          {t.compare.subtitle(
            data?.massTarget ?? MASS_TARGET_G,
            data?.fixedCalibrationTemp ?? FIXED_CALIBRATION_TEMP_C,
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!data ? (
          <div className="flex h-80 items-center justify-center text-muted-foreground">
            <Loader2 className="size-5 animate-spin" />
          </div>
        ) : (
          <>
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.rows} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis
                    dataKey="temperature"
                    tickFormatter={(temp) => `${temp}°`}
                    stroke="var(--muted-foreground)"
                    fontSize={12}
                  />
                  <YAxis
                    stroke="var(--muted-foreground)"
                    fontSize={12}
                    tickFormatter={(v) => `${Number(v).toFixed(0)}g`}
                    domain={[0, "auto"]}
                  />
                  <ReferenceLine
                    y={data.massTarget}
                    stroke="var(--muted-foreground)"
                    strokeDasharray="4 4"
                    label={{ value: t.compare.target, fontSize: 11, position: "insideTopRight" }}
                  />
                  <Tooltip
                    formatter={(value, name) => [`${Number(value).toFixed(2)} g`, name]}
                    labelFormatter={(temp) => `${temp} °C`}
                    contentStyle={{
                      background: "var(--popover)",
                      border: "1px solid var(--border)",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="fixed"
                    name={t.compare.colFixed}
                    stroke="var(--chart-5)"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="compensated"
                    name={t.compare.compensated}
                    stroke="var(--chart-1)"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="mt-3 flex flex-wrap gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="size-2.5 rounded-full" style={{ background: "var(--chart-1)" }} />
                {t.compare.compensated}
              </span>
              <span className="flex items-center gap-1.5">
                <span className="size-2.5 rounded-full" style={{ background: "var(--chart-5)" }} />
                {t.compare.fixedAt(data.fixedCalibrationTemp)}
              </span>
            </div>

            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm tabular-nums">
                <thead>
                  <tr className="border-b text-left text-xs text-muted-foreground">
                    <th className="py-2 pr-3 font-medium">{t.compare.colTemp}</th>
                    <th className="py-2 pr-3 text-right font-medium">{t.compare.colCompensated}</th>
                    <th className="py-2 pr-3 text-right font-medium">{t.compare.colFixed}</th>
                    <th className="py-2 text-right font-medium">{t.compare.colFixedError}</th>
                  </tr>
                </thead>
                <tbody>
                  {data.rows.map((r) => (
                    <tr key={r.temperature} className="border-b last:border-0">
                      <td className="py-1.5 pr-3">{r.temperature} °C</td>
                      <td className="py-1.5 pr-3 text-right">{r.compensated.toFixed(2)} g</td>
                      <td className="py-1.5 pr-3 text-right">{r.fixed.toFixed(2)} g</td>
                      <td className="py-1.5 text-right">{r.fixedErrorPct.toFixed(1)} %</td>
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
