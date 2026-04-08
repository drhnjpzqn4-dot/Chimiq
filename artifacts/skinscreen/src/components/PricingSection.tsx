import { useState } from "react";
import { useLocation } from "wouter";
import { Check, X, Zap, Loader2, ShieldCheck } from "lucide-react";
import { FadeIn } from "@/components/FadeIn";
import { useUserPlan } from "@/hooks/useUserPlan";
import { cn } from "@/lib/utils";
import { getBaseUrl } from "@/lib/base-url";

const FREE_FEATURES: Array<{ label: string; included: boolean }> = [
  { label: "Ingredient safety analysis", included: true },
  { label: "Compare 2 products (side-by-side)", included: true },
  { label: "Barcode scanner", included: true },
  { label: "Find a Dermatologist", included: true },
  { label: "My Shelf (up to 2 products)", included: true },
  { label: "Unlimited shelf products", included: false },
  { label: "Full routine cross-check", included: false },
  { label: "AI Chat", included: false },
  { label: "PDF Safety Report", included: false },
];

const PREMIUM_FEATURES: Array<{ label: string }> = [
  { label: "Everything in Free" },
  { label: "Unlimited shelf products" },
  { label: "Full routine cross-check" },
  { label: "AI Chat with SkinScreen" },
  { label: "PDF Safety Report" },
];

export function PricingSection() {
  const [, navigate] = useLocation();
  const { plan, isLoading } = useUserPlan();
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
        setError(data.error ?? "Something went wrong.");
      }
    } catch {
      setError("Failed to connect to payment service.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section id="pricing" className="w-full max-w-5xl mx-auto px-4">
      <FadeIn>
        <div className="text-center mb-10">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/60 mb-3">Pricing</p>
          <h2 className="text-3xl sm:text-4xl font-serif font-semibold text-foreground mb-3">
            Free to start. Upgrade when ready.
          </h2>
          <p className="text-muted-foreground max-w-lg mx-auto">
            Most people never need more than the free tier. But if your shelf keeps growing, Premium has you covered.
          </p>
        </div>
      </FadeIn>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 max-w-3xl mx-auto">
        <FadeIn delay={0.05}>
          <div className="bg-white rounded-3xl border border-border/60 shadow-sm p-7 flex flex-col h-full">
            <div className="mb-5">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">Free</p>
              <div className="flex items-end gap-1">
                <span className="text-3xl font-bold text-foreground">$0</span>
                <span className="text-muted-foreground mb-0.5">/month</span>
              </div>
            </div>

            <div className="space-y-2.5 flex-1">
              {FREE_FEATURES.map((f) => (
                <div key={f.label} className="flex items-center gap-2.5">
                  {f.included ? (
                    <Check className="w-3.5 h-3.5 text-[#22C55E] shrink-0" />
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
                {plan === "free" ? "Your current plan" : "Included"}
              </div>
            </div>
          </div>
        </FadeIn>

        <FadeIn delay={0.1}>
          <div className="relative bg-[#1A1A2E] rounded-3xl border border-primary/20 shadow-xl p-7 flex flex-col h-full overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl pointer-events-none" />

            <div className="relative mb-5">
              <div className="flex items-center gap-2 mb-2">
                <p className="text-xs font-semibold uppercase tracking-widest text-primary">Premium</p>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/20 text-primary text-[10px] font-bold">
                  <Zap className="w-2.5 h-2.5" /> Most popular
                </span>
              </div>
              <div className="flex items-end gap-1">
                <span className="text-3xl font-bold text-white">$4.99</span>
                <span className="text-white/50 mb-0.5">/month</span>
              </div>
              <p className="text-xs text-white/40 mt-1">Cancel anytime</p>
            </div>

            <div className="space-y-2.5 flex-1 relative">
              {PREMIUM_FEATURES.map((f) => (
                <div key={f.label} className="flex items-center gap-2.5">
                  <Check className="w-3.5 h-3.5 text-primary shrink-0" />
                  <span className="text-sm text-white/80">{f.label}</span>
                </div>
              ))}
            </div>

            <div className="mt-6 relative">
              {error && (
                <p className="text-xs text-red-400 text-center mb-2">{error}</p>
              )}
              {plan === "premium" ? (
                <div className="w-full py-2.5 rounded-xl bg-primary/20 text-center text-sm font-medium text-primary border border-primary/30">
                  <ShieldCheck className="w-4 h-4 inline mr-1" />
                  You&apos;re on Premium
                </div>
              ) : (
                <button
                  onClick={handleUpgrade}
                  disabled={loading || isLoading}
                  className="w-full py-3 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <><Loader2 className="w-4 h-4 animate-spin" />Redirecting…</>
                  ) : (
                    <>Get Premium — $4.99/mo</>
                  )}
                </button>
              )}
            </div>
          </div>
        </FadeIn>
      </div>

      <FadeIn delay={0.15}>
        <p className="text-center text-xs text-muted-foreground/50 mt-6">
          Secure payments via Stripe · No subscription lock-in · Cancel in one click
        </p>
      </FadeIn>
    </section>
  );
}
