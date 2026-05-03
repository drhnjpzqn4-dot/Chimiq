import { useAuth } from "@workspace/replit-auth-web";
import { useEffect, useState } from "react";
import { Star, Gift, Sparkles } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { MyShelf } from "@/components/MyShelf";
import { useTranslation } from "@/lib/i18n";

const PREMIUM_CONTRIBUTION_MILESTONE = 30;
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

function ContributionBadge({ count }: { count: number }) {
  const { t } = useTranslation();
  if (count === 0) return null;
  const nextMilestone = Math.ceil(count / PREMIUM_CONTRIBUTION_MILESTONE) * PREMIUM_CONTRIBUTION_MILESTONE;
  const remaining = nextMilestone - count;
  const progress =
    count % PREMIUM_CONTRIBUTION_MILESTONE === 0 && count > 0
      ? PREMIUM_CONTRIBUTION_MILESTONE
      : count % PREMIUM_CONTRIBUTION_MILESTONE;
  const filledStars = Math.round((progress / PREMIUM_CONTRIBUTION_MILESTONE) * STARS_DISPLAYED);
  const emptyStars = STARS_DISPLAYED - filledStars;
  return (
    <div className="mb-5 flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
      <Gift className="h-4 w-4 shrink-0 text-amber-600" />
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold text-amber-700">
          {count === 1
            ? t("shelf.productContributedOneFmt", { count })
            : t("shelf.productContributedManyFmt", { count })}
          {remaining > 0 && (
            <span className="font-normal text-amber-600">{t("shelf.moreForFreeMonthFmt", { remaining })}</span>
          )}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-0.5">
        {[...Array(filledStars)].map((_, i) => (
          <Star key={i} className="h-3 w-3 fill-amber-400 text-amber-400" />
        ))}
        {[...Array(emptyStars)].map((_, i) => (
          <Star key={`e-${i}`} className="h-3 w-3 text-amber-200" />
        ))}
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
    fetch("/api/contribute/stats", { credentials: "include" })
      .then((r) => r.json())
      .then((data) => setStats(data as ContributeStats))
      .catch(() => {});
  }, [isAuthenticated]);

  if (!user) return null;
  const displayName = user.firstName ?? user.email?.split("@")[0] ?? t("common.greetingFallback");

  return (
    <AppShell
      title={t("shelf.titleGreeting", { name: displayName })}
      subtitle={t("shelf.subtitle")}
    >
      {stats?.premiumJustUnlocked && stats.premiumUntil && (
        <PremiumUnlockedBanner premiumUntil={stats.premiumUntil} />
      )}
      {!stats?.premiumJustUnlocked && stats && stats.acceptedContributions > 0 && (
        <ContributionBadge count={stats.acceptedContributions} />
      )}

      <MyShelf userId={user.id} displayName={displayName} />
    </AppShell>
  );
}
