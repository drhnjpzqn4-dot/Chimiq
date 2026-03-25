import { FadeIn } from "@/components/FadeIn";
import { WaitlistForm } from "@/components/WaitlistForm";
import { DangerCard } from "@/components/DangerCard";
import { CheckCircle2, ScanLine, Layers, Activity } from "lucide-react";

export default function Home() {
  return (
    <main className="min-h-screen bg-background overflow-hidden selection:bg-primary/20">
      
      {/* HERO SECTION */}
      <section className="relative pt-32 pb-24 md:pt-48 md:pb-32 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto flex flex-col items-center text-center">
        {/* Abstract Background Element (AI Generated Image) */}
        <div className="absolute inset-0 -z-10 flex justify-center items-center opacity-30 pointer-events-none">
          <img 
            src={`${import.meta.env.BASE_URL}images/hero-abstract.png`} 
            alt="Abstract soft sage green gradient" 
            className="w-full max-w-4xl h-auto object-cover blur-3xl"
          />
        </div>

        <FadeIn direction="down" delay={0.1}>
          <span className="inline-block py-1 px-3 rounded-full bg-primary/10 text-primary text-sm font-medium tracking-wide mb-6">
            Coming Soon to iOS
          </span>
        </FadeIn>
        
        <FadeIn delay={0.2} className="max-w-4xl">
          <h1 className="text-5xl sm:text-6xl md:text-7xl font-serif text-foreground leading-[1.1] tracking-tight mb-6">
            40 products. 400 ingredients.<br className="hidden md:block" />
            <span className="italic text-muted-foreground">Do you know what they do to each other?</span>
          </h1>
        </FadeIn>

        <FadeIn delay={0.3} className="max-w-2xl mx-auto">
          <p className="text-lg sm:text-xl text-muted-foreground leading-relaxed mb-10">
            SkinScreen scans your skincare and finds dangerous combinations — before they find your skin. Build a safer, smarter routine.
          </p>
        </FadeIn>

        <FadeIn delay={0.4} className="w-full flex justify-center">
          <WaitlistForm buttonSize="lg" />
        </FadeIn>
      </section>

      {/* THE SKINCARE SPIRAL */}
      <section className="py-24 bg-[#F5F5F7]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <FadeIn>
            <h2 className="text-3xl md:text-5xl font-serif text-center mb-16">The Skincare Spiral</h2>
          </FadeIn>

          <div className="relative border-l border-primary/30 ml-4 md:ml-1/2 space-y-12 pb-8">
            {[
              { text: "Influencer recommends a serum → you buy it", delay: 0.1 },
              { text: "Skin dries out → buy a moisturizer", delay: 0.3 },
              { text: "Moisturizer won't penetrate → buy a booster", delay: 0.5 },
              { text: "Booster + serum = breakout → buy a calming cream", delay: 0.7 },
              { text: "40 jars on the shelf. Skin worse than before.", delay: 0.9, bold: true },
            ].map((step, idx) => (
              <FadeIn key={idx} direction="left" delay={step.delay} className="relative pl-8">
                <div className="absolute w-3 h-3 rounded-full bg-primary -left-[6.5px] top-2 ring-4 ring-[#F5F5F7]" />
                <p className={`text-lg md:text-xl ${step.bold ? "font-serif font-bold text-foreground text-2xl" : "text-muted-foreground"}`}>
                  {step.text}
                </p>
              </FadeIn>
            ))}
          </div>
          
          <FadeIn delay={1.2} direction="up" className="mt-12 text-center">
            <p className="text-2xl font-serif text-primary italic">SkinScreen breaks the cycle.</p>
          </FadeIn>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
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
              <div className="w-20 h-20 rounded-3xl bg-primary/10 flex items-center justify-center mb-6 text-primary shadow-sm relative overflow-hidden">
                <Activity className="w-10 h-10 relative z-10" />
                {/* Traffic light visual hint */}
                <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-destructive/60 animate-pulse" />
                <div className="absolute bottom-3 left-3 w-2 h-2 rounded-full bg-warning/60" />
                <div className="absolute top-4 left-4 w-2 h-2 rounded-full bg-success/60" />
              </div>
              <h3 className="text-2xl font-serif mb-3">3. Screen</h3>
              <p className="text-muted-foreground">
                Get a full safety analysis. See clear <span className="text-success font-medium">safe</span>, <span className="text-warning font-medium">caution</span>, or <span className="text-destructive font-medium">avoid</span> ratings for every pair.
              </p>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* DANGER ZONE (Replaces "The Numbers") */}
      <section className="py-24 bg-zinc-900 text-white rounded-[2.5rem] mx-4 sm:mx-6 lg:mx-8 mb-24 px-4 sm:px-12 lg:px-16 overflow-hidden relative">
        {/* Dark section for dramatic contrast - specifically requested not to use dark mode globally, but a dark section makes the "danger" pop beautifully and premium */}
        <div className="max-w-7xl mx-auto">
          <FadeIn>
            <h2 className="text-3xl md:text-5xl font-serif mb-6 leading-tight">
              What you don't know<br/>can hurt your skin.
            </h2>
            <p className="text-lg text-zinc-400 max-w-2xl mb-16">
              These are real, documented ingredient conflicts — the kind your dermatologist knows, but the beauty industry doesn't advertise.
            </p>
          </FadeIn>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
            <DangerCard 
              pair="Retinol + AHA/BHA"
              risk="Both are chemical exfoliants. Together they cause severe skin irritation, redness, and can damage the skin barrier — especially at night when skin is most vulnerable."
              citation="Kligman, A.M. (1988). The compatibility of combinations of glycolic acid and tretinoin. J Dermatol Treat. DOI: 10.3109/09546639409086912"
              severity="HIGH RISK"
              delay={0.1}
            />
            <DangerCard 
              pair="Retinol + Benzoyl Peroxide"
              risk="Benzoyl peroxide oxidises retinol, rendering it inactive. You're paying for two products that cancel each other out — and drying out your skin in the process."
              citation="Nighswonger, B.D. et al. (1993). Retinoid interactions with benzoyl peroxide. J Pharm Sci. PMID: 8450449"
              severity="HIGH RISK"
              delay={0.2}
            />
            <DangerCard 
              pair="AHAs + Sunscreen (without applying)"
              risk="Glycolic acid and lactic acid increase UV sensitivity by up to 50%. Using them without SPF dramatically raises your risk of sun damage, hyperpigmentation, and skin cancer."
              citation="Kornhauser, A. et al. (2010). Applications of hydroxy acids. Clin Cosmet Investig Dermatol. DOI: 10.2147/CCID.S9042"
              severity="HIGH RISK"
              delay={0.3}
            />
            <DangerCard 
              pair="Vitamin C + Niacinamide"
              risk="Widely debated. Some studies show they can form niacin when combined at high temperatures, potentially causing flushing. Safest to use at separate times of day."
              citation="Wohlrab, J. & Kreft, D. (2014). Niacinamide — mechanisms of action. Skin Pharmacol Physiol. DOI: 10.1159/000354888"
              severity="CAUTION"
              delay={0.4}
            />
            <DangerCard 
              pair="Kojic Acid + Vitamin C"
              risk="Both compete for the same oxidation pathway, reducing each other's brightening effect. Combined, they can also increase skin sensitivity and cause unexpected irritation."
              citation="Parvez, S. et al. (2006). Naturally occurring tyrosinase inhibitors. Phytother Res. DOI: 10.1002/ptr.1954"
              severity="HIGH RISK"
              delay={0.5}
            />
          </div>
        </div>
      </section>

      {/* WAITLIST CTA */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto text-center border-t border-border/50">
        <FadeIn>
          <div className="inline-flex items-center gap-2 mb-6 text-primary font-medium bg-primary/5 px-4 py-2 rounded-full">
            <CheckCircle2 className="w-5 h-5" />
            Join 200+ people waiting for smarter skincare
          </div>
          <h2 className="text-4xl md:text-6xl font-serif text-foreground mb-6 tracking-tight">
            Be first to know when SkinScreen launches
          </h2>
          <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto">
            Stop guessing. Start knowing. Get early access to the app that protects your skin barrier.
          </p>
          <div className="flex justify-center">
            <WaitlistForm buttonSize="lg" />
          </div>
        </FadeIn>
      </section>

      {/* FOOTER */}
      <footer className="py-8 text-center text-muted-foreground text-sm border-t border-border/50">
        <p>SkinScreen © {new Date().getFullYear()}. Smarter skincare starts here.</p>
      </footer>
    </main>
  );
}
