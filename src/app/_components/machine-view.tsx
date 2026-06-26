"use client";

import { Droplets } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTranslation } from "@/i18n";
import { CalibrationPanel } from "./calibration-panel";
import { AccuracyChart } from "./charts/accuracy-chart";
import { CalibrationCurves } from "./charts/calibration-curves";
import { CompareChart } from "./charts/compare-chart";
import { LanguageSwitcher } from "./language-switcher";
import { MachineProvider } from "./machine-context";
import { OilInfo } from "./oil-info";
import { OilSelector } from "./oil-selector";
import { OperatePanel } from "./operate-panel";

const TAB_VALUES = [
  "operate",
  "calibrate",
  "oil",
  "curves",
  "accuracy",
  "compare",
] as const;

export function MachineView() {
  const { t } = useTranslation();

  return (
    <MachineProvider>
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8 sm:px-8">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-chart-1">
              <Droplets className="size-5" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">{t.header.title}</h1>
              <p className="text-sm text-muted-foreground">{t.header.subtitle}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <LanguageSwitcher />
            <OilSelector />
          </div>
        </header>

        <Tabs defaultValue="operate" className="w-full">
          <TabsList className="w-full justify-start overflow-x-auto">
            {TAB_VALUES.map((v) => (
              <TabsTrigger key={v} value={v}>
                {t.tabs[v]}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="operate" className="pt-4">
            <OperatePanel />
          </TabsContent>
          <TabsContent value="calibrate" className="pt-4">
            <CalibrationPanel />
          </TabsContent>
          <TabsContent value="oil" className="pt-4">
            <OilInfo />
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
