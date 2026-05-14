import { useEffect, useReducer, useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { ChevronRight, Loader2 } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { SkinProfileChips } from "@/components/SkinProfileChips";
import PaywallModal from "@/components/PaywallModal";
import { apiFetch } from "@/lib/api";
import { useUserPlan } from "@/hooks/useUserPlan";
import { getBaseUrl } from "@/lib/base-url";
import { isNative, openExternal } from "@/lib/native";
import { useTranslation, LOCALES, type Locale } from "@/lib/i18n";
import { PREMIUM_CONTRIBUTION_MILESTONE } from "@/pages/app/Shelf";

interface ContributeStats {
  acceptedContributions: number;
  premiumUntil: string | null;
}

const AGE_GROUP_LABELS: Record<string, string> = {
  "13-15": "13–15",
  "16-17": "16–17",
  "18-20": "18–20",
  "21+": "21+",
};

const SKIN_PROFILE_KEYS: Record<string, string> = {
  sensitive: "scanner.skinType.sensitive",
  young: "scanner.skinType.young",
  mature: "scanner.skinType.mature",
  pregnant: "scanner.skinType.pregnant",
};

function readLs(key: string): string {
  if (typeof window === "undefined") return "";
  try {
    return window.localStorage.getItem(key)?.trim() ?? "";
  } catch {
    return "";
  }
}

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const { isPremium, isLoading, trialEligible } = useUserPlan();
  const [, navigate] = useLocation();
  const { t, locale, setLocale } = useTranslation();
  const [stats, setStats] = useState<ContributeStats | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const [langSheetOpen, setLangSheetOpen] = useState(false);
  const [prefTick, bumpPrefs] = useReducer((n: number) => n + 1, 0);

  const runningNative = isNative();

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
    try {
      const res = await apiFetch(`${getBaseUrl()}api/payments/portal`, {
        method: "POST",
      });
      const data = (await res.json()) as { url?: string };
      if (data.url) {
        if (runningNative) {
          await openExternal(data.url);
        } else {
          window.location.href = data.url;
        }
      }
    } catch {
      // noop
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
  const skinProfileKey = skinRaw ? SKIN_PROFILE_KEYS[skinRaw] : undefined;
  const skinTypeLabel = skinProfileKey ? t(skinProfileKey) : skinRaw ? skinRaw : "Inte valt";

  const ageRaw = readLs("chimiq.ageGroup");
  const ageGroupLabel = ageRaw ? (AGE_GROUP_LABELS[ageRaw] ?? ageRaw) : "Inte valt";

  const goalRaw = readLs("chimiq.skinGoal");
  const goalLabel = goalRaw ? goalRaw : "Inte valt";

  const currentLanguageLabel = LOCALES.find((l) => l.code === locale)?.label ?? locale;

  const milestone = PREMIUM_CONTRIBUTION_MILESTONE;
  const contributed = stats?.acceptedContributions ?? 0;

  void prefTick;

  const scrollToSkinEditor = () => {
    document.getElementById("skin-profile-editor")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <AppShell title="Profil">
      <div className="space-y-4 pb-8">
        <h2 className="font-serif text-[28px] font-medium leading-tight" style={{ color: "var(--ink)" }}>
          Profil
        </h2>
        <p className="text-[14px]" style={{ color: "var(--ink-soft)" }}>
          Din hud, dina mål
        </p>

        {/* 1. Avatar */}
        <div className="rounded-3xl border border-border/40 bg-white p-5 text-center shadow-sm">
          <div
            className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full text-3xl"
            style={{ background: "linear-gradient(135deg, var(--rose-gold), var(--gold))" }}
          >
            ✨
          </div>
          <h3 className="font-serif text-lg font-medium" style={{ color: "var(--ink)" }}>
            {user.firstName ?? user.email?.split("@")[0] ?? "Chimiq"}
          </h3>
          <p className="text-xs" style={{ color: "var(--ink-soft)" }}>
            {user.email}
          </p>
          <button
            type="button"
            className="mt-1 text-[11px] font-semibold"
            style={{ color: "var(--rose-gold-deep)" }}
          >
            Byt avatar
          </button>
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
              CURRENT PLAN
            </p>
            <h3 className="mb-1 font-serif text-lg font-medium" style={{ color: "var(--ink)" }}>
              ✨ Premium
            </h3>
            <p className="mb-3 text-[12px]" style={{ color: "#4A2D10" }}>
              Obegränsad hylla, AI-chatt, hela rutinen i kombo-check.
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
              ) : null}
              💳 Hantera betalning
            </button>
          </div>
        ) : (
          <div className="rounded-3xl border border-border/40 bg-white p-4 shadow-sm">
            <p className="mb-0.5 text-[10px] font-bold uppercase tracking-widest" style={{ color: "var(--ink-soft)" }}>
              CURRENT PLAN
            </p>
            <h3 className="mb-1 font-serif text-lg font-medium" style={{ color: "var(--ink)" }}>
              Gratis
            </h3>
            <p className="mb-3 text-[12px]" style={{ color: "var(--ink-soft)" }}>
              {isLoading
                ? t("profileCard.checkingPlan")
                : "Max 2 produkter på hyllan. Uppgradera för obegränsad hylla, AI-chatt och PDF-rapport."}
            </p>
            {runningNative ? (
              <div className="rounded-full border border-border/40 bg-[color-mix(in_srgb,var(--cream-warm)_80%,white)] px-4 py-2.5 text-center text-[12px]" style={{ color: "var(--ink-soft)" }}>
                {t("profileCard.nativePremiumNotice")}
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowPaywall(true)}
                className="w-full rounded-full py-2.5 text-[13px] font-semibold text-white"
                style={{ background: "var(--sage)" }}
                data-touch-target
              >
                {trialEligible ? "✨ Testa Premium fritt i 14 dagar" : `✨ ${t("profileCard.upgradeToPremium")}`}
              </button>
            )}
          </div>
        )}

        {/* 3. Min hud */}
        <div>
          <p className="mb-2 px-1 text-[10px] font-bold uppercase tracking-widest" style={{ color: "var(--ink-soft)" }}>
            Min hud
          </p>
          <div className="overflow-hidden rounded-3xl border border-border/40 bg-white shadow-sm">
            <button
              type="button"
              className="flex w-full items-center justify-between border-b border-border/30 px-4 py-3.5 text-left"
              data-touch-target
              onClick={scrollToSkinEditor}
            >
              <span className="text-[14px] font-medium" style={{ color: "var(--ink)" }}>
                Hudtyp
              </span>
              <span className="flex items-center gap-1 text-[13px]" style={{ color: "var(--ink-soft)" }}>
                {skinTypeLabel} <ChevronRight className="h-4 w-4" aria-hidden />
              </span>
            </button>
            <button
              type="button"
              className="flex w-full items-center justify-between border-b border-border/30 px-4 py-3.5 text-left"
              data-touch-target
              onClick={scrollToSkinEditor}
            >
              <span className="text-[14px] font-medium" style={{ color: "var(--ink)" }}>
                Mål
              </span>
              <span className="flex max-w-[55%] items-center gap-1 text-[13px]" style={{ color: "var(--ink-soft)" }}>
                <span className="truncate">{goalLabel}</span> <ChevronRight className="h-4 w-4 shrink-0" aria-hidden />
              </span>
            </button>
            <button
              type="button"
              className="flex w-full items-center justify-between px-4 py-3.5 text-left"
              data-touch-target
              onClick={scrollToSkinEditor}
            >
              <span className="text-[14px] font-medium" style={{ color: "var(--ink)" }}>
                Ålder
              </span>
              <span className="flex items-center gap-1 text-[13px]" style={{ color: "var(--ink-soft)" }}>
                {ageGroupLabel} <ChevronRight className="h-4 w-4" aria-hidden />
              </span>
            </button>
          </div>
          <div id="skin-profile-editor" className="mt-3 scroll-mt-24">
            <SkinProfileChips />
          </div>
        </div>

        {/* 4. Bidrag & belöningar */}
        <div>
          <p className="mb-2 px-1 text-[10px] font-bold uppercase tracking-widest" style={{ color: "var(--ink-soft)" }}>
            Bidrag & belöningar
          </p>
          <div className="overflow-hidden rounded-3xl border border-border/40 bg-white shadow-sm">
            <button
              type="button"
              className="flex w-full items-center justify-between border-b border-border/30 px-4 py-3.5 text-left"
              data-touch-target
              onClick={() => navigate("/app/rewards")}
            >
              <span className="text-[14px] font-medium" style={{ color: "var(--ink)" }}>
                Bidragna produkter
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
                Leaderboard & badges
              </span>
              <ChevronRight className="h-4 w-4" style={{ color: "var(--ink-soft)" }} aria-hidden />
            </button>
          </div>
        </div>

        {/* 5. Appen */}
        <div>
          <p className="mb-2 px-1 text-[10px] font-bold uppercase tracking-widest" style={{ color: "var(--ink-soft)" }}>
            Appen
          </p>
          <div className="overflow-hidden rounded-3xl border border-border/40 bg-white shadow-sm">
            <button
              type="button"
              className="flex w-full items-center justify-between border-b border-border/30 px-4 py-3.5 text-left"
              data-touch-target
              onClick={() => setLangSheetOpen((o) => !o)}
            >
              <span className="text-[14px] font-medium" style={{ color: "var(--ink)" }}>
                Språk
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
                Notiser
              </span>
              <ChevronRight className="h-4 w-4" style={{ color: "var(--ink-soft)" }} aria-hidden />
            </button>
            <a
              href="mailto:hello@chimiq.com"
              className="flex w-full items-center justify-between border-b border-border/30 px-4 py-3.5 text-left"
              data-touch-target
            >
              <span className="text-[14px] font-medium" style={{ color: "var(--ink)" }}>
                Kontakta support
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
                Logga ut
              </span>
              <ChevronRight className="h-4 w-4" style={{ color: "var(--rose-gold-deep)" }} aria-hidden />
            </button>
          </div>
        </div>

        {/* 6. Footer */}
        <div className="py-4 text-center text-[11px]" style={{ color: "var(--ink-soft)" }}>
          <a href={`${base}/legal/privacy`} style={{ color: "var(--ink-soft)" }}>
            Privacy
          </a>
          {" · "}
          <a href={`${base}/legal/terms`} style={{ color: "var(--ink-soft)" }}>
            Terms
          </a>
          {" · "}
          <a href={`${base}/legal/medical-disclaimer`} style={{ color: "var(--ink-soft)" }}>
            Medical Disclaimer
          </a>
        </div>
      </div>

      {!isPremium && <PaywallModal open={showPaywall} onOpenChange={setShowPaywall} />}
    </AppShell>
  );
}
