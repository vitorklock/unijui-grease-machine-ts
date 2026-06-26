"use client";

import { Droplet, Gauge, Hand, Pause, Play, RotateCcw, Zap } from "lucide-react";
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
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import { ControllerSelector } from "./controller-selector";
import { SPEED_OPTIONS, useMachine } from "./machine-context";

const g = (n: number) => `${n.toFixed(3)} g`;
const s = (n: number) => `${n.toFixed(3)} s`;

export function OperatePanel() {
  const m = useMachine();
  const barMax = Math.max(m.massPerPulse * 1.4, 30);
  const barPct = Math.min(100, (m.snapshot.scaleWeight / barMax) * 100);

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_1.1fr]">
      <div className="flex flex-col gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Controller</CardTitle>
            <CardDescription>
              Pick how the machine drives the motor.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ControllerSelector />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Ambient temperature
              <span className="font-mono text-base">{m.temperature.toFixed(0)} °C</span>
            </CardTitle>
            <CardDescription>
              Flow and drip change with temperature — sweep it to watch the
              compensated controller hold the dose.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Slider
              min={5}
              max={40}
              step={1}
              value={[m.temperature]}
              onValueChange={(v) => m.setTemperature(v[0])}
            />
            <div className="mt-1 flex justify-between text-xs text-muted-foreground">
              <span>5 °C</span>
              <span>40 °C</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Droplet className="size-4 text-chart-1" />
              Live scale
            </CardTitle>
            <CardDescription>
              Dispensed mass in the container (clears between pulses).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="font-mono text-4xl font-semibold tabular-nums">
              {m.snapshot.scaleWeight.toFixed(3)}
              <span className="ml-1 text-lg text-muted-foreground">g</span>
            </div>
            <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className={cn(
                  "h-full rounded-full transition-[width] duration-75",
                  m.snapshot.motorRunning ? "bg-chart-1" : "bg-primary/60",
                )}
                style={{ width: `${barPct}%` }}
              />
            </div>
            <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
              <Badge variant={m.snapshot.motorRunning ? "default" : "secondary"}>
                motor {m.snapshot.motorRunning ? "running" : "idle"}
              </Badge>
              <Badge variant={m.snapshot.ready ? "default" : "outline"}>
                {m.snapshot.ready
                  ? "calibrated"
                  : `needs calibration (${m.snapshot.completeTemperatures.length}/2 temps)`}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Gauge className="size-4" /> Simulation speed
            </CardTitle>
            <CardDescription>
              A real micro-dosing pump is slow, so the demo compresses wall-clock
              time. Motor on-times shown are real-machine seconds.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-1.5">
              {SPEED_OPTIONS.map((sp) => (
                <Button
                  key={sp}
                  size="sm"
                  variant={sp === m.speed ? "default" : "outline"}
                  onClick={() => m.setSpeed(sp)}
                >
                  {sp}×
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col gap-4">
        {m.controllerKey === "manual" ? <ManualControls /> : <AutomaticControls />}

        {m.error ? (
          <p className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            {m.error}
          </p>
        ) : null}

        <DispenseLog />
      </div>
    </div>
  );
}

function ManualControls() {
  const m = useMachine();
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Hand className="size-4" /> Manual control
        </CardTitle>
        <CardDescription>
          Hold to run the motor — for filling hoses and purging air. No
          calibration needed.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <Button
          size="lg"
          className="h-20 select-none text-base"
          onPointerDown={m.manualOn}
          onPointerUp={m.manualOff}
          onPointerLeave={m.manualOff}
          onContextMenu={(e) => e.preventDefault()}
        >
          {m.snapshot.motorRunning ? "Running…" : "Hold to run"}
        </Button>
        <Button variant="outline" onClick={m.tare}>
          <RotateCcw className="size-4" /> Tare scale
        </Button>
      </CardContent>
    </Card>
  );
}

function AutomaticControls() {
  const m = useMachine();
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="size-4 text-chart-1" /> Automatic dispensing
        </CardTitle>
        <CardDescription>
          Compensated pulses of a target mass at a fixed interval.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="mass">Mass per pulse (g)</Label>
            <Input
              id="mass"
              type="number"
              min={0.1}
              step={0.5}
              value={m.massPerPulse}
              onChange={(e) => m.setMassPerPulse(Number(e.target.value) || 0)}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="interval">Interval (s)</Label>
            <Input
              id="interval"
              type="number"
              min={0}
              step={1}
              value={m.intervalSeconds}
              onChange={(e) => m.setIntervalSeconds(Number(e.target.value) || 0)}
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {m.running ? (
            <Button variant="destructive" onClick={m.stopAuto}>
              <Pause className="size-4" /> Stop cycle
            </Button>
          ) : (
            <Button onClick={m.startAuto} disabled={!m.snapshot.ready}>
              <Play className="size-4" /> Start cycle
            </Button>
          )}
          <Button
            variant="outline"
            onClick={m.dispenseOne}
            disabled={m.running || !m.snapshot.ready}
          >
            Dispense one pulse
          </Button>
          <Button variant="secondary" onClick={m.restart}>
            <RotateCcw className="size-4" /> Restart
          </Button>
        </div>

        {!m.snapshot.ready ? (
          <p className="text-xs text-muted-foreground">
            Calibrate at two or more temperatures (Calibrate tab) to enable
            automatic dispensing.
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}

function DispenseLog() {
  const m = useMachine();
  return (
    <Card className="flex-1">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Pulse log
          {m.log.length > 0 ? (
            <Button variant="ghost" size="sm" onClick={m.clearLog}>
              Clear
            </Button>
          ) : null}
        </CardTitle>
        <CardDescription>Most recent pulses first.</CardDescription>
      </CardHeader>
      <CardContent>
        {m.log.length === 0 ? (
          <p className="text-sm text-muted-foreground">No pulses yet.</p>
        ) : (
          <ul className="flex max-h-72 flex-col gap-1 overflow-auto text-sm">
            {m.log.map((entry) => (
              <li
                key={entry.id}
                className="flex items-center justify-between rounded-md border px-3 py-1.5"
              >
                <span className="font-medium tabular-nums">{g(entry.massTarget)}</span>
                <span className="text-xs text-muted-foreground tabular-nums">
                  {entry.temperature.toFixed(0)} °C · motor {s(entry.motorOnTime)} ·
                  drip ≈ {entry.estimatedDrip.toFixed(2)} g
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
