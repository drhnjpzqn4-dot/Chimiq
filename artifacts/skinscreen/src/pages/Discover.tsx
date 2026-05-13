import { Link } from "wouter";
import { FadeIn } from "@/components/FadeIn";
import { useState } from "react";
import {
  TOP_MISTAKES,
  TOP_WORRIES,
  getDiscoverImage,
  type DiscoverItem,
  type MistakeItem,
  type WorryItem,
} from "@/lib/discover-content";
import { AlertTriangle, HeartPulse, ArrowRight, ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n";

const base = (import.meta.env.BASE_URL ?? "/").replace(/\/+$/, "") || "";

/**
 * Square thumbnail for a Discover card. Uses the article's content-hashed
 * image URL when available, falls back to a slug-seeded gradient on
 * missing-asset (404) or when the article has no `image` field set, so
 * cards never show a broken icon while images are being added.
 */
function DiscoverThumb({
  item,
  tone,
}: {
  item: DiscoverItem;
  tone: "mistake" | "worry";
}) {
  const img = getDiscoverImage(item);
  const [failed, setFailed] = useState(false);
  const showImg = img.hasImage && !failed;

  if (showImg) {
    return (
      <img
        src={img.src}
        alt=""
        loading="lazy"
        className="shrink-0 w-16 h-16 sm:w-20 sm:h-20 rounded-xl object-cover bg-muted"
        onError={() => setFailed(true)}
      />
    );
  }

  // Brand-aligned gradients — mistakes use warm/alert tones, worries use sage/calm tones.
  // Rank within each tone rotates through 3 brand color pairs so cards feel distinct.
  const mistakeGrads = [
    "linear-gradient(135deg, var(--rose-soft), var(--rose-gold))",      // rose
    "linear-gradient(135deg, var(--gold-soft), var(--gold))",            // gold
    "linear-gradient(135deg, var(--cream-warm), var(--rose-gold-deep))", // warm cream
  ];
  const worryGrads = [
    "linear-gradient(135deg, var(--green-soft), var(--sage))",           // sage
    "linear-gradient(135deg, var(--cream-warm), var(--gold))",           // cream-gold
    "linear-gradient(135deg, var(--gold-soft), var(--sage-deep))",       // gold-sage
  ];
  const grads = tone === "mistake" ? mistakeGrads : worryGrads;
  const grad = grads[(item.rank - 1) % grads.length];
  return (
    <div
      aria-hidden
      className="shrink-0 w-16 h-16 sm:w-20 sm:h-20 rounded-xl flex items-center justify-center font-serif font-medium text-2xl text-ink/50"
      style={{ background: grad }}
    >
      {item.rank}
    </div>
  );
}

function MistakeCard({ item, index }: { item: MistakeItem; index: number }) {
  const { t } = useTranslation();
  const severityClass =
    item.severity === "HIGH"
      ? "bg-[var(--red-soft)] text-[var(--red-deep)] border-[var(--rose-soft)]"
      : item.severity === "MEDIUM"
        ? "bg-amber-soft text-amber-deep border-[var(--gold-soft)]"
        : "bg-green-soft text-sage-deep border-[var(--green-soft)]";

  return (
    <FadeIn delay={index * 0.04} fullWidth>
      <Link
        href={`/discover/mistakes/${item.slug}`}
        className="group block h-full p-5 sm:p-6 bg-white rounded-2xl border border-border/60 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
      >
        <div className="flex items-start gap-4">
          <DiscoverThumb item={item} tone="mistake" />
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-3 mb-1.5">
              <h3 className="text-base sm:text-lg font-serif font-medium text-foreground leading-snug">
                {item.title}
              </h3>
              <span
                className={cn(
                  "shrink-0 inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border whitespace-nowrap",
                  severityClass,
                )}
              >
                <AlertTriangle className="w-2.5 h-2.5" />
                {t(`severity.${item.severity}`)}
              </span>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">{item.hook}</p>
            <div className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-primary group-hover:gap-2 transition-all">
              {t("discoverPage.readMore")} <ArrowRight className="w-3 h-3" />
            </div>
          </div>
        </div>
      </Link>
    </FadeIn>
  );
}

function WorryCard({ item, index }: { item: WorryItem; index: number }) {
  const { t } = useTranslation();
  const freqClass =
    item.frequency === "VERY_COMMON"
      ? "bg-green-soft text-sage-deep border-[var(--green-soft)]"
      : item.frequency === "COMMON"
        ? "bg-[var(--cream-warm)] text-[var(--ink-soft)] border-[var(--line)]"
        : "bg-[var(--rose-soft)] text-[var(--rose-gold-deep)] border-[var(--rose-soft)]";

  return (
    <FadeIn delay={index * 0.04} fullWidth>
      <Link
        href={`/discover/worries/${item.slug}`}
        className="group block h-full p-5 sm:p-6 bg-white rounded-2xl border border-border/60 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
      >
        <div className="flex items-start gap-4">
          <DiscoverThumb item={item} tone="worry" />
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-3 mb-1.5">
              <h3 className="text-base sm:text-lg font-serif font-medium text-foreground leading-snug">
                {item.title}
              </h3>
              <span
                className={cn(
                  "shrink-0 inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border whitespace-nowrap",
                  freqClass,
                )}
              >
                <HeartPulse className="w-2.5 h-2.5" />
                {t(`frequency.${item.frequency}`)}
              </span>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">{item.hook}</p>
            <div className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-primary group-hover:gap-2 transition-all">
              {t("discoverPage.readMore")} <ArrowRight className="w-3 h-3" />
            </div>
          </div>
        </div>
      </Link>
    </FadeIn>
  );
}

export default function Discover() {
  const { t } = useTranslation();
  return (
    <div className="min-h-screen bg-[#FAFAF8]">
      <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-border/30">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <a href={base + "/"} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ChevronLeft className="w-4 h-4" />
            {t("discoverPage.backHome")}
          </a>
          <a href={base + "/"}>
            <img
              src={`${import.meta.env.BASE_URL}images/logo-chimiq-long.png`}
              alt="Chimiq"
              className="h-7 w-auto"
            />
          </a>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
        <FadeIn>
          <header className="text-center mb-12">
            <span className="inline-block py-1 px-3 rounded-full bg-primary/15 text-primary text-xs font-medium tracking-wider uppercase mb-4">
              {t("discoverPage.kicker")}
            </span>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-serif text-foreground leading-tight mb-4">
              {t("discoverPage.title")}
            </h1>
            <p className="text-muted-foreground max-w-2xl mx-auto text-base sm:text-lg leading-relaxed">
              {t("discoverPage.subtitle")}
            </p>
          </header>
        </FadeIn>

        <section id="mistakes" className="mb-16 scroll-mt-20">
          <FadeIn>
            <div className="flex items-end justify-between gap-4 mb-6">
              <div>
                <h2 className="text-2xl sm:text-3xl font-serif text-foreground mb-1">
                  {t("discoverPage.mistakesH2")}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {t("discoverPage.mistakesSub")}
                </p>
              </div>
            </div>
          </FadeIn>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {TOP_MISTAKES.map((item, idx) => (
              <MistakeCard key={item.slug} item={item} index={idx} />
            ))}
          </div>
        </section>

        <section id="worries" className="scroll-mt-20">
          <FadeIn>
            <div className="flex items-end justify-between gap-4 mb-6">
              <div>
                <h2 className="text-2xl sm:text-3xl font-serif text-foreground mb-1">
                  {t("discoverPage.worriesH2")}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {t("discoverPage.worriesSub")}
                </p>
              </div>
            </div>
          </FadeIn>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {TOP_WORRIES.map((item, idx) => (
              <WorryCard key={item.slug} item={item} index={idx} />
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
