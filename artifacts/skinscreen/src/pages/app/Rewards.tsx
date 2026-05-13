import { Link } from "wouter";
import { ChevronLeft, Crown, Gift, Sparkles, Trophy } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { useTranslation } from "@/lib/i18n";

export default function RewardsScreen() {
  const { t } = useTranslation();

  const badges = [
    { emoji: "🌱", title: t("rewards.badge1Title"), body: t("rewards.badge1Body") },
    { emoji: "🔟", title: t("rewards.badge2Title"), body: t("rewards.badge2Body") },
    { emoji: "⭐", title: t("rewards.badge3Title"), body: t("rewards.badge3Body") },
    { emoji: "💎", title: t("rewards.badge4Title"), body: t("rewards.badge4Body") },
    { emoji: "🏆", title: t("rewards.badge5Title"), body: t("rewards.badge5Body") },
    { emoji: "✨", title: t("rewards.badge6Title"), body: t("rewards.badge6Body") },
  ];

  const rules = [
    t("rewards.rule1"),
    t("rewards.rule2"),
    t("rewards.rule3"),
    t("rewards.rule4"),
  ];

  return (
    <AppShell title={t("rewards.headline")} subtitle={t("rewards.sub")}>
      <div className="mb-4 flex items-center justify-between">
        <Link href="/app/profile">
          <a
            data-touch-target
            className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft className="h-4 w-4" />
            {t("common.back")}
          </a>
        </Link>
      </div>

      <section className="mb-5 rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/5 to-white p-5 shadow-sm">
        <div className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-primary">
          <Gift className="h-3.5 w-3.5" /> 1
        </div>
        <h2 className="font-serif text-lg font-medium text-foreground">
          {t("rewards.contribTitle")}
        </h2>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{t("rewards.contribBody")}</p>
      </section>

      <section className="mb-5 rounded-3xl border border-amber-200 bg-gradient-to-br from-amber-50 to-white p-5 shadow-sm">
        <div className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-amber-700">
          <Sparkles className="h-3.5 w-3.5" /> 2
        </div>
        <h2 className="font-serif text-lg font-medium text-foreground">
          {t("rewards.tipsTitle")}
        </h2>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{t("rewards.tipsBody")}</p>
      </section>

      <section className="mb-5">
        <h2 className="mb-3 flex items-center gap-2 font-serif text-lg font-medium text-foreground">
          <Trophy className="h-4 w-4 text-amber-500" /> {t("rewards.badgesTitle")}
        </h2>
        <ul className="grid grid-cols-2 gap-3">
          {badges.map((b) => (
            <li
              key={b.title}
              className="rounded-2xl border border-border/40 bg-white p-3 shadow-sm"
            >
              <div className="text-2xl" aria-hidden>
                {b.emoji}
              </div>
              <p className="mt-1 text-sm font-semibold text-foreground">{b.title}</p>
              <p className="mt-0.5 text-xs leading-snug text-muted-foreground">{b.body}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="mb-6 rounded-3xl border border-border/40 bg-white p-5 shadow-sm">
        <h2 className="mb-2 flex items-center gap-2 font-serif text-base font-medium text-foreground">
          <Crown className="h-4 w-4 text-amber-500" /> {t("rewards.rulesTitle")}
        </h2>
        <ul className="space-y-1.5 text-sm text-muted-foreground">
          {rules.map((r) => (
            <li key={r} className="flex gap-2">
              <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-primary/60" aria-hidden />
              <span className="leading-relaxed">{r}</span>
            </li>
          ))}
        </ul>
      </section>
    </AppShell>
  );
}
