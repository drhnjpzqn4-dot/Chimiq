import { Link } from "wouter";
import { FadeIn } from "@/components/FadeIn";
import {
  TOP_MISTAKES,
  TOP_WORRIES,
  type MistakeItem,
  type WorryItem,
} from "@/lib/discover-content";
import { AlertTriangle, HeartPulse, ArrowRight, ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n";

const base = (import.meta.env.BASE_URL ?? "/").replace(/\/+$/, "") || "";


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
        <div className="flex items-center gap-2 mb-3">
          <span
            className={cn(
              "inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider px-3 py-1 rounded-full border whitespace-nowrap",
              severityClass,
            )}
          >
            <AlertTriangle className="w-3 h-3" />
            {t(`severity.${item.severity}`)}
          </span>
          <span className="text-xs text-muted-foreground/50 font-medium">#{item.rank}</span>
        </div>
        <h3 className="text-base sm:text-lg font-serif font-medium text-foreground leading-snug mb-1.5">
          {item.title}
        </h3>
        <p className="text-sm text-muted-foreground leading-relaxed">{item.hook}</p>
        <div className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-primary group-hover:gap-2 transition-all">
          {t("discoverPage.readMore")} <ArrowRight className="w-3 h-3" />
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
        <div className="flex items-center gap-2 mb-3">
          <span
            className={cn(
              "inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider px-3 py-1 rounded-full border whitespace-nowrap",
              freqClass,
            )}
          >
            <HeartPulse className="w-3 h-3" />
            {t(`frequency.${item.frequency}`)}
          </span>
          <span className="text-xs text-muted-foreground/50 font-medium">#{item.rank}</span>
        </div>
        <h3 className="text-base sm:text-lg font-serif font-medium text-foreground leading-snug mb-1.5">
          {item.title}
        </h3>
        <p className="text-sm text-muted-foreground leading-relaxed">{item.hook}</p>
        <div className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-primary group-hover:gap-2 transition-all">
          {t("discoverPage.readMore")} <ArrowRight className="w-3 h-3" />
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
