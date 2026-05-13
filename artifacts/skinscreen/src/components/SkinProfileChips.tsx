import { useEffect, useState } from "react";
import type { SkinProfile } from "@workspace/api-client-react";
import { useTranslation } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const SKIN_PROFILE_OPTIONS: { value: SkinProfile; labelKey: string }[] = [
  { value: "sensitive", labelKey: "scanner.skinType.sensitive" },
  { value: "young", labelKey: "scanner.skinType.young" },
  { value: "mature", labelKey: "scanner.skinType.mature" },
  { value: "pregnant", labelKey: "scanner.skinType.pregnant" },
];

function readStored(): SkinProfile | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    const stored = window.localStorage.getItem("skinscreen.skinProfile");
    if (!stored) return undefined;
    const ok = SKIN_PROFILE_OPTIONS.some((o) => o.value === stored);
    return ok ? (stored as SkinProfile) : undefined;
  } catch {
    return undefined;
  }
}

/** Profil-hudtyp — samma val som skannern använder via localStorage. */
export function SkinProfileChips() {
  const { t } = useTranslation();
  const [value, setValue] = useState<SkinProfile | undefined>(() => readStored());

  useEffect(() => {
    try {
      if (value) {
        window.localStorage.setItem("skinscreen.skinProfile", value);
      } else {
        window.localStorage.removeItem("skinscreen.skinProfile");
      }
    } catch {
      // ignore
    }
  }, [value]);

  return (
    <section className="mb-5 animate-pop-in">
      <div className="rounded-3xl border border-border/40 bg-white p-5 shadow-sm">
        <h2 className="mb-3 font-serif text-lg font-medium text-foreground">
          {t("profile.skinSection")}
        </h2>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {t("scanner.yourSkinType")}
        </p>
        <div className="flex flex-wrap gap-2">
          {SKIN_PROFILE_OPTIONS.map((p) => (
            <button
              key={p.value}
              type="button"
              onClick={() => setValue((v) => (v === p.value ? undefined : p.value))}
              className={cn(
                "inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-medium transition-all duration-150",
                "focus:outline-none focus:ring-2 focus:ring-[color-mix(in_srgb,var(--sage)_40%,transparent)] focus:ring-offset-2 focus:ring-offset-white",
                value === p.value
                  ? "border-transparent text-white shadow-sm"
                  : "border-border/60 bg-white text-muted-foreground hover:border-[color-mix(in_srgb,var(--sage)_50%,transparent)] hover:text-foreground",
              )}
              style={
                value === p.value
                  ? { backgroundColor: "var(--sage)", borderColor: "var(--sage)", color: "#fff" }
                  : undefined
              }
              data-touch-target
            >
              {t(p.labelKey)}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
