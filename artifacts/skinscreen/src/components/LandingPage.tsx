import { FadeIn } from "@/components/FadeIn";
import { WaitlistForm } from "@/components/WaitlistForm";
import { DangerCard } from "@/components/DangerCard";
import { SpiralSection } from "@/components/SpiralSection";
import { IngredientScanner } from "@/components/IngredientScanner";
import { SocialProof } from "@/components/SocialProof";
import { MyShelf, MyShelfSection } from "@/components/MyShelf";
import type { LandingConfig } from "@/lib/landing-config";
import { useAuth } from "@workspace/replit-auth-web";
import {
  ScanLine, Layers, ShieldCheck,
  AlertTriangle, HelpCircle, ShieldOff, XCircle, FlaskConical,
  Sun, Moon, Plus, CheckCircle2, ShoppingBag, Bell, User, LogOut,
} from "lucide-react";

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

  const displayName = user
    ? (user.firstName ?? user.email?.split("@")[0] ?? "there")
    : null;

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
              <button
                onClick={login}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-white bg-primary hover:bg-primary/90 px-4 py-2 rounded-full transition-colors"
              >
                <User className="w-3.5 h-3.5" />
                Sign in
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* 1. HERO */}
      <section id="hero" className="isolate relative pt-24 pb-20 sm:pt-36 sm:pb-24 md:pt-48 md:pb-32 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto flex flex-col items-center text-center">
        <div className="hidden sm:block absolute inset-0 -z-10 pointer-events-none overflow-hidden">
          <img
            src={`${import.meta.env.BASE_URL}images/hero-bg.png`}
            alt=""
            className="absolute right-0 top-0 h-full w-auto max-w-[55%] md:max-w-[65%] opacity-40"
          />
        </div>

        <FadeIn direction="down" delay={0.1}>
          <span className="inline-block py-1 px-3 rounded-full bg-primary/10 text-primary text-sm font-medium tracking-wide mb-6">
            Coming Soon to iOS
          </span>
        </FadeIn>

        <FadeIn delay={0.2} className="max-w-4xl">
          <h1 className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-serif text-foreground leading-[1.15] tracking-tight mb-6">
            {config.hero.headline}{" "}
            <br className="hidden sm:block" />
            <span className="italic text-muted-foreground">{config.hero.headlineItalic}</span>
          </h1>
        </FadeIn>

        <FadeIn delay={0.3} className="max-w-2xl mx-auto">
          <p className="text-lg sm:text-xl text-muted-foreground leading-relaxed mb-10">
            {config.hero.subhead}
          </p>
        </FadeIn>

        <FadeIn delay={0.4} className="w-full flex justify-center">
          <WaitlistForm buttonSize="lg" buttonLabel={config.hero.ctaLabel} />
        </FadeIn>
      </section>

      {/* 2. SOUND FAMILIAR — COMMUNITY FEARS */}
      <section id="fears" className="py-24 px-4 sm:px-6 lg:px-8">
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

      {/* 4. THE SKINCARE SPIRAL */}
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

      {/* 5. THE GOAL — MOVED UP as emotional pivot */}
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
      <section id="how-it-works" className="py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <FadeIn>
          <h2 className="text-3xl md:text-5xl font-serif text-center mb-16">How SkinScreen works</h2>
        </FadeIn>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 lg:gap-16">
          <FadeIn delay={0.1}>
            <div className="flex flex-col items-center text-center">
              <div className="w-20 h-20 rounded-3xl bg-primary/10 flex items-center justify-center mb-6 text-primary shadow-sm">
                <ScanLine className="w-10 h-10" />
              </div>
              <h3 className="text-2xl font-serif mb-3">1. Scan</h3>
              <p className="text-muted-foreground">
                Photograph or type your product's ingredient list. We instantly parse the complex chemical names.
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
          <IngredientScanner ctaLabel={config.scannerCtaLabel} />
        </div>
      </section>

      {/* 10. MY SHELF — live feature section */}
      <section id="my-shelf" className="py-24 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24 items-start">

            <FadeIn direction="right">
              <div>
                <span className="inline-block py-1 px-3 rounded-full bg-primary/15 text-primary text-sm font-medium tracking-wide mb-6">
                  {isAuthenticated ? "Your routine" : "Now available"}
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
                    { icon: ShoppingBag, text: "Scan a new product in-store and instantly see if it conflicts with your shelf" },
                    { icon: Bell, text: "Get safety alerts when a new conflict is discovered in your routine" },
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
                  <button
                    onClick={login}
                    className="inline-flex items-center gap-2 text-white bg-primary hover:bg-primary/90 px-6 py-3 rounded-full font-medium text-sm transition-colors"
                  >
                    <User className="w-4 h-4" />
                    Sign in to build your shelf
                  </button>
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

      {/* 11. WAITLIST CTA */}
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
    </main>
  );
}
