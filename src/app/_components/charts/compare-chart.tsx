"use client";

import { useMemo } from "react";
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
import { cn } from "@/lib/utils";
import { runCompareScenario, type CompareScenarioResult } from "@/simulation";
import { useMachine } from "../machine-context";
import { RunConfig } from "./run-config";
import { useChartData } from "./use-chart-data";

/** Pulse mass every dispenser targets, in grams. */
const MASS_TARGET_G = 10;
/** Temperature the legacy fixed-time dispenser was calibrated at, in °C. */
const FIXED_CALIBRATION_TEMP_C = 25;

/** Selected strategy is solid cyan; the rest are muted, exactly like the oil chart. */
function lineStyle(selected: boolean) {
  return {
    stroke: selected ? "var(--chart-1)" : "var(--muted-foreground)",
    strokeWidth: selected ? 2.5 : 1.25,
    strokeOpacity: selected ? 1 : 0.4,
  };
}

const TOOLTIP_STYLE = {
  background: "var(--popover)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  fontSize: 12,
} as const;

export function CompareChart() {
  const { t } = useTranslation();
  const { oil, interpolatorKey } = useMachine();
  const data = useChartData(`Compare · ${oil.id}`, () =>
    runCompareScenario(MASS_TARGET_G, FIXED_CALIBRATION_TEMP_C, undefined, undefined, {
      physics: oil.physics,
    }),
  );

  // Pivot the tidy per-strategy series into the flat rows recharts wants: one row
  // per swept temperature, with a column per interpolator key (+ fixed-time).
  const gramsData = useMemo(() => {
    if (!data) return [];
    return data.sweepTemps.map((temperature, i) => {
      const row: Record<string, number> = {
        temperature,
        fixed: data.fixed.sweep[i].delivered,
      };
      for (const s of data.interpolators) row[s.key] = s.sweep[i].delivered;
      return row;
    });
  }, [data]);

  const errorData = useMemo(() => {
    if (!data) return [];
    return data.sweepTemps.map((temperature, i) => {
      const row: Record<string, number> = { temperature };
      for (const s of data.interpolators) row[s.key] = s.sweep[i].errorPct;
      return row;
    });
  }, [data]);

  if (!data) {
    return (
      <Card>
        <CardContent className="flex h-80 items-center justify-center text-muted-foreground">
          <Loader2 className="size-5 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  const name = (key: CompareScenarioResult["bestKey"]) => t.interpolator.names[key];

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>{t.compare.title}</CardTitle>
          <CardDescription>
            {t.compare.subtitle(data.massTarget, data.fixedCalibrationTemp)}
          </CardDescription>
          <RunConfig interpolator={false} />
        </CardHeader>
        <CardContent>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={gramsData} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis
                  dataKey="temperature"
                  type="number"
                  domain={["dataMin", "dataMax"]}
                  tickFormatter={(temp) => `${Number(temp).toFixed(0)}°`}
                  stroke="var(--muted-foreground)"
                  fontSize={12}
                />
                <YAxis
                  stroke="var(--muted-foreground)"
                  fontSize={12}
                  tickFormatter={(v) => `${Number(v).toFixed(0)}g`}
                  domain={["auto", "auto"]}
                />
                <ReferenceLine
                  y={data.massTarget}
                  stroke="var(--muted-foreground)"
                  strokeDasharray="4 4"
                  label={{ value: t.compare.target, fontSize: 11, position: "insideTopRight" }}
                />
                <Tooltip
                  cursor={{ stroke: "var(--border)" }}
                  content={<ChartTooltip unit="g" digits={2} highlightKey={interpolatorKey} />}
                />
                <Line
                  type="monotone"
                  dataKey="fixed"
                  name={t.compare.fixedAt(data.fixedCalibrationTemp)}
                  stroke="var(--chart-5)"
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive={false}
                />
                {data.interpolators.map((s) => (
                  <Line
                    key={s.key}
                    type="monotone"
                    dataKey={s.key}
                    name={name(s.key)}
                    dot={false}
                    isAnimationActive={false}
                    {...lineStyle(s.key === interpolatorKey)}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>

          <Legend
            data={data}
            interpolatorKey={interpolatorKey}
            name={name}
            fixedLabel={t.compare.fixedAt(data.fixedCalibrationTemp)}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t.compare.errorTitle}</CardTitle>
          <CardDescription>{t.compare.errorSubtitle}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={errorData} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis
                  dataKey="temperature"
                  type="number"
                  domain={["dataMin", "dataMax"]}
                  tickFormatter={(temp) => `${Number(temp).toFixed(0)}°`}
                  stroke="var(--muted-foreground)"
                  fontSize={12}
                />
                <YAxis
                  stroke="var(--muted-foreground)"
                  fontSize={12}
                  tickFormatter={(v) => `${Number(v).toFixed(1)}%`}
                  domain={["auto", "auto"]}
                />
                <ReferenceLine
                  y={0}
                  stroke="var(--muted-foreground)"
                  strokeDasharray="4 4"
                  label={{ value: t.compare.perfect, fontSize: 11, position: "insideTopRight" }}
                />
                <Tooltip
                  cursor={{ stroke: "var(--border)" }}
                  content={<ChartTooltip unit="%" digits={3} highlightKey={interpolatorKey} />}
                />
                {data.interpolators.map((s) => (
                  <Line
                    key={s.key}
                    type="monotone"
                    dataKey={s.key}
                    name={name(s.key)}
                    dot={false}
                    isAnimationActive={false}
                    {...lineStyle(s.key === interpolatorKey)}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm tabular-nums">
              <thead>
                <tr className="border-b text-left text-xs text-muted-foreground">
                  <th className="py-2 pr-3 font-medium">{t.compare.colTemp}</th>
                  {data.interpolators.map((s) => (
                    <th key={s.key} className="py-2 pr-3 text-right font-medium">
                      {name(s.key)}
                    </th>
                  ))}
                  <th className="py-2 text-right font-medium">{t.compare.colFixedError}</th>
                </tr>
              </thead>
              <tbody>
                {data.temps.map((temperature, i) => (
                  <tr key={temperature} className="border-b last:border-0">
                    <td className="py-1.5 pr-3">{temperature} °C</td>
                    {data.interpolators.map((s) => (
                      <td
                        key={s.key}
                        className={cn(
                          "py-1.5 pr-3 text-right",
                          s.key === interpolatorKey && "font-medium text-foreground",
                        )}
                      >
                        {s.rows[i].errorPct.toFixed(2)} %
                      </td>
                    ))}
                    <td className="py-1.5 text-right">
                      {data.fixed.rows[i].errorPct.toFixed(1)} %
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/** One series row in the hover tooltip: swatch + name + value. */
interface TooltipItem {
  dataKey?: string | number;
  name?: string;
  value?: number | string;
  color?: string;
  stroke?: string;
}

/**
 * Shared hover tooltip for both compare charts: the temperature, then a colored
 * swatch, the strategy name, and its value for every line — with the selected
 * strategy emphasized. (recharts' default content wasn't surfacing the names.)
 */
function ChartTooltip({
  active,
  label,
  payload,
  unit,
  digits,
  highlightKey,
}: {
  active?: boolean;
  label?: number | string;
  payload?: TooltipItem[];
  unit: string;
  digits: number;
  highlightKey: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ ...TOOLTIP_STYLE, padding: "8px 10px" }} className="min-w-36 shadow-md">
      <div className="mb-1.5 font-medium text-foreground">{Number(label).toFixed(1)} °C</div>
      <ul className="flex flex-col gap-1">
        {payload.map((item) => {
          const selected = String(item.dataKey) === highlightKey;
          return (
            <li key={String(item.dataKey)} className="flex items-center gap-2">
              <span
                className="size-2 shrink-0 rounded-full"
                style={{ background: item.color ?? item.stroke }}
              />
              <span
                className={cn(
                  "text-muted-foreground",
                  selected && "font-medium text-foreground",
                )}
              >
                {item.name}
              </span>
              <span className="ml-auto pl-3 font-medium tabular-nums text-foreground">
                {Number(item.value).toFixed(digits)} {unit}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function Legend({
  data,
  interpolatorKey,
  name,
  fixedLabel,
}: {
  data: CompareScenarioResult;
  interpolatorKey: CompareScenarioResult["bestKey"];
  name: (key: CompareScenarioResult["bestKey"]) => string;
  fixedLabel: string;
}) {
  const { t } = useTranslation();
  return (
    <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
      {data.interpolators.map((s) => {
        const selected = s.key === interpolatorKey;
        return (
          <span key={s.key} className="flex items-center gap-1.5">
            <span
              className="size-2.5 rounded-full"
              style={{
                background: selected ? "var(--chart-1)" : "var(--muted-foreground)",
                opacity: selected ? 1 : 0.4,
              }}
            />
            <span className={cn(selected && "font-medium text-foreground")}>{name(s.key)}</span>
            <span className="text-muted-foreground">
              {t.compare.meanError(s.meanAbsErrorPct.toFixed(2))}
            </span>
          </span>
        );
      })}
      <span className="flex items-center gap-1.5">
        <span className="size-2.5 rounded-full" style={{ background: "var(--chart-5)" }} />
        {fixedLabel}
      </span>
    </div>
  );
}
