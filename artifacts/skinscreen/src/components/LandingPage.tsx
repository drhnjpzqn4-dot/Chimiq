import { useState, useEffect } from "react";
import { FadeIn } from "@/components/FadeIn";
import { WaitlistForm } from "@/components/WaitlistForm";
import { DangerCard } from "@/components/DangerCard";
import { DangerVisual } from "@/components/DangerVisual";
import { SpiralSection } from "@/components/SpiralSection";
import { IngredientScanner } from "@/components/IngredientScanner";
import type { ScannerSeed } from "@/components/IngredientScanner";
import { SocialProof } from "@/components/SocialProof";
import { MyShelf, MyShelfSection } from "@/components/MyShelf";
import { ChatPanel } from "@/components/ChatPanel";
import { FindDermatologist } from "@/components/FindDermatologist";
import type { LandingConfig } from "@/lib/landing-config";
import { useAuth } from "@workspace/replit-auth-web";
import {
  ScanLine, Layers, ShieldCheck,
  AlertTriangle, HelpCircle, ShieldOff, XCircle, FlaskConical,
  Sun, Moon, Plus, CheckCircle2, ShoppingBag, Bell, User, LogOut,
  Skull, ExternalLink, Share2, ArrowDown, FileText, MessageCircle,
} from "lucide-react";

interface SiteStats {
  analyses: number;
  products: number;
  waitlist: number;
}

const DISASTER_MIX_SEED: ScannerSeed = {
  mode: "compare",
  product1: "Water, Sodium C14-16 Olefin Sulfonate, PEG-80 Sorbitan Laurate, Cocamidopropyl Betaine, Glycerin, Sodium Lauroamphoacetate, Sodium Hydroxide, Hydroxyethylcellulose, Benzoyl Peroxide 10%, Glycol Distearate, Cocamide MEA, Laureth-4, Citric Acid, Tetrasodium EDTA",
  product1Name: "Neutrogena Rapid Clear BP Wash",
  product2: "Water, Dimethicone, Glycerin, Isopropyl Isostearate, Caprylic/Capric Triglyceride, PEG-100 Stearate, Propylene Glycol, Glyceryl Stearate, Cetyl Alcohol, Niacinamide, Retinol, Sodium Hyaluronate, Tocopherol, Phenoxyethanol, Ethylhexylglycerin, Disodium EDTA, Carbomer, Triethanolamine",
  product2Name: "RoC Retinol Correxion Serum",
  autoRun: true,
};

const dangerCombinations = [
  {
    pair: "Retinol + AHA/BHA",
    risk: "Both are chemical exfoliants. Together they cause severe skin irritation, redness, and can damage the skin barrier — especially at night when skin is most vulnerable.",
    citation: "Kligman, A.M. (1988). The compatibility of combinations of glycolic acid and tretinoin. J Dermatol Treat.",
    citationUrl: "https://doi.org/10.3109/09546639409086912",
    severity: "HIGH RISK" as const,
  },
  {
    pair: "Retinol + Benzoyl Peroxide",
    risk: "Benzoyl peroxide oxidises retinol, rendering it inactive. You're paying for two products that cancel each other out — and drying out your skin in the process.",
    citation: "Nighswonger, B.D. et al. (1993). Retinoid interactions with benzoyl peroxide. J Pharm Sci. PMID: 8450449",
    citationUrl: "https://pubmed.ncbi.nlm.nih.gov/8450449/",
    severity: "HIGH RISK" as const,
  },
  {
    pair: "AHAs + No Sunscreen",
    risk: "Glycolic acid and lactic acid increase UV sensitivity by up to 50%. Using them without SPF dramatically raises your risk of sun damage, hyperpigmentation, and skin cancer.",
    citation: "Kornhauser, A. et al. (2010). Applications of hydroxy acids. Clin Cosmet Investig Dermatol.",
    citationUrl: "https://doi.org/10.2147/CCID.S9042",
    severity: "HIGH RISK" as const,
  },
  {
    pair: "Vitamin C + Niacinamide",
    risk: "Widely debated. Some studies show they can form niacin when combined at high temperatures, potentially causing flushing. Safest to use at separate times of day.",
    citation: "Wohlrab, J. & Kreft, D. (2014). Niacinamide — mechanisms of action. Skin Pharmacol Physiol.",
    citationUrl: "https://doi.org/10.1159/000354888",
    severity: "CAUTION" as const,
  },
  {
    pair: "Kojic Acid + Vitamin C",
    risk: "Both compete for the same oxidation pathway, reducing each other's brightening effect. Combined, they can also increase skin sensitivity and cause unexpected irritation.",
    citation: "Parvez, S. et al. (2006). Naturally occurring tyrosinase inhibitors. Phytother Res.",
    citationUrl: "https://doi.org/10.1002/ptr.1954",
    severity: "HIGH RISK" as const,
  },
];

const communityFears = [
  {
    icon: AlertTriangle,
    headline: "\"Am I destroying my skin?\"",
    body: "Retinol + AHAs together — the #1 fear in every skincare forum.",
  },
  {
    icon: HelpCircle,
    headline: "\"Is this purging or breaking out?\"",
    body: "Can't tell if your acids are working or quietly causing damage.",
  },
  {
    icon: ShieldOff,
    headline: "\"I wrecked my moisture barrier.\"",
    body: "Tight, raw, sensitive skin from over-exfoliation. A painful lesson to learn.",
  },
  {
    icon: XCircle,
    headline: "\"I'm using products that cancel out.\"",
    body: "Benzoyl peroxide silently degrades retinol — two products, zero results.",
  },
  {
    icon: FlaskConical,
    headline: "\"Should I mix Vitamin C and Niacinamide?\"",
    body: "Thousands ask this every month. The answer is nuanced — and matters.",
  },
  {
    icon: Layers,
    headline: "\"What order do I layer these in?\"",
    body: "Thinness rule, wait times, actives first — the rules nobody explains clearly.",
  },
];

const ingredientRisks = [
  { emoji: "🧱", title: "Barrier disruption", desc: "Harsh sulfates, stripping cleansers, and misused AHAs/BHAs erode the lipid layer that keeps moisture in and irritants out." },
  { emoji: "🔬", title: "Endocrine disruptors", desc: "Oxybenzone, octinoxate, and certain parabens can mimic hormones in the body — a particular concern for young skin and during pregnancy." },
  { emoji: "☣️", title: "Formaldehyde releasers", desc: "DMDM Hydantoin, quaternium-15, and diazolidinyl urea slowly release formaldehyde — a known carcinogen — as a preservative." },
  { emoji: "🌸", title: "Hidden fragrance", desc: "\"Parfum\" or \"Fragrance\" on a label can legally conceal up to 3,000 undisclosed chemicals, many of which are common allergens." },
  { emoji: "🧫", title: "Harsh preservatives", desc: "Methylisothiazolinone (MI) and methylchloroisothiazolinone (MCI) are among the leading causes of allergic contact dermatitis worldwide." },
  { emoji: "☀️", title: "Photosensitisers", desc: "AHAs, retinol, and benzoyl peroxide increase your skin's UV sensitivity. Using them without SPF dramatically raises hyperpigmentation and cancer risk." },
  { emoji: "⚡", title: "Ingredient conflicts", desc: "Some actives deactivate each other on contact (retinol + benzoyl peroxide), while others cause over-exfoliation when layered (retinol + AHAs)." },
  { emoji: "🔴", title: "Known allergens", desc: "Nickel salts, balsam of Peru, propolis, and certain dyes cause sensitisation that worsens with repeated exposure — even in small amounts." },
  { emoji: "🔵", title: "Nanoparticles", desc: "Nano-sized zinc oxide and titanium dioxide in sunscreens may penetrate below the skin surface — evidence is still emerging on long-term effects." },
  { emoji: "🧪", title: "Penetration enhancers", desc: "PEGs, propylene glycol, and similar solvents increase skin permeability — useful for actives, but also carry any harmful co-ingredients deeper." },
];

interface LandingPageProps {
  config: LandingConfig;
}

export function LandingPage({ config }: LandingPageProps) {
  const { user, isLoading: authLoading, isAuthenticated, login, logout } = useAuth();
  const [scannerSeed, setScannerSeed] = useState<ScannerSeed | null>(null);
  const [stats, setStats] = useState<SiteStats | null>(null);

  useEffect(() => {
    fetch("/api/stats", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setStats(d as SiteStats))
      .catch(() => {});
  }, []);

  const displayName = user
    ? (user.firstName ?? user.email?.split("@")[0] ?? "there")
    : null;

  const handleDisasterMixScan = () => {
    setScannerSeed({ ...DISASTER_MIX_SEED });
    const el = document.getElementById("try-it-now");
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <main className="min-h-screen bg-background overflow-hidden">

      {/* TOP NAV */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-border/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          <a href="#hero" className="font-serif text-base font-semibold text-foreground tracking-tight">
            SkinScreen
          </a>
          <div className="flex items-center gap-3">
            {authLoading ? (
              <div className="h-8 w-20 rounded-full bg-border/40 animate-pulse" />
            ) : isAuthenticated ? (
              <div className="flex items-center gap-2">
                <a
                  href="#my-shelf"
                  className="flex items-center gap-1.5 text-sm font-medium text-foreground/80 hover:text-foreground transition-colors"
                >
                  <User className="w-4 h-4" />
                  <span className="hidden sm:inline">{displayName}</span>
                  <span className="sm:hidden">My Shelf</span>
                </a>
                <button
                  onClick={logout}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded-lg hover:bg-border/20"
                  aria-label="Log out"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Log out</span>
                </button>
              </div>
            ) : (
              <a
                href="#waitlist"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-white bg-primary hover:bg-primary/90 px-4 py-2 rounded-full transition-colors"
              >
                Join waitlist
              </a>
            )}
          </div>
        </div>
      </nav>

      {/* 1. HERO — dark, full-bleed, dramatic */}
      <section id="hero" className="isolate relative min-h-[92vh] flex flex-col overflow-hidden">
        {/* Full-bleed background image */}
        <img
          src={`${import.meta.env.BASE_URL}images/hero-dark.png`}
          alt=""
          className="absolute inset-0 w-full h-full object-cover scale-105"
        />
        {/* Dark dramatic overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-black/85 via-black/70 to-[#0d200d]/80" />
        {/* Subtle sage vignette at bottom */}
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#0d200d]/60 to-transparent" />

        {/* Content */}
        <div className="relative z-10 flex-1 flex flex-col justify-center items-center text-center px-4 sm:px-6 lg:px-8 pt-28 pb-16 max-w-5xl mx-auto w-full">

          {/* Badge */}
          <FadeIn direction="down" delay={0.1}>
            <span className="inline-flex items-center gap-1.5 py-1.5 px-4 rounded-full bg-white/10 backdrop-blur-sm border border-white/15 text-white/70 text-xs font-medium tracking-widest uppercase mb-8">
              <ShieldCheck className="w-3 h-3 text-primary" />
              AI Ingredient Safety Scanner
            </span>
          </FadeIn>

          {/* Headline */}
          <FadeIn delay={0.2} className="max-w-4xl">
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-[5.5rem] font-serif text-white leading-[1.08] tracking-tight mb-4">
              Your skincare routine<br className="hidden sm:block" />{" "}
              might be{" "}
              <span className="italic text-white/50">damaging your skin.</span>
            </h1>
            <p className="text-xl sm:text-2xl text-white/40 font-light italic mt-3">
              Most people have no idea.
            </p>
          </FadeIn>

          {/* Stats — immediately below headline to sell stakes */}
          {stats && (
            <FadeIn delay={0.35}>
              <div className="flex items-center justify-center gap-8 sm:gap-14 mb-10">
                {[
                  { label: "analyses run", value: stats.analyses },
                  { label: "on the waitlist", value: stats.waitlist },
                ].map(({ label, value }) => (
                  <div key={label} className="text-center">
                    <div className="text-2xl sm:text-3xl font-serif font-bold text-white tabular-nums">{value}+</div>
                    <div className="text-xs text-white/35 mt-1 uppercase tracking-wider">{label}</div>
                  </div>
                ))}
              </div>
            </FadeIn>
          )}

          {/* Animated ingredient conflict tags */}
          <FadeIn delay={0.45}>
            <div className="flex flex-wrap justify-center gap-2 mb-10 max-w-2xl mx-auto">
              {[
                { name: "Retinol", conflict: true, floatDuration: "2.6s", floatDelay: "0s", badgeDelay: "2.4s", pulseDelay: "3.1s" },
                { name: "Glycolic Acid", conflict: true, floatDuration: "3.1s", floatDelay: "0.4s", badgeDelay: "2.9s", pulseDelay: "3.6s" },
                { name: "Niacinamide", conflict: false, floatDuration: "2.8s", floatDelay: "0.7s", badgeDelay: "", pulseDelay: "" },
                { name: "Benzoyl Peroxide", conflict: true, floatDuration: "2.4s", floatDelay: "0.2s", badgeDelay: "3.3s", pulseDelay: "4.0s" },
                { name: "Vitamin C", conflict: false, floatDuration: "3.0s", floatDelay: "0.9s", badgeDelay: "", pulseDelay: "" },
                { name: "AHA / BHA", conflict: false, floatDuration: "2.7s", floatDelay: "0.5s", badgeDelay: "", pulseDelay: "" },
              ].map((ing) => (
                <div
                  key={ing.name}
                  className="relative inline-flex items-center px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/15 text-white/75 text-sm font-medium"
                  style={{
                    animation: `hero-float ${ing.floatDuration} ease-in-out infinite`,
                    animationDelay: ing.floatDelay,
                  }}
                >
                  {ing.name}
                  {ing.conflict && (
                    <span
                      className="absolute -top-2.5 -right-2 bg-red-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap shadow-lg"
                      style={{
                        animation: `hero-conflict-in 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) ${ing.badgeDelay} both, hero-conflict-pulse 1.8s ease-in-out ${ing.pulseDelay} infinite`,
                        opacity: 0,
                      }}
                    >
                      ⚠ Conflict
                    </span>
                  )}
                </div>
              ))}
            </div>
          </FadeIn>

          {/* CTAs — two side-by-side */}
          <FadeIn delay={0.65}>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <a
                href="#try-it-now"
                className="inline-flex items-center justify-center gap-2.5 bg-primary hover:bg-primary/90 text-white px-8 py-4 rounded-full text-base font-semibold transition-all duration-200 shadow-[0_0_40px_rgba(123,175,122,0.35)] hover:shadow-[0_0_60px_rgba(123,175,122,0.5)] hover:-translate-y-0.5 w-full sm:w-auto"
              >
                Scan my ingredients →
              </a>
              <a
                href="#waitlist"
                className="inline-flex items-center justify-center gap-2 bg-white/10 hover:bg-white/18 backdrop-blur-sm text-white border border-white/25 px-8 py-4 rounded-full text-base font-medium transition-all duration-200 hover:-translate-y-0.5 w-full sm:w-auto"
              >
                Join waitlist
              </a>
            </div>
          </FadeIn>

        </div>
      </section>

      {/* 2. SOUND FAMILIAR — hidden, starts with danger zone instead */}
      <section id="fears" className="py-24 px-4 sm:px-6 lg:px-8 hidden">
        <div className="max-w-7xl mx-auto">
          <FadeIn>
            <h2 className="text-3xl md:text-5xl font-serif text-center mb-4">
              Sound familiar?
            </h2>
            <p className="text-center text-muted-foreground max-w-2xl mx-auto mb-16">
              These are the questions filling Reddit, TikTok, and dermatologist waiting rooms. You're not alone — and you deserve a real answer.
            </p>
          </FadeIn>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {communityFears.map((fear, idx) => {
              const Icon = fear.icon;
              return (
                <FadeIn key={fear.headline} delay={idx * 0.08}>
                  <div className="flex flex-col gap-3 p-6 rounded-2xl bg-white border border-border/50 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 h-full">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                        <Icon className="w-4 h-4 text-primary" />
                      </div>
                      <p className="font-serif text-base font-semibold text-foreground leading-snug">
                        {fear.headline}
                      </p>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {fear.body}
                    </p>
                  </div>
                </FadeIn>
              );
            })}
          </div>
        </div>
      </section>

      {/* 3. DANGER ZONE */}
      <section id="danger-zone" className="py-24 px-4 sm:px-6 lg:px-8 bg-[#FAFAF8]">
        <div className="max-w-7xl mx-auto">
          <FadeIn>
            <h2 className="text-3xl md:text-5xl font-serif text-center mb-4">
              What you don't know can hurt your skin.
            </h2>
            <p className="text-center text-muted-foreground max-w-2xl mx-auto mb-16">
              These are real, documented ingredient conflicts — the kind your dermatologist knows, but the beauty industry doesn't advertise.
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

      {/* 4. DISASTER MIX — viral TikTok section */}
      <section id="disaster-mix" className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <FadeIn>
            <div className="text-center mb-12">
              <span className="inline-flex items-center gap-1.5 py-1 px-3 rounded-full bg-red-100 text-red-600 text-sm font-semibold tracking-wide mb-6">
                <Skull className="w-3.5 h-3.5" />
                Disaster Mix
              </span>
              <h2 className="text-3xl md:text-5xl font-serif mb-4">
                The routine that sells millions —<br className="hidden sm:block" />
                <span className="italic text-red-500">and quietly damages skin.</span>
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto text-lg leading-relaxed">
                These three products are consistently bought together. They're sold in the same store, recommended in the same "beginner skincare" guides. They are also a clinically documented disaster combination.
              </p>
            </div>
          </FadeIn>

          <FadeIn delay={0.15}>
            <div className="rounded-3xl border border-red-200 bg-red-50/40 overflow-hidden">
              {/* The products */}
              <div className="px-6 sm:px-10 pt-8 pb-6">
                <p className="text-xs font-bold uppercase tracking-widest text-red-400 mb-5 text-center">The routine</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                  {[
                    {
                      brand: "Neutrogena",
                      name: "Rapid Clear Stubborn Acne Wash",
                      activeIngredient: "Benzoyl Peroxide 10%",
                      role: "AM cleanser",
                      emoji: "🧴",
                    },
                    {
                      brand: "RoC",
                      name: "Retinol Correxion Line Smoothing Serum",
                      activeIngredient: "Retinol (stabilised)",
                      role: "PM serum",
                      emoji: "💊",
                    },
                    {
                      brand: "Paula's Choice",
                      name: "Skin Perfecting 8% AHA Gel Exfoliant",
                      activeIngredient: "Glycolic Acid 8%",
                      role: "PM exfoliant",
                      emoji: "⚗️",
                    },
                  ].map((product) => (
                    <div key={product.name} className="flex flex-col gap-2 p-4 rounded-2xl bg-white border border-red-100 shadow-sm">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xl">{product.emoji}</span>
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-red-400/80 bg-red-100/80 px-2 py-0.5 rounded-full">
                          {product.role}
                        </span>
                      </div>
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">{product.brand}</p>
                        <p className="text-sm font-serif font-semibold text-foreground leading-snug">{product.name}</p>
                        <p className="text-xs font-medium text-red-500 mt-1">{product.activeIngredient}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* The conflicts */}
                <div className="space-y-4">
                  <p className="text-xs font-bold uppercase tracking-widest text-red-400 text-center mb-2">What happens when you use them together</p>

                  <div className="p-4 rounded-2xl bg-red-100/60 border border-red-200">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-xl bg-red-500 flex items-center justify-center shrink-0 mt-0.5">
                        <XCircle className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-red-700 mb-1">
                          Benzoyl Peroxide oxidises Retinol — instantly
                        </p>
                        <p className="text-sm text-red-700/80 leading-relaxed">
                          Benzoyl peroxide is a potent oxidising agent. When it contacts retinol — even rinsed off the skin and picked up on a towel, or transferred via hands — it chemically degrades the retinol molecule before it can reach your skin cells. You are paying for an active ingredient that is being destroyed in real time.
                        </p>
                        <a
                          href="https://pubmed.ncbi.nlm.nih.gov/8450449/"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 mt-2 text-[11px] text-red-500 hover:text-red-700 transition-colors"
                        >
                          <ExternalLink className="w-3 h-3" />
                          <span className="italic">Nighswonger et al. (1993). J Pharm Sci. PMID: 8450449</span>
                        </a>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-red-100/60 border border-red-200">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-xl bg-red-500 flex items-center justify-center shrink-0 mt-0.5">
                        <AlertTriangle className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-red-700 mb-1">
                          Retinol + Glycolic Acid = barrier destruction
                        </p>
                        <p className="text-sm text-red-700/80 leading-relaxed">
                          Both retinol and glycolic acid (AHA) speed up skin cell turnover and reduce the skin's natural barrier function when used alone. Together in an evening routine, they cause accelerated exfoliation that strips the protective lipid layer — leading to redness, peeling, raw skin, and dramatically increased sensitivity.
                        </p>
                        <a
                          href="https://doi.org/10.3109/09546639409086912"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 mt-2 text-[11px] text-red-500 hover:text-red-700 transition-colors"
                        >
                          <ExternalLink className="w-3 h-3" />
                          <span className="italic">Kligman, A.M. (1988). J Dermatol Treat. DOI: 10.3109/09546639409086912</span>
                        </a>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-xl bg-amber-400 flex items-center justify-center shrink-0 mt-0.5">
                        <FlaskConical className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-amber-700 mb-1">
                          The triple hit: photosensitivity goes through the roof
                        </p>
                        <p className="text-sm text-amber-700/80 leading-relaxed">
                          AHAs increase UV sensitivity by up to 50%. Retinol makes skin significantly more photosensitive. Using both without rigorous SPF application — as most people in this routine do — dramatically elevates the risk of hyperpigmentation, sunburn, and long-term UV damage.
                        </p>
                        <a
                          href="https://doi.org/10.2147/CCID.S9042"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 mt-2 text-[11px] text-amber-600 hover:text-amber-800 transition-colors"
                        >
                          <ExternalLink className="w-3 h-3" />
                          <span className="italic">Kornhauser et al. (2010). Clin Cosmet Investig Dermatol. DOI: 10.2147/CCID.S9042</span>
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* CTA strip */}
              <div className="px-6 sm:px-10 py-6 bg-red-100/60 border-t border-red-200">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="text-center sm:text-left">
                    <p className="font-serif text-base font-semibold text-red-700">
                      Does your routine have hidden combinations like this?
                    </p>
                    <p className="text-sm text-red-600/80 mt-1">
                      SkinScreen checks every product pair in your routine — before your skin pays the price.
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <button
                      type="button"
                      onClick={handleDisasterMixScan}
                      className="inline-flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white px-5 py-2.5 rounded-full text-sm font-semibold transition-colors shadow-sm"
                    >
                      Scan your routine
                      <ArrowDown className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        const text = "🚨 These 3 products are bought together ALL the time — and they're clinically documented to destroy each other.\n\nNeutrogena Benzoyl Peroxide + RoC Retinol + Paula's Choice Glycolic Acid\n\nBP oxidises retinol (you're wasting your money). Retinol + AHA strips your skin barrier. Both make UV damage 50% worse.\n\nCheck YOUR routine free: skinscreen.app";
                        if (navigator.share) {
                          navigator.share({ text }).catch(() => {});
                        } else {
                          navigator.clipboard.writeText(text).catch(() => {});
                        }
                      }}
                      className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full border border-red-300 text-red-600 text-sm font-medium hover:bg-red-50 transition-colors"
                    >
                      <Share2 className="w-4 h-4" />
                      Share
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* 5. THE SKINCARE SPIRAL */}
      <section id="spiral" className="py-24 bg-[#F5F5F7]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <FadeIn>
            <h2 className="text-3xl md:text-5xl font-serif text-center mb-4">The Skincare Spiral</h2>
            <p className="text-center text-muted-foreground mb-16 max-w-xl mx-auto">
              One product leads to five more. Sound familiar?
            </p>
          </FadeIn>
          <SpiralSection />
        </div>
      </section>

      {/* 6. THE GOAL — MOVED UP as emotional pivot */}
      <section id="the-goal" className="py-24 px-4 sm:px-6 lg:px-8 bg-[#FAFAF8]">
        <div className="max-w-5xl mx-auto">
          <FadeIn>
            <h2 className="text-3xl md:text-5xl font-serif text-center mb-6">
              {config.theGoal.headline}
            </h2>
            <p className="text-center text-muted-foreground max-w-2xl mx-auto mb-16 text-lg leading-relaxed">
              {config.theGoal.body}
            </p>
          </FadeIn>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { emoji: "🧴", title: "Fewer products", desc: "A healthy skin barrier needs 3 products, not 12. SkinScreen helps you find the right ones." },
              { emoji: "💸", title: "Less spending", desc: "Stop buying fixes for problems your products are causing. Know what works before you buy." },
              { emoji: "🌿", title: "Cleaner routine", desc: "Know exactly what you're putting on your skin and why — ingredient by ingredient." },
            ].map((card, idx) => (
              <FadeIn key={card.title} delay={idx * 0.15}>
                <div className="flex flex-col items-start gap-4 p-8 rounded-3xl bg-white border border-border/50 shadow-sm h-full">
                  <span className="text-4xl">{card.emoji}</span>
                  <div>
                    <h3 className="text-xl font-serif font-semibold text-foreground mb-2">{card.title}</h3>
                    <p className="text-muted-foreground leading-relaxed">{card.desc}</p>
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* 6. HOW SKINSCREEN WORKS */}
      <section id="how-it-works" className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <FadeIn>
            <div className="text-center mb-6">
              <h2 className="text-3xl md:text-5xl font-serif mb-6">How SkinScreen works</h2>
              <p className="text-xl md:text-2xl text-foreground font-medium max-w-3xl mx-auto leading-snug mb-4">
                The first AI skincare scanner that detects dangerous ingredient combinations — before they damage your skin.
              </p>
              <p className="text-muted-foreground max-w-2xl mx-auto text-lg leading-relaxed mb-10">
                Many common skincare ingredients are harmless alone — but when combined with other products in your routine, they can cause serious irritation, chemical burns, or long-term damage.
              </p>
            </div>
          </FadeIn>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 lg:gap-16 mb-14">
            <FadeIn delay={0.1}>
              <div className="flex flex-col items-center text-center">
                <div className="w-20 h-20 rounded-3xl bg-primary/10 flex items-center justify-center mb-6 text-primary shadow-sm">
                  <ScanLine className="w-10 h-10" />
                </div>
                <h3 className="text-2xl font-serif mb-3">1. Scan</h3>
                <p className="text-muted-foreground">
                  Photograph your product's ingredient list or scan its barcode. We instantly identify every ingredient — even the complex chemical names.
                </p>
              </div>
            </FadeIn>

            <FadeIn delay={0.3}>
              <div className="flex flex-col items-center text-center">
                <div className="w-20 h-20 rounded-3xl bg-primary/10 flex items-center justify-center mb-6 text-primary shadow-sm">
                  <Layers className="w-10 h-10" />
                </div>
                <h3 className="text-2xl font-serif mb-3">2. Stack</h3>
                <p className="text-muted-foreground">
                  Add your other skincare products to build your virtual shelf and establish your daily routine.
                </p>
              </div>
            </FadeIn>

            <FadeIn delay={0.5}>
              <div className="flex flex-col items-center text-center">
                <div className="w-20 h-20 rounded-3xl bg-primary/10 flex items-center justify-center mb-6 text-primary shadow-sm">
                  <ShieldCheck className="w-10 h-10" />
                </div>
                <h3 className="text-2xl font-serif mb-3">3. Screen</h3>
                <div className="text-muted-foreground">
                  <p className="mb-3">Get your full safety analysis with clear ratings:</p>
                  <div className="flex flex-col items-center gap-1.5 text-sm font-medium">
                    <span className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-[#22C55E] inline-block" />
                      <span className="text-[#16A34A]">Safe to combine</span>
                    </span>
                    <span className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-[#F59E0B] inline-block" />
                      <span className="text-[#B45309]">Use with caution</span>
                    </span>
                    <span className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-[#EF4444] inline-block" />
                      <span className="text-[#B91C1C]">Avoid combining</span>
                    </span>
                  </div>
                </div>
              </div>
            </FadeIn>
          </div>

          {/* CTA to scanner */}
          <FadeIn delay={0.6}>
            <div className="text-center">
              <a
                href="#try-it-now"
                className="inline-flex items-center gap-2 bg-primary hover:bg-primary/90 text-white px-8 py-4 rounded-full text-base font-semibold transition-all duration-200 shadow-md hover:shadow-lg hover:-translate-y-0.5"
              >
                Try it now →
              </a>
              <p className="text-muted-foreground text-sm mt-3">No sign-up needed. Works instantly.</p>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* CTA BANNER — after how it works */}
      <section className="py-14 px-4 sm:px-6 lg:px-8 bg-primary/8">
        <div className="max-w-3xl mx-auto text-center">
          <FadeIn>
            <p className="text-lg font-medium text-foreground mb-2">SkinScreen is launching soon.</p>
            <p className="text-muted-foreground mb-6">Early access members get unlimited scans, barcode lookup, and a personalised PDF safety report for their dermatologist.</p>
            <a href="#waitlist" className="inline-flex items-center gap-2 bg-primary hover:bg-primary/90 text-white px-7 py-3.5 rounded-full font-semibold text-sm transition-all hover:-translate-y-0.5 shadow-md">
              Join the waitlist — it's free
            </a>
          </FadeIn>
        </div>
      </section>

      {/* 7. WHAT'S HIDING IN YOUR PRODUCTS — moved lower, calmer discovery zone */}
      <section id="ingredient-risks" className="py-24 px-4 sm:px-6 lg:px-8 bg-[#FAFAF8]">
        <div className="max-w-7xl mx-auto">
          <FadeIn>
            <h2 className="text-3xl md:text-5xl font-serif text-center mb-4">
              What's really hiding in your products
            </h2>
            <p className="text-center text-muted-foreground max-w-2xl mx-auto mb-16">
              Most of us read ingredient labels like a foreign language. Here are the 10 categories dermatologists flag most — and what they actually do.
            </p>
          </FadeIn>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {ingredientRisks.map((risk, idx) => (
              <FadeIn key={risk.title} delay={idx * 0.06}>
                <div className="flex flex-col gap-3 p-6 rounded-2xl bg-white border border-border/50 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 h-full">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{risk.emoji}</span>
                    <p className="font-serif text-base font-semibold text-foreground leading-snug">{risk.title}</p>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">{risk.desc}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* 8. SOCIAL PROOF — forum posts from research */}
      <SocialProof style={config.socialProofStyle} />

      {/* 9. TRY IT NOW — SCANNER (climax) */}
      <section id="try-it-now" className="py-24 px-4 sm:px-6 lg:px-8 bg-[#F5F5F7]">
        <div className="max-w-5xl mx-auto">
          <FadeIn>
            <div className="text-center mb-12">
              <span className="inline-block py-1 px-3 rounded-full bg-primary/10 text-primary text-sm font-medium tracking-wide mb-4">
                Live Preview
              </span>
              <h2 className="text-3xl md:text-5xl font-serif mb-4">
                Try It Now
              </h2>
              <p className="text-muted-foreground max-w-xl mx-auto">
                {config.scannerSubhead}
              </p>
            </div>
          </FadeIn>
          <IngredientScanner ctaLabel={config.scannerCtaLabel} seed={scannerSeed} />
        </div>
      </section>

      {/* 10. MY SHELF — live feature section */}
      <section id="my-shelf" className="py-24 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24 items-start">

            <FadeIn direction="right">
              <div>
                <span className="inline-block py-1 px-3 rounded-full bg-primary/15 text-primary text-sm font-medium tracking-wide mb-6">
                  {isAuthenticated ? "Your routine" : "Coming soon"}
                </span>
                <h2 className="text-3xl md:text-5xl font-serif mb-6 leading-tight">
                  Your personal<br />
                  <span className="italic text-muted-foreground">skincare shelf.</span>
                </h2>
                <p className="text-muted-foreground text-lg leading-relaxed mb-8">
                  Stop testing combinations on your face. My Shelf lets you build your full routine digitally — and checks any new product against everything you already use, <em>before you buy it</em>.
                </p>
                <ul className="space-y-4 mb-10">
                  {[
                    { icon: Sun, text: "Organise your morning & evening routines in one place" },
                    { icon: ShoppingBag, text: "Scan a new product or scan its barcode in-store — instantly see if it conflicts with your shelf" },
                    { icon: Bell, text: "Get safety alerts when a new conflict is discovered in your routine" },
                    { icon: FileText, text: "Download a personalised PDF safety report to share with your dermatologist" },
                    { icon: MessageCircle, text: "Ask our AI dermatologist anything about your ingredients — backed by peer-reviewed research" },
                  ].map(({ icon: Icon, text }) => (
                    <li key={text} className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                        <Icon className="w-4 h-4 text-primary" />
                      </div>
                      <span className="text-foreground leading-snug">{text}</span>
                    </li>
                  ))}
                </ul>
                {!isAuthenticated && (
                  <a
                    href="#waitlist"
                    className="inline-flex items-center gap-2 text-white bg-primary hover:bg-primary/90 px-6 py-3 rounded-full font-medium text-sm transition-colors shadow-md hover:-translate-y-0.5"
                  >
                    Join the waitlist to get early access
                  </a>
                )}
                {isAuthenticated && (
                  <p className="flex items-center gap-2 text-primary font-medium text-sm">
                    <CheckCircle2 className="w-4 h-4" />
                    Signed in as {displayName}
                  </p>
                )}
              </div>
            </FadeIn>

            <FadeIn direction="left" delay={0.15}>
              {isAuthenticated && user ? (
                <MyShelf userId={user.id} displayName={displayName} />
              ) : (
                <div className="relative">
                  <div className="pointer-events-none opacity-60">
                    <MyShelfSection />
                  </div>
                  <div className="absolute inset-0 flex flex-col items-center justify-center rounded-3xl bg-white/70 backdrop-blur-sm">
                    <div className="text-center px-6">
                      <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                        <User className="w-6 h-6 text-primary" />
                      </div>
                      <p className="font-serif text-lg font-semibold text-foreground mb-2">
                        Your shelf is waiting
                      </p>
                      <p className="text-sm text-muted-foreground mb-5">
                        Sign in to start building your personal skincare routine.
                      </p>
                      <button
                        onClick={login}
                        className="inline-flex items-center gap-2 text-white bg-primary hover:bg-primary/90 px-5 py-2.5 rounded-full font-medium text-sm transition-colors"
                      >
                        Sign in to get started
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </FadeIn>

          </div>
        </div>
      </section>

      {/* 11. FIND A DERMATOLOGIST */}
      <FindDermatologist />

      {/* 12. WAITLIST CTA */}
      <section id="waitlist" className="py-24 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto text-center border-t border-border/50">
        <FadeIn>
          <h2 className="text-4xl md:text-6xl font-serif text-foreground mb-6 tracking-tight">
            Be first to know when SkinScreen launches
          </h2>
          <p className="text-xl text-muted-foreground mb-3 max-w-2xl mx-auto">
            Join 200+ people waiting for smarter skincare.
          </p>
          <p className="text-muted-foreground/70 mb-10 text-sm">Stop guessing. Start knowing.</p>
          <div className="flex justify-center">
            <WaitlistForm buttonSize="lg" />
          </div>
        </FadeIn>
      </section>

      {/* FOOTER */}
      <footer className="py-8 text-center text-muted-foreground text-sm border-t border-border/50">
        <p>SkinScreen &copy; {new Date().getFullYear()}. Smarter skincare starts here.</p>
      </footer>

      {/* FLOATING AI CHAT */}
      <ChatPanel />
    </main>
  );
}
