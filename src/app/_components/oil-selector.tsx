"use client";

import { Beaker } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTranslation } from "@/i18n";
import { useMachine } from "./machine-context";

/** Global fluid picker. Changing the oil rebuilds the machine and clears calibration. */
export function OilSelector() {
  const { oil, oils, setOil } = useMachine();
  const { t } = useTranslation();

  return (
    <div className="flex items-center gap-2">
      <Beaker className="size-4 text-muted-foreground" />
      <Select value={oil.id} onValueChange={setOil}>
        <SelectTrigger className="w-[200px]" aria-label={t.oil.pickerLabel}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent position="popper" align="start" className="max-h-72">
          {oils.map((o) => (
            <SelectItem key={o.id} value={o.id}>
              {o.grade}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
