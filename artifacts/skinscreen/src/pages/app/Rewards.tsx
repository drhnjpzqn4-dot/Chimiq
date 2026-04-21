import { useState } from "react";
import { Link } from "wouter";
import { ChevronLeft, Crown, Gift, Sparkles, Trophy, Languages } from "lucide-react";
import { AppShell } from "@/components/AppShell";

const COPY = {
  en: {
    headline: "How rewards work",
    sub: "Three simple ways to earn free Premium and recognition in SkinScreen.",
    contribSectionTitle: "Contribute products",
    contribBody:
      "Scan products that aren't in our database yet. Every accepted contribution counts toward your total. Reach 30 accepted contributions and get one full month of Premium — free.",
    tipsSectionTitle: "Share helpful tips",
    tipsBody:
      "Post short skincare tips in the Tips feed. The community votes their favourites up. Each Monday, the most-voted tip from the previous week wins Best Tip of the Week and earns the author one month of Premium plus the Verified Tipster badge.",
    badgesTitle: "Earn badges",
    badges: [
      { emoji: "🌱", title: "First Scan", body: "Submit your first accepted contribution." },
      { emoji: "🔟", title: "10 Products", body: "Reach 10 accepted contributions." },
      { emoji: "⭐", title: "30 Products", body: "Reach 30 — and earn a free month." },
      { emoji: "💎", title: "100 Products", body: "Reach 100. Database hero." },
      { emoji: "🏆", title: "Top 10 This Month", body: "Finish a month inside the top 10." },
      { emoji: "✨", title: "Verified Tipster", body: "Win Best Tip of the Week." },
    ],
    rulesTitle: "House rules",
    rules: [
      "One vote per tip. You cannot vote on your own tips.",
      "5 tips per day max — focus on quality.",
      "Duplicate or already-known products do not count toward the 30-contribution milestone.",
      "Premium grants stack on top of any time you already have left.",
    ],
  },
  sv: {
    headline: "Så funkar belöningarna",
    sub: "Tre enkla sätt att tjäna gratis Premium och bli sedd i SkinScreen.",
    contribSectionTitle: "Bidra med produkter",
    contribBody:
      "Skanna produkter som inte finns i vår databas. Varje godkänt bidrag räknas. Vid 30 godkända bidrag får du en hel månad Premium — gratis.",
    tipsSectionTitle: "Dela bra tips",
    tipsBody:
      "Posta korta hudvårdstips i Tips-flödet. Community röstar upp sina favoriter. Varje måndag vinner det mest uppröstade tipset från föregående vecka Veckans bästa tips — författaren får en månad Premium och Verifierad Tipsare-märket.",
    badgesTitle: "Samla märken",
    badges: [
      { emoji: "🌱", title: "Första skanningen", body: "Skicka in ditt första godkända bidrag." },
      { emoji: "🔟", title: "10 produkter", body: "Nå 10 godkända bidrag." },
      { emoji: "⭐", title: "30 produkter", body: "Nå 30 — och få en månad gratis." },
      { emoji: "💎", title: "100 produkter", body: "Nå 100. Databashjälten." },
      { emoji: "🏆", title: "Topp 10 denna månad", body: "Avsluta en månad i topp 10." },
      { emoji: "✨", title: "Verifierad Tipsare", body: "Vinn Veckans bästa tips." },
    ],
    rulesTitle: "Husregler",
    rules: [
      "En röst per tips. Du kan inte rösta på egna tips.",
      "Max 5 tips per dag — fokusera på kvalitet.",
      "Dubbla eller redan kända produkter räknas inte mot 30-bidragsmålet.",
      "Premium-månader läggs ovanpå tid du redan har kvar.",
    ],
  },
} as const;

type Lang = keyof typeof COPY;

export default function RewardsScreen() {
  const [lang, setLang] = useState<Lang>("en");
  const c = COPY[lang];

  return (
    <AppShell title={c.headline} subtitle={c.sub}>
      <div className="mb-4 flex items-center justify-between">
        <Link href="/app/profile">
          <a
            data-touch-target
            className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft className="h-4 w-4" />
            Back
          </a>
        </Link>
        <button
          type="button"
          onClick={() => setLang(lang === "en" ? "sv" : "en")}
          data-touch-target
          aria-label="Toggle language"
          className="inline-flex items-center gap-1.5 rounded-full bg-white border border-border/60 px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted"
        >
          <Languages className="h-3.5 w-3.5" />
          {lang === "en" ? "Svenska" : "English"}
        </button>
      </div>

      <section className="mb-5 rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/5 to-white p-5 shadow-sm">
        <div className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-primary">
          <Gift className="h-3.5 w-3.5" /> 1
        </div>
        <h2 className="font-serif text-lg font-semibold text-foreground">
          {c.contribSectionTitle}
        </h2>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{c.contribBody}</p>
      </section>

      <section className="mb-5 rounded-3xl border border-amber-200 bg-gradient-to-br from-amber-50 to-white p-5 shadow-sm">
        <div className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-amber-700">
          <Sparkles className="h-3.5 w-3.5" /> 2
        </div>
        <h2 className="font-serif text-lg font-semibold text-foreground">
          {c.tipsSectionTitle}
        </h2>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{c.tipsBody}</p>
      </section>

      <section className="mb-5">
        <h2 className="mb-3 flex items-center gap-2 font-serif text-lg font-semibold text-foreground">
          <Trophy className="h-4 w-4 text-amber-500" /> {c.badgesTitle}
        </h2>
        <ul className="grid grid-cols-2 gap-3">
          {c.badges.map((b) => (
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
        <h2 className="mb-2 flex items-center gap-2 font-serif text-base font-semibold text-foreground">
          <Crown className="h-4 w-4 text-amber-500" /> {c.rulesTitle}
        </h2>
        <ul className="space-y-1.5 text-sm text-muted-foreground">
          {c.rules.map((r) => (
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
