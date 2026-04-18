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
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { useUserPlan } from "@/hooks/useUserPlan";
import { getBaseUrl } from "@/lib/base-url";

interface ContributeStats {
  acceptedContributions: number;
  premiumUntil: string | null;
}

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const { plan, isPremium, isLoading } = useUserPlan();
  const [, navigate] = useLocation();
  const [stats, setStats] = useState<ContributeStats | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);

  useEffect(() => {
    fetch("/api/contribute/stats", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setStats(d as ContributeStats))
      .catch(() => {});
  }, []);

  const handleManageBilling = async () => {
    setPortalLoading(true);
    try {
      const res = await fetch(`${getBaseUrl()}api/payments/portal`, {
        method: "POST",
        credentials: "include",
      });
      const data = (await res.json()) as { url?: string };
      if (data.url) window.location.href = data.url;
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
    <AppShell title="Profile" subtitle="Your account, plan, and contributions.">
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
                    <ShieldCheck className="h-5 w-5 text-primary" />
                    Free
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

      {/* Settings list */}
      <section className="mb-6">
        <ul className="divide-y divide-border/40 overflow-hidden rounded-3xl border border-border/40 bg-white shadow-sm">
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

      <p className="text-center text-[10px] uppercase tracking-widest text-muted-foreground/40">
        ChimIQ · Plan: {plan}
      </p>
    </AppShell>
  );
}
