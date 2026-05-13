import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { Check, X, Zap, Loader2, ShieldCheck } from "lucide-react";
import { FadeIn } from "@/components/FadeIn";
import { useUserPlan } from "@/hooks/useUserPlan";
import { cn } from "@/lib/utils";
import { getBaseUrl } from "@/lib/base-url";
import { useTranslation } from "@/lib/i18n";
import { getFreeFeatures, getPremiumFeatures } from "@/lib/pricing-features";
import {
  getStoredBillingPreference,
  setStoredBillingPreference,
} from "@/lib/billing-preference";
import { trackEvent } from "@/lib/analytics";

export function PricingSection() {
  const [, navigate] = useLocation();
  const { t } = useTranslation();
  const { plan, isLoading, trialEligible, trialDays } = useUserPlan();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [billing, setBilling] = useState<"monthly" | "yearly">(
    getStoredBillingPreference,
  );

  useEffect(() => {
    setStoredBillingPreference(billing);
  }, [billing]);

  const FREE_FEATURES = useMemo(() => getFreeFeatures(t), [t]);
  const PREMIUM_FEATURES = useMemo(
    () => getPremiumFeatures(t).map((label) => ({ label })),
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
        navigate("/signup?next=/pricing");
        return;
      }
      const data = (await res.json()) as { url?: string; error?: string };
      if (data.url) {
        trackEvent("checkout_start", { plan_type: billing, source: "pricing_section" });
        try {
          localStorage.setItem("skinscreen.checkout_meta", JSON.stringify({ plan_type: billing, source: "pricing_section" }));
        } catch {}
        window.location.href = data.url;
      } else {
        setError(data.error ?? t("pricing.errorGenericShort"));
      }
    } catch {
      setError(t("pricing.errorConnectShort"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <section id="pricing" className="w-full max-w-5xl mx-auto px-4">
      <FadeIn>
        <div className="text-center mb-10">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/60 mb-3">
            {t("pricing.kicker")}
          </p>
          <h2 className="text-3xl sm:text-4xl font-serif font-medium text-foreground mb-3">
            {t("pricing.sectionHeadline")}
          </h2>
          <p className="text-muted-foreground max-w-lg mx-auto">
            {t("pricing.sectionSub")}
          </p>
        </div>
      </FadeIn>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 max-w-3xl mx-auto">
        <FadeIn delay={0.05}>
          <div className="bg-white rounded-3xl border border-border/60 shadow-sm p-7 flex flex-col h-full">
            <div className="mb-5">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">
                {t("pricing.free")}
              </p>
              <div className="flex items-end gap-1">
                <span className="text-3xl font-bold text-foreground">{t("pricing.zeroPrice")}</span>
                <span className="text-muted-foreground mb-0.5">{t("pricing.perMonth")}</span>
              </div>
            </div>

            <div className="space-y-2.5 flex-1">
              {FREE_FEATURES.map((f) => (
                <div key={f.label} className="flex items-center gap-2.5">
                  {f.included ? (
                    <Check className="w-3.5 h-3.5 text-[#15803D] shrink-0" aria-hidden="true" />
                  ) : (
                    <X className="w-3.5 h-3.5 text-muted-foreground/30 shrink-0" />
                  )}
                  <span className={cn(
                    "text-sm",
                    f.included ? "text-foreground" : "text-muted-foreground/40 line-through",
                  )}>
                    {f.label}
                  </span>
                </div>
              ))}
            </div>

            <div className="mt-6">
              <div className="w-full py-2.5 rounded-xl bg-[#F5F5F7] text-center text-sm font-medium text-muted-foreground">
                {plan === "free" ? t("pricing.currentPlan") : t("pricing.included")}
              </div>
            </div>
          </div>
        </FadeIn>

        <FadeIn delay={0.1}>
          <div className="relative rounded-3xl border border-[#D29A55]/40 shadow-xl p-7 flex flex-col h-full overflow-hidden" style={{ backgroundColor: "#F4D8A2" }}>
            <div className="absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl pointer-events-none" style={{ backgroundColor: "rgba(210,154,85,0.25)" }} />

            <div className="relative mb-5">
              <div className="flex items-center gap-2 mb-3">
                <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "#8A6217" }}>{t("pricing.premium")}</p>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ backgroundColor: "rgba(138,98,23,0.15)", color: "#8A6217" }}>
                  <Zap className="w-2.5 h-2.5" /> {t("pricing.mostPopular")}
                </span>
              </div>

              <div className="inline-flex items-center rounded-full p-0.5 mb-3" style={{ backgroundColor: "rgba(138,98,23,0.12)", border: "1px solid rgba(138,98,23,0.2)" }}>
                <button
                  type="button"
                  onClick={() => setBilling("monthly")}
                  className={cn(
                    "px-3 py-1 rounded-full text-[11px] font-semibold transition-colors",
                    billing === "monthly"
                      ? "bg-white"
                      : "hover:bg-white/40",
                  )}
                  style={{ color: billing === "monthly" ? "#2C1A0E" : "rgba(44,26,14,0.55)" }}
                >
                  {t("pricing.monthly")}
                </button>
                <button
                  type="button"
                  onClick={() => setBilling("yearly")}
                  className={cn(
                    "px-3 py-1 rounded-full text-[11px] font-semibold transition-colors flex items-center gap-1.5",
                    billing === "yearly"
                      ? "bg-white"
                      : "hover:bg-white/40",
                  )}
                  style={{ color: billing === "yearly" ? "#2C1A0E" : "rgba(44,26,14,0.55)" }}
                >
                  {t("pricing.yearly")}
                  <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold" style={{ backgroundColor: "#D29A55", color: "white" }}>
                    {t("pricing.save98")}
                  </span>
                </button>
              </div>

              <div className="flex items-end gap-1">
                <span className="text-3xl font-bold" style={{ color: "#2C1A0E" }}>
                  {billing === "yearly" ? "490" : "49"}
                </span>
                <span className="text-base font-semibold mb-0.5" style={{ color: "rgba(44,26,14,0.65)" }}>SEK</span>
                <span className="mb-0.5" style={{ color: "rgba(44,26,14,0.45)" }}>
                  /{billing === "yearly" ? t("pricing.year") : t("pricing.month")}
                </span>
              </div>
              <p className="text-xs mt-1" style={{ color: "rgba(44,26,14,0.40)" }}>
                {billing === "yearly" ? t("pricing.yearlyHintShort") : t("pricing.cancelAnytime")}
              </p>
            </div>

            <div className="space-y-2.5 flex-1 relative">
              {PREMIUM_FEATURES.map((f) => (
                <div key={f.label} className="flex items-center gap-2.5">
                  <Check className="w-3.5 h-3.5 shrink-0" style={{ color: "#8A6217" }} />
                  <span className="text-sm" style={{ color: "rgba(44,26,14,0.80)" }}>{f.label}</span>
                </div>
              ))}
            </div>

            <div className="mt-6 relative">
              {error && (
                <p className="text-xs text-red-600 text-center mb-2">{error}</p>
              )}
              {plan === "premium" ? (
                <div className="w-full py-2.5 rounded-xl text-center text-sm font-medium border" style={{ backgroundColor: "rgba(210,154,85,0.25)", color: "#8A6217", borderColor: "rgba(210,154,85,0.5)" }}>
                  <ShieldCheck className="w-4 h-4 inline mr-1" />
                  {t("pricing.youreOnPremium")}
                </div>
              ) : (
                <button
                  onClick={handleUpgrade}
                  disabled={loading || isLoading}
                  className="w-full py-3 rounded-xl text-sm font-semibold transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  style={{ backgroundColor: "#D29A55", color: "white" }}
                >
                  {loading ? (
                    <><Loader2 className="w-4 h-4 animate-spin" />{t("pricing.redirecting")}</>
                  ) : trialEligible ? (
                    <>{t("pricing.startTrialCta", { days: trialDays })}</>
                  ) : (
                    <>{billing === "yearly" ? t("pricing.getPremiumYr") : t("pricing.getPremiumMo")}</>
                  )}
                </button>
              )}
              {plan !== "premium" && trialEligible && (
                <p className="text-[11px] text-center mt-2 font-medium" style={{ color: "#8A6217" }}>
                  {t("pricing.trialFinePrint", {
                    days: trialDays,
                    price: billing === "yearly" ? "490 SEK/yr" : "49 SEK/mo",
                  })}
                </p>
              )}
            </div>
          </div>
        </FadeIn>
      </div>

      <FadeIn delay={0.15}>
        <p className="text-center text-xs text-muted-foreground/50 mt-6">
          {t("pricing.secureFooter")}
        </p>
      </FadeIn>
    </section>
  );
}
