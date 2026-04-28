import { useEffect, useState } from "react";
import { Link } from "wouter";
import { Trophy, Crown, Sparkles, ChevronLeft, Info } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { useTranslation } from "@/lib/i18n";

interface LeaderboardRow {
  userId: string;
  displayName: string;
  contributions: number;
  rank: number;
}

interface BestTip {
  weekKey: string;
  tipId: string;
  body: string;
  voteCount: number;
  authorDisplayName: string;
}

interface LeaderboardResponse {
  allTime: LeaderboardRow[];
  monthly: LeaderboardRow[];
  bestTipOfWeek: BestTip | null;
  bestTipWeekKey: string | null;
}

type Tab = "monthly" | "allTime";

export default function LeaderboardScreen() {
  const { t } = useTranslation();
  const [data, setData] = useState<LeaderboardResponse | null>(null);
  const [tab, setTab] = useState<Tab>("monthly");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/leaderboard", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setData(d as LeaderboardResponse))
      .catch(() => setData({ allTime: [], monthly: [], bestTipOfWeek: null, bestTipWeekKey: null }))
      .finally(() => setLoading(false));
  }, []);

  const rows = tab === "monthly" ? data?.monthly ?? [] : data?.allTime ?? [];

  return (
    <AppShell
      title={t("leaderboard.title")}
      subtitle={t("leaderboard.subtitle")}
    >
      <div className="mb-4 flex items-center justify-between">
        <Link href="/app/discover">
          <a
            data-touch-target
            className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft className="h-4 w-4" />
            {t("leaderboard.backToDiscover")}
          </a>
        </Link>
        <Link href="/app/rewards">
          <a
            data-touch-target
            className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/15"
          >
            <Info className="h-3.5 w-3.5" />
            {t("leaderboard.howRewardsWork")}
          </a>
        </Link>
      </div>

      {/* Best Tip of the Week */}
      <section className="mb-6 animate-pop-in">
        <div className="rounded-3xl border border-amber-200 bg-gradient-to-br from-amber-50 to-white p-5 shadow-sm">
          <div className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-amber-700">
            <Sparkles className="h-3.5 w-3.5" />
            {t("leaderboard.bestTipBadge")}
          </div>
          {data?.bestTipOfWeek ? (
            <>
              <p className="font-serif text-base leading-snug text-foreground">
                "{data.bestTipOfWeek.body}"
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                {t(
                  data.bestTipOfWeek.voteCount === 1
                    ? "leaderboard.bestTipMeta_one"
                    : "leaderboard.bestTipMeta_other",
                  {
                    name: data.bestTipOfWeek.authorDisplayName,
                    count: data.bestTipOfWeek.voteCount,
                  },
                )}
              </p>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              {t("leaderboard.bestTipEmpty")}
            </p>
          )}
        </div>
      </section>

      {/* Tab switch */}
      <div role="tablist" aria-label={t("leaderboard.periodAria")} className="mb-4 flex gap-2">
        {(
          [
            { id: "monthly" as const, label: t("leaderboard.thisMonth") },
            { id: "allTime" as const, label: t("leaderboard.allTime") },
          ]
        ).map((tt) => (
          <button
            key={tt.id}
            role="tab"
            type="button"
            aria-selected={tab === tt.id}
            onClick={() => setTab(tt.id)}
            data-touch-target
            className={`flex-1 rounded-2xl px-4 py-2.5 text-sm font-semibold transition-colors ${
              tab === tt.id
                ? "bg-primary text-white shadow-md shadow-primary/20"
                : "bg-white text-muted-foreground border border-border/40 hover:bg-muted"
            }`}
          >
            {tt.label}
          </button>
        ))}
      </div>

      {/* Rows */}
      <section>
        {loading && (
          <div className="space-y-2">
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="h-14 rounded-2xl skeleton" />
            ))}
          </div>
        )}
        {!loading && rows.length === 0 && (
          <div className="rounded-3xl border border-dashed border-border/60 bg-white p-8 text-center">
            <Trophy className="mx-auto mb-3 h-8 w-8 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">
              {tab === "monthly" ? t("leaderboard.emptyMonth") : t("leaderboard.emptyAllTime")}
            </p>
          </div>
        )}
        {!loading && rows.length > 0 && (
          <ul className="overflow-hidden rounded-3xl border border-border/40 bg-white shadow-sm">
            {rows.map((row) => {
              const isTopThree = row.rank <= 3;
              const medal = row.rank === 1 ? "🥇" : row.rank === 2 ? "🥈" : row.rank === 3 ? "🥉" : null;
              return (
                <li
                  key={row.userId}
                  className="flex items-center gap-3 border-b border-border/30 px-4 py-3 last:border-b-0"
                >
                  <div
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl text-sm font-bold ${
                      isTopThree
                        ? "bg-amber-100 text-amber-700"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {medal ?? `#${row.rank}`}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-foreground">
                      {row.displayName}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-base font-bold text-foreground">{row.contributions}</p>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      {t("leaderboard.products")}
                    </p>
                  </div>
                  {row.rank === 1 && <Crown className="h-4 w-4 text-amber-500" aria-hidden />}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <p className="mt-6 text-center text-xs text-muted-foreground/70">
        {t("leaderboard.footnote")}
      </p>
    </AppShell>
  );
}
