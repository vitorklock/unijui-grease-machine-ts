"use client";

import { CONTROLLERS } from "@/lib/grease-machine";
import { cn } from "@/lib/utils";
import { useMachine } from "./machine-context";

/** Renders one button per registered controller — no per-controller special-casing. */
export function ControllerSelector() {
  const { controllerKey, setControllerKey } = useMachine();

  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      {Object.values(CONTROLLERS).map((entry) => {
        const active = entry.key === controllerKey;
        return (
          <button
            key={entry.key}
            type="button"
            onClick={() => setControllerKey(entry.key)}
            aria-pressed={active}
            className={cn(
              "rounded-lg border p-3 text-left transition-colors",
              active
                ? "border-primary bg-primary/5"
                : "border-border hover:bg-muted/50",
            )}
          >
            <div className="text-sm font-medium">{entry.label}</div>
            <div className="mt-1 text-xs text-muted-foreground">
              {entry.description}
            </div>
          </button>
        );
      })}
    </div>
  );
}
