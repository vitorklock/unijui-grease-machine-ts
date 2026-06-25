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
import { useMachine } from "./machine-context";

const QUICK_TEMPS = [10, 20, 28, 35];

export function CalibrationPanel() {
  const m = useMachine();
  const [temp, setTemp] = useState(10);

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_1.3fr]">
      <Card className="self-start">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Thermometer className="size-4" /> Run a calibration
          </CardTitle>
          <CardDescription>
            At each temperature the procedure runs a short (5 g) and a long (30 g)
            pulse, waits for the drip to settle, and records flow and drip.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="grid gap-1.5">
            <Label htmlFor="cal-temp">Temperature (°C)</Label>
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
            {QUICK_TEMPS.map((t) => (
              <Button
                key={t}
                variant="outline"
                size="sm"
                onClick={() => setTemp(t)}
              >
                {t} °C
              </Button>
            ))}
          </div>

          <Button onClick={() => m.calibrateAt(temp)} disabled={m.calibrating}>
            {m.calibrating ? (
              <>
                <Loader2 className="size-4 animate-spin" /> Calibrating…
              </>
            ) : (
              `Calibrate at ${temp} °C`
            )}
          </Button>

          <div className="flex items-center gap-2">
            <Badge variant={m.snapshot.ready ? "default" : "outline"}>
              {m.snapshot.ready ? "Ready to dispense" : "Not ready"}
            </Badge>
            <span className="text-xs text-muted-foreground">
              {m.snapshot.completeTemperatures.length} complete temperature
              {m.snapshot.completeTemperatures.length === 1 ? "" : "s"}
            </span>
          </div>

          <p className="text-xs text-muted-foreground">
            Need at least two temperatures. For best accuracy, calibrate on the
            coldest and warmest days plus one in between.
          </p>

          {m.points.length > 0 ? (
            <Button variant="ghost" size="sm" onClick={m.clearCalibration}>
              <Trash2 className="size-4" /> Clear calibration
            </Button>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Calibration points</CardTitle>
          <CardDescription>
            {m.points.length} point{m.points.length === 1 ? "" : "s"} stored.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {m.points.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No calibration yet. Run a calibration to populate the store.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs text-muted-foreground">
                    <th className="py-2 pr-3 font-medium">Temp</th>
                    <th className="py-2 pr-3 font-medium">Regime</th>
                    <th className="py-2 pr-3 text-right font-medium">Cal mass</th>
                    <th className="py-2 pr-3 text-right font-medium">Motor time</th>
                    <th className="py-2 pr-3 text-right font-medium">Flow</th>
                    <th className="py-2 text-right font-medium">Drip</th>
                  </tr>
                </thead>
                <tbody className="tabular-nums">
                  {m.points.map((p, i) => (
                    <tr key={`${p.temperature}-${p.regime}-${i}`} className="border-b last:border-0">
                      <td className="py-1.5 pr-3">{p.temperature} °C</td>
                      <td className="py-1.5 pr-3">
                        <Badge variant="secondary" className="font-normal">
                          {p.regime.toLowerCase()}
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
          )}
        </CardContent>
      </Card>
    </div>
  );
}
