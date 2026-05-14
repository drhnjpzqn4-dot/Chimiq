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

type AgeGroup = "13-15" | "16-17" | "18-20" | "21+";

const AGE_GROUP_OPTIONS: { value: AgeGroup; label: string }[] = [
  { value: "13-15", label: "13–15" },
  { value: "16-17", label: "16–17" },
  { value: "18-20", label: "18–20" },
  { value: "21+", label: "21+" },
];

function readStoredAge(): AgeGroup | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    const s = window.localStorage.getItem("chimiq.ageGroup");
    if (!s) return undefined;
    return AGE_GROUP_OPTIONS.some((o) => o.value === s) ? (s as AgeGroup) : undefined;
  } catch {
    return undefined;
  }
}

function readStoredGoal(): string {
  if (typeof window === "undefined") return "";
  try {
    return window.localStorage.getItem("chimiq.skinGoal") ?? "";
  } catch {
    return "";
  }
}

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
  const [ageGroup, setAgeGroup] = useState<AgeGroup | undefined>(() => readStoredAge());
  const [goal, setGoal] = useState<string>(() => readStoredGoal());

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

  useEffect(() => {
    try {
      if (ageGroup) window.localStorage.setItem("chimiq.ageGroup", ageGroup);
      else window.localStorage.removeItem("chimiq.ageGroup");
    } catch {
      // ignore
    }
  }, [ageGroup]);

  useEffect(() => {
    try {
      if (goal.trim()) window.localStorage.setItem("chimiq.skinGoal", goal.trim());
      else window.localStorage.removeItem("chimiq.skinGoal");
    } catch {
      // ignore
    }
  }, [goal]);

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

        {/* Åldersgrupp */}
        <div className="mt-4 border-t border-border/30 pt-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Ålder
          </p>
          <div className="flex flex-wrap gap-2">
            {AGE_GROUP_OPTIONS.map((a) => (
              <button
                key={a.value}
                type="button"
                onClick={() => setAgeGroup((v) => (v === a.value ? undefined : a.value))}
                className={cn(
                  "inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-medium transition-all duration-150",
                  "focus:outline-none focus:ring-2 focus:ring-[color-mix(in_srgb,var(--sage)_40%,transparent)] focus:ring-offset-2 focus:ring-offset-white",
                  ageGroup === a.value
                    ? "border-transparent text-white shadow-sm"
                    : "border-border/60 bg-white text-muted-foreground hover:border-[color-mix(in_srgb,var(--sage)_50%,transparent)] hover:text-foreground",
                )}
                style={
                  ageGroup === a.value
                    ? { backgroundColor: "var(--sage)", borderColor: "var(--sage)", color: "#fff" }
                    : undefined
                }
                data-touch-target
              >
                {a.label}
              </button>
            ))}
          </div>
        </div>

        {/* Mål — fritext */}
        <div className="mt-4 border-t border-border/30 pt-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Mitt mål
          </p>
          <textarea
            rows={2}
            maxLength={200}
            placeholder="Vad vill du uppnå med din hudvård? (t.ex. minska rodnad, hitta en enkel morgonrutin)"
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            className="w-full resize-none rounded-2xl border border-border/60 bg-white px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-[color-mix(in_srgb,var(--sage)_40%,transparent)]"
          />
        </div>
      </div>
    </section>
  );
}
