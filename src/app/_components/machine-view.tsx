"use client";

import { Droplets } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CalibrationPanel } from "./calibration-panel";
import { AccuracyChart } from "./charts/accuracy-chart";
import { CalibrationCurves } from "./charts/calibration-curves";
import { CompareChart } from "./charts/compare-chart";
import { MachineProvider } from "./machine-context";
import { OperatePanel } from "./operate-panel";

const TABS = [
  { value: "operate", label: "Operate" },
  { value: "calibrate", label: "Calibrate" },
  { value: "curves", label: "Curves" },
  { value: "accuracy", label: "Accuracy" },
  { value: "compare", label: "Compare" },
];

export function MachineView() {
  return (
    <MachineProvider>
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8 sm:px-8">
        <header className="flex items-start gap-3">
          <div className="mt-0.5 flex size-10 items-center justify-center rounded-xl bg-primary/10 text-chart-1">
            <Droplets className="size-5" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Grease Machine</h1>
            <p className="text-sm text-muted-foreground">
              Temperature-compensated precision dispenser for thin drip oil —
              calibrate, then dispense exact pulses regardless of the weather.
            </p>
          </div>
        </header>

        <Tabs defaultValue="operate">
          <TabsList className="w-full justify-start overflow-x-auto">
            {TABS.map((t) => (
              <TabsTrigger key={t.value} value={t.value}>
                {t.label}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="operate" className="pt-4">
            <OperatePanel />
          </TabsContent>
          <TabsContent value="calibrate" className="pt-4">
            <CalibrationPanel />
          </TabsContent>
          <TabsContent value="curves" className="pt-4">
            <CalibrationCurves />
          </TabsContent>
          <TabsContent value="accuracy" className="pt-4">
            <AccuracyChart />
          </TabsContent>
          <TabsContent value="compare" className="pt-4">
            <CompareChart />
          </TabsContent>
        </Tabs>
      </div>
    </MachineProvider>
  );
}
