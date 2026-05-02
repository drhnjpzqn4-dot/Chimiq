import { useMemo, useState } from "react";
import { useLocation } from "wouter";
import {
  Check, X, Zap, ShieldCheck, MessageCircle, FileText, Layers,
  ArrowLeft, Loader2,
} from "lucide-react";
import { FadeIn } from "@/components/FadeIn";
import { useUserPlan } from "@/hooks/useUserPlan";
import { cn } from "@/lib/utils";
import { getBaseUrl } from "@/lib/base-url";
import { useTranslation } from "@/lib/i18n";
import { isNative, openExternal } from "@/lib/native";

export default function Pricing() {
  const [, navigate] = useLocation();
  const { t } = useTranslation();
  const { plan, isLoading: planLoading } = useUserPlan();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [billing, setBilling] = useState<"monthly" | "yearly">("yearly");

  const FREE_FEATURES = useMemo(
    () => [
      { label: t("pricing.feat.safetyAnalysis"), included: true },
      { label: t("pricing.feat.compare2"), included: true },
      { label: t("pricing.feat.findDerm"), included: true },
      { label: t("pricing.feat.barcode"), included: true },
      { label: t("pricing.feat.shelfLimited"), included: true },
      { label: t("pricing.feat.shelfUnlimited"), included: false },
      { label: t("pricing.feat.routineCheck"), included: false },
      { label: t("pricing.feat.aiChatWith"), included: false },
      { label: t("pricing.feat.pdf"), included: false },
    ],
    [t],
  );

  const PREMIUM_FEATURES = useMemo(
    () => [
      { label: t("pricing.feat.safetyAnalysis") },
      { label: t("pricing.feat.compare2") },
      { label: t("pricing.feat.findDerm") },
      { label: t("pricing.feat.barcode") },
      { label: t("pricing.feat.shelfUnlimited") },
      { label: t("pricing.feat.routineCheck") },
      { label: t("pricing.feat.aiChatWith") },
      { label: t("pricing.feat.pdf") },
    ],
    [t],
  );

  const HIGHLIGHTS = useMemo(
    () => [
      {
        icon: Layers,
        title: t("pricing.highlight1Title"),
        desc: t("pricing.highlight1Desc"),
      },
      {
        icon: MessageCircle,
        title: t("pricing.highlight2Title"),
        desc: t("pricing.highlight2Desc"),
      },
      {
        icon: FileText,
        title: t("pricing.highlight3Title"),
        desc: t("pricing.highlight3Desc"),
      },
    ],
    [t],
  );

  const handleUpgrade = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${getBaseUrl()}api/payments/checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ plan: billing }),
      });
      if (res.status === 401) {
        navigate("/");
        return;
      }
      const data = (await res.json()) as { url?: string; error?: string };
      if (data.url) {
        if (isNative()) {
          // App Store / Play Store reader-app flow: open Stripe Checkout in
          // the system in-app browser (SFSafariViewController / Custom Tabs)
          // so cookies and the return URL behave correctly. The app shell
          // never displays Stripe UI inline.
          await openExternal(data.url);
        } else {
          window.location.href = data.url;
        }
      } else {
        setError(data.error ?? t("pricing.errorGeneric"));
      }
    } catch {
      setError(t("pricing.errorConnect"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAFAF8]">
      <div className="max-w-5xl mx-auto px-4 py-12 sm:py-20">
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-10"
        >
          <ArrowLeft className="w-4 h-4" />
          {t("pricing.backToChimiq")}
        </button>

        <FadeIn>
          <div className="text-center mb-14">
            <h1 className="text-4xl sm:text-5xl font-serif font-semibold text-foreground mb-4">
              {t("pricing.headline")}
            </h1>
            <p className="text-lg text-muted-foreground max-w-xl mx-auto">
              {t("pricing.subhead")}
            </p>
          </div>
        </FadeIn>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
          <FadeIn delay={0.05}>
            <div className="bg-white rounded-3xl border border-border/60 shadow-sm p-8 flex flex-col h-full">
              <div className="mb-6">
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">{t("pricing.free")}</p>
                <div className="flex items-end gap-1 mb-1">
                  <span className="text-4xl font-bold text-foreground">{t("pricing.zeroPrice")}</span>
                  <span className="text-muted-foreground mb-1">{t("pricing.perMonth")}</span>
                </div>
                <p className="text-sm text-muted-foreground">{t("pricing.noCard")}</p>
              </div>

              <div className="space-y-3 flex-1">
                {FREE_FEATURES.map((f) => (
                  <div key={f.label} className="flex items-center gap-3">
                    {f.included ? (
                      <Check className="w-4 h-4 text-[#22C55E] shrink-0" />
                    ) : (
                      <X className="w-4 h-4 text-muted-foreground/40 shrink-0" />
                    )}
                    <span className={cn(
                      "text-sm",
                      f.included ? "text-foreground" : "text-muted-foreground/50",
                    )}>
                      {f.label}
                    </span>
                  </div>
                ))}
              </div>

              <div className="mt-8">
                <div className="w-full py-3 rounded-xl bg-[#F5F5F7] text-center text-sm font-medium text-muted-foreground">
                  {plan === "free" ? t("pricing.currentPlan") : t("pricing.includedWithPremium")}
                </div>
              </div>
            </div>
          </FadeIn>

          <FadeIn delay={0.1}>
            <div className="relative bg-[#1A1A2E] rounded-3xl border border-primary/20 shadow-xl p-8 flex flex-col h-full overflow-hidden">
              <div className="absolute top-0 right-0 w-40 h-40 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-32 h-32 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

              <div className="relative mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <p className="text-xs font-semibold uppercase tracking-widest text-primary">{t("pricing.premium")}</p>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/20 text-primary text-[10px] font-bold">
                    <Zap className="w-2.5 h-2.5" /> {t("pricing.bestValue")}
                  </span>
                </div>

                <div className="inline-flex items-center bg-white/5 border border-white/10 rounded-full p-0.5 mb-4">
                  <button
                    type="button"
                    onClick={() => setBilling("monthly")}
                    className={cn(
                      "px-3 py-1 rounded-full text-[11px] font-semibold transition-colors",
                      billing === "monthly"
                        ? "bg-white text-[#1A1A2E]"
                        : "text-white/60 hover:text-white",
                    )}
                  >
                    {t("pricing.monthly")}
                  </button>
                  <button
                    type="button"
                    onClick={() => setBilling("yearly")}
                    className={cn(
                      "px-3 py-1 rounded-full text-[11px] font-semibold transition-colors flex items-center gap-1.5",
                      billing === "yearly"
                        ? "bg-white text-[#1A1A2E]"
                        : "text-white/60 hover:text-white",
                    )}
                  >
                    {t("pricing.yearly")}
                    <span className={cn(
                      "px-1.5 py-0.5 rounded-full text-[9px] font-bold",
                      billing === "yearly"
                        ? "bg-primary text-white"
                        : "bg-primary/30 text-primary",
                    )}>
                      {t("pricing.save98")}
                    </span>
                  </button>
                </div>

                <div className="flex items-end gap-1 mb-1">
                  <span className="text-4xl font-bold text-white">
                    {billing === "yearly" ? "490" : "49"}
                  </span>
                  <span className="text-lg font-semibold text-white/70 mb-1">SEK</span>
                  <span className="text-white/50 mb-1">
                    /{billing === "yearly" ? t("pricing.year") : t("pricing.month")}
                  </span>
                </div>
                <p className="text-sm text-white/50">
                  {billing === "yearly" ? t("pricing.yearlyHint") : t("pricing.monthlyHint")}
                </p>
              </div>

              <div className="space-y-3 flex-1 relative">
                {PREMIUM_FEATURES.map((f) => (
                  <div key={f.label} className="flex items-center gap-3">
                    <Check className="w-4 h-4 text-primary shrink-0" />
                    <span className="text-sm text-white/80">{f.label}</span>
                  </div>
                ))}
              </div>

              <div className="mt-8 relative">
                {error && (
                  <p className="text-xs text-red-400 text-center mb-3">{error}</p>
                )}
                {plan === "premium" ? (
                  <div className="w-full py-3 rounded-xl bg-primary/20 text-center text-sm font-medium text-primary border border-primary/30">
                    <ShieldCheck className="w-4 h-4 inline mr-1.5" />
                    {t("pricing.youreOnPremium")}
                  </div>
                ) : (
                  <button
                    onClick={handleUpgrade}
                    disabled={loading || planLoading}
                    className="w-full py-3 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <><Loader2 className="w-4 h-4 animate-spin" />{t("pricing.redirecting")}</>
                    ) : (
                      <>{billing === "yearly" ? t("pricing.getPremiumYr") : t("pricing.getPremiumMo")}</>
                    )}
                  </button>
                )}
                <p className="text-[11px] text-white/30 text-center mt-3">
                  {t("pricing.securePayment")}
                </p>
              </div>
            </div>
          </FadeIn>
        </div>

        <FadeIn delay={0.15}>
          <div className="mt-14 grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-3xl mx-auto">
            {HIGHLIGHTS.map((item) => (
              <div key={item.title} className="text-center px-4">
                <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
                  <item.icon className="w-5 h-5 text-primary" />
                </div>
                <p className="text-sm font-semibold text-foreground mb-1">{item.title}</p>
                <p className="text-xs text-muted-foreground leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </FadeIn>
      </div>
    </div>
  );
}
