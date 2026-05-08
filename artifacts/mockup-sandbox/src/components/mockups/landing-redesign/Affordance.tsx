import "./_tokens.css";
import { useState } from "react";
import {
  ScanLine,
  ShieldCheck,
  AlertTriangle,
  ArrowRight,
  Smartphone,
  Apple,
  Download,
  Play,
  CheckCircle2,
  XCircle,
  Plus,
  Sparkles,
  Bell,
  ShoppingBag,
  FlaskConical,
  Search,
  QrCode,
  ChevronRight,
  Star,
  Zap,
  Gift,
  Mail,
  HelpCircle,
} from "lucide-react";

const SAGE = "#7BAF7A";
const SAGE_STRONG = "#356E36";
const DANGER = "#EF4444";

function Btn({
  children,
  variant = "primary",
  helper,
  icon: Icon,
  full,
  pulse,
}: {
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "ghost" | "danger" | "dark";
  helper?: string;
  icon?: React.ComponentType<{ size?: number; className?: string }>;
  full?: boolean;
  pulse?: boolean;
}) {
  const base =
    "inline-flex flex-col items-center justify-center gap-1 rounded-2xl font-semibold transition-all duration-150 active:scale-[0.97] focus:outline-none focus-visible:ring-4 focus-visible:ring-[#356E36]/40 shadow-md hover:shadow-lg hover:-translate-y-0.5";
  const sizes = "px-6 py-3.5 min-h-[56px] text-base";
  const variants = {
    primary: "bg-[#356E36] text-white hover:bg-[#2a572b] ring-1 ring-[#1f3f20]/30",
    secondary:
      "bg-white text-[#356E36] border-2 border-[#356E36] hover:bg-[#F0F7F0]",
    ghost:
      "bg-white/10 text-white border-2 border-white/40 backdrop-blur-md hover:bg-white/20",
    danger: "bg-[#EF4444] text-white hover:bg-[#dc2626]",
    dark: "bg-[#0d200d] text-white hover:bg-[#162a16]",
  } as const;
  return (
    <button
      data-touch
      className={`${base} ${sizes} ${variants[variant]} ${full ? "w-full" : ""} ${pulse ? "animate-pulse-soft" : ""}`}
    >
      <span className="inline-flex items-center gap-2 leading-none">
        {Icon ? <Icon size={20} /> : null}
        <span>{children}</span>
        <ArrowRight size={18} />
      </span>
      {helper ? (
        <span className="text-[11px] font-normal opacity-80 leading-tight">
          {helper}
        </span>
      ) : null}
    </button>
  );
}

function SectionEndCta({ label, helper }: { label: string; helper?: string }) {
  return (
    <div className="mt-12 flex flex-col items-center gap-2">
      <button
        data-touch
        className="inline-flex items-center gap-2 px-7 min-h-[52px] rounded-full bg-[#F0F7F0] text-[#356E36] font-semibold border-2 border-[#356E36]/30 hover:bg-[#356E36] hover:text-white transition-all active:scale-[0.97] focus:outline-none focus-visible:ring-4 focus-visible:ring-[#356E36]/40 shadow-sm hover:shadow-md"
      >
        <span>{label}</span>
        <ArrowRight size={18} />
      </button>
      {helper ? (
        <span className="text-xs text-[#6B7280]">{helper}</span>
      ) : null}
    </div>
  );
}

export default function Affordance() {
  const [scannerInput, setScannerInput] = useState("");

  return (
    <div className="chimiq-root">
      <style>{`
        @keyframes pulse-soft {
          0%, 100% { box-shadow: 0 0 0 0 rgba(53, 110, 53, 0.45); }
          50% { box-shadow: 0 0 0 12px rgba(53, 110, 53, 0); }
        }
        .animate-pulse-soft { animation: pulse-soft 1.8s ease-out infinite; }
        @keyframes float-bob {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }
        .float-bob { animation: float-bob 3s ease-in-out infinite; }
      `}</style>
      <div className="min-h-screen bg-white">
        {/* ─── STICKY TOP NAV ─── */}
        <nav className="sticky top-0 z-50 bg-white border-b-2 border-[#E8F0E8] shadow-sm">
          <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between gap-4">
            <a href="#hero" className="flex items-center" aria-label="Chimiq home">
              <img
                src="/images/logo-chimiq-long.png"
                alt="Chimiq"
                style={{ height: 32, width: "auto", objectFit: "contain" }}
              />
            </a>
            <div className="flex items-center gap-2">
              <select
                aria-label="Language"
                data-touch
                className="hidden sm:block min-h-[44px] px-3 rounded-xl border-2 border-[#DCE9DC] text-sm font-medium text-[#356E36] bg-white hover:bg-[#F0F7F0] focus:outline-none focus-visible:ring-4 focus-visible:ring-[#356E36]/30"
              >
                <option>EN</option>
                <option>SV</option>
                <option>FR</option>
              </select>
              <button
                data-touch
                className="hidden md:inline-flex items-center gap-2 min-h-[44px] px-4 rounded-xl border-2 border-[#356E36] text-[#356E36] bg-white hover:bg-[#F0F7F0] text-sm font-semibold transition-all active:scale-[0.97] focus:outline-none focus-visible:ring-4 focus-visible:ring-[#356E36]/30"
              >
                <ScanLine size={16} />
                Try scanner
              </button>
              <button
                data-touch
                className="inline-flex items-center gap-2 min-h-[44px] px-4 rounded-xl bg-[#356E36] text-white hover:bg-[#2a572b] text-sm font-semibold transition-all active:scale-[0.97] shadow-md focus:outline-none focus-visible:ring-4 focus-visible:ring-[#356E36]/40"
              >
                <Download size={16} />
                Get the app
              </button>
              <button
                data-touch
                className="inline-flex items-center min-h-[44px] px-3 rounded-xl text-sm font-semibold text-[#1A1A1F] hover:bg-[#F0F7F0] transition-colors focus:outline-none focus-visible:ring-4 focus-visible:ring-[#356E36]/30"
              >
                Sign in
              </button>
            </div>
          </div>
        </nav>

        {/* ─── HERO ─── */}
        <section
          id="hero"
          className="relative isolate overflow-hidden min-h-[820px] flex flex-col"
        >
          <img
            src="/images/hero-dark.png"
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
          />
          {/* darker overlay — chrome over photography */}
          <div className="absolute inset-0 bg-black/75" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-[#0d200d]/80" />

          <div className="relative z-10 flex-1 flex flex-col items-center text-center px-6 pt-20 pb-16 max-w-4xl mx-auto w-full">
            <span className="inline-flex items-center gap-2 py-2 px-4 rounded-full bg-[#EF4444]/15 border border-[#EF4444]/40 text-[#fecaca] text-xs font-bold tracking-widest uppercase mb-6">
              <AlertTriangle size={14} />
              AVOID DANGEROUS COMBOS
            </span>

            <h1 className="text-4xl sm:text-5xl md:text-6xl font-serif text-white leading-[1.05] tracking-tight mb-5">
              Chimiq is the app that{" "}
              <span className="italic text-[#a8d4a7]">scans your skincare</span>{" "}
              and flags dangerous ingredient combinations.
            </h1>
            <p className="text-lg text-white/85 mb-10 max-w-2xl">
              Paste an ingredient list, scan a barcode, or build your full
              routine. We tell you — in seconds — what conflicts, what's safe,
              and what to do instead.
            </p>

            {/* THREE CTAs vertical stack — each with icon + outcome line */}
            <div className="w-full max-w-md flex flex-col gap-3">
              {/* CTA 1: Scanner */}
              <button
                data-touch
                className="group w-full flex items-center justify-between gap-3 px-5 py-4 min-h-[72px] rounded-2xl bg-[#356E36] text-white hover:bg-[#2a572b] active:scale-[0.98] transition-all shadow-[0_8px_30px_rgba(53,110,53,0.5)] hover:shadow-[0_12px_40px_rgba(53,110,53,0.65)] ring-1 ring-white/20 focus:outline-none focus-visible:ring-4 focus-visible:ring-white/60 animate-pulse-soft"
              >
                <span className="flex items-center gap-3 text-left">
                  <span className="w-11 h-11 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
                    <ScanLine size={22} />
                  </span>
                  <span>
                    <span className="block text-base font-bold">
                      Try the scanner now
                    </span>
                    <span className="block text-xs text-white/80 font-normal">
                      No signup, free, instant results
                    </span>
                  </span>
                </span>
                <ArrowRight size={20} className="opacity-90 group-hover:translate-x-1 transition-transform" />
              </button>

              {/* CTA 2: Download — equally prominent */}
              <button
                data-touch
                className="group w-full flex items-center justify-between gap-3 px-5 py-4 min-h-[72px] rounded-2xl bg-white text-[#0d200d] hover:bg-[#F0F7F0] active:scale-[0.98] transition-all shadow-[0_8px_30px_rgba(255,255,255,0.25)] hover:shadow-[0_12px_40px_rgba(255,255,255,0.4)] ring-2 ring-white focus:outline-none focus-visible:ring-4 focus-visible:ring-white/60"
              >
                <span className="flex items-center gap-3 text-left">
                  <span className="w-11 h-11 rounded-xl bg-[#356E36] text-white flex items-center justify-center flex-shrink-0">
                    <Download size={22} />
                  </span>
                  <span>
                    <span className="block text-base font-bold">
                      Download the Chimiq app
                    </span>
                    <span className="block text-xs text-[#6B7280] font-normal">
                      iOS &amp; Android coming soon — get notified
                    </span>
                  </span>
                </span>
                <ArrowRight size={20} className="opacity-90 group-hover:translate-x-1 transition-transform" />
              </button>

              {/* CTA 3: How it works */}
              <button
                data-touch
                className="group w-full flex items-center justify-between gap-3 px-5 py-4 min-h-[72px] rounded-2xl bg-white/10 text-white border-2 border-white/40 backdrop-blur-md hover:bg-white/20 active:scale-[0.98] transition-all focus:outline-none focus-visible:ring-4 focus-visible:ring-white/60"
              >
                <span className="flex items-center gap-3 text-left">
                  <span className="w-11 h-11 rounded-xl bg-white/15 flex items-center justify-center flex-shrink-0">
                    <Play size={22} />
                  </span>
                  <span>
                    <span className="block text-base font-bold">
                      See how it works
                    </span>
                    <span className="block text-xs text-white/70 font-normal">
                      30-second tour
                    </span>
                  </span>
                </span>
                <ArrowRight size={20} className="opacity-90 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>

            {/* Ingredient pills with conflict badges */}
            <div className="flex flex-wrap justify-center gap-2 mt-10 max-w-2xl">
              {[
                { name: "Retinol", conflict: true },
                { name: "Glycolic Acid", conflict: true },
                { name: "Niacinamide", conflict: false },
                { name: "Benzoyl Peroxide", conflict: true },
                { name: "Vitamin C", conflict: false },
                { name: "AHA / BHA", conflict: false },
              ].map((ing) => (
                <span
                  key={ing.name}
                  className="relative inline-flex items-center px-4 py-2 rounded-full bg-white/12 border border-white/25 text-white text-sm font-medium"
                >
                  {ing.name}
                  {ing.conflict && (
                    <span className="absolute -top-2 -right-2 bg-[#EF4444] text-white text-[9px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap shadow">
                      ⚠ CONFLICT
                    </span>
                  )}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* ─── HOW IT WORKS ─── */}
        <section id="how-it-works" className="py-20 px-6 bg-white">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <span className="inline-block text-xs font-bold tracking-widest uppercase text-[#356E36] mb-3">
                Step by step
              </span>
              <h2 className="text-3xl md:text-5xl font-serif mb-3">
                How Chimiq works
              </h2>
              <p className="text-[#6B7280] text-lg">
                Three steps. Seconds. No guesswork.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              {[
                {
                  num: "1",
                  icon: ScanLine,
                  title: "Scan or paste",
                  body: "Photograph your ingredient list, scan the barcode, or choose from popular products.",
                  cta: "Try the scanner",
                },
                {
                  num: "2",
                  icon: ShoppingBag,
                  title: "Build your routine",
                  body: "Add multiple products to check how they interact — not just what's in them.",
                  cta: "See My Shelf",
                },
                {
                  num: "3",
                  icon: ShieldCheck,
                  title: "See the risks",
                  body: "Get instant conflict detection with clear red, yellow, and green ratings — and what to do instead.",
                  cta: "View example",
                },
              ].map((step) => (
                <div
                  key={step.num}
                  className="relative bg-white rounded-2xl p-6 border-2 border-[#E8F0E8] shadow-sm hover:shadow-lg hover:border-[#7BAF7A] transition-all"
                >
                  <div className="flex items-center gap-3 mb-4">
                    <span className="w-10 h-10 rounded-full bg-[#356E36] text-white flex items-center justify-center font-bold text-lg">
                      {step.num}
                    </span>
                    <step.icon size={24} className="text-[#356E36]" />
                  </div>
                  <h3 className="text-xl font-serif font-semibold mb-2">
                    {step.title}
                  </h3>
                  <p className="text-sm text-[#6B7280] mb-4 leading-relaxed">
                    {step.body}
                  </p>
                  <button
                    data-touch
                    className="w-full inline-flex items-center justify-center gap-2 min-h-[48px] rounded-xl bg-[#F0F7F0] text-[#356E36] font-semibold text-sm hover:bg-[#356E36] hover:text-white transition-all active:scale-[0.97] focus:outline-none focus-visible:ring-4 focus-visible:ring-[#356E36]/30"
                  >
                    {step.cta}
                    <ArrowRight size={16} />
                  </button>
                </div>
              ))}
            </div>

            <SectionEndCta
              label="Next: try the scanner"
              helper="No signup required"
            />
          </div>
        </section>

        {/* ─── SCANNER ─── */}
        <section
          id="scanner"
          className="py-20 px-6 bg-gradient-to-b from-[#F7FAF7] to-white"
        >
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-10">
              <span className="inline-block text-xs font-bold tracking-widest uppercase text-[#356E36] mb-3">
                Try It Now · Free
              </span>
              <h2 className="text-3xl md:text-5xl font-serif mb-3">
                Paste your ingredients. Get an answer.
              </h2>
              <p className="text-[#6B7280] text-lg">
                Dermatologist-informed, research-backed. Instant.
              </p>
            </div>

            <div className="bg-white rounded-3xl border-2 border-[#DCE9DC] shadow-xl p-6 md:p-8">
              <label className="block text-xs font-bold tracking-widest uppercase text-[#356E36] mb-2">
                CHIMIQ SCANNER
              </label>

              <div className="flex flex-col sm:flex-row gap-3 mb-4">
                <div className="flex-1 relative">
                  <Search
                    size={20}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-[#6B7280] pointer-events-none"
                  />
                  <input
                    value={scannerInput}
                    onChange={(e) => setScannerInput(e.target.value)}
                    placeholder="Paste ingredient list here, e.g. Aqua, Retinol, Glycolic Acid…"
                    className="w-full h-[56px] pl-11 pr-4 rounded-2xl border-2 border-[#DCE9DC] bg-[#F7FAF7] text-base text-[#1A1A1F] placeholder:text-[#9CA3AF] focus:outline-none focus:border-[#356E36] focus:bg-white focus:ring-4 focus:ring-[#356E36]/20"
                  />
                </div>
                <button
                  data-touch
                  className="inline-flex items-center justify-center gap-2 h-[56px] px-7 rounded-2xl bg-[#356E36] text-white font-bold text-base hover:bg-[#2a572b] transition-all active:scale-[0.97] shadow-lg ring-1 ring-[#1f3f20]/30 focus:outline-none focus-visible:ring-4 focus-visible:ring-[#356E36]/40 animate-pulse-soft"
                >
                  <Zap size={18} />
                  Analyze
                </button>
              </div>

              {/* Chip suggestions */}
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className="text-xs text-[#6B7280] font-medium">
                  Or click to try:
                </span>
                {[
                  "Retinol + Glycolic Acid",
                  "Niacinamide + Vit C",
                  "BP + Retinol",
                ].map((chip) => (
                  <button
                    key={chip}
                    data-touch
                    className="inline-flex items-center gap-1.5 min-h-[36px] px-3 rounded-full bg-[#F0F7F0] border border-[#356E36]/30 text-[#356E36] text-sm font-semibold hover:bg-[#356E36] hover:text-white transition-all active:scale-[0.97] focus:outline-none focus-visible:ring-4 focus-visible:ring-[#356E36]/30"
                  >
                    <Sparkles size={12} />
                    {chip}
                  </button>
                ))}
              </div>

              <div className="mt-6 grid sm:grid-cols-3 gap-3 text-xs text-[#6B7280]">
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-[#356E36]" />
                  No signup required
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-[#356E36]" />
                  Free, always
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-[#356E36]" />
                  Results in &lt;3s
                </div>
              </div>
            </div>

            <SectionEndCta
              label="Next: see the danger combos"
              helper="Real, documented conflicts"
            />
          </div>
        </section>

        {/* ─── DANGER COMBINATIONS ─── */}
        <section className="py-20 px-6 bg-white">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <span className="inline-block text-xs font-bold tracking-widest uppercase text-[#EF4444] mb-3">
                The danger zone
              </span>
              <h2 className="text-3xl md:text-5xl font-serif mb-3">
                What you don't know can{" "}
                <span className="italic">hurt your skin.</span>
              </h2>
              <p className="text-[#6B7280] text-lg max-w-2xl mx-auto">
                These are real, documented ingredient conflicts — the kind your
                dermatologist knows, but the beauty industry doesn't advertise.
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
              {[
                {
                  pair: "Retinol + Benzoyl Peroxide",
                  risk: "Benzoyl peroxide oxidises retinol, rendering it inactive. You're paying for two products that cancel each other out — and drying out your skin in the process.",
                  severity: "HIGH RISK",
                  source:
                    "Nighswonger et al. (1993). PMID: 8450449",
                },
                {
                  pair: "Retinol + AHA/BHA",
                  risk: "Both are chemical exfoliants. Together they cause severe skin irritation, redness, and can damage the skin barrier — especially at night when skin is most vulnerable.",
                  severity: "HIGH RISK",
                  source: "Kligman, A.M. (1988). J Dermatol Treat.",
                },
                {
                  pair: "AHAs + No Sunscreen",
                  risk: "Glycolic acid and lactic acid increase UV sensitivity by up to 50%. Using them without SPF dramatically raises your risk of sun damage and hyperpigmentation.",
                  severity: "HIGH RISK",
                  source: "Kornhauser et al. (2010).",
                },
                {
                  pair: "Vitamin C + Niacinamide",
                  risk: "Widely debated. Some studies show they can form niacin when combined at high temperatures, potentially causing flushing. Safest to use at separate times of day.",
                  severity: "CAUTION",
                  source: "Wohlrab & Kreft (2014).",
                },
                {
                  pair: "Hydroquinone + AHAs",
                  risk: "Stacking exfoliating acids with hydroquinone can over-strip the barrier and cause paradoxical hyperpigmentation. Use under dermatologist guidance only.",
                  severity: "HIGH RISK",
                  source: "Parvez et al. (2006). Phytother Res.",
                },
                {
                  pair: "Kojic Acid + Vitamin C",
                  risk: "Both compete for the same oxidation pathway, reducing each other's brightening effect. Combined, they can also increase skin sensitivity.",
                  severity: "HIGH RISK",
                  source: "Parvez et al. (2006).",
                },
              ].map((c) => {
                const high = c.severity === "HIGH RISK";
                return (
                  <article
                    key={c.pair}
                    className={`rounded-2xl p-5 border-2 shadow-sm hover:shadow-lg transition-all ${
                      high
                        ? "bg-[#FEF2F2] border-[#EF4444]/30"
                        : "bg-[#FFFBEB] border-[#F59E0B]/30"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <h3 className="text-lg font-serif font-semibold leading-tight">
                        {c.pair}
                      </h3>
                      <span
                        className={`flex-shrink-0 inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full ${
                          high
                            ? "bg-[#EF4444] text-white"
                            : "bg-[#F59E0B] text-white"
                        }`}
                      >
                        {high ? <XCircle size={11} /> : <AlertTriangle size={11} />}
                        {c.severity}
                      </span>
                    </div>
                    <p className="text-sm text-[#1A1A1F]/80 leading-relaxed mb-3">
                      {c.risk}
                    </p>
                    <p className="text-[11px] text-[#6B7280] mb-4">
                      Source: {c.source}
                    </p>
                    <button
                      data-touch
                      className="w-full inline-flex items-center justify-center gap-2 min-h-[44px] rounded-xl bg-white border-2 border-[#356E36]/30 text-[#356E36] font-semibold text-sm hover:bg-[#356E36] hover:text-white hover:border-[#356E36] transition-all active:scale-[0.97] focus:outline-none focus-visible:ring-4 focus-visible:ring-[#356E36]/30"
                    >
                      Check my routine for this
                      <ArrowRight size={14} />
                    </button>
                  </article>
                );
              })}
            </div>

            <SectionEndCta
              label="Next: see the disaster mix"
              helper="The bestselling routine that hurts skin"
            />
          </div>
        </section>

        {/* ─── DISASTER MIX ─── */}
        <section className="py-20 px-6 bg-[#0d200d] text-white">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <span className="inline-flex items-center gap-2 py-1.5 px-4 rounded-full bg-[#EF4444]/20 border border-[#EF4444]/40 text-[#fecaca] text-xs font-bold tracking-widest uppercase mb-4">
                <AlertTriangle size={12} />
                Disaster Mix
              </span>
              <h2 className="text-3xl md:text-5xl font-serif mb-3 leading-tight">
                The routine that sells millions —{" "}
                <span className="italic text-white/70">
                  and quietly damages skin.
                </span>
              </h2>
              <p className="text-white/70 text-lg max-w-2xl mx-auto">
                Three bestselling products, sold side-by-side, recommended in the
                same beginner guides. They're also a clinically documented
                disaster combination.
              </p>
            </div>

            <div className="flex flex-col lg:flex-row items-stretch justify-center gap-3 mb-8">
              {[
                {
                  brand: "The Ordinary",
                  name: "Retinol 1% in Squalane",
                  role: "PM serum",
                },
                {
                  brand: "The Ordinary",
                  name: "Salicylic Acid 2% Solution",
                  role: "PM exfoliant",
                },
                {
                  brand: "The Ordinary",
                  name: "AHA 30% + BHA 2% Peel",
                  role: "Weekly peel",
                },
              ].map((p, i, arr) => (
                <div key={p.name} className="flex items-stretch gap-3 flex-1">
                  <div className="flex-1 bg-white/8 rounded-2xl p-5 border-2 border-white/15 backdrop-blur-sm">
                    <div className="aspect-[3/4] mb-4 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center">
                      <FlaskConical size={56} className="text-white/40" />
                    </div>
                    <span className="block text-[10px] font-bold tracking-widest uppercase text-white/50 mb-1">
                      {p.brand}
                    </span>
                    <h3 className="text-base font-serif font-semibold mb-1 leading-tight">
                      {p.name}
                    </h3>
                    <span className="inline-block text-xs px-2 py-0.5 rounded-full bg-white/10 text-white/70">
                      {p.role}
                    </span>
                  </div>
                  {i < arr.length - 1 && (
                    <div className="flex items-center justify-center">
                      <span className="w-10 h-10 rounded-full bg-[#EF4444] text-white flex items-center justify-center shadow-lg">
                        <Plus size={20} strokeWidth={3} />
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="text-center">
              <button
                data-touch
                className="inline-flex items-center justify-center gap-2 min-h-[64px] px-8 rounded-2xl bg-[#EF4444] text-white text-lg font-bold hover:bg-[#dc2626] transition-all active:scale-[0.97] shadow-[0_8px_30px_rgba(239,68,68,0.4)] focus:outline-none focus-visible:ring-4 focus-visible:ring-[#EF4444]/50"
              >
                <AlertTriangle size={22} />
                See what happens
                <ArrowRight size={20} />
              </button>
              <p className="mt-3 text-sm text-white/60">
                Side-by-side breakdown · clinically sourced
              </p>
            </div>
          </div>
        </section>

        {/* ─── SOCIAL PROOF ─── */}
        <section className="py-16 px-6 bg-white">
          <div className="max-w-5xl mx-auto">
            <div className="grid md:grid-cols-3 gap-4">
              {[
                { stat: "187,420", label: "Analyses run" },
                { stat: "42,180", label: "Products scanned" },
                { stat: "4.8★", label: "Average user rating" },
              ].map((s) => (
                <div
                  key={s.label}
                  className="bg-[#F0F7F0] rounded-2xl p-6 text-center border-2 border-[#356E36]/15"
                >
                  <div className="text-4xl font-serif font-bold text-[#356E36] mb-1">
                    {s.stat}
                  </div>
                  <div className="text-sm text-[#6B7280] font-medium">
                    {s.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── MY SHELF ─── */}
        <section className="py-20 px-6 bg-[#F7FAF7]">
          <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-12 items-center">
            <div>
              <span className="inline-block text-xs font-bold tracking-widest uppercase text-[#356E36] mb-3">
                Your routine
              </span>
              <h2 className="text-3xl md:text-5xl font-serif mb-4 leading-tight">
                Your personal{" "}
                <span className="italic">skincare shelf.</span>
              </h2>
              <p className="text-[#6B7280] text-lg mb-6">
                Stop testing combinations on your face. My Shelf lets you build
                your full routine digitally — and checks any new product against
                everything you already use, before you buy it.
              </p>
              <ul className="space-y-3 mb-6">
                {[
                  "Organise morning & evening routines",
                  "Scan in-store and check instantly against your shelf",
                  "Get safety alerts when new conflicts are discovered",
                  "Download a PDF safety report for your dermatologist",
                ].map((f) => (
                  <li key={f} className="flex items-start gap-3 text-sm">
                    <CheckCircle2
                      size={20}
                      className="text-[#356E36] flex-shrink-0 mt-0.5"
                    />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <button
                data-touch
                className="inline-flex items-center gap-2 min-h-[52px] px-6 rounded-2xl bg-[#356E36] text-white font-bold hover:bg-[#2a572b] transition-all active:scale-[0.97] shadow-md focus:outline-none focus-visible:ring-4 focus-visible:ring-[#356E36]/40"
              >
                <ShoppingBag size={18} />
                Start your shelf — free
                <ArrowRight size={16} />
              </button>
            </div>

            {/* Stylized shelf preview */}
            <div className="bg-white rounded-3xl p-6 border-2 border-[#DCE9DC] shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold tracking-widest uppercase text-[#356E36]">
                  My Shelf · Preview
                </span>
                <Bell size={16} className="text-[#356E36]" />
              </div>
              <div className="space-y-3">
                {[
                  { name: "CeraVe Hydrating Cleanser", verdict: "ok" },
                  { name: "The Ordinary Niacinamide 10%", verdict: "ok" },
                  { name: "Paula's Choice Retinol 1%", verdict: "warn" },
                  { name: "Drunk Elephant T.L.C. Glycolic Toner", verdict: "danger" },
                ].map((p) => (
                  <div
                    key={p.name}
                    className="flex items-center gap-3 p-3 rounded-xl border-2 border-[#E8F0E8] bg-[#F7FAF7]"
                  >
                    <div className="w-10 h-10 rounded-lg bg-white border border-[#DCE9DC] flex items-center justify-center">
                      <FlaskConical size={18} className="text-[#356E36]" />
                    </div>
                    <span className="flex-1 text-sm font-medium">{p.name}</span>
                    {p.verdict === "ok" && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full bg-[#356E36]/10 text-[#356E36]">
                        <CheckCircle2 size={11} /> SAFE
                      </span>
                    )}
                    {p.verdict === "warn" && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full bg-[#F59E0B]/15 text-[#92400E]">
                        <AlertTriangle size={11} /> CAUTION
                      </span>
                    )}
                    {p.verdict === "danger" && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full bg-[#EF4444]/15 text-[#EF4444]">
                        <XCircle size={11} /> CONFLICT
                      </span>
                    )}
                  </div>
                ))}
              </div>
              <div className="mt-4 p-3 rounded-xl bg-[#FEF2F2] border border-[#EF4444]/30 text-xs text-[#7f1d1d]">
                <strong>Conflict found:</strong> Retinol + Glycolic Acid → barrier damage at night.
              </div>
            </div>
          </div>
        </section>

        {/* ─── PRICING ─── */}
        <section className="py-20 px-6 bg-white">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-12">
              <span className="inline-block text-xs font-bold tracking-widest uppercase text-[#356E36] mb-3">
                Pricing
              </span>
              <h2 className="text-3xl md:text-5xl font-serif mb-3">
                Free to start. Upgrade when ready.
              </h2>
              <p className="text-[#6B7280] text-lg">
                Most people never need more than the free tier. But if your shelf
                keeps growing, Premium has you covered.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-5">
              {/* FREE */}
              <div className="bg-white rounded-3xl p-7 border-2 border-[#E8F0E8] shadow-md">
                <h3 className="text-2xl font-serif font-semibold mb-1">Free</h3>
                <div className="text-4xl font-bold text-[#356E36] mb-1">$0</div>
                <p className="text-xs text-[#6B7280] mb-5">
                  No card required. Always free.
                </p>
                <ul className="space-y-2 mb-6 text-sm">
                  {[
                    "Ingredient safety analysis",
                    "Compare 2 products at once",
                    "Find a Dermatologist",
                    "Barcode scanner",
                    "My Shelf (up to 2 products)",
                  ].map((f) => (
                    <li key={f} className="flex items-start gap-2">
                      <CheckCircle2
                        size={16}
                        className="text-[#356E36] flex-shrink-0 mt-0.5"
                      />
                      {f}
                    </li>
                  ))}
                </ul>
                <button
                  data-touch
                  className="w-full inline-flex flex-col items-center justify-center gap-1 min-h-[56px] rounded-2xl bg-[#F0F7F0] text-[#356E36] font-bold border-2 border-[#356E36]/30 hover:bg-[#356E36] hover:text-white transition-all active:scale-[0.97] focus:outline-none focus-visible:ring-4 focus-visible:ring-[#356E36]/30"
                >
                  <span>Choose Free</span>
                  <span className="text-[11px] font-normal opacity-80">
                    Start now · no card · no signup wall
                  </span>
                </button>
              </div>

              {/* PREMIUM */}
              <div className="relative bg-gradient-to-br from-[#356E36] to-[#2a572b] text-white rounded-3xl p-7 shadow-2xl ring-2 ring-[#356E36]">
                <span className="absolute -top-3 right-6 inline-flex items-center gap-1 text-[10px] font-bold tracking-widest uppercase px-3 py-1 rounded-full bg-[#EF4444] text-white shadow">
                  <Star size={11} /> Most popular
                </span>
                <h3 className="text-2xl font-serif font-semibold mb-1">
                  Premium
                </h3>
                <div className="flex items-baseline gap-1 mb-1">
                  <span className="text-4xl font-bold">49 SEK</span>
                  <span className="text-sm opacity-80">/month</span>
                </div>
                <p className="text-xs text-white/80 mb-5">
                  7-day free trial · cancel anytime
                </p>
                <ul className="space-y-2 mb-6 text-sm">
                  {[
                    "Everything in Free",
                    "Unlimited shelf products",
                    "Full routine cross-check",
                    "AI Chat with Chimiq",
                    "PDF Safety Report",
                  ].map((f) => (
                    <li key={f} className="flex items-start gap-2">
                      <CheckCircle2
                        size={16}
                        className="text-[#a8d4a7] flex-shrink-0 mt-0.5"
                      />
                      {f}
                    </li>
                  ))}
                </ul>
                <button
                  data-touch
                  className="w-full inline-flex flex-col items-center justify-center gap-1 min-h-[56px] rounded-2xl bg-white text-[#356E36] font-bold hover:bg-[#F0F7F0] transition-all active:scale-[0.97] shadow-lg focus:outline-none focus-visible:ring-4 focus-visible:ring-white/60"
                >
                  <span>Start 7-day free trial</span>
                  <span className="text-[11px] font-normal opacity-80">
                    Free for 7 days, then 49 SEK/mo · cancel anytime
                  </span>
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* ─── EARN PREMIUM ─── */}
        <section className="py-20 px-6 bg-[#F7FAF7]">
          <div className="max-w-5xl mx-auto text-center">
            <span className="inline-flex items-center gap-2 py-1.5 px-4 rounded-full bg-[#356E36]/10 text-[#356E36] text-xs font-bold tracking-widest uppercase mb-4">
              <Gift size={12} />
              Help the community · Earn free premium
            </span>
            <h2 className="text-3xl md:text-5xl font-serif mb-3">
              Build the database.{" "}
              <span className="italic">Earn free premium.</span>
            </h2>
            <p className="text-[#6B7280] text-lg max-w-2xl mx-auto mb-8">
              Add 30 new products to unlock 1 month Premium free. Every product
              you contribute helps thousands avoid skin-damaging combinations.
            </p>
            <button
              data-touch
              className="inline-flex flex-col items-center justify-center gap-1 min-h-[64px] px-8 rounded-2xl bg-[#356E36] text-white font-bold hover:bg-[#2a572b] transition-all active:scale-[0.97] shadow-lg focus:outline-none focus-visible:ring-4 focus-visible:ring-[#356E36]/40"
            >
              <span className="inline-flex items-center gap-2 text-base">
                <Gift size={18} />
                Start contributing
                <ArrowRight size={16} />
              </span>
              <span className="text-[11px] font-normal opacity-80">
                Free · sign in to track your progress
              </span>
            </button>
          </div>
        </section>

        {/* ─── DOWNLOAD THE APP — full bleed dark green, big ─── */}
        <section
          id="download"
          className="relative py-24 px-6 bg-[#0d200d] text-white overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-[#356E36]/30 via-transparent to-transparent" />
          <div className="relative max-w-6xl mx-auto">
            <div className="grid md:grid-cols-2 gap-10 items-center">
              <div>
                <span className="inline-flex items-center gap-2 py-1.5 px-4 rounded-full bg-white/15 border border-white/30 text-white text-xs font-bold tracking-widest uppercase mb-5">
                  <Smartphone size={12} />
                  Download Chimiq
                </span>
                <h2 className="text-4xl md:text-6xl font-serif leading-[1.05] mb-5">
                  Get Chimiq{" "}
                  <span className="italic text-[#a8d4a7]">on your phone.</span>
                </h2>
                <p className="text-white/85 text-lg mb-8 max-w-lg">Scan in-store. Build your personal shelf with the products you use every day. Get push alerts when a new conflict is found in your routine. Free to try.</p>

                <div className="flex flex-col sm:flex-row gap-3 mb-6">
                  <button
                    data-touch
                    style={{ width: 240 }}
                    className="inline-flex items-center gap-3 min-h-[64px] px-5 rounded-2xl bg-white text-[#0d200d] font-bold hover:bg-[#F0F7F0] transition-all active:scale-[0.97] shadow-xl focus:outline-none focus-visible:ring-4 focus-visible:ring-white/60"
                  >
                    <Apple size={32} />
                    <span className="text-left leading-tight">
                      <span className="block text-[10px] font-medium opacity-70">
                        Download on the
                      </span>
                      <span className="block text-lg">App Store</span>
                    </span>
                  </button>
                  <button
                    data-touch
                    style={{ width: 240 }}
                    className="inline-flex items-center gap-3 min-h-[64px] px-5 rounded-2xl bg-white text-[#0d200d] font-bold hover:bg-[#F0F7F0] transition-all active:scale-[0.97] shadow-xl focus:outline-none focus-visible:ring-4 focus-visible:ring-white/60"
                  >
                    <Smartphone size={32} />
                    <span className="text-left leading-tight">
                      <span className="block text-[10px] font-medium opacity-70">
                        Get it on
                      </span>
                      <span className="block text-lg">Google Play</span>
                    </span>
                  </button>
                </div>

                <button
                  data-touch
                  className="inline-flex items-center gap-2 min-h-[48px] px-5 rounded-xl bg-white/10 border-2 border-white/40 text-white font-semibold hover:bg-white/20 transition-all active:scale-[0.97] focus:outline-none focus-visible:ring-4 focus-visible:ring-white/60"
                >
                  <Mail size={16} />
                  Email me when it launches
                </button>
              </div>

              <div className="flex flex-col items-center gap-6">
                <img
                  src="/images/app-icon.png"
                  alt="Chimiq app icon"
                  style={{ width: 160, height: 160 }}
                  className="rounded-[40px] shadow-2xl float-bob"
                />
                <div
                  className="bg-white rounded-2xl p-4 shadow-2xl flex flex-col items-center"
                  style={{ width: 200 }}
                >
                  <div className="w-[160px] h-[160px] rounded-xl bg-white border-2 border-[#0d200d] flex items-center justify-center">
                    {/* Stylized QR placeholder */}
                    <svg
                      viewBox="0 0 100 100"
                      className="w-full h-full p-2"
                      aria-label="QR code"
                    >
                      {Array.from({ length: 10 }).map((_, y) =>
                        Array.from({ length: 10 }).map((_, x) => {
                          const fill = (x * 7 + y * 13 + (x ^ y)) % 3 === 0;
                          return fill ? (
                            <rect
                              key={`${x}-${y}`}
                              x={x * 10}
                              y={y * 10}
                              width="10"
                              height="10"
                              fill="#0d200d"
                            />
                          ) : null;
                        }),
                      )}
                      <rect x="0" y="0" width="30" height="30" fill="none" stroke="#0d200d" strokeWidth="6" />
                      <rect x="70" y="0" width="30" height="30" fill="none" stroke="#0d200d" strokeWidth="6" />
                      <rect x="0" y="70" width="30" height="30" fill="none" stroke="#0d200d" strokeWidth="6" />
                    </svg>
                  </div>
                  <div className="mt-2 inline-flex items-center gap-1.5 text-xs font-bold text-[#0d200d]">
                    <QrCode size={14} />
                    Scan to download
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ─── FOOTER ─── */}
        <footer className="bg-white border-t-2 border-[#E8F0E8] py-16 px-6">
          <div className="max-w-7xl mx-auto grid md:grid-cols-3 gap-10">
            <div>
              <img
                src="/images/logo-chimiq-long.png"
                alt="Chimiq"
                style={{ height: 28, width: "auto", objectFit: "contain" }}
                className="mb-4"
              />
              <p className="text-sm text-[#6B7280] leading-relaxed mb-4">
                Chimiq is the first Chimiq product. We scan ingredient lists
                across categories — because what you put on your skin, hair, and
                home matters.
              </p>
              <ul className="space-y-1 text-sm">
                <li>
                  <a className="text-[#356E36] font-semibold hover:underline cursor-pointer">
                    Skincare
                  </a>
                </li>
                <li className="text-[#6B7280]">
                  Hair{" "}
                  <span className="text-xs italic">(coming soon)</span>
                </li>
                <li className="text-[#6B7280]">
                  Household{" "}
                  <span className="text-xs italic">(coming soon)</span>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="text-base font-serif font-semibold mb-3">
                Quick links
              </h3>
              <ul className="space-y-2 text-sm">
                {[
                  "How it works",
                  "Try the scanner",
                  "Discover",
                  "Pricing",
                  "Earn free Premium",
                  "Download the app",
                  "Privacy policy",
                  "Terms of service",
                  "Medical disclaimer",
                ].map((l) => (
                  <li key={l}>
                    <a className="text-[#356E36] hover:underline cursor-pointer inline-flex items-center gap-1">
                      <ChevronRight size={12} />
                      {l}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="text-lg font-serif font-semibold mb-3">
                Get in touch
              </h3>
              <form className="flex flex-col gap-3">
                <input
                  type="text"
                  placeholder="Your name"
                  className="w-full min-h-[48px] px-4 rounded-xl border-2 border-[#DCE9DC] bg-white text-sm focus:outline-none focus:border-[#356E36] focus:ring-4 focus:ring-[#356E36]/20"
                />
                <input
                  type="email"
                  placeholder="your@email.com"
                  className="w-full min-h-[48px] px-4 rounded-xl border-2 border-[#DCE9DC] bg-white text-sm focus:outline-none focus:border-[#356E36] focus:ring-4 focus:ring-[#356E36]/20"
                />
                <textarea
                  placeholder="What's on your mind?"
                  rows={3}
                  className="w-full px-4 py-3 rounded-xl border-2 border-[#DCE9DC] bg-white text-sm resize-none focus:outline-none focus:border-[#356E36] focus:ring-4 focus:ring-[#356E36]/20"
                />
                <button
                  type="button"
                  data-touch
                  className="w-full inline-flex items-center justify-center gap-2 min-h-[52px] rounded-xl bg-[#356E36] text-white font-bold hover:bg-[#2a572b] transition-all active:scale-[0.97] shadow-md focus:outline-none focus-visible:ring-4 focus-visible:ring-[#356E36]/40"
                >
                  <Mail size={16} />
                  Send message
                </button>
              </form>
            </div>
          </div>
          <div className="max-w-7xl mx-auto mt-12 pt-6 border-t border-[#E8F0E8] text-xs text-[#6B7280] flex flex-wrap items-center justify-between gap-3">
            <span>© 2026 Chimiq. Smarter skincare starts here.</span>
            <span className="inline-flex items-center gap-2">
              <HelpCircle size={12} />
              Need help? <a className="text-[#356E36] font-semibold underline cursor-pointer">pia@chimiq.com</a>
            </span>
          </div>
        </footer>

        {/* ─── PERSISTENT FLOATING DOWNLOAD PILL ─── */}
        <div
          className="fixed bottom-5 right-5 z-50 flex items-center gap-2 pl-4 pr-2 py-2 rounded-full bg-[#356E36] text-white shadow-2xl ring-2 ring-white/40 backdrop-blur-sm hover:bg-[#2a572b] transition-all cursor-pointer animate-pulse-soft"
          role="button"
          tabIndex={0}
        >
          <Download size={18} />
          <span className="text-sm font-bold whitespace-nowrap">
            Download Chimiq
          </span>
          <span className="flex items-center gap-1 ml-1">
            <span className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center">
              <Apple size={14} />
            </span>
            <span className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center">
              <Smartphone size={14} />
            </span>
          </span>
        </div>
      </div>
    </div>
  );
}
