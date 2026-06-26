"use client";

import { Languages } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTranslation, type Locale } from "@/i18n";

export function LanguageSwitcher() {
  const { locale, setLocale, locales, t } = useTranslation();

  return (
    <div className="flex w-full items-center gap-2">
      <Languages className="size-4 shrink-0 text-muted-foreground" />
      <Select value={locale} onValueChange={(v) => setLocale(v as Locale)}>
        <SelectTrigger className="w-auto min-w-0 flex-1" aria-label={t.language.label}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent position="popper" align="start">
          {locales.map((l) => (
            <SelectItem key={l} value={l}>
              {t.language[l]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
