import { MessageCircle, Sparkles, ArrowUpRight, Compass } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { FindDermatologist } from "@/components/FindDermatologist";

const TIPS = [
  {
    title: "Don't mix retinol with AHAs",
    body: "Layering acids on top of retinol can shred your barrier — alternate evenings instead.",
    tag: "Routine",
  },
  {
    title: "SPF every. single. day.",
    body: "Even on cloudy days. Especially if you're using actives like vitamin C or BHA.",
    tag: "Protect",
  },
  {
    title: "Patch test new products",
    body: "Apply a small amount behind your ear for 48h before going all-in on your face.",
    tag: "Safety",
  },
];

export default function DiscoverScreen() {
  return (
    <AppShell
      title="Discover"
      subtitle="Tips, expert care, and ways to learn safer skincare."
    >
      {/* AI chat hero */}
      <section className="mb-6 animate-pop-in">
        <div className="relative overflow-hidden rounded-3xl bg-[#1A1A2E] p-5 text-white shadow-xl">
          <div className="absolute -right-12 -top-12 h-48 w-48 rounded-full bg-primary/30 blur-3xl" aria-hidden />
          <div className="relative flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/10">
              <MessageCircle className="h-6 w-6 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-widest text-primary/80">Ask anything</p>
              <p className="mt-0.5 font-serif text-xl font-semibold leading-tight">
                Chat with the SkinScreen AI
              </p>
              <p className="mt-1 text-sm text-white/70">
                Get evidence-based answers about your shelf, ingredient interactions, and routine timing.
              </p>
              <p className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-primary">
                <Sparkles className="h-3.5 w-3.5" />
                Tap the chat bubble to start
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Tips */}
      <section className="mb-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-serif text-lg font-semibold text-foreground">Quick tips</h2>
          <span className="text-xs text-muted-foreground/70">Curated weekly</span>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {TIPS.map((tip, i) => (
            <article
              key={tip.title}
              className="group rounded-3xl border border-border/40 bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
              style={{ animation: "fade-up 0.45s cubic-bezier(0.22,1,0.36,1) both", animationDelay: `${i * 60}ms` }}
            >
              <div className="mb-2 flex items-center justify-between">
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary">
                  {tip.tag}
                </span>
                <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground/50 transition-colors group-hover:text-primary" />
              </div>
              <h3 className="font-serif text-base font-semibold leading-snug text-foreground">{tip.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{tip.body}</p>
            </article>
          ))}
        </div>
      </section>

      {/* Find dermatologist */}
      <section className="mb-2 -mx-4">
        <div className="rounded-3xl bg-[#F5F5F7] mx-4 overflow-hidden">
          <FindDermatologist />
        </div>
      </section>

      <p className="mt-2 flex items-center justify-center gap-1.5 text-center text-xs text-muted-foreground/60">
        <Compass className="h-3 w-3" />
        More content coming soon — DIY recipes, top mistakes, leaderboard.
      </p>
    </AppShell>
  );
}
