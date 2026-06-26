"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { en, type Messages } from "./messages";
import { pt } from "./pt";

export const LOCALES = ["en", "pt"] as const;
export type Locale = (typeof LOCALES)[number];

const DICTIONARIES: Record<Locale, Messages> = { en, pt };
const STORAGE_KEY = "grease-machine.locale";
const DEFAULT_LOCALE: Locale = "en";

interface I18nValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: Messages;
  locales: readonly Locale[];
}

const I18nContext = createContext<I18nValue | null>(null);

export function useTranslation(): I18nValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useTranslation must be used within <I18nProvider>");
  return ctx;
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);

  // Restore the saved locale after mount. Server and first client render use the
  // default (localStorage is client-only), so this one-time sync is intentional
  // and cannot run earlier without risking a hydration mismatch.
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "en" || saved === "pt") setLocaleState(saved);
  }, []);

  const value = useMemo<I18nValue>(() => {
    const setLocale = (next: Locale) => {
      setLocaleState(next);
      try {
        localStorage.setItem(STORAGE_KEY, next);
      } catch {
        /* storage unavailable (private mode) — keep the in-memory locale */
      }
    };
    return { locale, setLocale, t: DICTIONARIES[locale], locales: LOCALES };
  }, [locale]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export type { Messages } from "./messages";
