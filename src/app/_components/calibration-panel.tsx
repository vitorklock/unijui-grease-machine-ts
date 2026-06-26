"use client";

import { useState } from "react";
import { Loader2, Thermometer, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTranslation } from "@/i18n";
import { CalibrationFitChart } from "./charts/calibration-fit-chart";
import { useMachine, useSnapshot } from "./machine-context";

const QUICK_TEMPS = [10, 20, 28, 35, 40];

/** Rows shown before the list collapses behind a "View all" toggle. */
const POINTS_LIMIT = 7;

export function CalibrationPanel() {
  const m = useMachine();
  const snapshot = useSnapshot();
  const { t } = useTranslation();
  const [temp, setTemp] = useState(10);
  const [showAll, setShowAll] = useState(false);

  const total = m.points.length;
  const collapsed = total > POINTS_LIMIT && !showAll;
  const visiblePoints = collapsed ? m.points.slice(0, POINTS_LIMIT) : m.points;

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_1.3fr]">
      <Card className="self-start">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Thermometer className="size-4" /> {t.calibrate.runTitle}
          </CardTitle>
          <CardDescription>{t.calibrate.runSubtitle}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="grid gap-1.5">
            <Label htmlFor="cal-temp">{t.calibrate.temperature}</Label>
            <Input
              id="cal-temp"
              type="number"
              min={-10}
              max={60}
              value={temp}
              onChange={(e) => setTemp(Number(e.target.value) || 0)}
            />
          </div>

          <div className="flex flex-wrap gap-2">
            {QUICK_TEMPS.map((value) => (
              <Button
                key={value}
                variant="outline"
                size="sm"
                onClick={() => setTemp(value)}
              >
                {value} °C
              </Button>
            ))}
          </div>

          <Button onClick={() => m.calibrateAt(temp)} disabled={m.calibrating}>
            {m.calibrating ? (
              <>
                <Loader2 className="size-4 animate-spin" /> {t.calibrate.calibrating}
              </>
            ) : (
              t.calibrate.calibrateAt(temp)
            )}
          </Button>

          <div className="flex items-center gap-2">
            <Badge variant={snapshot.ready ? "default" : "outline"}>
              {snapshot.ready ? t.calibrate.ready : t.calibrate.notReady}
            </Badge>
            <span className="text-xs text-muted-foreground">
              {t.calibrate.completeTemps(snapshot.completeTemperatures.length)}
            </span>
          </div>

          <p className="text-xs text-muted-foreground">{t.calibrate.hint}</p>

          {m.points.length > 0 ? (
            <Button variant="ghost" size="sm" onClick={m.clearCalibration}>
              <Trash2 className="size-4" /> {t.calibrate.clearCalibration}
            </Button>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {t.calibrate.pointsTitle}
            {total > 0 ? (
              <Badge variant="secondary" className="font-normal tabular-nums">
                {total}
              </Badge>
            ) : null}
          </CardTitle>
          <CardDescription>{t.calibrate.pointsStored(total)}</CardDescription>
        </CardHeader>
        <CardContent>
          {total === 0 ? (
            <p className="text-sm text-muted-foreground">{t.calibrate.noPoints}</p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-xs text-muted-foreground">
                      <th className="py-2 pr-3 font-medium">{t.calibrate.colTemp}</th>
                      <th className="py-2 pr-3 font-medium">{t.calibrate.colRegime}</th>
                      <th className="py-2 pr-3 text-right font-medium">{t.calibrate.colCalMass}</th>
                      <th className="py-2 pr-3 text-right font-medium">{t.calibrate.colMotorTime}</th>
                      <th className="py-2 pr-3 text-right font-medium">{t.calibrate.colFlow}</th>
                      <th className="py-2 text-right font-medium">{t.calibrate.colDrip}</th>
                    </tr>
                  </thead>
                  <tbody className="tabular-nums">
                    {visiblePoints.map((p, i) => (
                      <tr key={`${p.temperature}-${p.regime}-${i}`} className="border-b last:border-0">
                        <td className="py-1.5 pr-3">{p.temperature} °C</td>
                        <td className="py-1.5 pr-3">
                          <Badge variant="secondary" className="font-normal">
                            {p.regime === "SHORT"
                              ? t.calibrate.regimeShort
                              : t.calibrate.regimeLong}
                          </Badge>
                        </td>
                        <td className="py-1.5 pr-3 text-right">{p.calTarget} g</td>
                        <td className="py-1.5 pr-3 text-right">{p.motorOnTime.toFixed(3)} s</td>
                        <td className="py-1.5 pr-3 text-right">
                          {(p.calTarget / p.motorOnTime).toFixed(2)} g/s
                        </td>
                        <td className="py-1.5 text-right">{p.drip.toFixed(2)} g</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {total > POINTS_LIMIT ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2 w-full"
                  onClick={() => setShowAll((v) => !v)}
                >
                  {showAll ? t.calibrate.showLess : t.calibrate.viewAll(total)}
                </Button>
              ) : null}
            </>
          )}
        </CardContent>
      </Card>

      <div className="lg:col-span-2">
        <CalibrationFitChart />
      </div>
    </div>
  );
}
