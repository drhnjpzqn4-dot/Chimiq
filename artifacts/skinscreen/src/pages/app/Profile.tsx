import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@workspace/replit-auth-web";
import {
  LogOut,
  Crown,
  Gift,
  CreditCard,
  ChevronRight,
  ShieldCheck,
  Mail,
  Loader2,
  Layers,
  Trophy,
  Info,
  XCircle,
  CheckCircle2,
  Clock,
  Pencil,
  Sparkles,
  AlertTriangle,
  ShieldAlert,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { useUserPlan } from "@/hooks/useUserPlan";
import { notifyUnseenRecipesChanged } from "@/hooks/useUnseenRecipeCount";
import { getBaseUrl } from "@/lib/base-url";
import { isNative, openExternal, MANAGE_SUBSCRIPTION_WEB_URL } from "@/lib/native";
import { useTranslation, LOCALES, type Locale } from "@/lib/i18n";

interface ContributeStats {
  acceptedContributions: number;
  premiumUntil: string | null;
}

interface BadgeItem {
  id: string;
  title: string;
  description: string;
  emoji: string;
  awardedAt: string;
}

interface MySubmission {
  id: string;
  barcode: string;
  productName: string | null;
  brand: string | null;
  status: string;
  reviewNote: string | null;
  aiReviewNote: string | null;
  submittedAt: string;
  reviewedAt: string | null;
}

interface MyRecipe {
  id: string;
  title: string;
  category: string;
  status: "pending" | "approved" | "changes_requested" | "rejected";
  riskLevel: "safe" | "caution" | "high_risk" | null;
  adminNote: string | null;
  createdAt: string;
  updatedAt: string;
  reviewedAt: string | null;
}

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const { plan, isPremium, isLoading } = useUserPlan();
  const [, navigate] = useLocation();
  const { t, locale, setLocale } = useTranslation();
  const [stats, setStats] = useState<ContributeStats | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [testChargeLoading, setTestChargeLoading] = useState(false);
  const [testChargeResult, setTestChargeResult] = useState<{
    ok: boolean;
    livemode?: boolean;
    chargeId?: string | null;
    refundId?: string;
    refundStatus?: string;
    paymentIntentId?: string;
    amount?: number;
    currency?: string;
    webhook?: {
      chargeRefundedListenerCount: number;
      configuredOk: boolean;
      delivered: boolean;
      deliveredAt: string | null;
      eventId: string | null;
      endpoints: Array<{
        url: string;
        status: string;
        listensForChargeRefunded: boolean;
      }>;
    };
    error?: string;
    requiresConfirmation?: boolean;
  } | null>(null);
  const [badges, setBadges] = useState<BadgeItem[]>([]);
  const [mySubmissions, setMySubmissions] = useState<MySubmission[]>([]);
  const [myRecipes, setMyRecipes] = useState<MyRecipe[]>([]);
  const [unseenRecipeCount, setUnseenRecipeCount] = useState(0);
  const [recipeNotifications, setRecipeNotifications] = useState<
    {
      id: string;
      title: string;
      status: "pending" | "approved" | "changes_requested" | "rejected";
      adminNote: string | null;
      reviewedAt: string | null;
    }[]
  >([]);

  // Per-recipe ack (#70) — called when the user taps a notification entry
  // or opens a recipe via its inline action button. Updates local state
  // optimistically and asks the BottomTabBar to refetch its dot count.
  const ackRecipe = (recipeId: string) => {
    setRecipeNotifications((prev) => prev.filter((n) => n.id !== recipeId));
    setUnseenRecipeCount((c) => Math.max(0, c - 1));
    fetch(`/api/recipes/mine/${recipeId}/seen`, {
      method: "POST",
      credentials: "include",
    })
      .then(() => notifyUnseenRecipesChanged())
      .catch(() => {});
  };

  useEffect(() => {
    fetch("/api/contribute/stats", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setStats(d as ContributeStats))
      .catch(() => {});
    fetch("/api/admin/check", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : { isAdmin: false }))
      .then((d) => setIsAdmin(!!(d as { isAdmin?: boolean }).isAdmin))
      .catch(() => {});
    fetch("/api/badges/me", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : { badges: [] }))
      .then((d) => setBadges((d as { badges?: BadgeItem[] }).badges ?? []))
      .catch(() => {});
    // Pull the user's recent submissions so we can surface the admin's
    // rejection note when present (#72). Anonymous users get an empty list.
    fetch("/api/contribute/my-recent", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : { submissions: [] }))
      .then((d) => setMySubmissions((d as { submissions?: MySubmission[] }).submissions ?? []))
      .catch(() => {});
    // Pull the user's own recipes (#69) so they can see admin notes and
    // edit/resubmit when status is `changes_requested`.
    fetch("/api/recipes/mine", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : { recipes: [], unseenCount: 0 }))
      .then((d) => {
        const data = d as { recipes?: MyRecipe[]; unseenCount?: number };
        setMyRecipes(data.recipes ?? []);
        setUnseenRecipeCount(data.unseenCount ?? 0);
      })
      .catch(() => {});
    // Notification banner entries — only the recipes that are *still*
    // unseen, so the user actively dismisses each one by tapping. (#70)
    fetch("/api/recipes/mine/notifications", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : { notifications: [] }))
      .then((d) =>
        setRecipeNotifications(
          (d as { notifications?: typeof recipeNotifications }).notifications ?? [],
        ),
      )
      .catch(() => {});
  }, []);

  const runningNative = isNative();

  const handleTestCharge = async (confirmTestMode = false) => {
    setTestChargeLoading(true);
    setTestChargeResult(null);
    try {
      const res = await fetch(`${getBaseUrl()}api/payments/admin/test-charge`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmTestMode }),
      });
      const data = (await res.json()) as Exclude<typeof testChargeResult, null>;
      setTestChargeResult({ ...data, ok: res.ok && data.ok !== false });
    } catch (e) {
      setTestChargeResult({
        ok: false,
        error: (e as Error).message ?? "Network error",
      });
    } finally {
      setTestChargeLoading(false);
    }
  };

  const handleManageBilling = async () => {
    setPortalLoading(true);
    try {
      const res = await fetch(`${getBaseUrl()}api/payments/portal`, {
        method: "POST",
        credentials: "include",
      });
      const data = (await res.json()) as { url?: string };
      // On native we route through the system browser so Stripe's billing
      // portal renders in Safari / Chrome (App Store reader-app compliance).
      if (data.url) {
        if (runningNative) {
          await openExternal(data.url);
        } else {
          window.location.href = data.url;
        }
      }
    } catch {
      // noop
    } finally {
      setPortalLoading(false);
    }
  };

  if (!user) return null;
  const displayName = user.firstName ?? user.email?.split("@")[0] ?? t("common.greetingFallback");
  const initials = (user.firstName ?? user.email ?? t("common.initialFallback")).slice(0, 1).toUpperCase();

  const milestone = 30;
  const contributed = stats?.acceptedContributions ?? 0;
  const nextMilestone = Math.ceil((contributed + 1) / milestone) * milestone;
  const remaining = nextMilestone - contributed;
  const progressInCycle =
    contributed > 0 && contributed % milestone === 0
      ? milestone
      : contributed % milestone;
  const progressPct = Math.min(100, Math.round((progressInCycle / milestone) * 100));

  return (
    <AppShell title={t("profile.title")} subtitle={t("profile.subtitle")}>
      {/* Identity card */}
      <section className="mb-5 animate-pop-in">
        <div className="rounded-3xl bg-white border border-border/40 shadow-sm p-5 flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary/70 text-xl font-bold text-white shadow-md">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-serif text-xl font-semibold leading-tight text-foreground truncate">
              {displayName}
            </p>
            {user.email && (
              <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground truncate">
                <Mail className="h-3 w-3 shrink-0" />
                <span className="truncate">{user.email}</span>
              </p>
            )}
          </div>
        </div>
      </section>

      {/* Notification banner — surfaces unseen review feedback for the
          submitter and deep-links each entry to the right destination
          (RecipeDetail for approved, edit form otherwise). Tapping any
          row acks just that recipe so the dot/banner clear only for
          notifications the user actually looked at. (#70) */}
      {recipeNotifications.length > 0 && (
        <section className="mb-5" data-testid="recipe-notifications">
          <div className="rounded-3xl border border-amber-200 bg-amber-50/60 p-4 shadow-sm">
            <p className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-amber-800">
              <Sparkles className="h-3.5 w-3.5" />
              {t("myRecipes.heading")} · {recipeNotifications.length}
            </p>
            <ul className="space-y-2">
              {recipeNotifications.map((n) => {
                const isApproved = n.status === "approved";
                const isChanges = n.status === "changes_requested";
                const isRejected = n.status === "rejected";
                const label = isApproved
                  ? t("myRecipes.status.approved")
                  : isChanges
                    ? t("myRecipes.status.changesRequested")
                    : isRejected
                      ? t("myRecipes.status.rejected")
                      : n.status;
                const target =
                  isApproved
                    ? `/recipes/${n.id}`
                    : `/app/recipes/new?edit=${n.id}`;
                return (
                  <li key={n.id}>
                    <button
                      type="button"
                      data-testid={`recipe-notification-${n.id}`}
                      data-touch-target
                      onClick={() => {
                        ackRecipe(n.id);
                        navigate(target);
                      }}
                      className="flex w-full items-start gap-3 rounded-2xl border border-amber-200/70 bg-white p-3 text-left transition-colors hover:bg-amber-50"
                    >
                      <span className="mt-0.5 inline-flex h-2.5 w-2.5 shrink-0 rounded-full bg-amber-500" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-foreground">
                          {n.title}
                        </span>
                        <span className="mt-0.5 block text-[11px] font-semibold uppercase tracking-wide text-amber-700">
                          {label}
                        </span>
                        {n.adminNote && (
                          <span className="mt-1 block text-xs text-muted-foreground line-clamp-2">
                            <span className="font-semibold text-foreground/80">
                              {t("myRecipes.reviewerNote")}{" "}
                            </span>
                            {n.adminNote}
                          </span>
                        )}
                      </span>
                      <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" />
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </section>
      )}

      {/* Plan card */}
      <section className="mb-5">
        <div
          className={`rounded-3xl border p-5 shadow-sm ${
            isPremium
              ? "border-amber-200 bg-gradient-to-br from-amber-50 to-white"
              : "border-primary/20 bg-gradient-to-br from-primary/5 to-white"
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                {t("profileCard.currentPlan")}
              </span>
              <p className="mt-1 flex items-center gap-2 font-serif text-2xl font-semibold text-foreground">
                {isPremium ? (
                  <>
                    <Crown className="h-5 w-5 text-amber-500" />
                    {t("profileCard.premium")}
                  </>
                ) : (
                  <>
                    <ShieldCheck className="h-5 w-5 text-primary-strong" />
                    <span className="text-primary-strong">{t("profileCard.free")}</span>
                  </>
                )}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {isLoading
                  ? t("profileCard.checkingPlan")
                  : isPremium
                    ? t("profileCard.descPremium")
                    : t("profileCard.descFree")}
              </p>
            </div>
          </div>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            {isPremium ? (
              <button
                type="button"
                onClick={handleManageBilling}
                disabled={portalLoading}
                data-touch-target
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl border border-border/60 bg-white px-4 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-muted disabled:opacity-60"
              >
                {portalLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CreditCard className="h-4 w-4" />
                )}
                {t("profileCard.manageBilling")}
              </button>
            ) : runningNative ? (
              // Reader-app compliance: native shells must not display
              // call-to-action buttons that direct to a non-IAP purchase
              // flow. We show a neutral status message instead and let
              // already-subscribed users sign in.
              <div className="flex-1 rounded-2xl border border-border/60 bg-muted/40 px-4 py-3 text-center text-xs text-muted-foreground">
                {t("profileCard.nativePremiumNotice")}
              </div>
            ) : (
              <button
                type="button"
                onClick={() => navigate("/pricing")}
                data-touch-target
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-3 text-sm font-semibold text-white shadow-md shadow-primary/20 transition-transform active:scale-[0.98]"
              >
                <Crown className="h-4 w-4" />
                {t("profileCard.upgradeToPremium")}
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Contributions */}
      <section className="mb-5">
        <div className="rounded-3xl border border-border/40 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                {t("profileCard.contributions")}
              </p>
              <p className="mt-1 font-serif text-2xl font-semibold text-foreground">
                {contributed} <span className="text-base text-muted-foreground">{t("profileCard.products")}</span>
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {t("profileCard.moreForFreeMonthFmt", { remaining })}
              </p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-100 text-amber-600">
              <Gift className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-gradient-to-r from-primary to-amber-400 transition-all duration-500"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      </section>

      {/* My recent submissions — surfaces the admin's rejection note (#72). */}
      {mySubmissions.length > 0 && (
        <section className="mb-5">
          <div className="rounded-3xl border border-border/40 bg-white p-5 shadow-sm">
            <p className="mb-3 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
              {t("profileCard.recentSubmissions")}
            </p>
            <ul className="space-y-3">
              {mySubmissions.slice(0, 5).map((s) => {
                const isRejected = s.status === "rejected";
                const isApproved = s.status === "approved";
                const isPending =
                  s.status === "pending" ||
                  s.status === "needs_admin" ||
                  s.status === "ai_reviewing";
                const label = isApproved
                  ? t("profileCard.statusApproved")
                  : isRejected
                  ? t("profileCard.statusRejected")
                  : isPending
                  ? t("profileCard.statusUnderReview")
                  : s.status;
                const Icon = isApproved ? CheckCircle2 : isRejected ? XCircle : Clock;
                const iconClass = isApproved
                  ? "text-green-600"
                  : isRejected
                  ? "text-destructive"
                  : "text-amber-500";
                return (
                  <li
                    key={s.id}
                    className={`rounded-2xl border p-3 ${
                      isRejected
                        ? "border-destructive/30 bg-red-50/40"
                        : "border-border/40 bg-muted/20"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-foreground">
                          {s.productName?.trim() || s.brand?.trim() || s.barcode}
                        </p>
                        {s.brand && s.productName && (
                          <p className="truncate text-xs text-muted-foreground">{s.brand}</p>
                        )}
                        <p className="mt-1 text-[11px] text-muted-foreground">
                          {t("profileCard.submittedFmt", { date: new Date(s.submittedAt).toLocaleDateString(locale) })}
                        </p>
                      </div>
                      <span
                        className={`inline-flex items-center gap-1 shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                          isApproved
                            ? "bg-green-100 text-green-700"
                            : isRejected
                            ? "bg-red-100 text-red-700"
                            : "bg-amber-100 text-amber-700"
                        }`}
                      >
                        <Icon className={`h-3 w-3 ${iconClass}`} />
                        {label}
                      </span>
                    </div>
                    {isRejected && s.reviewNote && (
                      <p className="mt-2 rounded-lg bg-white/80 p-2 text-xs text-destructive">
                        <span className="font-semibold">{t("profileCard.reviewerNote")}</span>
                        {s.reviewNote}
                      </p>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        </section>
      )}

      {/* My recipes — lets submitters see admin feedback and edit/resubmit
          changes_requested recipes (#69). */}
      {myRecipes.length > 0 && (
        <section className="mb-5">
          <div className="rounded-3xl border border-border/40 bg-white p-5 shadow-sm">
            <div className="mb-3 flex items-center gap-2">
              <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                {t("myRecipes.heading")}
              </p>
              {unseenRecipeCount > 0 && (
                <span
                  data-testid="my-recipes-unseen-dot"
                  role="status"
                  aria-live="polite"
                  aria-label={t("myRecipes.unseenAria", {
                    count: unseenRecipeCount,
                  })}
                  className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-500 px-1.5 text-[10px] font-bold text-white shadow-sm"
                >
                  {unseenRecipeCount}
                </span>
              )}
            </div>
            <ul className="space-y-3">
              {myRecipes.slice(0, 8).map((r) => {
                const isApproved = r.status === "approved";
                const isRejected = r.status === "rejected";
                const isChanges = r.status === "changes_requested";
                const isPending = r.status === "pending";
                const label = isApproved
                  ? t("myRecipes.status.approved")
                  : isRejected
                    ? t("myRecipes.status.rejected")
                    : isChanges
                      ? t("myRecipes.status.changesRequested")
                      : t("myRecipes.status.underReview");
                const StatusIcon = isApproved
                  ? CheckCircle2
                  : isRejected
                    ? XCircle
                    : isChanges
                      ? AlertTriangle
                      : Clock;
                const RiskIcon =
                  r.riskLevel === "high_risk"
                    ? ShieldAlert
                    : r.riskLevel === "caution"
                      ? AlertTriangle
                      : r.riskLevel === "safe"
                        ? Sparkles
                        : null;
                const riskColor =
                  r.riskLevel === "high_risk"
                    ? "text-red-600"
                    : r.riskLevel === "caution"
                      ? "text-amber-600"
                      : "text-green-600";
                const cardTone = isChanges
                  ? "border-amber-300 bg-amber-50/60"
                  : isRejected
                    ? "border-destructive/30 bg-red-50/40"
                    : "border-border/40 bg-muted/20";
                const badgeTone = isApproved
                  ? "bg-green-100 text-green-700"
                  : isRejected
                    ? "bg-red-100 text-red-700"
                    : isChanges
                      ? "bg-amber-100 text-amber-700"
                      : "bg-muted text-muted-foreground";
                return (
                  <li key={r.id} className={`rounded-2xl border p-3 ${cardTone}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-foreground">
                          {r.title}
                        </p>
                        <p className="mt-0.5 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                          <span className="capitalize">{r.category}</span>
                          {RiskIcon && (
                            <>
                              <span aria-hidden>·</span>
                              <RiskIcon className={`h-3 w-3 ${riskColor}`} />
                            </>
                          )}
                          <span aria-hidden>·</span>
                          <span>
                            {new Date(r.updatedAt).toLocaleDateString(locale)}
                          </span>
                        </p>
                      </div>
                      <span
                        role="status"
                        className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ${badgeTone}`}
                      >
                        <StatusIcon className="h-3 w-3" aria-hidden="true" />
                        {label}
                      </span>
                    </div>
                    {(isChanges || isRejected) && r.adminNote && (
                      <p
                        className={`mt-2 rounded-lg bg-white/80 p-2 text-xs ${
                          isChanges ? "text-amber-800" : "text-destructive"
                        }`}
                      >
                        <span className="font-semibold">
                          {t("myRecipes.reviewerNote")}{" "}
                        </span>
                        {r.adminNote}
                      </p>
                    )}
                    {isChanges && (
                      <button
                        type="button"
                        onClick={() => {
                          ackRecipe(r.id);
                          navigate(`/app/recipes/new?edit=${r.id}`);
                        }}
                        data-touch-target
                        className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-primary/90"
                      >
                        <Pencil className="h-3 w-3" aria-hidden="true" />
                        {t("myRecipes.editAndResubmit")}
                      </button>
                    )}
                    {(isPending || isApproved) && (
                      <button
                        type="button"
                        onClick={() => {
                          ackRecipe(r.id);
                          if (isApproved) navigate(`/recipes/${r.id}`);
                          else navigate(`/app/recipes/new?edit=${r.id}`);
                        }}
                        data-touch-target
                        className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-border bg-white px-4 py-1.5 text-xs font-semibold text-foreground hover:bg-muted"
                      >
                        {isApproved ? (
                          <>
                            <ChevronRight className="h-3 w-3" aria-hidden="true" />
                            {t("myRecipes.viewPublic")}
                          </>
                        ) : (
                          <>
                            <Pencil className="h-3 w-3" aria-hidden="true" />
                            {t("myRecipes.editWhilePending")}
                          </>
                        )}
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        </section>
      )}

      {/* Badges */}
      <section className="mb-5">
        <div className="rounded-3xl border border-border/40 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
              <Trophy className="h-3.5 w-3.5 text-amber-500" />
              {t("profileCard.badges")}
            </p>
            <button
              type="button"
              onClick={() => navigate("/app/rewards")}
              data-touch-target
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline"
            >
              <Info className="h-3 w-3" />
              {t("profileCard.howRewardsWork")}
            </button>
          </div>
          {badges.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {t("profileCard.earnFirstBadge")}
            </p>
          ) : (
            <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4">
              {badges.map((b) => (
                <li
                  key={b.id}
                  className="flex flex-col items-center text-center"
                  title={b.description}
                >
                  <div className="text-2xl" aria-hidden>
                    {b.emoji}
                  </div>
                  <p className="mt-1 text-[10px] font-semibold leading-tight text-foreground">
                    {b.title}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* Settings list */}
      <section className="mb-6">
        <ul className="divide-y divide-border/40 overflow-hidden rounded-3xl border border-border/40 bg-white shadow-sm">
          <li>
            <button
              type="button"
              onClick={() => navigate("/app/leaderboard")}
              data-touch-target
              className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left transition-colors hover:bg-muted"
            >
              <span className="flex items-center gap-2 text-sm font-medium text-foreground">
                <Trophy className="h-4 w-4 text-amber-500" />
                {t("profileCard.leaderboard")}
              </span>
              <ChevronRight className="h-4 w-4 text-muted-foreground/60" />
            </button>
          </li>
          <li>
            <button
              type="button"
              onClick={() => navigate("/app/shelf")}
              data-touch-target
              className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left transition-colors hover:bg-muted"
            >
              <span className="flex items-center gap-2 text-sm font-medium text-foreground">
                <Layers className="h-4 w-4 text-primary" />
                {t("profileCard.shelfRoutine")}
              </span>
              <ChevronRight className="h-4 w-4 text-muted-foreground/60" />
            </button>
          </li>
          {!runningNative && (
            <li>
              <button
                type="button"
                onClick={() => navigate("/pricing")}
                data-touch-target
                className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left transition-colors hover:bg-muted"
              >
                <span className="text-sm font-medium text-foreground">{t("profileCard.pricingPlans")}</span>
                <ChevronRight className="h-4 w-4 text-muted-foreground/60" />
              </button>
            </li>
          )}
          <li>
            <button
              type="button"
              onClick={() => navigate("/app/recipes/new")}
              data-touch-target
              className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left transition-colors hover:bg-muted"
            >
              <span className="text-sm font-medium text-foreground">{t("profileCard.shareRecipe")}</span>
              <ChevronRight className="h-4 w-4 text-muted-foreground/60" />
            </button>
          </li>
          <li>
            <button
              type="button"
              onClick={() => navigate("/recipes")}
              data-touch-target
              className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left transition-colors hover:bg-muted"
            >
              <span className="text-sm font-medium text-foreground">{t("profileCard.browseRecipes")}</span>
              <ChevronRight className="h-4 w-4 text-muted-foreground/60" />
            </button>
          </li>
          {isAdmin && (
            <>
              <li>
                <button
                  type="button"
                  onClick={() => {
                    const base = (import.meta.env.BASE_URL ?? "/").replace(/\/+$/, "") || "";
                    window.location.href = `${base}/admin/submissions`;
                  }}
                  data-touch-target
                  className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left transition-colors hover:bg-muted"
                >
                  <span className="flex items-center gap-2 text-sm font-medium text-foreground">
                    <ShieldCheck className="h-4 w-4 text-primary" />
                    {t("profileCard.submissionQueue")}
                  </span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground/60" />
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => {
                    const base = (import.meta.env.BASE_URL ?? "/").replace(/\/+$/, "") || "";
                    window.location.href = `${base}/admin/recipes`;
                  }}
                  data-touch-target
                  className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left transition-colors hover:bg-muted"
                >
                  <span className="flex items-center gap-2 text-sm font-medium text-foreground">
                    <ShieldCheck className="h-4 w-4 text-primary" />
                    {t("profileCard.recipeQueue")}
                  </span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground/60" />
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => {
                    const base = (import.meta.env.BASE_URL ?? "/").replace(/\/+$/, "") || "";
                    window.location.href = `${base}/admin/users`;
                  }}
                  data-touch-target
                  className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left transition-colors hover:bg-muted"
                >
                  <span className="flex items-center gap-2 text-sm font-medium text-foreground">
                    <ShieldCheck className="h-4 w-4 text-primary" />
                    Users
                  </span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground/60" />
                </button>
              </li>
              {/* Go-live verification: charges 1 SEK against the admin's
                  saved card and immediately refunds it. Used to confirm
                  Stripe live mode and webhook delivery in seconds rather
                  than walking through the full checkout flow manually
                  (LAUNCH_CHECKLIST §6.4). */}
              <li className="px-5 py-4">
                <div className="flex items-center justify-between gap-3">
                  <span className="flex min-w-0 items-center gap-2 text-sm font-medium text-foreground">
                    <CreditCard className="h-4 w-4 text-primary" />
                    Test live charge
                  </span>
                  <button
                    type="button"
                    data-testid="admin-test-charge"
                    onClick={() => handleTestCharge(false)}
                    disabled={testChargeLoading}
                    data-touch-target
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-primary/30 bg-primary/5 px-3 py-1.5 text-xs font-semibold text-primary transition-colors hover:bg-primary/10 disabled:opacity-60"
                  >
                    {testChargeLoading ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="h-3.5 w-3.5" />
                    )}
                    Charge 1 SEK + refund
                  </button>
                </div>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Charges your saved card 1 SEK and refunds it immediately.
                  Use after key rotation or domain change to verify live mode.
                </p>
                {testChargeResult && (
                  <div
                    data-testid="admin-test-charge-result"
                    className={`mt-3 rounded-2xl border p-3 text-xs ${
                      testChargeResult.ok
                        ? "border-green-200 bg-green-50/60 text-foreground"
                        : "border-destructive/30 bg-red-50/60 text-foreground"
                    }`}
                  >
                    {testChargeResult.ok ? (
                      <>
                        <p className="flex items-center gap-1.5 font-semibold text-green-700">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Charged & refunded ·{" "}
                          {testChargeResult.livemode ? "LIVE mode" : "TEST mode"}
                        </p>
                        <dl className="mt-2 space-y-1 font-mono text-[11px] text-muted-foreground">
                          {testChargeResult.chargeId && (
                            <div className="flex gap-2">
                              <dt className="shrink-0">charge:</dt>
                              <dd
                                className="truncate text-foreground"
                                data-testid="admin-test-charge-id"
                              >
                                {testChargeResult.chargeId}
                              </dd>
                            </div>
                          )}
                          {testChargeResult.refundId && (
                            <div className="flex gap-2">
                              <dt className="shrink-0">refund:</dt>
                              <dd
                                className="truncate text-foreground"
                                data-testid="admin-test-refund-id"
                              >
                                {testChargeResult.refundId} ·{" "}
                                {testChargeResult.refundStatus}
                              </dd>
                            </div>
                          )}
                          {testChargeResult.paymentIntentId && (
                            <div className="flex gap-2">
                              <dt className="shrink-0">intent:</dt>
                              <dd className="truncate text-foreground">
                                {testChargeResult.paymentIntentId}
                              </dd>
                            </div>
                          )}
                        </dl>
                        {testChargeResult.webhook && (
                          <div className="mt-2 space-y-1.5 border-t border-green-200/60 pt-2">
                            {/* End-to-end delivery — the real go/no-go signal. */}
                            <p
                              data-testid="admin-test-charge-webhook-delivered"
                              className={`flex items-center gap-1.5 font-semibold ${
                                testChargeResult.webhook.delivered
                                  ? "text-green-700"
                                  : "text-amber-700"
                              }`}
                            >
                              {testChargeResult.webhook.delivered ? (
                                <CheckCircle2 className="h-3.5 w-3.5" />
                              ) : (
                                <AlertTriangle className="h-3.5 w-3.5" />
                              )}
                              {testChargeResult.webhook.delivered
                                ? `Webhook delivered (${testChargeResult.webhook.eventId ?? "evt"})`
                                : "Webhook NOT delivered within 10s — check Stripe Dashboard"}
                            </p>
                            {/* Configuration sanity check — secondary. */}
                            <p className="text-[11px] text-muted-foreground">
                              Config:{" "}
                              {
                                testChargeResult.webhook
                                  .chargeRefundedListenerCount
                              }{" "}
                              endpoint(s) listening for charge.refunded
                            </p>
                            {testChargeResult.webhook.endpoints.length > 0 && (
                              <ul className="space-y-0.5 font-mono text-[11px] text-muted-foreground">
                                {testChargeResult.webhook.endpoints.map((e) => (
                                  <li key={e.url} className="truncate">
                                    {e.status === "enabled" ? "✓" : "✗"} {e.url}{" "}
                                    {e.listensForChargeRefunded
                                      ? ""
                                      : "(no charge.refunded)"}
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        )}
                      </>
                    ) : (
                      <>
                        <p className="flex items-center gap-1.5 font-semibold text-destructive">
                          <XCircle className="h-3.5 w-3.5" />
                          {testChargeResult.error ?? "Test charge failed"}
                        </p>
                        {testChargeResult.requiresConfirmation && (
                          <button
                            type="button"
                            onClick={() => handleTestCharge(true)}
                            disabled={testChargeLoading}
                            data-touch-target
                            data-testid="admin-test-charge-confirm-test-mode"
                            className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-amber-300 bg-amber-50 px-3 py-1.5 text-[11px] font-semibold text-amber-800 hover:bg-amber-100 disabled:opacity-60"
                          >
                            <AlertTriangle className="h-3 w-3" />
                            Charge test-mode card anyway
                          </button>
                        )}
                      </>
                    )}
                  </div>
                )}
              </li>
            </>
          )}
          {runningNative && isPremium && (
            // Reader-app compliance: only shown to users who already have an
            // entitlement; routes to the same Stripe Billing Portal used on
            // web for cancel/upgrade. Not a purchase CTA.
            <li>
              <button
                type="button"
                onClick={() => openExternal(MANAGE_SUBSCRIPTION_WEB_URL)}
                data-touch-target
                className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left transition-colors hover:bg-muted"
              >
                <span className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <CreditCard className="h-4 w-4 text-primary" />
                  {t("profileCard.manageSubWeb")}
                </span>
                <ChevronRight className="h-4 w-4 text-muted-foreground/60" />
              </button>
            </li>
          )}
          <li className="flex items-center justify-between gap-3 px-5 py-4">
            <span className="text-sm font-medium text-foreground">{t("profile.language")}</span>
            <div role="radiogroup" aria-label={t("profile.language")} className="flex items-center gap-1 rounded-full bg-muted p-1">
              {LOCALES.map((l) => {
                const active = locale === l.code;
                return (
                  <button
                    key={l.code}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => setLocale(l.code as Locale)}
                    data-touch-target
                    className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                      active
                        ? "bg-white text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {l.label}
                  </button>
                );
              })}
            </div>
          </li>
          <li>
            <a
              href="mailto:hello@chimiq.com"
              data-touch-target
              className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left transition-colors hover:bg-muted"
            >
              <span className="text-sm font-medium text-foreground">{t("profileCard.contactSupport")}</span>
              <ChevronRight className="h-4 w-4 text-muted-foreground/60" />
            </a>
          </li>
          <li>
            <button
              type="button"
              onClick={logout}
              data-touch-target
              className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left text-destructive transition-colors hover:bg-destructive/5"
            >
              <span className="flex items-center gap-2 text-sm font-medium">
                <LogOut className="h-4 w-4" />
                {t("profileCard.logout")}
              </span>
              <ChevronRight className="h-4 w-4 text-destructive/60" />
            </button>
          </li>
        </ul>
      </section>

      <nav
        aria-label={t("footer.legalHeading")}
        className="flex flex-wrap justify-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground"
      >
        <a
          href={`${(import.meta.env.BASE_URL ?? "/").replace(/\/+$/, "")}/legal/privacy`}
          className="hover:text-foreground underline-offset-2 hover:underline"
        >
          {t("footer.legalPrivacy")}
        </a>
        <a
          href={`${(import.meta.env.BASE_URL ?? "/").replace(/\/+$/, "")}/legal/terms`}
          className="hover:text-foreground underline-offset-2 hover:underline"
        >
          {t("footer.legalTerms")}
        </a>
        <a
          href={`${(import.meta.env.BASE_URL ?? "/").replace(/\/+$/, "")}/legal/medical-disclaimer`}
          className="hover:text-foreground underline-offset-2 hover:underline"
        >
          {t("footer.legalDisclaimer")}
        </a>
      </nav>

      <p className="text-center text-[10px] uppercase tracking-widest text-muted-foreground/40">
        {t("profileCard.footerPlanFmt", { plan: isPremium ? t("profileCard.premium") : t("profileCard.free") })}
      </p>
    </AppShell>
  );
}
