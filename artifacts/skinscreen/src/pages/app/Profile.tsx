import { useEffect, useReducer, useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { Check, ChevronRight, CreditCard, Loader2, Pencil, Sparkles, X } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { SkinProfileChips } from "@/components/SkinProfileChips";
import PaywallModal from "@/components/PaywallModal";
import { apiFetch } from "@/lib/api";
import { useUserPlan } from "@/hooks/useUserPlan";
import { getBaseUrl } from "@/lib/base-url";
import { isNative, openExternal } from "@/lib/native";
import { useTranslation, LOCALES, type Locale } from "@/lib/i18n";
import { TRIAL_DAYS } from "@/lib/pricing";
import { PREMIUM_CONTRIBUTION_MILESTONE } from "@/pages/app/Shelf";

interface ContributeStats {
  acceptedContributions: number;
  premiumUntil: string | null;
}

type OnboardingAgeId = "under16" | "16-17" | "18-25" | "26-35" | "36-45" | "46plus";

const AGE_TITLE_KEY: Record<
  OnboardingAgeId,
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

const SKIN_PROFILE_KEYS: Partial<
  Record<
    string,
    | "onboarding.skin.sensitive.title"
    | "onboarding.skin.oily.title"
    | "onboarding.skin.dry.title"
    | "onboarding.skin.combination.title"
    | "scanner.skinType.sensitive"
    | "scanner.skinType.young"
    | "scanner.skinType.mature"
    | "scanner.skinType.pregnant"
  >
> = {
  sensitive: "onboarding.skin.sensitive.title",
  oily: "onboarding.skin.oily.title",
  dry: "onboarding.skin.dry.title",
  combination: "onboarding.skin.combination.title",
  young: "scanner.skinType.young",
  mature: "scanner.skinType.mature",
  pregnant: "scanner.skinType.pregnant",
};

const AVATAR_EMOJIS = ["✨", "🌿", "🌸", "🧴", "💚", "🌙", "☀️", "🌺", "💜", "🍃", "🦋", "🌊"] as const;

async function patchProfile(body: {
  displayName?: string;
  avatarEmoji?: string;
}): Promise<boolean> {
  const res = await apiFetch("/api/profile", {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return res.ok;
}

function readLs(key: string): string {
  if (typeof window === "undefined") return "";
  try {
    return window.localStorage.getItem(key)?.trim() ?? "";
  } catch {
    return "";
  }
}

export default function ProfileScreen() {
  const { user, logout, refetch } = useAuth();
  const { isPremium, isLoading, trialEligible } = useUserPlan();
  const [, navigate] = useLocation();
  const { t, locale, setLocale } = useTranslation();
  const [stats, setStats] = useState<ContributeStats | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);
  const [portalError, setPortalError] = useState<string | null>(null);
  const [showPaywall, setShowPaywall] = useState(false);
  const [langSheetOpen, setLangSheetOpen] = useState(false);
  const [showEditor, setShowEditor] = useState(false);
  const [prefTick, bumpPrefs] = useReducer((n: number) => n + 1, 0);
  const [localDisplayName, setLocalDisplayName] = useState("");
  const [localAvatarEmoji, setLocalAvatarEmoji] = useState("✨");
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const [nameError, setNameError] = useState<string | null>(null);
  const [nameSaved, setNameSaved] = useState(false);

  const runningNative = isNative();

  useEffect(() => {
    if (!user) return;
    setLocalDisplayName(user.displayName ?? user.firstName ?? "");
    setLocalAvatarEmoji(user.avatarEmoji ?? "✨");
  }, [user?.id, user?.displayName, user?.avatarEmoji, user?.firstName]);

  useEffect(() => {
    apiFetch("/api/contribute/stats", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setStats(d as ContributeStats))
      .catch(() => {});
  }, []);

  useEffect(() => {
    const onInteract = () => bumpPrefs();
    window.addEventListener("click", onInteract, true);
    return () => window.removeEventListener("click", onInteract, true);
  }, []);

  const handleManageBilling = async () => {
    setPortalLoading(true);
    setPortalError(null);
    try {
      const res = await apiFetch(`${getBaseUrl()}api/payments/portal`, {
        method: "POST",
      });
      if (res.status === 400) {
        setPortalError(t("profileCard.noStripeYet"));
        return;
      }
      if (!res.ok) {
        setPortalError(t("profileCard.portalError"));
        return;
      }
      const data = (await res.json()) as { url?: string };
      if (data.url) {
        if (runningNative) {
          await openExternal(data.url);
        } else {
          window.location.href = data.url;
        }
      } else {
        setPortalError(t("profileCard.portalError"));
      }
    } catch {
      setPortalError(t("profileCard.portalError"));
    } finally {
      setPortalLoading(false);
    }
  };

  const handleLogout = () => {
    void logout();
  };

  if (!user) return null;

  const base = (import.meta.env.BASE_URL ?? "/").replace(/\/+$/, "") || "";

  const skinRaw = readLs("skinscreen.skinProfile");
  const skinI18nKey = skinRaw ? SKIN_PROFILE_KEYS[skinRaw] : undefined;
  const skinTypeLabel = skinI18nKey
    ? t(skinI18nKey)
    : skinRaw
      ? skinRaw
      : t("profile.notSet");

  const ageRaw = readLs("chimiq.ageGroup");
  const ageGroupLabel =
    ageRaw && ageRaw in AGE_TITLE_KEY
      ? t(AGE_TITLE_KEY[ageRaw as OnboardingAgeId])
      : ageRaw
        ? ageRaw
        : t("profile.notSet");

  const goalRaw = readLs("chimiq.skinGoal");
  // TODO: goal value is stored as raw text from onboarding, not an i18n key. Migrate in separate task.
  const goalLabel = goalRaw ? goalRaw : t("profile.notSet");

  const currentLanguageLabel = (() => {
    try {
      if (typeof Intl !== "undefined" && typeof Intl.DisplayNames === "function") {
        const name = new Intl.DisplayNames([locale], { type: "language" }).of(locale);
        if (name) {
          return name.charAt(0).toLocaleUpperCase(locale) + name.slice(1);
        }
      }
    } catch {
      // ignore
    }
    return LOCALES.find((l) => l.code === locale)?.label ?? locale;
  })();

  const milestone = PREMIUM_CONTRIBUTION_MILESTONE;
  const contributed = stats?.acceptedContributions ?? 0;

  void prefTick;

  const fallbackName = user.email?.split("@")[0] ?? "Chimiq";
  const visibleName =
    localDisplayName.trim() || user.displayName?.trim() || user.firstName?.trim() || fallbackName;

  const saveDisplayName = async (raw: string) => {
    const trimmed = raw.trim().slice(0, 50);
    if (trimmed.length < 1) {
      setNameError(t("profile.saveError"));
      return;
    }
    const previous = localDisplayName;
    setNameError(null);
    setLocalDisplayName(trimmed);
    setEditingName(false);
    const ok = await patchProfile({ displayName: trimmed });
    if (!ok) {
      setLocalDisplayName(previous);
      setNameError(t("profile.saveError"));
      return;
    }
    setNameSaved(true);
    window.setTimeout(() => setNameSaved(false), 2000);
    void refetch();
  };

  const pickAvatarEmoji = async (emoji: string) => {
    const previous = localAvatarEmoji;
    setLocalAvatarEmoji(emoji);
    setEmojiPickerOpen(false);
    const ok = await patchProfile({ avatarEmoji: emoji });
    if (!ok) {
      setLocalAvatarEmoji(previous);
      return;
    }
    void refetch();
  };

  const startEditingName = () => {
    setNameDraft(visibleName);
    setNameError(null);
    setEditingName(true);
  };

  const cancelEditingName = () => {
    setEditingName(false);
    setNameDraft(visibleName);
    setNameError(null);
  };

  const openSkinEditor = () => {
    setShowEditor(true);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        document.getElementById("skin-profile-editor")?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    });
  };

  return (
    <AppShell pageLabel={t("tabs.profile")} subtitle={t("profile.subtitle")}>
      <div className="space-y-4 pb-8">
        {/* 1. Avatar */}
        <div className="overflow-hidden rounded-2xl border border-border/40 bg-white shadow-sm">
          <div className="flex items-center gap-4 px-4 py-3">
            <div
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-2xl"
              style={{ background: "linear-gradient(135deg, var(--rose-gold), var(--gold))" }}
              aria-hidden
            >
              {localAvatarEmoji}
            </div>

            <div className="min-w-0 flex-1">
              {editingName ? (
                <input
                  type="text"
                  value={nameDraft}
                  maxLength={50}
                  autoFocus
                  className="w-full rounded-lg border border-border/50 bg-white px-2 py-1 font-serif text-base font-medium outline-none focus:border-[var(--sage)]"
                  style={{ color: "var(--ink)" }}
                  onChange={(e) => setNameDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      void saveDisplayName(nameDraft);
                    }
                    if (e.key === "Escape") {
                      e.preventDefault();
                      cancelEditingName();
                    }
                  }}
                  onBlur={() => {
                    void saveDisplayName(nameDraft);
                  }}
                />
              ) : (
                <button
                  type="button"
                  className="flex max-w-full items-center gap-1.5 text-left"
                  onClick={startEditingName}
                  data-touch-target
                >
                  <span
                    className="truncate font-serif text-base font-medium"
                    style={{ color: "var(--ink)" }}
                  >
                    {visibleName}
                  </span>
                  <Pencil className="h-3.5 w-3.5 shrink-0" style={{ color: "var(--ink-soft)" }} aria-hidden />
                </button>
              )}
              {nameSaved && (
                <span className="mt-0.5 inline-flex items-center gap-0.5 text-[11px] font-medium" style={{ color: "var(--sage-deep)" }}>
                  <Check className="h-3.5 w-3.5" aria-hidden />
                  {t("profile.saved")}
                </span>
              )}
              {nameError && (
                <p className="mt-0.5 text-[11px]" style={{ color: "var(--red-deep)" }}>
                  {nameError}
                </p>
              )}
              <p className="truncate text-xs" style={{ color: "var(--ink-soft)" }}>
                {user.email}
              </p>
            </div>

            <button
              type="button"
              className="shrink-0 text-[11px] font-semibold"
              style={{ color: "var(--rose-gold-deep)" }}
              onClick={() => setEmojiPickerOpen((open) => !open)}
              data-touch-target
            >
              {t("profile.changeAvatar")}
            </button>
          </div>
          {emojiPickerOpen && (
            <div
              className="flex flex-wrap gap-2 border-t border-border/30 px-4 py-3"
              style={{ backgroundColor: "var(--cream-warm)" }}
              role="group"
              aria-label={t("profile.changeAvatar")}
            >
              {AVATAR_EMOJIS.map((emoji) => {
                const active = localAvatarEmoji === emoji;
                return (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => void pickAvatarEmoji(emoji)}
                    data-touch-target
                    className="flex h-10 w-10 items-center justify-center rounded-full border text-xl transition-colors"
                    style={
                      active
                        ? {
                            borderColor: "var(--sage)",
                            backgroundColor: "var(--sage)",
                          }
                        : {
                            borderColor: "var(--line)",
                            backgroundColor: "#fff",
                          }
                    }
                    aria-pressed={active}
                  >
                    {emoji}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* 2. Plankort */}
        {isPremium ? (
          <div
            className="rounded-3xl border p-4 shadow-sm"
            style={{
              background: "linear-gradient(135deg, var(--gold-soft), #E5C18A)",
              borderColor: "var(--gold)",
            }}
          >
            <p className="mb-0.5 text-[10px] font-bold uppercase tracking-widest" style={{ color: "#4A2D10" }}>
              {t("profile.currentPlanLabel")}
            </p>
            <h3 className="mb-1 font-serif text-lg font-medium" style={{ color: "var(--ink)" }}>
              <Sparkles className="h-4 w-4 inline mr-1" aria-hidden />
              {t("profileCard.premium")}
            </h3>
            <p className="mb-3 text-[12px]" style={{ color: "#4A2D10" }}>
              {t("profileCard.descPremium")}
            </p>
            <button
              type="button"
              onClick={handleManageBilling}
              disabled={portalLoading}
              className="inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-[12px] font-semibold"
              style={{
                borderColor: "var(--gold)",
                color: "#4A2D10",
                background: "rgba(255,255,255,0.5)",
              }}
              data-touch-target
            >
              {portalLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              ) : (
                <CreditCard className="h-4 w-4 inline mr-1" aria-hidden />
              )}
              {t("profileCard.managePlan")}
            </button>
            {portalError && (
              <p className="mt-2 text-[11px] leading-snug" style={{ color: "var(--red-deep)" }}>
                {portalError}
              </p>
            )}
          </div>
        ) : (
          <div className="rounded-3xl border border-border/40 bg-white p-4 shadow-sm">
            <p className="mb-0.5 text-[10px] font-bold uppercase tracking-widest" style={{ color: "var(--ink-soft)" }}>
              {t("profile.currentPlanLabel")}
            </p>
            <h3 className="mb-1 font-serif text-lg font-medium" style={{ color: "var(--ink)" }}>
              {t("profileCard.free")}
            </h3>
            <p className="mb-3 text-[12px]" style={{ color: "var(--ink-soft)" }}>
              {isLoading ? t("profileCard.checkingPlan") : t("profileCard.descFree")}
            </p>
            {runningNative ? (
              <div className="rounded-full border border-border/40 bg-[color-mix(in_srgb,var(--cream-warm)_80%,white)] px-4 py-2.5 text-center text-[12px]" style={{ color: "var(--ink-soft)" }}>
                {t("profileCard.nativePremiumNotice")}
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowPaywall(true)}
                className="w-full rounded-full py-2.5 text-[13px] font-semibold"
                style={{ background: "var(--gold)", color: "var(--ink)" }}
                data-touch-target
              >
                {trialEligible ? (
                  <>
                    <Sparkles className="h-4 w-4 inline mr-1" style={{ color: "var(--ink)" }} aria-hidden />
                    {t("pricing.startTrialCta", { days: TRIAL_DAYS })}
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 inline mr-1" style={{ color: "var(--ink)" }} aria-hidden />
                    {t("profileCard.upgradeToPremium")}
                  </>
                )}
              </button>
            )}
          </div>
        )}

        {/* 3. Min hud */}
        <div>
          <p className="mb-2 px-1 text-[10px] font-bold uppercase tracking-widest" style={{ color: "var(--ink-soft)" }}>
            {t("profile.skinSection")}
          </p>
          <div className="overflow-hidden rounded-3xl border border-border/40 bg-white shadow-sm">
            <button
              type="button"
              className="flex w-full items-center justify-between border-b border-border/30 px-4 py-3.5 text-left"
              data-touch-target
              onClick={openSkinEditor}
            >
              <span className="text-[14px] font-medium" style={{ color: "var(--ink)" }}>
                {t("profile.skinType")}
              </span>
              <span className="flex items-center gap-1 text-[13px]" style={{ color: "var(--ink-soft)" }}>
                {skinTypeLabel} <ChevronRight className="h-4 w-4" aria-hidden />
              </span>
            </button>
            <button
              type="button"
              className="flex w-full items-center justify-between border-b border-border/30 px-4 py-3.5 text-left"
              data-touch-target
              onClick={openSkinEditor}
            >
              <span className="text-[14px] font-medium" style={{ color: "var(--ink)" }}>
                {t("profile.goal")}
              </span>
              <span className="flex max-w-[55%] items-center gap-1 text-[13px]" style={{ color: "var(--ink-soft)" }}>
                <span className="truncate">{goalLabel}</span> <ChevronRight className="h-4 w-4 shrink-0" aria-hidden />
              </span>
            </button>
            <button
              type="button"
              className="flex w-full items-center justify-between px-4 py-3.5 text-left"
              data-touch-target
              onClick={openSkinEditor}
            >
              <span className="text-[14px] font-medium" style={{ color: "var(--ink)" }}>
                {t("profile.age")}
              </span>
              <span className="flex items-center gap-1 text-[13px]" style={{ color: "var(--ink-soft)" }}>
                {ageGroupLabel} <ChevronRight className="h-4 w-4" aria-hidden />
              </span>
            </button>
          </div>
          {showEditor && (
            <div id="skin-profile-editor" className="mt-3 scroll-mt-24">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-sm font-semibold" style={{ color: "var(--ink)" }}>
                  {t("profile.editLabel")}
                </p>
                <button
                  type="button"
                  onClick={() => setShowEditor(false)}
                  className="flex h-8 w-8 items-center justify-center rounded-full"
                  style={{ background: "var(--cream-warm)" }}
                  aria-label={t("common.close")}
                >
                  <X className="h-4 w-4" style={{ color: "var(--ink-soft)" }} aria-hidden />
                </button>
              </div>
              <SkinProfileChips />
            </div>
          )}
        </div>

        {/* 4. Bidrag & belöningar — DOLD tills belöningssystemet är byggt.
            Backend, DB och routes är intakta. Sätt till true för att återaktivera. */}
        {false && (
        <div>
          <p className="mb-2 px-1 text-[10px] font-bold uppercase tracking-widest" style={{ color: "var(--ink-soft)" }}>
            {t("profile.contributionProgress")}
          </p>
          <div className="overflow-hidden rounded-3xl border border-border/40 bg-white shadow-sm">
            <button
              type="button"
              className="flex w-full items-center justify-between border-b border-border/30 px-4 py-3.5 text-left"
              data-touch-target
              onClick={() => navigate("/app/rewards")}
            >
              <span className="text-[14px] font-medium" style={{ color: "var(--ink)" }}>
                {t("profile.contributedProducts")}
              </span>
              <span className="flex items-center gap-1 text-[13px] font-semibold" style={{ color: "var(--sage-deep)" }}>
                {contributed} / {milestone} <ChevronRight className="h-4 w-4" aria-hidden />
              </span>
            </button>
            <button
              type="button"
              className="flex w-full items-center justify-between px-4 py-3.5 text-left"
              data-touch-target
              onClick={() => navigate("/app/leaderboard")}
            >
              <span className="text-[14px] font-medium" style={{ color: "var(--ink)" }}>
                {t("profile.leaderboardBadges")}
              </span>
              <ChevronRight className="h-4 w-4" style={{ color: "var(--ink-soft)" }} aria-hidden />
            </button>
          </div>
        </div>
        )}

        {/* 5. Appen */}
        <div>
          <p className="mb-2 px-1 text-[10px] font-bold uppercase tracking-widest" style={{ color: "var(--ink-soft)" }}>
            {t("profile.appSection")}
          </p>
          <div className="overflow-hidden rounded-3xl border border-border/40 bg-white shadow-sm">
            <button
              type="button"
              className="flex w-full items-center justify-between border-b border-border/30 px-4 py-3.5 text-left"
              data-touch-target
              onClick={() => setLangSheetOpen((o) => !o)}
            >
              <span className="text-[14px] font-medium" style={{ color: "var(--ink)" }}>
                {t("profile.language")}
              </span>
              <span className="flex items-center gap-1 text-[13px]" style={{ color: "var(--ink-soft)" }}>
                {currentLanguageLabel} <ChevronRight className="h-4 w-4" aria-hidden />
              </span>
            </button>
            {langSheetOpen && (
              <div
                className="border-b border-border/30 px-4 py-3"
                style={{ backgroundColor: "var(--cream-warm)" }}
                role="group"
                aria-label={t("profile.language")}
              >
                <div className="flex flex-wrap gap-2">
                  {LOCALES.map((l) => {
                    const active = locale === l.code;
                    return (
                      <button
                        key={l.code}
                        type="button"
                        onClick={() => {
                          setLocale(l.code as Locale);
                          setLangSheetOpen(false);
                        }}
                        data-touch-target
                        className="rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors"
                        style={
                          active
                            ? {
                                borderColor: "var(--sage)",
                                backgroundColor: "var(--sage)",
                                color: "#fff",
                              }
                            : {
                                borderColor: "var(--line)",
                                backgroundColor: "#fff",
                                color: "var(--ink-soft)",
                              }
                        }
                      >
                        {l.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
            <button type="button" className="flex w-full items-center justify-between border-b border-border/30 px-4 py-3.5 text-left" data-touch-target>
              <span className="text-[14px] font-medium" style={{ color: "var(--ink)" }}>
                {t("profile.notifications")}
              </span>
              <ChevronRight className="h-4 w-4" style={{ color: "var(--ink-soft)" }} aria-hidden />
            </button>
            <a
              href="mailto:hello@chimiq.com"
              className="flex w-full items-center justify-between border-b border-border/30 px-4 py-3.5 text-left"
              data-touch-target
            >
              <span className="text-[14px] font-medium" style={{ color: "var(--ink)" }}>
                {t("profileCard.contactSupport")}
              </span>
              <ChevronRight className="h-4 w-4" style={{ color: "var(--ink-soft)" }} aria-hidden />
            </a>
            <button
              type="button"
              onClick={handleLogout}
              className="flex w-full items-center justify-between px-4 py-3.5 text-left"
              data-touch-target
            >
              <span className="text-[14px] font-medium" style={{ color: "var(--rose-gold-deep)" }}>
                {t("profileCard.logout")}
              </span>
              <ChevronRight className="h-4 w-4" style={{ color: "var(--rose-gold-deep)" }} aria-hidden />
            </button>
          </div>
        </div>

        {/* 6. Footer */}
        <div className="py-4 text-center text-[11px]" style={{ color: "var(--ink-soft)" }}>
          <a href={`${base}/legal/privacy`} style={{ color: "var(--ink-soft)" }}>
            {t("profile.footerPrivacy")}
          </a>
          {" · "}
          <a href={`${base}/legal/terms`} style={{ color: "var(--ink-soft)" }}>
            {t("profile.footerTerms")}
          </a>
          {" · "}
          <a href={`${base}/legal/medical-disclaimer`} style={{ color: "var(--ink-soft)" }}>
            {t("profile.footerMedical")}
          </a>
        </div>
      </div>

      {!isPremium && <PaywallModal open={showPaywall} onOpenChange={setShowPaywall} />}
    </AppShell>
  );
}
