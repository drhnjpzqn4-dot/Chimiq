import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { useAuth } from "@workspace/replit-auth-web";
import { useGetShelf, getGetShelfQueryKey } from "@workspace/api-client-react";
import { ChevronRight } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTranslation } from "@/lib/i18n";
import { PREMIUM_CONTRIBUTION_MILESTONE } from "@/pages/app/Shelf";

interface ContributeStats {
  acceptedContributions: number;
  premiumUntil: string | null;
}

function localeTag(locale: string): string {
  switch (locale) {
    case "sv":
      return "sv-SE";
    case "fr":
      return "fr-FR";
    case "es":
      return "es-ES";
    default:
      return "en-GB";
  }
}

function formatTodayLong(locale: string): string {
  const d = new Date();
  const raw = d.toLocaleDateString(localeTag(locale), {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

export default function HomeScreen() {
  const { user } = useAuth();
  const { t, locale } = useTranslation();
  const [stats, setStats] = useState<ContributeStats | null>(null);

  const firstName =
    user?.firstName ?? user?.email?.split("@")[0] ?? t("common.greetingFallback");

  const shelfQuery = useGetShelf({
    query: { queryKey: getGetShelfQueryKey(), enabled: Boolean(user) },
  });

  useEffect(() => {
    fetch("/api/contribute/stats", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setStats(d as ContributeStats))
      .catch(() => {});
  }, []);

  const milestone = PREMIUM_CONTRIBUTION_MILESTONE;
  const contributed = stats?.acceptedContributions ?? 0;
  const progressInCycle =
    contributed > 0 && contributed % milestone === 0
      ? milestone
      : contributed % milestone;
  const progressPct = Math.min(100, Math.round((progressInCycle / milestone) * 100));

  const shelfProducts = shelfQuery.data?.products ?? [];
  const previewProducts = useMemo(() => shelfProducts.slice(0, 3), [shelfProducts]);

  const todayLabel = useMemo(() => formatTodayLong(locale), [locale]);

  return (
    <AppShell title={t("tabs.home")}>
      <div className="space-y-5 rounded-2xl bg-[#FAF7F2] p-4 sm:p-5">
        {/* Sektion 1 — Hälsning */}
        <section className="animate-pop-in">
          <h1 className="font-serif text-2xl font-semibold leading-tight text-foreground sm:text-3xl">
            {t("home.greetingFmt", { name: firstName })}
          </h1>
          <p className="mt-1.5 text-sm font-medium text-muted-foreground">{todayLabel}</p>
          <p className="mt-1 text-sm text-muted-foreground/90">{t("home.tagline")}</p>
        </section>

        {/* Sektion 2 — Min hylla (preview) */}
        <section>
          <Card className="border-border/40 bg-white shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="font-serif text-lg">{t("home.shelfPreviewTitle")}</CardTitle>
              <Link href="/app/shelf">
                <a
                  data-touch-target
                  className="inline-flex items-center gap-0.5 text-xs font-semibold text-primary hover:underline"
                  aria-label={t("home.shelfSeeAll")}
                >
                  {t("home.shelfSeeAll")}
                  <ChevronRight className="h-3.5 w-3.5" aria-hidden />
                </a>
              </Link>
            </CardHeader>
            <CardContent>
              {shelfQuery.isLoading ? (
                <div className="h-16 rounded-xl bg-muted/40 animate-pulse" />
              ) : previewProducts.length === 0 ? (
                <Link href="/app/scan">
                  <a
                    data-touch-target
                    className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
                  >
                    {t("home.shelfEmptyCta")}
                  </a>
                </Link>
              ) : (
                <ul className="space-y-2">
                  {previewProducts.map((p) => (
                    <li
                      key={p.id}
                      className="flex items-center justify-between gap-3 rounded-xl border border-border/40 bg-[#FAFAF8] px-3 py-2.5"
                    >
                      <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
                        {p.productName}
                      </span>
                      <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                        {p.routineSlot === "both"
                          ? "AM+PM"
                          : p.routineSlot === "morning"
                            ? t("myShelf.slot.morning")
                            : t("myShelf.slot.evening")}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </section>

        {/* Sektion 3 — Bidragsstatus (kompakt) */}
        <section>
          <Card className="border-border/40 bg-[#FDF8F3] shadow-sm">
            <CardContent className="pt-6">
              <p className="mb-3 text-sm font-medium text-foreground">
                {t("home.contributionCompactFmt", {
                  current: progressInCycle,
                  total: milestone,
                })}
              </p>
              <div className="h-2 w-full overflow-hidden rounded-full bg-white/80">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${progressPct}%`,
                    backgroundColor: "#7BAF7A",
                  }}
                />
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Sektion 4 — Veckans ingrediens */}
        <section>
          <Card className="border-border/40 bg-white shadow-sm">
            <CardHeader>
              <CardTitle className="font-serif text-lg" style={{ color: "#7BAF7A" }}>
                {t("home.ingredientWeekTitle")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-sm font-semibold text-foreground">{t("home.ingredientWeekName")}</p>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {t("home.ingredientWeekBody")}
              </p>
            </CardContent>
          </Card>
        </section>

        {/* Sektion 5 — Discover Problems */}
        <section>
          <Card className="border-border/40 bg-white shadow-sm">
            <CardContent className="pt-6">
              <Link href="/app/problems">
                <a
                  data-touch-target
                  className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
                >
                  {t("home.problemsCta")}
                  <ChevronRight className="h-4 w-4 shrink-0" aria-hidden />
                </a>
              </Link>
            </CardContent>
          </Card>
        </section>
      </div>
    </AppShell>
  );
}
