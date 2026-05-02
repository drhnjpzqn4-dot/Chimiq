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
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { useUserPlan } from "@/hooks/useUserPlan";
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

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const { plan, isPremium, isLoading } = useUserPlan();
  const [, navigate] = useLocation();
  const { t, locale, setLocale } = useTranslation();
  const [stats, setStats] = useState<ContributeStats | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [badges, setBadges] = useState<BadgeItem[]>([]);
  const [mySubmissions, setMySubmissions] = useState<MySubmission[]>([]);

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
  }, []);

  const runningNative = isNative();

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
  const displayName = user.firstName ?? user.email?.split("@")[0] ?? "there";
  const initials = (user.firstName ?? user.email ?? "U").slice(0, 1).toUpperCase();

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
                Current plan
              </span>
              <p className="mt-1 flex items-center gap-2 font-serif text-2xl font-semibold text-foreground">
                {isPremium ? (
                  <>
                    <Crown className="h-5 w-5 text-amber-500" />
                    Premium
                  </>
                ) : (
                  <>
                    <ShieldCheck className="h-5 w-5 text-primary-strong" />
                    <span className="text-primary-strong">Free</span>
                  </>
                )}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {isLoading
                  ? "Checking your plan…"
                  : isPremium
                    ? "Unlimited shelf, AI chat, full routine cross-check."
                    : "2 shelf products, single + compare scans, dermatologist finder."}
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
                Manage billing
              </button>
            ) : runningNative ? (
              // Reader-app compliance: native shells must not display
              // call-to-action buttons that direct to a non-IAP purchase
              // flow. We show a neutral status message instead and let
              // already-subscribed users sign in.
              <div className="flex-1 rounded-2xl border border-border/60 bg-muted/40 px-4 py-3 text-center text-xs text-muted-foreground">
                Premium is available to existing subscribers — sign in with the
                account you upgraded on the web.
              </div>
            ) : (
              <button
                type="button"
                onClick={() => navigate("/pricing")}
                data-touch-target
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-3 text-sm font-semibold text-white shadow-md shadow-primary/20 transition-transform active:scale-[0.98]"
              >
                <Crown className="h-4 w-4" />
                Upgrade to Premium
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
                Contributions
              </p>
              <p className="mt-1 font-serif text-2xl font-semibold text-foreground">
                {contributed} <span className="text-base text-muted-foreground">products</span>
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {remaining} more for 1 month free Premium.
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
              Your recent submissions
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
                  ? "Approved"
                  : isRejected
                  ? "Rejected"
                  : isPending
                  ? "Under review"
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
                          Submitted {new Date(s.submittedAt).toLocaleDateString()}
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
                        <span className="font-semibold">Reviewer note: </span>
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

      {/* Badges */}
      <section className="mb-5">
        <div className="rounded-3xl border border-border/40 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
              <Trophy className="h-3.5 w-3.5 text-amber-500" />
              Badges
            </p>
            <button
              type="button"
              onClick={() => navigate("/app/rewards")}
              data-touch-target
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline"
            >
              <Info className="h-3 w-3" />
              How rewards work
            </button>
          </div>
          {badges.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Earn your first badge by submitting a missing product to the database.
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
                Leaderboard
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
                My shelf & routine check
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
                <span className="text-sm font-medium text-foreground">Pricing & plans</span>
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
              <span className="text-sm font-medium text-foreground">Share a DIY recipe</span>
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
              <span className="text-sm font-medium text-foreground">Browse DIY recipes</span>
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
                    Submission queue
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
                    Recipe queue
                  </span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground/60" />
                </button>
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
                  Manage subscription on the web
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
              <span className="text-sm font-medium text-foreground">Contact support</span>
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
                Log out
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
        Chimiq · Plan: {plan}
      </p>
    </AppShell>
  );
}
