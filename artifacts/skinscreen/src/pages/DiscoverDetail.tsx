import { useState } from "react";
import { Link, useRoute } from "wouter";
import { FadeIn } from "@/components/FadeIn";
import { DiscoverRating } from "@/components/DiscoverRating";
import {
  getMistake,
  getWorry,
  SCANNER_SEED_STORAGE_KEY,
  SEVERITY_LABEL,
  FREQUENCY_LABEL,
  type DiscoverItem,
  type DiscoverCta,
  type MistakeItem,
  type WorryItem,
  type CtaType,
} from "@/lib/discover-content";
import {
  AlertTriangle,
  HeartPulse,
  ChevronLeft,
  ExternalLink,
  Share2,
  CheckCircle2,
  ScanLine,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

const base = (import.meta.env.BASE_URL ?? "/").replace(/\/+$/, "") || "";

function ctaHref(type: CtaType): string {
  switch (type) {
    case "scan":
      return `${base}/#scanner`;
    case "compare":
      return `${base}/#scanner`;
    case "alternatives":
      return `${base}/#scanner`;
    case "shelf":
      return `${base}/app`;
  }
}

function ctaIcon(type: CtaType) {
  if (type === "shelf") return <Sparkles className="w-4 h-4" />;
  return <ScanLine className="w-4 h-4" />;
}

function handleCtaClick(cta: DiscoverCta) {
  if (typeof window === "undefined") return;
  if (cta.seed) {
    try {
      window.sessionStorage.setItem(
        SCANNER_SEED_STORAGE_KEY,
        JSON.stringify(cta.seed),
      );
    } catch {
      // ignore — seed is best-effort
    }
  } else {
    try {
      window.sessionStorage.removeItem(SCANNER_SEED_STORAGE_KEY);
    } catch {
      // ignore
    }
  }
}

function ShareButton({ title }: { title: string }) {
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    const url = window.location.href;
    const shareData = {
      title: `${title} · SkinScreen`,
      text: title,
      url,
    };
    if (typeof navigator !== "undefined" && "share" in navigator) {
      try {
        await navigator.share(shareData);
        return;
      } catch {
        // user cancelled — fall through to copy
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  return (
    <button
      type="button"
      onClick={handleShare}
      className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5 rounded-full border border-border/60 hover:border-foreground/30 bg-white"
    >
      {copied ? (
        <>
          <CheckCircle2 className="w-3.5 h-3.5 text-primary" />
          Link copied
        </>
      ) : (
        <>
          <Share2 className="w-3.5 h-3.5" />
          Share
        </>
      )}
    </button>
  );
}

interface DetailViewProps {
  kind: "mistakes" | "worries";
  item: DiscoverItem & { severity?: string; frequency?: string };
  tagLabel: string;
  tagClass: string;
  TagIcon: typeof AlertTriangle;
}

function DetailView({ kind, item, tagLabel, tagClass, TagIcon }: DetailViewProps) {
  const sectionLabel = kind === "mistakes" ? "Top 10 mistakes" : "Top 10 worries";

  return (
    <div className="min-h-screen bg-[#FAFAF8]">
      <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-border/30">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <Link
            href="/discover"
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            Discover
          </Link>
          <ShareButton title={item.title} />
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
        <FadeIn>
          <p className="text-xs font-medium uppercase tracking-wider text-primary/70 mb-3">
            {sectionLabel} · #{item.rank}
          </p>
          <div className="flex items-start gap-3 mb-4">
            <h1 className="text-3xl sm:text-4xl font-serif text-foreground leading-tight flex-1">
              {item.title}
            </h1>
          </div>
          <div className="flex items-center gap-2 mb-8">
            <span
              className={cn(
                "inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full border",
                tagClass,
              )}
            >
              <TagIcon className="w-3 h-3" />
              {tagLabel}
            </span>
          </div>
          <p className="text-lg text-muted-foreground leading-relaxed mb-10 italic">
            {item.hook}
          </p>
        </FadeIn>

        <FadeIn delay={0.05}>
          <section className="mb-8">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground/70 mb-3">
              The problem
            </h2>
            <p className="text-base text-foreground leading-relaxed">{item.problem}</p>
          </section>
        </FadeIn>

        <FadeIn delay={0.1}>
          <section className="mb-8 p-5 sm:p-6 rounded-2xl bg-white border border-border/60">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground/70 mb-3">
              Why it matters
            </h2>
            <p className="text-base text-foreground leading-relaxed mb-3">
              {item.whyItMatters}
            </p>
            {item.citation && (
              <a
                href={item.citation.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-start gap-2 text-xs text-muted-foreground/80 hover:text-primary transition-colors"
              >
                <ExternalLink className="w-3 h-3 mt-0.5 shrink-0" />
                <span className="italic leading-snug">
                  <span className="font-semibold not-italic">Source: </span>
                  {item.citation.text}
                </span>
              </a>
            )}
          </section>
        </FadeIn>

        <FadeIn delay={0.15}>
          <section className="mb-10">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground/70 mb-4">
              The fix — in {item.solution.length} steps
            </h2>
            <ol className="space-y-3">
              {item.solution.map((step, idx) => (
                <li
                  key={idx}
                  className="flex items-start gap-3 p-4 rounded-2xl bg-white border border-border/50"
                >
                  <span className="shrink-0 w-7 h-7 rounded-full bg-primary/15 text-primary text-xs font-bold flex items-center justify-center mt-0.5">
                    {idx + 1}
                  </span>
                  <p className="text-base text-foreground leading-relaxed">{step}</p>
                </li>
              ))}
            </ol>
          </section>
        </FadeIn>

        <FadeIn delay={0.2}>
          <section className="mb-12">
            <a
              href={ctaHref(item.cta.type)}
              onClick={() => handleCtaClick(item.cta)}
              className="inline-flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-white px-7 py-3.5 rounded-full text-base font-semibold transition-all duration-200 shadow-md hover:shadow-lg hover:-translate-y-0.5 w-full sm:w-auto"
            >
              {ctaIcon(item.cta.type)}
              {item.cta.label}
              <ArrowRight className="w-4 h-4" />
            </a>
          </section>
        </FadeIn>

        <FadeIn delay={0.25}>
          <DiscoverRating kind={kind} slug={item.slug} />
        </FadeIn>

        <div className="border-t border-border/40 pt-8">
          <Link
            href="/discover"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            Back to {sectionLabel.toLowerCase()}
          </Link>
        </div>
      </main>
    </div>
  );
}

export function MistakeDetail() {
  const [, params] = useRoute("/discover/mistakes/:slug");
  const slug = params?.slug;
  const item = slug ? getMistake(slug) : undefined;

  if (!item) return <NotFoundDetail kind="mistakes" />;

  const severityClass =
    item.severity === "HIGH"
      ? "bg-red-100 text-red-700 border-red-200"
      : item.severity === "MEDIUM"
        ? "bg-amber-100 text-amber-700 border-amber-200"
        : "bg-sky-100 text-sky-700 border-sky-200";

  return (
    <DetailView
      kind="mistakes"
      item={item as MistakeItem}
      tagLabel={SEVERITY_LABEL[item.severity]}
      tagClass={severityClass}
      TagIcon={AlertTriangle}
    />
  );
}

export function WorryDetail() {
  const [, params] = useRoute("/discover/worries/:slug");
  const slug = params?.slug;
  const item = slug ? getWorry(slug) : undefined;

  if (!item) return <NotFoundDetail kind="worries" />;

  const freqClass =
    item.frequency === "VERY_COMMON"
      ? "bg-primary/10 text-primary border-primary/20"
      : item.frequency === "COMMON"
        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
        : "bg-purple-50 text-purple-700 border-purple-200";

  return (
    <DetailView
      kind="worries"
      item={item as WorryItem}
      tagLabel={FREQUENCY_LABEL[item.frequency]}
      tagClass={freqClass}
      TagIcon={HeartPulse}
    />
  );
}

function NotFoundDetail({ kind }: { kind: "mistakes" | "worries" }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FAFAF8] px-4">
      <div className="text-center max-w-md">
        <h1 className="text-2xl font-serif text-foreground mb-3">We couldn't find that.</h1>
        <p className="text-muted-foreground mb-6">
          The page you're looking for might have moved.
        </p>
        <Link
          href="/discover"
          className="inline-flex items-center gap-2 bg-primary hover:bg-primary/90 text-white px-6 py-3 rounded-full text-sm font-semibold transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to {kind === "mistakes" ? "top mistakes" : "top worries"}
        </Link>
      </div>
    </div>
  );
}
