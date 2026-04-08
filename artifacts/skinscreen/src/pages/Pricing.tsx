import { useState } from "react";
import { useLocation } from "wouter";
import {
  Check, X, Zap, ShieldCheck, MessageCircle, FileText, Layers,
  ArrowLeft, Loader2,
} from "lucide-react";
import { FadeIn } from "@/components/FadeIn";
import { useUserPlan } from "@/hooks/useUserPlan";
import { cn } from "@/lib/utils";
import { getBaseUrl } from "@/lib/base-url";

const FREE_FEATURES: Array<{ label: string; included: boolean }> = [
  { label: "Ingredient safety analysis", included: true },
  { label: "Compare 2 products at once", included: true },
  { label: "Find a Dermatologist", included: true },
  { label: "Barcode scanner", included: true },
  { label: "My Shelf (up to 2 products)", included: true },
  { label: "Unlimited shelf products", included: false },
  { label: "Full routine cross-check", included: false },
  { label: "AI Chat with SkinScreen", included: false },
  { label: "PDF Safety Report", included: false },
];

const PREMIUM_FEATURES: Array<{ label: string }> = [
  { label: "Ingredient safety analysis" },
  { label: "Compare 2 products at once" },
  { label: "Find a Dermatologist" },
  { label: "Barcode scanner" },
  { label: "Unlimited shelf products" },
  { label: "Full routine cross-check" },
  { label: "AI Chat with SkinScreen" },
  { label: "PDF Safety Report" },
];

const HIGHLIGHTS = [
  {
    icon: Layers,
    title: "Unlimited Shelf",
    desc: "Track your entire skincare routine — no limits.",
  },
  {
    icon: MessageCircle,
    title: "AI Chat",
    desc: "Ask anything about your routine. Get expert-backed answers.",
  },
  {
    icon: FileText,
    title: "PDF Reports",
    desc: "Download and share your full routine analysis with your dermatologist.",
  },
];

export default function Pricing() {
  const [, navigate] = useLocation();
  const { plan, isLoading: planLoading } = useUserPlan();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleUpgrade = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${getBaseUrl()}api/payments/checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });
      if (res.status === 401) {
        navigate("/");
        return;
      }
      const data = (await res.json()) as { url?: string; error?: string };
      if (data.url) {
        window.location.href = data.url;
      } else {
        setError(data.error ?? "Something went wrong. Please try again.");
      }
    } catch {
      setError("Failed to connect to payment service. Please try again.");
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
          Back to SkinScreen
        </button>

        <FadeIn>
          <div className="text-center mb-14">
            <h1 className="text-4xl sm:text-5xl font-serif font-semibold text-foreground mb-4">
              Simple, honest pricing
            </h1>
            <p className="text-lg text-muted-foreground max-w-xl mx-auto">
              Start free. Upgrade when you need the full power of your personal dermatology assistant.
            </p>
          </div>
        </FadeIn>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
          <FadeIn delay={0.05}>
            <div className="bg-white rounded-3xl border border-border/60 shadow-sm p-8 flex flex-col h-full">
              <div className="mb-6">
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">Free</p>
                <div className="flex items-end gap-1 mb-1">
                  <span className="text-4xl font-bold text-foreground">$0</span>
                  <span className="text-muted-foreground mb-1">/month</span>
                </div>
                <p className="text-sm text-muted-foreground">No card required. Always free.</p>
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
                  {plan === "free" ? "Your current plan" : "Included with Premium"}
                </div>
              </div>
            </div>
          </FadeIn>

          <FadeIn delay={0.1}>
            <div className="relative bg-[#1A1A2E] rounded-3xl border border-primary/20 shadow-xl p-8 flex flex-col h-full overflow-hidden">
              <div className="absolute top-0 right-0 w-40 h-40 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-32 h-32 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

              <div className="relative mb-6">
                <div className="flex items-center gap-2 mb-2">
                  <p className="text-xs font-semibold uppercase tracking-widest text-primary">Premium</p>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/20 text-primary text-[10px] font-bold">
                    <Zap className="w-2.5 h-2.5" /> Best value
                  </span>
                </div>
                <div className="flex items-end gap-1 mb-1">
                  <span className="text-4xl font-bold text-white">$4.99</span>
                  <span className="text-white/50 mb-1">/month</span>
                </div>
                <p className="text-sm text-white/50">Cancel anytime. No hidden fees.</p>
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
                    You&apos;re on Premium
                  </div>
                ) : (
                  <button
                    onClick={handleUpgrade}
                    disabled={loading || planLoading}
                    className="w-full py-3 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <><Loader2 className="w-4 h-4 animate-spin" />Redirecting…</>
                    ) : (
                      <>Get Premium — $4.99/mo</>
                    )}
                  </button>
                )}
                <p className="text-[11px] text-white/30 text-center mt-3">
                  Secure payment via Stripe · Cancel anytime
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
