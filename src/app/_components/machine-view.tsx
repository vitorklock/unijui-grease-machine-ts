"use client";

import type { ReactNode } from "react";
import { Droplets } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTranslation } from "@/i18n";
import { CalibrationPanel } from "./calibration-panel";
import { AccuracyChart } from "./charts/accuracy-chart";
import { CalibrationCurves } from "./charts/calibration-curves";
import { CompareChart } from "./charts/compare-chart";
import { ExportButton } from "./export-button";
import { InterpolatorSelector } from "./interpolator-selector";
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
        <header className="flex flex-col gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-chart-1">
                <Droplets className="size-5" />
              </div>
              <h1 className="text-2xl font-semibold tracking-tight">{t.header.title}</h1>
            </div>
            <p className="max-w-2xl text-sm text-muted-foreground">{t.header.subtitle}</p>
          </div>

          {/* Controls bar: language + machine settings on the left, export action right-aligned. */}
          <div className="flex flex-wrap items-end gap-x-4 gap-y-3 rounded-xl border bg-card/50 px-3 py-2.5">
            <Field label={t.language.label}>
              <LanguageSwitcher />
            </Field>
            <Field label={t.oil.pickerLabel}>
              <OilSelector />
            </Field>
            <Field label={t.interpolator.pickerLabel}>
              <InterpolatorSelector />
            </Field>
            <div className="ml-auto">
              <ExportButton />
            </div>
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

/** A labelled control in the machine settings bar: tiny caption above the input. */
function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      {children}
    </div>
  );
}
