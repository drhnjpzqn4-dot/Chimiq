import { useMemo, useState } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, ScanLine, AlertTriangle, HelpCircle } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import {
  TOP_MISTAKES,
  TOP_WORRIES,
  SEVERITY_LABEL,
  FREQUENCY_LABEL,
  type DiscoverItem,
} from "@/lib/discover-content";

type Tab = "mistakes" | "worries";

interface CardData {
  rank: number;
  slug: string;
  title: string;
  hook: string;
  badge: string;
  badgeTone: "red" | "amber" | "blue";
  problem: string;
  whyItMatters: string;
  solution: string[];
}

const TONE_CLASS: Record<CardData["badgeTone"], string> = {
  red: "bg-red-50 text-red-700",
  amber: "bg-amber-50 text-amber-700",
  blue: "bg-sky-50 text-sky-700",
};

function toCard(item: DiscoverItem & { severity?: string; frequency?: string }): CardData {
  const isMistake = "severity" in item && item.severity;
  let badge = "";
  let tone: CardData["badgeTone"] = "blue";
  if (isMistake && item.severity) {
    badge = SEVERITY_LABEL[item.severity as keyof typeof SEVERITY_LABEL];
    tone = item.severity === "HIGH" ? "red" : item.severity === "MEDIUM" ? "amber" : "blue";
  } else if (item.frequency) {
    badge = FREQUENCY_LABEL[item.frequency as keyof typeof FREQUENCY_LABEL];
    tone = item.frequency === "VERY_COMMON" ? "amber" : "blue";
  }
  return {
    rank: item.rank,
    slug: item.slug,
    title: item.title,
    hook: item.hook,
    badge,
    badgeTone: tone,
    problem: item.problem,
    whyItMatters: item.whyItMatters,
    solution: item.solution,
  };
}

export default function ProblemsScreen() {
  const [, navigate] = useLocation();
  const [tab, setTab] = useState<Tab>("mistakes");

  const cards = useMemo<CardData[]>(() => {
    const source = tab === "mistakes" ? TOP_MISTAKES : TOP_WORRIES;
    return source.map((it) => toCard(it as DiscoverItem & { severity?: string; frequency?: string }));
  }, [tab]);

  return (
    <AppShell title="Common problems" subtitle="Top 10 mistakes and worries — at a glance.">
      <button
        type="button"
        onClick={() => navigate("/app/scan")}
        data-touch-target
        className="mb-3 inline-flex min-h-[44px] items-center gap-1.5 rounded-full bg-white/60 px-3 py-1.5 text-sm font-medium text-foreground hover:bg-white"
        aria-label="Back to scanner"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to scanner
      </button>

      <div
        role="tablist"
        aria-label="Common problems category"
        className="mb-4 grid grid-cols-2 gap-2 rounded-2xl bg-muted/40 p-1"
      >
        <button
          role="tab"
          aria-selected={tab === "mistakes"}
          onClick={() => setTab("mistakes")}
          data-touch-target
          className={`flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold transition-colors ${
            tab === "mistakes" ? "bg-white text-foreground shadow-sm" : "text-muted-foreground"
          }`}
        >
          <AlertTriangle className="h-4 w-4" />
          Top mistakes
        </button>
        <button
          role="tab"
          aria-selected={tab === "worries"}
          onClick={() => setTab("worries")}
          data-touch-target
          className={`flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold transition-colors ${
            tab === "worries" ? "bg-white text-foreground shadow-sm" : "text-muted-foreground"
          }`}
        >
          <HelpCircle className="h-4 w-4" />
          Top worries
        </button>
      </div>

      {/* Horizontally swipeable card rail. Each card snaps; user swipes to next. */}
      <div
        className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-4"
        style={{ scrollPaddingInline: "1rem" }}
      >
        {cards.map((c) => (
          <article
            key={c.slug}
            className="w-[88%] shrink-0 snap-center rounded-3xl border border-border/40 bg-white p-5 shadow-sm sm:w-[420px]"
          >
            <header className="flex items-start justify-between gap-2">
              <span className="inline-flex h-7 min-w-[28px] items-center justify-center rounded-full bg-primary/10 px-2 text-xs font-bold text-primary">
                #{c.rank}
              </span>
              {c.badge && (
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${TONE_CLASS[c.badgeTone]}`}
                >
                  {c.badge}
                </span>
              )}
            </header>
            <h3 className="mt-2 font-serif text-lg font-semibold leading-tight text-foreground">
              {c.title}
            </h3>
            <p className="mt-1 text-sm font-medium text-muted-foreground">{c.hook}</p>
            <p className="mt-3 text-sm leading-relaxed text-foreground/90">{c.problem}</p>
            <p className="mt-2 text-xs italic text-muted-foreground">{c.whyItMatters}</p>
            <div className="mt-3 rounded-2xl border border-border/40 bg-muted/30 p-3">
              <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                What to do
              </p>
              <ul className="mt-1.5 list-inside list-disc space-y-1 text-sm text-foreground">
                {c.solution.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </div>
            <button
              type="button"
              onClick={() => navigate("/app/scan")}
              data-touch-target
              className="mt-4 inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-primary/25"
            >
              <ScanLine className="h-4 w-4" />
              Scan a product now
            </button>
          </article>
        ))}
      </div>

      <p className="mt-2 text-center text-[11px] text-muted-foreground">
        Swipe to see more →
      </p>
    </AppShell>
  );
}
