import { useEffect, useState } from "react";
import { useTranslation } from "@/lib/i18n";
import { cn } from "@/lib/utils";

/** Samma värden som onboarding (`OnboardingFlow.tsx` SkinId). */
type ProfileSkinType = "sensitive" | "oily" | "dry" | "combination";

const SKIN_PROFILE_OPTIONS: ProfileSkinType[] = ["sensitive", "oily", "dry", "combination"];

const SKIN_TITLE_KEY: Record<
  ProfileSkinType,
  | "onboarding.skin.sensitive.title"
  | "onboarding.skin.oily.title"
  | "onboarding.skin.dry.title"
  | "onboarding.skin.combination.title"
> = {
  sensitive: "onboarding.skin.sensitive.title",
  oily: "onboarding.skin.oily.title",
  dry: "onboarding.skin.dry.title",
  combination: "onboarding.skin.combination.title",
};

/** Samma värden som onboarding (`OnboardingFlow.tsx` AgeId). */
type AgeGroup = "under16" | "16-17" | "18-25" | "26-35" | "36-45" | "46plus";

const AGE_GROUP_OPTIONS = [
  { value: "under16" as const },
  { value: "16-17" as const },
  { value: "18-25" as const },
  { value: "26-35" as const },
  { value: "36-45" as const },
  { value: "46plus" as const },
] as const;

const AGE_TITLE_KEY: Record<
  AgeGroup,
  | "onboarding.age.under16.title"
  | "onboarding.age.16-17.title"
  | "onboarding.age.18-25.title"
  | "onboarding.age.26-35.title"
  | "onboarding.age.36-45.title"
  | "onboarding.age.46plus.title"
> = {
  under16: "onboarding.age.under16.title",
  "16-17": "onboarding.age.16-17.title",
  "18-25": "onboarding.age.18-25.title",
  "26-35": "onboarding.age.26-35.title",
  "36-45": "onboarding.age.36-45.title",
  "46plus": "onboarding.age.46plus.title",
};

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

function readStoredSkin(): ProfileSkinType | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    const stored = window.localStorage.getItem("skinscreen.skinProfile");
    if (!stored) return undefined;
    const ok = SKIN_PROFILE_OPTIONS.includes(stored as ProfileSkinType);
    return ok ? (stored as ProfileSkinType) : undefined;
  } catch {
    return undefined;
  }
}

/** Profil-hudtyp — samma värden som onboarding; lagras under `skinscreen.skinProfile` (skannern). */
export function SkinProfileChips() {
  const { t } = useTranslation();
  const [value, setValue] = useState<ProfileSkinType | undefined>(() => readStoredSkin());
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
              key={p}
              type="button"
              onClick={() => setValue((v) => (v === p ? undefined : p))}
              className={cn(
                "inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-medium transition-all duration-150",
                "focus:outline-none focus:ring-2 focus:ring-[color-mix(in_srgb,var(--sage)_40%,transparent)] focus:ring-offset-2 focus:ring-offset-white",
                value === p
                  ? "border-transparent text-white shadow-sm"
                  : "border-border/60 bg-white text-muted-foreground hover:border-[color-mix(in_srgb,var(--sage)_50%,transparent)] hover:text-foreground",
              )}
              style={
                value === p
                  ? { backgroundColor: "var(--sage)", borderColor: "var(--sage)", color: "#fff" }
                  : undefined
              }
              data-touch-target
            >
              {t(SKIN_TITLE_KEY[p])}
            </button>
          ))}
        </div>

        {/* Åldersgrupp — samma värden som onboarding */}
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
                {t(AGE_TITLE_KEY[a.value])}
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
