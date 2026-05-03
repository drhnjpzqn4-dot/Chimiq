import { useEffect, useMemo, useState } from "react";
import { useLocation, useRoute } from "wouter";
import {
  Check, X, ShieldCheck, ScanLine, Sparkles, Lock, ArrowRight,
  ChevronDown, Star,
} from "lucide-react";
import { useAuth } from "@workspace/replit-auth-web";
import { useLoginWithConsent } from "@/components/ConsentGate";
import { useTranslation } from "@/lib/i18n";
import { ExitIntentPopup } from "@/components/ExitIntentPopup";
import { trackEvent } from "@/lib/analytics";
import { cn } from "@/lib/utils";
import { getFreeFeatures, getPremiumFeatures } from "@/lib/pricing-features";

interface SiteStats {
  analyses: number;
  products: number;
  users?: number;
}

function useNextParam(): string {
  const base = (import.meta.env.BASE_URL ?? "/").replace(/\/+$/, "") || "";
  if (typeof window === "undefined") return base + "/app/scan";
  const params = new URLSearchParams(window.location.search);
  const next = params.get("next");
  if (next && next.startsWith("/")) return next;
  return base + "/app/scan";
}

export default function Signup() {
  const { t } = useTranslation();
  const { isAuthenticated, isLoading } = useAuth();
  const { requestLogin } = useLoginWithConsent();
  const [, navigate] = useLocation();
  const [isLoginMode] = useRoute("/login");
  const [stats, setStats] = useState<SiteStats | null>(null);
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const next = useNextParam();
  const base = (import.meta.env.BASE_URL ?? "/").replace(/\/+$/, "") || "";

  // Already-signed-in users skip the marketing page entirely.
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      navigate(next, { replace: true });
    }
  }, [isAuthenticated, isLoading, navigate, next]);

  // Page-view analytics (one shot per mount).
  useEffect(() => {
    trackEvent("signup_page_view", { mode: isLoginMode ? "login" : "signup" });
  }, [isLoginMode]);

  useEffect(() => {
    fetch("/api/stats", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setStats(d as SiteStats))
      .catch(() => {});
  }, []);

  const triggerSignup = (source: string) => {
    trackEvent("signup_cta_click", { source, mode: isLoginMode ? "login" : "signup" });
    requestLogin(next);
  };

  const FREE_FEATURE_ROWS = useMemo(() => getFreeFeatures(t), [t]);
  const FREE_FEATURES = useMemo(
    () => FREE_FEATURE_ROWS.filter((f) => f.included).map((f) => f.label),
    [FREE_FEATURE_ROWS],
  );
  const FREE_NOT_INCLUDED = useMemo(
    () => FREE_FEATURE_ROWS.filter((f) => !f.included).map((f) => f.label),
    [FREE_FEATURE_ROWS],
  );
  const PREMIUM_FEATURES = useMemo(() => getPremiumFeatures(t), [t]);

  const TESTIMONIALS = [
    { quote: t("signup.testimonial1"), name: t("signup.testimonial1Name") },
    { quote: t("signup.testimonial2"), name: t("signup.testimonial2Name") },
    { quote: t("signup.testimonial3"), name: t("signup.testimonial3Name") },
  ];

  const FAQ = [
    { q: t("signup.faq1Q"), a: t("signup.faq1A") },
    { q: t("signup.faq2Q"), a: t("signup.faq2A") },
    { q: t("signup.faq3Q"), a: t("signup.faq3A") },
    { q: t("signup.faq4Q"), a: t("signup.faq4A") },
  ];

  const headline = isLoginMode ? t("signup.loginHeadline") : t("signup.headline");
  const subhead = isLoginMode ? t("signup.loginSubhead") : t("signup.subhead");
  const primaryCta = isLoginMode ? t("signup.loginCta") : t("signup.primaryCta");

  if (isLoading || isAuthenticated) {
    return <div className="min-h-screen bg-[#FAFAF8]" aria-hidden />;
  }

  return (
    <div className="min-h-screen bg-[#FAFAF8] pb-24 sm:pb-0">
      <ExitIntentPopup
        enabled={!isAuthenticated && !isLoginMode}
        onCta={() => triggerSignup("exit_popup")}
      />

      {/* Top bar */}
      <header className="sticky top-0 z-30 bg-white/85 backdrop-blur-md border-b border-border/30">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <a href={base + "/"} className="flex items-center" aria-label="Chimiq">
            <img
              src={`${import.meta.env.BASE_URL}images/logo-chimiq-long.png`}
              alt="Chimiq"
              style={{ height: 30, width: "auto", objectFit: "contain" }}
            />
          </a>
          <a
            href={isLoginMode ? base + "/signup" : base + "/login"}
            className="text-sm font-medium text-primary-strong hover:underline"
          >
            {isLoginMode ? t("signup.toggleToSignup") : t("signup.toggleToLogin")}
          </a>
        </div>
      </header>

      {/* Hero */}
      <section className="px-4 sm:px-6 pt-12 sm:pt-16 pb-10">
        <div className="max-w-3xl mx-auto text-center">
          <span className="inline-flex items-center gap-1.5 py-1 px-3 rounded-full bg-primary/10 text-primary-strong text-xs font-semibold tracking-wide mb-5">
            <ShieldCheck className="w-3.5 h-3.5" />
            {t("signup.badge")}
          </span>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-serif font-semibold text-foreground leading-[1.05] tracking-tight mb-5">
            {headline}
          </h1>
          <p className="text-lg sm:text-xl text-muted-foreground max-w-xl mx-auto leading-relaxed mb-8">
            {subhead}
          </p>
          <button
            type="button"
            onClick={() => triggerSignup("hero")}
            className="inline-flex items-center justify-center gap-2 bg-primary-strong hover:bg-primary-strong/90 text-white px-8 py-4 rounded-full text-base font-semibold transition-all duration-200 shadow-[0_8px_30px_rgba(53,110,53,0.25)] hover:shadow-[0_10px_40px_rgba(53,110,53,0.35)] hover:-translate-y-0.5"
          >
            {primaryCta} <ArrowRight className="w-4 h-4" />
          </button>
          <p className="mt-4 text-xs text-muted-foreground flex items-center justify-center gap-1.5">
            <Lock className="w-3 h-3" /> {t("signup.secureNote")}
          </p>
        </div>
      </section>

      {/* Three value bullets */}
      <section className="px-4 sm:px-6 pb-12">
        <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { icon: ScanLine, title: t("signup.value1Title"), body: t("signup.value1Body") },
            { icon: Sparkles, title: t("signup.value2Title"), body: t("signup.value2Body") },
            { icon: ShieldCheck, title: t("signup.value3Title"), body: t("signup.value3Body") },
          ].map((v) => (
            <div
              key={v.title}
              className="bg-white rounded-2xl border border-border/60 p-5 shadow-sm"
            >
              <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary-strong flex items-center justify-center mb-3">
                <v.icon className="w-5 h-5" />
              </div>
              <h3 className="text-base font-semibold text-foreground mb-1.5">{v.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{v.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Free vs Premium comparison */}
      <section className="px-4 sm:px-6 py-12 bg-white border-y border-border/40">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/60 mb-3">
              {t("signup.compareKicker")}
            </p>
            <h2 className="text-3xl sm:text-4xl font-serif font-semibold text-foreground mb-3">
              {t("signup.compareTitle")}
            </h2>
            <p className="text-muted-foreground max-w-lg mx-auto">
              {t("signup.compareSubtitle")}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="bg-[#F7FAF7] rounded-3xl border border-[#DCE9DC] p-7 flex flex-col">
              <div className="mb-5">
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">
                  {t("pricing.free")}
                </p>
                <div className="flex items-end gap-1">
                  <span className="text-3xl font-bold text-foreground">{t("pricing.zeroPrice")}</span>
                  <span className="text-muted-foreground mb-0.5">{t("pricing.perMonth")}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">{t("pricing.noCard")}</p>
              </div>
              <ul className="space-y-2.5 flex-1">
                {FREE_FEATURES.map((label) => (
                  <li key={label} className="flex items-center gap-2.5">
                    <Check className="w-4 h-4 text-[#15803D] shrink-0" aria-hidden="true" />
                    <span className="text-sm text-foreground">{label}</span>
                  </li>
                ))}
                {FREE_NOT_INCLUDED.map((label) => (
                  <li key={label} className="flex items-center gap-2.5">
                    <X className="w-4 h-4 text-muted-foreground/40 shrink-0" aria-hidden="true" />
                    <span className="text-sm text-muted-foreground/60 line-through">{label}</span>
                  </li>
                ))}
              </ul>
              <button
                type="button"
                onClick={() => triggerSignup("compare_free")}
                className="mt-6 w-full py-2.5 rounded-xl bg-primary-strong text-white text-sm font-semibold hover:bg-primary-strong/90 transition-colors"
              >
                {t("signup.startFree")}
              </button>
            </div>

            <div className="relative bg-[#1A1A2E] text-white rounded-3xl border border-primary/20 shadow-xl p-7 flex flex-col overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/15 rounded-full blur-3xl pointer-events-none" />
              <div className="relative mb-5">
                <p className="text-xs font-semibold uppercase tracking-widest text-primary mb-2">
                  {t("pricing.premium")}
                </p>
                <div className="flex items-end gap-1">
                  <span className="text-3xl font-bold">490</span>
                  <span className="text-base font-semibold text-white/70 mb-0.5">SEK</span>
                  <span className="text-white/50 mb-0.5">/{t("pricing.year")}</span>
                </div>
                <p className="text-xs text-white/50 mt-1">{t("pricing.yearlyHintShort")}</p>
              </div>
              <ul className="space-y-2.5 flex-1 relative">
                {PREMIUM_FEATURES.map((label) => (
                  <li key={label} className="flex items-center gap-2.5">
                    <Check className="w-4 h-4 text-primary shrink-0" aria-hidden="true" />
                    <span className="text-sm text-white/85">{label}</span>
                  </li>
                ))}
              </ul>
              <button
                type="button"
                onClick={() => triggerSignup("compare_premium")}
                className="mt-6 w-full py-2.5 rounded-xl bg-white text-[#1A1A2E] text-sm font-semibold hover:bg-white/90 transition-colors"
              >
                {t("signup.startFreeUpgradeLater")}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Social proof: real /api/stats numbers + customer testimonials */}
      <section className="px-4 sm:px-6 py-14">
        <div className="max-w-5xl mx-auto">
          {stats && (stats.analyses > 0 || stats.products > 0 || (stats.users ?? 0) > 0) && (
            <div className="flex flex-wrap justify-center gap-x-10 gap-y-4 mb-10 text-center">
              {(stats.users ?? 0) > 0 && (
                <div>
                  <div className="text-3xl font-serif font-semibold text-foreground">
                    {stats.users!.toLocaleString()}
                  </div>
                  <div className="text-xs uppercase tracking-widest text-muted-foreground mt-1">
                    {t("signup.statUsers")}
                  </div>
                </div>
              )}
              {stats.analyses > 0 && (
                <div>
                  <div className="text-3xl font-serif font-semibold text-foreground">
                    {stats.analyses.toLocaleString()}
                  </div>
                  <div className="text-xs uppercase tracking-widest text-muted-foreground mt-1">
                    {t("signup.statAnalyses")}
                  </div>
                </div>
              )}
              {stats.products > 0 && (
                <div>
                  <div className="text-3xl font-serif font-semibold text-foreground">
                    {stats.products.toLocaleString()}
                  </div>
                  <div className="text-xs uppercase tracking-widest text-muted-foreground mt-1">
                    {t("signup.statProducts")}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {TESTIMONIALS.map((tm) => (
              <figure
                key={tm.name}
                className="bg-white rounded-2xl border border-border/60 p-5 shadow-sm"
              >
                <div className="flex gap-0.5 mb-3 text-amber-400" aria-hidden="true">
                  {[0, 1, 2, 3, 4].map((i) => (
                    <Star key={i} className="w-3.5 h-3.5 fill-current" />
                  ))}
                </div>
                <blockquote className="text-sm text-foreground leading-relaxed mb-3">
                  “{tm.quote}”
                </blockquote>
                <figcaption className="text-xs text-muted-foreground">— {tm.name}</figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="px-4 sm:px-6 py-14 bg-white border-t border-border/40">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-serif font-semibold text-foreground text-center mb-8">
            {t("signup.faqTitle")}
          </h2>
          <div className="space-y-3">
            {FAQ.map((item, i) => {
              const isOpen = openFaq === i;
              return (
                <div
                  key={item.q}
                  className="border border-border/60 rounded-2xl bg-[#FAFAF8] overflow-hidden"
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaq(isOpen ? null : i)}
                    aria-expanded={isOpen}
                    className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left text-sm font-semibold text-foreground"
                  >
                    {item.q}
                    <ChevronDown
                      className={cn(
                        "w-4 h-4 text-muted-foreground shrink-0 transition-transform",
                        isOpen && "rotate-180",
                      )}
                    />
                  </button>
                  {isOpen && (
                    <div className="px-5 pb-4 text-sm text-muted-foreground leading-relaxed">
                      {item.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="px-4 sm:px-6 py-16">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-serif font-semibold text-foreground mb-4">
            {t("signup.finalCtaTitle")}
          </h2>
          <p className="text-muted-foreground mb-7">{t("signup.finalCtaBody")}</p>
          <button
            type="button"
            onClick={() => triggerSignup("final")}
            className="inline-flex items-center justify-center gap-2 bg-primary-strong hover:bg-primary-strong/90 text-white px-8 py-4 rounded-full text-base font-semibold transition-all shadow-[0_8px_30px_rgba(53,110,53,0.25)] hover:-translate-y-0.5"
          >
            {primaryCta} <ArrowRight className="w-4 h-4" />
          </button>
          <p className="mt-3 text-xs text-muted-foreground">{t("signup.finalCtaFinePrint")}</p>
        </div>
      </section>

      {/* Sticky mobile CTA */}
      <div
        className="sm:hidden fixed bottom-0 inset-x-0 z-30 bg-white/95 backdrop-blur-md border-t border-border/40 px-4 py-3"
        style={{ paddingBottom: "max(env(safe-area-inset-bottom, 0px), 0.75rem)" }}
      >
        <button
          type="button"
          onClick={() => triggerSignup("sticky_mobile")}
          className="w-full inline-flex items-center justify-center gap-2 bg-primary-strong hover:bg-primary-strong/90 text-white py-3.5 rounded-full text-sm font-semibold shadow-md"
        >
          {primaryCta} <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
