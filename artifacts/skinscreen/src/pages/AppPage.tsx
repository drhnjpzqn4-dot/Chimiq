import { useEffect, useState } from "react";
import { useAuth } from "@workspace/replit-auth-web";
import { MyShelf } from "@/components/MyShelf";
import { ScanLine, LogOut, Star, Gift, Sparkles } from "lucide-react";

interface ContributeStats {
  acceptedContributions: number;
  premiumUntil: string | null;
  premiumJustUnlocked: boolean;
}

function PremiumUnlockedBanner({ premiumUntil }: { premiumUntil: string }) {
  const expiry = new Date(premiumUntil);
  const expiryStr = expiry.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-amber-400 to-amber-500 p-5 shadow-lg mb-6">
      <div className="relative z-10 flex items-start gap-4">
        <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
          <Sparkles className="w-6 h-6 text-white" />
        </div>
        <div>
          <p className="font-bold text-white text-lg leading-tight">Premium unlocked!</p>
          <p className="text-white/90 text-sm mt-1">
            You've contributed 5 products to our database. Enjoy Premium access until {expiryStr}.
          </p>
          <div className="flex items-center gap-1 mt-2">
            {[...Array(5)].map((_, i) => (
              <Star key={i} className="w-4 h-4 fill-white text-white" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function ContributionBadge({ count }: { count: number }) {
  if (count === 0) return null;
  const nextMilestone = Math.ceil(count / 5) * 5;
  const remaining = nextMilestone - count;
  const starsToShow = Math.min(count % 5 || 5, 5);
  const emptyStars = 5 - starsToShow;
  return (
    <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-amber-50 border border-amber-200 mb-6">
      <Gift className="w-4 h-4 text-amber-600 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-amber-700">
          {count} product{count !== 1 ? "s" : ""} contributed
          {remaining > 0 && remaining <= 4 && (
            <span className="font-normal text-amber-600"> · {remaining} more to earn free Premium</span>
          )}
        </p>
      </div>
      <div className="flex items-center gap-0.5 shrink-0">
        {[...Array(starsToShow)].map((_, i) => (
          <Star key={i} className="w-3 h-3 fill-amber-400 text-amber-400" />
        ))}
        {[...Array(emptyStars)].map((_, i) => (
          <Star key={`e-${i}`} className="w-3 h-3 text-amber-200" />
        ))}
      </div>
    </div>
  );
}

export default function AppPage() {
  const { user, isLoading, isAuthenticated, logout } = useAuth();
  const [contributeStats, setContributeStats] = useState<ContributeStats | null>(null);

  const base = (import.meta.env.BASE_URL ?? "/").replace(/\/+$/, "") || "";

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      window.location.href = `/api/login?returnTo=${encodeURIComponent(base + "/app")}`;
    }
  }, [isLoading, isAuthenticated, base]);

  useEffect(() => {
    if (isAuthenticated) {
      fetch("/api/contribute/stats", { credentials: "include" })
        .then((r) => r.json())
        .then((data) => setContributeStats(data as ContributeStats))
        .catch(() => {});
    }
  }, [isAuthenticated]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAFAF8]">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-40 rounded-lg bg-border/30 animate-pulse" />
          <div className="h-4 w-24 rounded-full bg-border/20 animate-pulse" />
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return null;
  }

  const displayName = user.firstName ?? user.email?.split("@")[0] ?? "there";

  return (
    <div className="min-h-screen bg-[#FAFAF8]">
      <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-border/30">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <a href={base + "/"}>
            <img
              src={`${import.meta.env.BASE_URL}images/logo-chimiq-long.png`}
              alt="ChimIQ"
              className="h-8 w-auto"
            />
          </a>
          <button
            onClick={logout}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5 rounded-lg hover:bg-border/20"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Log out</span>
          </button>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-serif font-semibold text-foreground mb-1">
            Welcome back, {displayName}
          </h1>
          <p className="text-muted-foreground text-base">
            Your skincare shelf — check your routine and scan new products.
          </p>
        </div>

        {contributeStats?.premiumJustUnlocked && contributeStats.premiumUntil && (
          <PremiumUnlockedBanner premiumUntil={contributeStats.premiumUntil} />
        )}

        {!contributeStats?.premiumJustUnlocked &&
          contributeStats &&
          contributeStats.acceptedContributions > 0 && (
            <ContributionBadge count={contributeStats.acceptedContributions} />
          )}

        <div className="mb-8">
          <MyShelf userId={user.id} displayName={displayName} />
        </div>

        <div className="text-center py-6">
          <a
            href={`${base}/#try-it-now`}
            className="inline-flex items-center gap-2.5 bg-primary hover:bg-primary/90 text-white px-8 py-4 rounded-full text-base font-semibold transition-all duration-200 shadow-md hover:shadow-lg hover:-translate-y-0.5"
          >
            <ScanLine className="w-5 h-5" />
            Scan a product
          </a>
          <p className="text-muted-foreground text-sm mt-3">
            Paste an ingredient list or scan a barcode to check against your shelf.
          </p>
          <p className="text-muted-foreground/50 text-xs mt-2">
            Scan a new barcode and contribute ingredient data to earn free Premium.
          </p>
        </div>
      </main>
    </div>
  );
}
