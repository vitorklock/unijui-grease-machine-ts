"use client";

import { Spline } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTranslation } from "@/i18n";
import { useMachine } from "./machine-context";

/**
 * Global interpolation-strategy picker. Drives the live automatic controller AND
 * the highlighted line in the Compare charts. The recommended (most accurate)
 * strategy is flagged "best", so its advantage is visible before you even open
 * the Compare tab.
 */
export function InterpolatorSelector() {
  const { interpolatorKey, interpolators, setInterpolator } = useMachine();
  const { t } = useTranslation();

  return (
    <div className="flex items-center gap-2">
      <Spline className="size-4 text-muted-foreground" />
      <Select
        value={interpolatorKey}
        onValueChange={(v) => setInterpolator(v as typeof interpolatorKey)}
      >
        <SelectTrigger className="w-[190px]" aria-label={t.interpolator.pickerLabel}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent position="popper" align="start">
          {interpolators.map((it) => (
            <SelectItem key={it.key} value={it.key}>
              <span>{t.interpolator.names[it.key]}</span>
              {it.recommended ? (
                <Badge
                  variant="secondary"
                  className="px-1.5 py-0 text-[10px] uppercase tracking-wide"
                >
                  {t.interpolator.best}
                </Badge>
              ) : null}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
