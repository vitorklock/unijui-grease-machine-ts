"use client";

import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/i18n";
import { useMachine } from "./machine-context";

interface Props {
  variant?: "outline" | "ghost" | "secondary";
  size?: "sm" | "default";
  className?: string;
}

/** Downloads the full machine state (oil, calibration, settings, pulse log) as JSON. */
export function ExportButton({ variant = "outline", size = "sm", className }: Props) {
  const { exportData } = useMachine();
  const { t } = useTranslation();

  const onExport = () => {
    const json = JSON.stringify(exportData(), null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const a = document.createElement("a");
    a.href = url;
    a.download = `grease-machine-${stamp}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <Button variant={variant} size={size} className={className} onClick={onExport}>
      <Download className="size-4" /> {t.header.export}
    </Button>
  );
}
