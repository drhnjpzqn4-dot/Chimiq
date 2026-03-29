import { FadeIn } from "@/components/FadeIn";
import { WaitlistForm } from "@/components/WaitlistForm";
import { DangerCard } from "@/components/DangerCard";
import { SpiralSection } from "@/components/SpiralSection";
import { IngredientScanner } from "@/components/IngredientScanner";
import { ScanLine, Layers, ShieldCheck } from "lucide-react";

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

export default function Home() {
  return (
    <main className="min-h-screen bg-background overflow-hidden">

      {/* HERO */}
      <section id="hero" className="relative pt-32 pb-24 md:pt-48 md:pb-32 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto flex flex-col items-center text-center">
        <div className="absolute inset-0 -z-10 pointer-events-none overflow-hidden">
          <img
            src={`${import.meta.env.BASE_URL}images/hero-bg.png`}
            alt=""
            className="absolute right-0 top-0 h-full w-auto max-w-[55%] md:max-w-[65%] object-cover object-left opacity-25 md:opacity-30"
          />
        </div>

        <FadeIn direction="down" delay={0.1}>
          <span className="inline-block py-1 px-3 rounded-full bg-primary/10 text-primary text-sm font-medium tracking-wide mb-6">
            Coming Soon to iOS
          </span>
        </FadeIn>

        <FadeIn delay={0.2} className="max-w-4xl">
          <h1 className="text-5xl sm:text-6xl md:text-7xl font-serif text-foreground leading-[1.1] tracking-tight mb-6">
            40 products. 400 ingredients.
            <br className="hidden md:block" />
            <span className="italic text-muted-foreground">Do you know what they do to each other?</span>
          </h1>
        </FadeIn>

        <FadeIn delay={0.3} className="max-w-2xl mx-auto">
          <p className="text-lg sm:text-xl text-muted-foreground leading-relaxed mb-10">
            SkinScreen scans your skincare and finds dangerous combinations — before they find your skin.
          </p>
        </FadeIn>

        <FadeIn delay={0.4} className="w-full flex justify-center">
          <WaitlistForm buttonSize="lg" />
        </FadeIn>
      </section>

      {/* THE SKINCARE SPIRAL */}
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

      {/* HOW IT WORKS */}
      <section id="how-it-works" className="py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <FadeIn>
          <h2 className="text-3xl md:text-5xl font-serif text-center mb-16">How it works</h2>
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

      {/* DANGER ZONE */}
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

      {/* TRY IT NOW — INGREDIENT SCANNER */}
      <section id="try-it-now" className="py-24 px-4 sm:px-6 lg:px-8 bg-[#FAFAF8]">
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
                Paste two ingredient lists and see SkinScreen detect conflicts in seconds — dermatologist-informed, research-backed.
              </p>
            </div>
          </FadeIn>
          <IngredientScanner />
        </div>
      </section>

      {/* WAITLIST CTA */}
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
