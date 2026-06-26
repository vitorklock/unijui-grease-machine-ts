"use client";

import { Beaker, Spline } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useTranslation } from "@/i18n";
import { useMachine } from "../machine-context";

/**
 * Compact caption naming the oil (and, by default, the interpolation strategy)
 * the chart is currently computed for — mirrors the sidebar selectors' icons so
 * it is obvious which selection the chart reflects.
 */
export function RunConfig({ interpolator = true }: { interpolator?: boolean }) {
  const { oil, interpolatorKey } = useMachine();
  const { t } = useTranslation();
  return (
    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
      <Badge variant="secondary" className="gap-1 font-normal">
        <Beaker className="size-3" /> {oil.grade}
      </Badge>
      {interpolator ? (
        <Badge variant="secondary" className="gap-1 font-normal">
          <Spline className="size-3" /> {t.interpolator.names[interpolatorKey]}
        </Badge>
      ) : null}
    </div>
  );
}
