import { useAuth } from "@/hooks/useAuth";
import { useEffect, useState } from "react";
import { Star, Sparkles } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { MyShelf } from "@/components/MyShelf";
import { useTranslation } from "@/lib/i18n";
import { apiFetch } from "@/lib/api";

export const PREMIUM_CONTRIBUTION_MILESTONE = 30;
const STARS_DISPLAYED = 5;

interface ContributeStats {
  acceptedContributions: number;
  premiumUntil: string | null;
  premiumJustUnlocked: boolean;
}

function PremiumUnlockedBanner({ premiumUntil }: { premiumUntil: string }) {
  const { t, locale } = useTranslation();
  const localeMap: Record<string, string> = { en: "en-GB", sv: "sv-SE", fr: "fr-FR" };
  const expiry = new Date(premiumUntil);
  const expiryStr = expiry.toLocaleDateString(localeMap[locale] ?? "en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  return (
    <div className="relative mb-5 overflow-hidden rounded-3xl bg-gradient-to-br from-amber-400 to-amber-500 p-5 shadow-lg animate-pop-in">
      <div className="relative z-10 flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/20">
          <Sparkles className="h-6 w-6 text-white" />
        </div>
        <div>
          <p className="text-lg font-bold leading-tight text-white">{t("shelf.premiumUnlockedTitle")}</p>
          <p className="mt-1 text-sm text-white/90">
            {t("shelf.premiumUnlockedFmt", { count: PREMIUM_CONTRIBUTION_MILESTONE, date: expiryStr })}
          </p>
          <div className="mt-2 flex items-center gap-1">
            {[...Array(STARS_DISPLAYED)].map((_, i) => (
              <Star key={i} className="h-4 w-4 fill-white text-white" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ShelfScreen() {
  const { user, isAuthenticated } = useAuth();
  const [stats, setStats] = useState<ContributeStats | null>(null);
  const { t } = useTranslation();

  useEffect(() => {
    if (!isAuthenticated) return;
    apiFetch("/api/contribute/stats", { credentials: "include" })
      .then((r) => r.json())
      .then((data) => setStats(data as ContributeStats))
      .catch(() => {});
  }, [isAuthenticated]);

  if (!user) return null;
  const displayName = user.firstName ?? user.email?.split("@")[0] ?? t("common.greetingFallback");

  return (
    <AppShell
      pageLabel={t("tabs.shelf")}
      subtitle={t("shelf.subtitle")}
    >
      {stats?.premiumJustUnlocked && stats.premiumUntil && (
        <PremiumUnlockedBanner premiumUntil={stats.premiumUntil} />
      )}

      <MyShelf userId={user.id} displayName={displayName} />
    </AppShell>
  );
}
