import { lazy, Suspense, useState, useEffect, useRef } from "react";
import { ChatPanelLauncher } from "@/components/ChatPanelLauncher";
import { LazyOnVisible } from "@/components/LazyOnVisible";
import { FadeIn } from "@/components/FadeIn";
import { DangerCard } from "@/components/DangerCard";
import { PWAInstallBanner } from "@/components/PWAInstallBanner";
import { DangerVisual } from "@/components/DangerVisual";
import type { ScannerSeed } from "@/components/IngredientScanner";

// Inlined to avoid pulling the heavy `discover-content` module (curated
// article data, ~22 kB raw) into the marketing landing first-load. Must
// stay in sync with `SCANNER_SEED_STORAGE_KEY` in `@/lib/discover-content`.
const SCANNER_SEED_STORAGE_KEY = "skinscreen:scanner-seed";

const SpiralSection = lazy(() =>
  import("@/components/SpiralSection").then((m) => ({ default: m.SpiralSection })),
);
const IngredientScanner = lazy(() =>
  import("@/components/IngredientScanner").then((m) => ({ default: m.IngredientScanner })),
);
const SocialProof = lazy(() =>
  import("@/components/SocialProof").then((m) => ({ default: m.SocialProof })),
);
const MyShelf = lazy(() =>
  import("@/components/MyShelf").then((m) => ({ default: m.MyShelf })),
);
const MyShelfSection = lazy(() =>
  import("@/components/MyShelf").then((m) => ({ default: m.MyShelfSection })),
);
const PricingSection = lazy(() =>
  import("@/components/PricingSection").then((m) => ({ default: m.PricingSection })),
);
import type { LandingConfig } from "@/lib/landing-config";
import { useAuth } from "@workspace/replit-auth-web";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "@/lib/i18n";
import { useUserPlan } from "@/hooks/useUserPlan";
import {
  ScanLine, ShieldCheck,
  AlertTriangle, HelpCircle, ShieldOff, XCircle, FlaskConical,
  Sun, Moon, Plus, CheckCircle2, ShoppingBag, Bell, User, LogOut,
  Skull, ExternalLink, Share2, ArrowDown, FileText, MessageCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

const smoothScrollTo = (id: string, opts?: { block?: ScrollLogicalPosition }) => {
  const el = document.getElementById(id);
  if (!el) return;
  el.scrollIntoView({
    behavior: prefersReducedMotion() ? "auto" : "smooth",
    block: opts?.block,
  });
};

interface SiteStats {
  analyses: number;
  products: number;
}

const DISASTER_MIX_SEED: ScannerSeed = {
  mode: "compare",
  product1: "Water, Sodium C14-16 Olefin Sulfonate, PEG-80 Sorbitan Laurate, Cocamidopropyl Betaine, Glycerin, Sodium Lauroamphoacetate, Sodium Hydroxide, Hydroxyethylcellulose, Benzoyl Peroxide 10%, Glycol Distearate, Cocamide MEA, Laureth-4, Citric Acid, Tetrasodium EDTA",
  product1Name: "Neutrogena Rapid Clear BP Wash",
  product2: "Water, Dimethicone, Glycerin, Isopropyl Isostearate, Caprylic/Capric Triglyceride, PEG-100 Stearate, Propylene Glycol, Glyceryl Stearate, Cetyl Alcohol, Niacinamide, Retinol, Sodium Hyaluronate, Tocopherol, Phenoxyethanol, Ethylhexylglycerin, Disodium EDTA, Carbomer, Triethanolamine",
  product2Name: "RoC Retinol Correxion Serum",
  autoRun: true,
};

interface LandingPageProps {
  config: LandingConfig;
}

function StickySubNav({ visible }: { visible: boolean }) {
  const { t } = useTranslation();
  return (
    <nav
      aria-label={t("nav.howItWorks")}
      aria-hidden={!visible}
      // @ts-expect-error inert is a valid HTML attribute; React 19 supports it natively, older types don't.
      inert={!visible ? "" : undefined}
      className={cn(
        "fixed top-14 left-0 right-0 z-40 bg-white transition-all duration-300",
        "border-b border-[#E8F0E8]",
        visible ? "translate-y-0 opacity-100" : "-translate-y-full opacity-0 pointer-events-none",
      )}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-11 flex items-center justify-center gap-6 sm:gap-10">
        <a
          href="#how-it-works"
          tabIndex={visible ? 0 : -1}
          onClick={(e) => { e.preventDefault(); smoothScrollTo("how-it-works"); }}
          className="text-[14px] font-medium text-primary-strong no-underline hover:underline transition-colors"
        >
          {t("nav.howItWorks")}
        </a>
        <a
          href="#scanner"
          tabIndex={visible ? 0 : -1}
          onClick={(e) => { e.preventDefault(); smoothScrollTo("scanner"); }}
          className="text-[14px] font-medium text-primary-strong no-underline hover:underline transition-colors"
        >
          {t("nav.tryItNow")}
        </a>
        <a
          href={`${(import.meta.env.BASE_URL ?? "/").replace(/\/+$/, "")}/discover`}
          tabIndex={visible ? 0 : -1}
          className="text-[14px] font-medium text-primary-strong no-underline hover:underline transition-colors"
        >
          {t("nav.discover")}
        </a>
        <a
          href="#earn-premium"
          tabIndex={visible ? 0 : -1}
          onClick={(e) => { e.preventDefault(); smoothScrollTo("earn-premium"); }}
          className="text-[14px] font-medium text-primary-strong no-underline hover:underline transition-colors hidden sm:inline"
        >
          {t("nav.earnFreePremium")}
        </a>
        <a
          href="#download"
          tabIndex={visible ? 0 : -1}
          onClick={(e) => { e.preventDefault(); smoothScrollTo("download"); }}
          className="text-[14px] font-medium text-primary-strong no-underline hover:underline transition-colors hidden sm:inline"
        >
          {t("nav.download")}
        </a>
      </div>
    </nav>
  );
}

function ContactFooterForm() {
  const { t } = useTranslation();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const subject = encodeURIComponent(t("footer.contactSubject"));
    const body = encodeURIComponent(`Name: ${name}\nEmail: ${email}\n\n${message}`);
    window.location.href = `mailto:pia@seafari.se?subject=${subject}&body=${body}`;
    setSubmitted(true);
    setName(""); setEmail(""); setMessage("");
  };

  if (submitted) {
    return (
      <div className="flex items-center justify-center h-full min-h-[200px]">
        <p className="text-sm font-medium text-primary-strong">{t("footer.thanks")}</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <h3 className="text-lg font-serif font-semibold text-foreground mb-1">{t("footer.getInTouch")}</h3>
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder={t("footer.namePlaceholder")}
        required
        className="w-full px-4 py-2.5 rounded-xl border border-[#DCE9DC] bg-white text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-[#7BAF7A]/30 focus:border-[#7BAF7A]/50"
      />
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder={t("footer.emailPlaceholder")}
        required
        className="w-full px-4 py-2.5 rounded-xl border border-[#DCE9DC] bg-white text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-[#7BAF7A]/30 focus:border-[#7BAF7A]/50"
      />
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder={t("footer.messagePlaceholder")}
        rows={4}
        required
        className="w-full px-4 py-2.5 rounded-xl border border-[#DCE9DC] bg-white text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-[#7BAF7A]/30 focus:border-[#7BAF7A]/50 resize-none"
      />
      <button
        type="submit"
        className="w-full bg-primary-strong hover:bg-primary-strong/90 text-white py-3 rounded-xl text-sm font-semibold transition-colors"
      >
        {t("footer.send")}
      </button>
    </form>
  );
}

export function LandingPage({ config }: LandingPageProps) {
  const { t } = useTranslation();
  const { user, isLoading: authLoading, isAuthenticated, logout } = useAuth();
  const [, navigate] = useLocation();
  const { trialEligible, trialDays } = useUserPlan();
  const goToSignup = () => navigate("/signup");
  const goToLogin = () => navigate("/login");
  const [scannerSeed, setScannerSeed] = useState<ScannerSeed | null>(null);
  const [stats, setStats] = useState<SiteStats | null>(null);
  const [subNavVisible, setSubNavVisible] = useState(false);
  const heroRef = useRef<HTMLElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const upgradedToastShown = useRef(false);

  const dangerCombinations = [
    {
      pair: t("dangerZone.combo1Pair"),
      risk: t("dangerZone.combo1Risk"),
      citation: "Kligman, A.M. (1988). The compatibility of combinations of glycolic acid and tretinoin. J Dermatol Treat.",
      citationUrl: "https://doi.org/10.3109/09546639409086912",
      severity: "HIGH RISK" as const,
    },
    {
      pair: t("dangerZone.combo2Pair"),
      risk: t("dangerZone.combo2Risk"),
      citation: "Nighswonger, B.D. et al. (1993). Retinoid interactions with benzoyl peroxide. J Pharm Sci. PMID: 8450449",
      citationUrl: "https://pubmed.ncbi.nlm.nih.gov/8450449/",
      severity: "HIGH RISK" as const,
    },
    {
      pair: t("dangerZone.combo3Pair"),
      risk: t("dangerZone.combo3Risk"),
      citation: "Kornhauser, A. et al. (2010). Applications of hydroxy acids. Clin Cosmet Investig Dermatol.",
      citationUrl: "https://doi.org/10.2147/CCID.S9042",
      severity: "HIGH RISK" as const,
    },
    {
      pair: t("dangerZone.combo4Pair"),
      risk: t("dangerZone.combo4Risk"),
      citation: "Wohlrab, J. & Kreft, D. (2014). Niacinamide — mechanisms of action. Skin Pharmacol Physiol.",
      citationUrl: "https://doi.org/10.1159/000354888",
      severity: "CAUTION" as const,
    },
    {
      pair: t("dangerZone.combo5Pair"),
      risk: t("dangerZone.combo5Risk"),
      citation: "Parvez, S. et al. (2006). Naturally occurring tyrosinase inhibitors. Phytother Res.",
      citationUrl: "https://doi.org/10.1002/ptr.1954",
      severity: "HIGH RISK" as const,
    },
  ];

  useEffect(() => {
    fetch("/api/stats", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setStats(d as SiteStats))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (upgradedToastShown.current) return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("upgraded") === "true") {
      upgradedToastShown.current = true;
      toast({
        title: t("toast.welcomePremium"),
        description: t("toast.welcomePremiumDesc"),
      });
      queryClient.invalidateQueries({ queryKey: ["user-plan"] });
      const url = new URL(window.location.href);
      url.searchParams.delete("upgraded");
      window.history.replaceState({}, "", url.toString());
    }
  }, [toast, queryClient, t]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    let raw: string | null = null;
    try {
      raw = window.sessionStorage.getItem(SCANNER_SEED_STORAGE_KEY);
    } catch {
      return;
    }
    if (!raw) return;
    try {
      window.sessionStorage.removeItem(SCANNER_SEED_STORAGE_KEY);
    } catch {
      // ignore
    }
    try {
      const parsed = JSON.parse(raw) as ScannerSeed;
      if (parsed && (parsed.mode === "single" || parsed.mode === "compare")) {
        setScannerSeed(parsed);
        requestAnimationFrame(() => {
          smoothScrollTo("scanner", { block: "start" });
        });
      }
    } catch {
      // malformed seed — ignore
    }
  }, []);

  useEffect(() => {
    const el = heroRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => setSubNavVisible(!entry.isIntersecting),
      { threshold: 0 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const displayName = user
    ? (user.firstName ?? user.email?.split("@")[0] ?? "there")
    : null;

  const handleDisasterMixScan = () => {
    setScannerSeed({ ...DISASTER_MIX_SEED });
    smoothScrollTo("scanner", { block: "start" });
  };

  const scannerCtaLabel = {
    single: t(config.scannerCtaLabelKey.single as never),
    compare: t(config.scannerCtaLabelKey.compare as never),
  };

  return (
    <main className="min-h-screen bg-background overflow-hidden">
      <PWAInstallBanner />
      {/* TOP NAV */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-border/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          <a href="#hero" className="flex items-center">
            <img
              src={`${import.meta.env.BASE_URL}images/logo-chimiq-long.png`}
              alt="Chimiq"
              style={{ height: 32, width: "auto", objectFit: "contain" }}
            />
          </a>
          <div className="flex items-center gap-3">
            {authLoading ? (
              <div className="h-8 w-20 rounded-full bg-border/40 animate-pulse" />
            ) : isAuthenticated ? (
              <div className="flex items-center gap-2">
                <a
                  href={`${(import.meta.env.BASE_URL ?? "/").replace(/\/+$/, "")}/app`}
                  className="flex items-center gap-1.5 text-sm font-medium text-foreground/80 hover:text-foreground transition-colors"
                >
                  <User className="w-4 h-4" />
                  <span className="hidden sm:inline">{displayName}</span>
                  <span className="sm:hidden">{t("nav.myShelf")}</span>
                </a>
                <button
                  onClick={logout}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded-lg hover:bg-border/20"
                  aria-label={t("auth.logOut")}
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{t("auth.logOut")}</span>
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={goToLogin}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-white bg-primary-strong hover:bg-primary-strong/90 px-4 py-2 rounded-full transition-colors"
              >
                {t("auth.signIn")}
              </button>
            )}
          </div>
        </div>
      </nav>
      {/* STICKY SUB-NAV */}
      <StickySubNav visible={subNavVisible} />
      {/* 1. HERO */}
      <section ref={heroRef} id="hero" className="isolate relative min-h-[92vh] flex flex-col overflow-hidden">
        <img
          src={`${import.meta.env.BASE_URL}images/hero-dark.png`}
          alt=""
          className="absolute inset-0 w-full h-full object-cover scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-black/80 via-black/55 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#0d200d]/60 to-transparent" />

        <div className="relative z-10 flex-1 flex flex-col justify-center items-center text-center px-4 sm:px-6 lg:px-8 pt-28 pb-16 max-w-5xl mx-auto w-full">

          <FadeIn direction="down" delay={0.1}>
            <span className="inline-flex items-center gap-1.5 py-1.5 px-4 rounded-full bg-white/10 backdrop-blur-sm border border-white/15 text-white/70 text-xs font-medium tracking-widest uppercase mb-8">
              <ShieldCheck className="w-3 h-3 text-primary" />
              {t("hero.badge")}
            </span>
          </FadeIn>

          <FadeIn delay={0.2} className="max-w-4xl">
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-[5.5rem] font-serif text-white leading-[1.08] tracking-tight mb-4">
              {t("landing.heroLine1")}<br className="hidden sm:block" />{" "}
              {t("landing.heroLine2")}{" "}
              <span className="italic text-white/50">{t("landing.heroItalic")}</span>
            </h1>
            <p className="text-lg sm:text-xl font-light text-white/80 mt-5 max-w-2xl mx-auto leading-relaxed">
              {t("landing.heroBody")}
            </p>
          </FadeIn>

          <FadeIn delay={0.45}>
            <div className="flex flex-wrap justify-center gap-2 mt-10 mb-10 max-w-2xl mx-auto">
              {[
                { name: "Retinol", conflict: true, floatDuration: "2.6s", floatDelay: "0s", badgeDelay: "2.4s", pulseDelay: "3.1s" },
                { name: "Glycolic Acid", conflict: true, floatDuration: "3.1s", floatDelay: "0.4s", badgeDelay: "2.9s", pulseDelay: "3.6s" },
                { name: "Niacinamide", conflict: false, floatDuration: "2.8s", floatDelay: "0.7s", badgeDelay: "", pulseDelay: "" },
                { name: "Benzoyl Peroxide", conflict: true, floatDuration: "2.4s", floatDelay: "0.2s", badgeDelay: "3.3s", pulseDelay: "4.0s" },
                { name: "Vitamin C", conflict: false, floatDuration: "3.0s", floatDelay: "0.9s", badgeDelay: "", pulseDelay: "" },
                { name: "AHA / BHA", conflict: false, floatDuration: "2.7s", floatDelay: "0.5s", badgeDelay: "", pulseDelay: "" },
              ].map((ing) => {
                const isClickable = ing.conflict;
                const pillContent = (
                  <>
                    {ing.name}
                    {ing.conflict && (
                      <span
                        className="absolute -top-2.5 -right-2 bg-red-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap shadow-lg"
                        style={{
                          animation: `hero-conflict-in 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) ${ing.badgeDelay} both, hero-conflict-pulse 1.8s ease-in-out ${ing.pulseDelay} infinite`,
                          opacity: 0,
                        }}
                      >
                        {t("hero.conflict")}
                      </span>
                    )}
                  </>
                );
                const pillClass = "relative inline-flex items-center px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/15 text-white/75 text-sm font-medium";
                const pillStyle = {
                  animation: `hero-float ${ing.floatDuration} ease-in-out infinite`,
                  animationDelay: ing.floatDelay,
                };
                return isClickable ? (
                  <a
                    key={ing.name}
                    href="#danger-zone"
                    onClick={(e) => { e.preventDefault(); smoothScrollTo("danger-zone"); }}
                    className={pillClass + " cursor-pointer hover:bg-white/18 transition-colors"}
                    style={pillStyle}
                  >
                    {pillContent}
                  </a>
                ) : (
                  <div key={ing.name} className={pillClass} style={pillStyle}>
                    {pillContent}
                  </div>
                );
              })}
            </div>
          </FadeIn>

          {/* CTAs */}
          <FadeIn delay={0.65}>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              {isAuthenticated ? (
                <a
                  href="#scanner"
                  onClick={(e) => { e.preventDefault(); smoothScrollTo("scanner"); }}
                  className="inline-flex items-center justify-center gap-2.5 bg-primary-strong hover:bg-primary-strong/90 text-white px-8 py-4 rounded-full text-base font-semibold transition-all duration-200 shadow-[0_0_40px_rgba(53,110,53,0.35)] hover:shadow-[0_0_60px_rgba(53,110,53,0.5)] hover:-translate-y-0.5 w-full sm:w-auto"
                >
                  {t("nav.tryItNowArrow")}
                </a>
              ) : (
                <button
                  type="button"
                  onClick={goToSignup}
                  className="inline-flex items-center justify-center gap-2.5 bg-primary-strong hover:bg-primary-strong/90 text-white px-8 py-4 rounded-full text-base font-semibold transition-all duration-200 shadow-[0_0_40px_rgba(53,110,53,0.35)] hover:shadow-[0_0_60px_rgba(53,110,53,0.5)] hover:-translate-y-0.5 w-full sm:w-auto"
                >
                  {trialEligible
                    ? t("pricing.startTrialCta", { days: trialDays })
                    : t("nav.signInGetStarted")}
                </button>
              )}
              <a
                href="#how-it-works"
                onClick={(e) => { e.preventDefault(); smoothScrollTo("how-it-works"); }}
                className="inline-flex items-center justify-center gap-2 bg-white/10 hover:bg-white/18 backdrop-blur-sm text-white border border-white/25 px-8 py-4 rounded-full text-base font-medium transition-all duration-200 hover:-translate-y-0.5 w-full sm:w-auto"
              >
                {t("nav.seeHowItWorks")}
              </a>
            </div>
            {!isAuthenticated && trialEligible && (
              <p className="mt-4 text-center text-xs text-white/60 max-w-md mx-auto">
                {t("pricing.trialFinePrint", {
                  days: trialDays,
                  price: "49 SEK/mo",
                })}
              </p>
            )}
          </FadeIn>

        </div>
      </section>
      {/* 2. HOW IT WORKS */}
      <section id="how-it-works" className="py-24 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-5xl mx-auto">
          <FadeIn>
            <div className="text-center mb-14">
              <h2 className="text-3xl md:text-5xl font-serif mb-4">{t("howItWorks.title")}</h2>
              <p className="text-muted-foreground max-w-xl mx-auto text-lg">
                {t("howItWorks.subtitle")}
              </p>
            </div>
          </FadeIn>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Card 1: Scan or paste */}
            <FadeIn delay={0.1}>
              <div className="flex flex-col items-center text-center p-6 rounded-2xl" style={{ background: "#F7FAF7", borderRadius: 16 }}>
                <div className="mb-5">
                  <svg width="80" height="80" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect x="10" y="5" width="50" height="56" rx="8" fill="white" stroke="#DCE9DC" strokeWidth="1.5"/>
                    <rect x="19" y="16" width="24" height="3" rx="1.5" fill="#7BAF7A"/>
                    <rect x="19" y="24" width="32" height="2" rx="1" fill="#C8DCC8"/>
                    <rect x="19" y="29" width="27" height="2" rx="1" fill="#C8DCC8"/>
                    <rect x="19" y="34" width="30" height="2" rx="1" fill="#C8DCC8"/>
                    <rect x="19" y="39" width="20" height="2" rx="1" fill="#C8DCC8"/>
                    <rect x="19" y="44" width="25" height="2" rx="1" fill="#C8DCC8"/>
                    <rect x="10" y="68" width="50" height="7" rx="3" fill="#F0F7F0" stroke="#DCE9DC" strokeWidth="1"/>
                    <rect x="14" y="70" width="1.5" height="3" rx="0.5" fill="#2A2A2A"/>
                    <rect x="17" y="70" width="1" height="3" rx="0.5" fill="#2A2A2A"/>
                    <rect x="19.5" y="70" width="2" height="3" rx="0.5" fill="#2A2A2A"/>
                    <rect x="23" y="70" width="1" height="3" rx="0.5" fill="#2A2A2A"/>
                    <rect x="25" y="70" width="1.5" height="3" rx="0.5" fill="#2A2A2A"/>
                    <rect x="28" y="70" width="2.5" height="3" rx="0.5" fill="#2A2A2A"/>
                    <rect x="32" y="70" width="1" height="3" rx="0.5" fill="#2A2A2A"/>
                    <rect x="34.5" y="70" width="1.5" height="3" rx="0.5" fill="#2A2A2A"/>
                    <rect x="37" y="70" width="1" height="3" rx="0.5" fill="#2A2A2A"/>
                    <rect x="39.5" y="70" width="2" height="3" rx="0.5" fill="#2A2A2A"/>
                    <rect x="43" y="70" width="1.5" height="3" rx="0.5" fill="#2A2A2A"/>
                    <rect x="46" y="70" width="2" height="3" rx="0.5" fill="#2A2A2A"/>
                    <rect x="50" y="70" width="1.5" height="3" rx="0.5" fill="#2A2A2A"/>
                    <rect x="53" y="70" width="1" height="3" rx="0.5" fill="#2A2A2A"/>
                    <rect x="55.5" y="70" width="2" height="3" rx="0.5" fill="#2A2A2A"/>
                  </svg>
                </div>
                <h3 className="text-xl font-serif font-semibold mb-3">{t("howItWorks.scanTitle")}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{t("howItWorks.scanBody")}</p>
              </div>
            </FadeIn>

            {/* Card 2: Build your routine */}
            <FadeIn delay={0.25}>
              <div className="flex flex-col items-center text-center p-6 rounded-2xl" style={{ background: "#F7FAF7", borderRadius: 16 }}>
                <div className="mb-5">
                  <svg width="80" height="80" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
                    {/* Bottle 1 — left */}
                    <rect x="8" y="30" width="16" height="32" rx="5" fill="#A8CFA7"/>
                    <rect x="11" y="22" width="10" height="10" rx="3" fill="#7BAF7A"/>
                    <rect x="13" y="18" width="6" height="6" rx="2" fill="#5A9959"/>
                    <rect x="10" y="42" width="12" height="2" rx="1" fill="white" opacity="0.5"/>
                    <rect x="10" y="46" width="8" height="1.5" rx="0.75" fill="white" opacity="0.35"/>
                    {/* Bottle 2 — centre (taller) */}
                    <rect x="32" y="24" width="16" height="38" rx="5" fill="#7BAF7A"/>
                    <rect x="35" y="16" width="10" height="10" rx="3" fill="#5A9959"/>
                    <rect x="37" y="12" width="6" height="6" rx="2" fill="#3E7A3D"/>
                    <rect x="34" y="38" width="12" height="2" rx="1" fill="white" opacity="0.5"/>
                    <rect x="34" y="42" width="8" height="1.5" rx="0.75" fill="white" opacity="0.35"/>
                    {/* Bottle 3 — right */}
                    <rect x="56" y="30" width="16" height="32" rx="5" fill="#B8D9B7"/>
                    <rect x="59" y="22" width="10" height="10" rx="3" fill="#8FC48E"/>
                    <rect x="61" y="18" width="6" height="6" rx="2" fill="#7BAF7A"/>
                    <rect x="58" y="42" width="12" height="2" rx="1" fill="white" opacity="0.5"/>
                    <rect x="58" y="46" width="8" height="1.5" rx="0.75" fill="white" opacity="0.35"/>
                  </svg>
                </div>
                <h3 className="text-xl font-serif font-semibold mb-3">{t("howItWorks.routineTitle")}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{t("howItWorks.routineBody")}</p>
              </div>
            </FadeIn>

            {/* Card 3: See the risks */}
            <FadeIn delay={0.4}>
              <div className="flex flex-col items-center text-center p-6 rounded-2xl" style={{ background: "#F7FAF7", borderRadius: 16 }}>
                <div className="mb-5 flex items-center justify-center" style={{ height: 80 }}>
                  <div style={{ background: "#FEF2F2", border: "1.5px solid #FECACA", borderRadius: 12, padding: "10px 14px", minWidth: 150 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                      <span style={{ background: "#EF4444", color: "#fff", borderRadius: 5, padding: "2px 7px", fontSize: 9, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase" }}>{t("dangerZone.severityHigh")}</span>
                    </div>
                    <p style={{ fontWeight: 700, color: "#991B1B", fontSize: 11, lineHeight: 1.3, margin: 0 }}>{t("howItWorks.demoPair")}</p>
                    <p style={{ color: "#B91C1C", fontSize: 10, margin: "4px 0 0", lineHeight: 1.4, opacity: 0.8 }}>{t("howItWorks.demoSubtitle")}</p>
                  </div>
                </div>
                <h3 className="text-xl font-serif font-semibold mb-3">{t("howItWorks.risksTitle")}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{t("howItWorks.risksBody")}</p>
              </div>
            </FadeIn>
          </div>
        </div>
      </section>
      {/* 3. SCANNER */}
      <section id="scanner" className="py-24 px-4 sm:px-6 lg:px-8 bg-[#F5F5F7]">
        <div className="max-w-5xl mx-auto">
          <FadeIn>
            <div className="text-center mb-10">
              <p
                style={{
                  textTransform: "uppercase",
                  fontSize: 11,
                  letterSpacing: "0.14em",
                  color: "#356E35",
                  fontWeight: 600,
                  marginBottom: 12,
                }}
                className="text-[25px] mt-[0px] mb-[17px] font-bold">
                {t("scannerSection.kicker")}
              </p>
              <h2
                style={{
                  fontFamily: "'Playfair Display', Georgia, serif",
                  fontSize: "clamp(38px, 5vw, 44px)",
                  fontWeight: 700,
                  color: "#1A1A1A",
                  marginBottom: 12,
                  letterSpacing: "-0.01em",
                  lineHeight: 1.1,
                }}
              >
                {t("scannerSection.brand")}
              </h2>
              <p className="text-muted-foreground max-w-xl mx-auto">{t(config.scannerSubheadKey as never)}</p>
            </div>
          </FadeIn>

          {/* Scanner card */}
          <div
            className="mx-auto"
            style={{
              background: "#F7FAF7",
              border: "1px solid #DCE9DC",
              borderRadius: 24,
              padding: "40px",
              maxWidth: 760,
              boxShadow: "0 4px 32px rgba(0,0,0,0.05)",
            }}
          >
            <LazyOnVisible minHeight={320}>
              <Suspense fallback={<div style={{ minHeight: 320 }} />}>
                <IngredientScanner ctaLabel={scannerCtaLabel} seed={scannerSeed} />
              </Suspense>
            </LazyOnVisible>
          </div>
        </div>
      </section>
      {/* 4. DANGER COMBINATIONS */}
      <section id="danger-zone" className="py-24 px-4 sm:px-6 lg:px-8 bg-[#FAFAF8]">
        <div className="max-w-7xl mx-auto">
          <FadeIn>
            <h2 className="text-3xl md:text-5xl font-serif text-center mb-4">
              {t("dangerZone.title")}
            </h2>
            <p className="text-center text-muted-foreground max-w-2xl mx-auto mb-16">
              {t("dangerZone.subtitle")}
            </p>
          </FadeIn>

          <DangerVisual />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
            {dangerCombinations.map((combo, idx) => (
              <DangerCard
                key={combo.pair}
                pair={combo.pair}
                risk={combo.risk}
                citation={combo.citation}
                citationUrl={combo.citationUrl}
                severity={combo.severity}
                delay={idx * 0.1}
              />
            ))}
          </div>
        </div>
      </section>
      {/* 4b. DISASTER MIX */}
      <section id="disaster-mix" className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <FadeIn>
            <div className="text-center mb-12">
              <span className="inline-flex items-center gap-1.5 py-1 px-3 rounded-full bg-red-100 text-red-600 text-sm font-semibold tracking-wide mb-6">
                <Skull className="w-3.5 h-3.5" />
                {t("disasterMix.badge")}
              </span>
              <h2 className="text-3xl md:text-5xl font-serif mb-4">
                {t("disasterMix.titleLine1")}<br className="hidden sm:block" />
                <span className="italic text-red-500">{t("disasterMix.titleItalic")}</span>
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto text-lg leading-relaxed">
                {t("disasterMix.subtitle")}
              </p>
            </div>
          </FadeIn>

          <FadeIn delay={0.15}>
            <div className="rounded-3xl border border-red-200 bg-red-50/40 overflow-hidden">
              <div className="px-6 sm:px-10 pt-8 pb-6">
                <p className="text-xs font-bold uppercase tracking-widest text-red-400 mb-5 text-center">{t("disasterMix.theRoutine")}</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                  {[
                    {
                      brand: "The Ordinary",
                      name: "Retinol 1% in Squalane",
                      activeIngredient: "Retinol 1%",
                      role: t("disasterMix.rolePmSerum"),
                      image: `${import.meta.env.BASE_URL}images/the-ordinary-retinol.webp`,
                      imageAlt: "The Ordinary Retinol 1% in Squalane bottle",
                    },
                    {
                      brand: "The Ordinary",
                      name: "Salicylic Acid 2% Anhydrous Solution",
                      activeIngredient: "Salicylic Acid 2%",
                      role: t("disasterMix.roleAmPm"),
                      image: `${import.meta.env.BASE_URL}images/the-ordinary-salicylic-acid.webp`,
                      imageAlt: "The Ordinary Salicylic Acid 2% Anhydrous Solution bottle",
                    },
                    {
                      brand: "The Ordinary",
                      name: "AHA 30% + BHA 2% Peeling Solution",
                      activeIngredient: "AHA 30% + BHA 2%",
                      role: t("disasterMix.rolePmExfoliant"),
                      image: `${import.meta.env.BASE_URL}images/the-ordinary-aha-bha.webp`,
                      imageAlt: "The Ordinary AHA 30% + BHA 2% Peeling Solution bottle",
                    },
                  ].map((product) => (
                    <div key={product.name} className="flex flex-col rounded-2xl border border-red-100 shadow-sm overflow-hidden bg-white">
                      <div className="h-40 flex items-center justify-center relative bg-gray-50">
                        <img
                          src={product.image}
                          alt={product.imageAlt}
                          className="h-full w-full object-contain p-3"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                        />
                        <span className="absolute top-2.5 right-2.5 text-[9px] font-semibold uppercase tracking-wider text-red-200/90 bg-red-500/40 px-2 py-0.5 rounded-full border border-red-400/30">
                          {product.role}
                        </span>
                      </div>
                      <div className="p-3.5">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-0.5">{product.brand}</p>
                        <p className="text-sm font-serif font-semibold text-foreground leading-snug mb-1">{product.name}</p>
                        <p className="text-xs font-semibold text-red-500">{product.activeIngredient}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="space-y-4">
                  <p className="text-xs font-bold uppercase tracking-widest text-red-400 text-center mb-2">{t("disasterMix.whatHappens")}</p>

                  <div className="p-4 rounded-2xl bg-red-100/60 border border-red-200">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-xl bg-red-500 flex items-center justify-center shrink-0 mt-0.5">
                        <XCircle className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-red-700 mb-1">{t("disasterMix.bp1Title")}</p>
                        <p className="text-sm text-red-700/80 leading-relaxed">
                          {t("disasterMix.bp1Body")}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-red-100/60 border border-red-200">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-xl bg-red-500 flex items-center justify-center shrink-0 mt-0.5">
                        <AlertTriangle className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-red-700 mb-1">{t("disasterMix.bp2Title")}</p>
                        <p className="text-sm text-red-700/80 leading-relaxed">
                          {t("disasterMix.bp2Body")}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="px-6 sm:px-10 py-6 bg-red-50 border-t border-red-200">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                  <p className="text-sm font-medium text-red-700">{t("disasterMix.cta")}</p>
                  <button
                    type="button"
                    onClick={handleDisasterMixScan}
                    className="inline-flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white px-5 py-2.5 rounded-full text-sm font-semibold transition-colors shadow-sm shrink-0"
                  >
                    <FlaskConical className="w-3.5 h-3.5" />
                    {t("disasterMix.ctaButton")}
                  </button>
                </div>
              </div>
            </div>
          </FadeIn>
        </div>
      </section>
      {/* 5. SOCIAL PROOF */}
      <LazyOnVisible minHeight={240}>
        <Suspense fallback={null}>
          <SocialProof style={config.socialProofStyle} />
        </Suspense>
      </LazyOnVisible>
      {/* 6. SKINCARE SPIRAL */}
      <section id="spiral" className="py-24 bg-[#F5F5F7]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <LazyOnVisible minHeight={400}>
            <Suspense fallback={null}>
              <SpiralSection />
            </Suspense>
          </LazyOnVisible>
        </div>
      </section>
      {/* 7. MY SHELF */}
      <section id="my-shelf" className="py-24 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24 items-start">

            <FadeIn direction="right">
              <div>
                <span className="inline-block py-1 px-3 rounded-full bg-primary/15 text-primary-strong text-sm font-medium tracking-wide mb-6">
                  {isAuthenticated ? t("myShelfMkt.kickerYour") : t("myShelfMkt.kickerSoon")}
                </span>
                <h2 className="text-3xl md:text-5xl font-serif mb-6 leading-tight">
                  {t("myShelfMkt.titleLine1")}<br />
                  <span className="italic text-muted-foreground">{t("myShelfMkt.titleItalic")}</span>
                </h2>
                <p className="text-muted-foreground text-lg leading-relaxed mb-8">
                  {t("myShelfMkt.body")}
                </p>
                <ul className="space-y-4 mb-10">
                  {[
                    { icon: Sun, text: t("myShelfMkt.feature1") },
                    { icon: ShoppingBag, text: t("myShelfMkt.feature2") },
                    { icon: Bell, text: t("myShelfMkt.feature3") },
                    { icon: FileText, text: t("myShelfMkt.feature4") },
                    { icon: MessageCircle, text: t("myShelfMkt.feature5") },
                  ].map(({ icon: Icon, text }) => (
                    <li key={text} className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                        <Icon className="w-4 h-4 text-primary-strong" />
                      </div>
                      <span className="text-foreground leading-snug">{text}</span>
                    </li>
                  ))}
                </ul>
                {!isAuthenticated && (
                  <button
                    type="button"
                    onClick={goToSignup}
                    className="inline-flex items-center gap-2 text-white bg-primary-strong hover:bg-primary-strong/90 px-6 py-3 rounded-full font-medium text-sm transition-colors shadow-md hover:-translate-y-0.5"
                  >
                    {t("myShelfMkt.signInToStart")}
                  </button>
                )}
                {isAuthenticated && (
                  <p className="flex items-center gap-2 text-primary-strong font-medium text-sm">
                    <CheckCircle2 className="w-4 h-4" />
                    {t("myShelfMkt.signedInAs", { name: displayName ?? "" })}
                  </p>
                )}
              </div>
            </FadeIn>

            <FadeIn direction="left" delay={0.15}>
              {isAuthenticated && user ? (
                <LazyOnVisible minHeight={400}>
                  <Suspense fallback={null}>
                    <MyShelf userId={user.id} displayName={displayName} />
                  </Suspense>
                </LazyOnVisible>
              ) : (
                <div className="relative">
                  <div className="pointer-events-none opacity-60">
                    <LazyOnVisible minHeight={400}>
                      <Suspense fallback={null}>
                        <MyShelfSection />
                      </Suspense>
                    </LazyOnVisible>
                  </div>
                  <div className="absolute inset-0 flex flex-col items-center justify-center rounded-3xl bg-white/70 backdrop-blur-sm">
                    <div className="text-center px-6">
                      <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                        <User className="w-6 h-6 text-primary-strong" />
                      </div>
                      <p className="font-serif text-lg font-semibold text-foreground mb-2">
                        {t("myShelfMkt.shelfWaitingTitle")}
                      </p>
                      <p className="text-sm text-muted-foreground mb-5">
                        {t("myShelfMkt.shelfWaitingBody")}
                      </p>
                      <button
                        onClick={goToSignup}
                        className="inline-flex items-center gap-2 text-white bg-primary-strong hover:bg-primary-strong/90 px-5 py-2.5 rounded-full font-medium text-sm transition-colors"
                      >
                        {t("myShelfMkt.signInToGetStarted")}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </FadeIn>

          </div>
        </div>
      </section>
      {/* 8. PRICING */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-white border-t border-border/50">
        <LazyOnVisible minHeight={500}>
          <Suspense fallback={null}>
            <PricingSection />
          </Suspense>
        </LazyOnVisible>
      </section>
      {/* 9. EARN FREE PREMIUM */}
      <section id="earn-premium" className="py-24 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto border-t border-border/50">
        <FadeIn>
          <div className="text-center mb-14">
            <span className="inline-block py-1 px-3 rounded-full bg-primary/15 text-primary-strong text-sm font-medium tracking-wide mb-5">
              {t("earnPremium.kicker")}
            </span>
            <h2 className="text-4xl md:text-5xl font-serif text-foreground mb-4 tracking-tight">
              {t("earnPremium.titleLine1")} <span className="italic text-muted-foreground">{t("earnPremium.titleItalic")}</span>
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              {t("earnPremium.subtitle")}
            </p>
          </div>
        </FadeIn>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
          <FadeIn direction="right">
            <div className="h-full p-7 rounded-2xl bg-[#F7FAF7] border border-[#E8F0E8]">
              <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center mb-5">
                <ShieldCheck className="w-5 h-5 text-primary-strong" />
              </div>
              <h3 className="text-2xl font-serif text-foreground mb-3 leading-tight">
                {t("earnPremium.privateTitle")}
              </h3>
              <p className="text-muted-foreground mb-5 leading-relaxed">
                {t("earnPremium.privateBody")}
              </p>
              <ul className="space-y-2.5 text-sm text-foreground/85">
                <li className="flex items-start gap-2"><span className="text-primary-strong mt-0.5">✓</span><span>{t("earnPremium.privateBullet1")}</span></li>
                <li className="flex items-start gap-2"><span className="text-primary-strong mt-0.5">✓</span><span>{t("earnPremium.privateBullet2")}</span></li>
                <li className="flex items-start gap-2"><span className="text-primary-strong mt-0.5">✓</span><span>{t("earnPremium.privateBullet3")}</span></li>
              </ul>
            </div>
          </FadeIn>

          <FadeIn direction="left" delay={0.1}>
            <div className="h-full p-7 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/25">
              <div className="w-11 h-11 rounded-xl bg-primary/20 flex items-center justify-center mb-5">
                <Plus className="w-5 h-5 text-primary-strong" />
              </div>
              <h3 className="text-2xl font-serif text-foreground mb-3 leading-tight">
                {t("earnPremium.contribTitlePart1")} <span className="text-primary-strong">{t("earnPremium.contribTitlePart2")}</span>
              </h3>
              <p className="text-muted-foreground mb-5 leading-relaxed">
                {t("earnPremium.contribBody")}
              </p>
              <ul className="space-y-2.5 text-sm text-foreground/85 mb-6">
                <li className="flex items-start gap-2"><span className="text-primary-strong mt-0.5">•</span><span><strong>{t("earnPremium.contribBullet1Bold")}</strong> {t("earnPremium.contribBullet1Rest")}</span></li>
                <li className="flex items-start gap-2"><span className="text-primary-strong mt-0.5">•</span><span><strong>{t("earnPremium.contribBullet2Bold")}</strong> {t("earnPremium.contribBullet2Rest")}</span></li>
                <li className="flex items-start gap-2"><span className="text-primary-strong mt-0.5">•</span><span><strong>{t("earnPremium.contribBullet3Bold")}</strong> {t("earnPremium.contribBullet3Rest")}</span></li>
                <li className="flex items-start gap-2"><span className="text-primary-strong mt-0.5">•</span><span><strong>{t("earnPremium.contribBullet4Bold")}</strong> {t("earnPremium.contribBullet4Rest")}</span></li>
              </ul>
              {!isAuthenticated ? (
                <button
                  type="button"
                  onClick={goToSignup}
                  className="inline-flex items-center gap-2 text-white bg-primary-strong hover:bg-primary-strong/90 px-6 py-3 rounded-full font-medium text-sm transition-colors shadow-md hover:-translate-y-0.5"
                >
                  {t("earnPremium.signInToContribute")}
                </button>
              ) : (
                <a
                  href={`${(import.meta.env.BASE_URL ?? "/").replace(/\/+$/, "")}/app`}
                  className="inline-flex items-center gap-2 text-white bg-primary-strong hover:bg-primary-strong/90 px-6 py-3 rounded-full font-medium text-sm transition-colors shadow-md hover:-translate-y-0.5"
                >
                  {t("earnPremium.startContributing")}
                </a>
              )}
            </div>
          </FadeIn>
        </div>
      </section>
      {/* 9b. DOWNLOAD THE APP — Coming soon (iOS / Android) */}
      <section
        id="download"
        className="py-24 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto border-t border-border/50"
        aria-labelledby="download-heading"
      >
        <FadeIn>
          <div className="text-center max-w-2xl mx-auto">
            <p className="text-sm font-semibold text-primary-strong tracking-wider uppercase mb-3">
              {t("download.kicker")}
            </p>

            {/* App icon — the actual Chimiq mark people will see on their home screen */}
            <div className="flex justify-center mb-6">
              <img
                src={`${import.meta.env.BASE_URL}images/app-icon.png`}
                alt={t("download.appIconAlt")}
                width={120}
                height={120}
                className="rounded-[28px] shadow-xl ring-1 ring-black/5"
                style={{ width: 120, height: 120, objectFit: "cover" }}
                loading="lazy"
              />
            </div>

            <h2
              id="download-heading"
              className="text-4xl sm:text-5xl font-serif font-semibold text-foreground mb-5"
            >
              {t("download.title")}
            </h2>
            <p className="text-lg text-muted-foreground leading-relaxed mb-10">
              {t("download.subtitle")}
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-6">
              {/* App Store — disabled until live */}
              <button
                type="button"
                disabled
                aria-disabled="true"
                title={t("download.comingSoon")}
                className="inline-flex items-center gap-3 px-6 py-3.5 rounded-2xl bg-[#1C1C1E] text-white opacity-60 cursor-not-allowed min-w-[200px] justify-center"
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M17.05 12.04c-.03-3.02 2.47-4.47 2.58-4.54-1.41-2.06-3.6-2.34-4.38-2.37-1.86-.19-3.64 1.1-4.59 1.1-.95 0-2.41-1.07-3.97-1.04-2.04.03-3.93 1.19-4.98 3.02-2.13 3.69-.54 9.13 1.51 12.13 1.02 1.47 2.23 3.11 3.83 3.05 1.55-.06 2.13-.99 4-.99 1.86 0 2.39.99 4.02.96 1.66-.03 2.71-1.49 3.72-2.97 1.18-1.7 1.66-3.36 1.68-3.45-.04-.02-3.21-1.23-3.24-4.9zM14.04 3.4c.84-1.02 1.41-2.44 1.25-3.85-1.21.05-2.68.81-3.55 1.83-.78.9-1.46 2.34-1.28 3.73 1.35.1 2.74-.69 3.58-1.71z"/>
                </svg>
                <div className="text-left leading-tight">
                  <div className="text-[10px] uppercase tracking-wider opacity-80">{t("download.comingSoon")}</div>
                  <div className="text-base font-semibold">{t("download.appStore")}</div>
                </div>
              </button>

              {/* Google Play — disabled until live */}
              <button
                type="button"
                disabled
                aria-disabled="true"
                title={t("download.comingSoon")}
                className="inline-flex items-center gap-3 px-6 py-3.5 rounded-2xl bg-[#1C1C1E] text-white opacity-60 cursor-not-allowed min-w-[200px] justify-center"
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M3.6 1.2c-.4.4-.6.9-.6 1.5v18.6c0 .6.2 1.2.6 1.5l10.8-10.8L3.6 1.2zm12.6 9.3l2.8 2.8 3.7-2.1c1.1-.6 1.1-2.4 0-3.1l-3.6-2.1-2.9 2.8 0 1.7zm-1.4 1.4L4.6 22.6c.5.1 1 0 1.5-.3l11.6-6.7-3.5-3.7zM4.6 1.4l9.9 9.9 3.5-3.7L6.1 1c-.5-.3-1-.4-1.5-.3l0 .7z"/>
                </svg>
                <div className="text-left leading-tight">
                  <div className="text-[10px] uppercase tracking-wider opacity-80">{t("download.comingSoon")}</div>
                  <div className="text-base font-semibold">{t("download.googlePlay")}</div>
                </div>
              </button>
            </div>

            {!isAuthenticated && (
              <button
                type="button"
                onClick={goToSignup}
                className="text-sm font-medium text-primary-strong hover:underline"
              >
                {t("download.notifyMe")}
              </button>
            )}
            <p className="text-xs text-muted-foreground mt-3">
              {t("download.notifyHint")}
            </p>

            {/* Web app — what works today */}
            <div className="mt-12 pt-10 border-t border-border/40">
              <p className="text-sm font-medium text-muted-foreground mb-5">
                {t("download.webDivider")}
              </p>
              <a
                href={`${(import.meta.env.BASE_URL ?? "/").replace(/\/+$/, "")}/app`}
                className="inline-flex items-center gap-2 px-7 py-3.5 rounded-2xl bg-primary-strong hover:bg-primary-strong/90 text-white text-base font-semibold no-underline transition-colors shadow-md hover:shadow-lg"
              >
                {t("download.useWebApp")}
              </a>
              <p className="text-xs text-muted-foreground mt-4 max-w-md mx-auto leading-relaxed">
                {t("download.installHint")}
              </p>
            </div>
          </div>
        </FadeIn>
      </section>
      {/* 10. FOOTER */}
      <footer className="border-t border-border/50" style={{ background: "#F7FAF7", paddingTop: 64, paddingBottom: 40 }}>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 lg:gap-20">

            {/* Column 1 — Contact */}
            <div>
              <ContactFooterForm />
            </div>

            {/* Column 2 — Brand */}
            <div className="flex flex-col gap-4">
              <img
                src={`${import.meta.env.BASE_URL}images/logo-chimiq-long.png`}
                alt="Chimiq"
                className="opacity-90"
                style={{ height: 52, width: "auto", objectFit: "contain", objectPosition: "left" }}
              />
              <p className="text-sm text-muted-foreground leading-relaxed">
                {t("footer.copyright", { year: String(new Date().getFullYear()) })}
              </p>
              <div className="text-sm text-muted-foreground">
                <span className="text-foreground font-medium">{t("footer.skincare")}</span>
                {" · "}
                <span>
                  {t("footer.hair")}{" "}
                  <span className="text-muted-foreground/50 text-xs">{t("footer.comingSoon")}</span>
                </span>
                {" · "}
                <span>
                  {t("footer.household")}{" "}
                  <span className="text-muted-foreground/50 text-xs">{t("footer.comingSoon")}</span>
                </span>
              </div>
              <p className="text-xs text-muted-foreground/60 leading-relaxed max-w-xs">
                {t("footer.aboutChimiq")}
              </p>

              <nav
                aria-label={t("footer.legalHeading")}
                className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-muted-foreground pt-3 border-t border-border/30 mt-3"
              >
                <a
                  href={`${(import.meta.env.BASE_URL ?? "/").replace(/\/+$/, "")}/legal/privacy`}
                  className="hover:text-foreground underline-offset-2 hover:underline"
                >
                  {t("footer.legalPrivacy")}
                </a>
                <a
                  href={`${(import.meta.env.BASE_URL ?? "/").replace(/\/+$/, "")}/legal/terms`}
                  className="hover:text-foreground underline-offset-2 hover:underline"
                >
                  {t("footer.legalTerms")}
                </a>
                <a
                  href={`${(import.meta.env.BASE_URL ?? "/").replace(/\/+$/, "")}/legal/medical-disclaimer`}
                  className="hover:text-foreground underline-offset-2 hover:underline"
                >
                  {t("footer.legalDisclaimer")}
                </a>
                <button
                  type="button"
                  onClick={() => {
                    void import("@/lib/cookie-consent").then((m) =>
                      m.reopenCookieBanner(),
                    );
                  }}
                  className="hover:text-foreground underline-offset-2 hover:underline"
                >
                  {t("cookies.settings")}
                </button>
              </nav>
            </div>

          </div>
        </div>
      </footer>
      {/* FLOATING AI CHAT */}
      <ChatPanelLauncher />
    </main>
  );
}
