import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import {
  Camera,
  Search,
  ChevronRight,
  AlertTriangle,
  Loader2,
  Gift,
  Sparkles,
  Compass,
  PackageSearch,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { IngredientScanner } from "@/components/IngredientScanner";
import { BarcodeScanButton } from "@/components/BarcodeScanButton";
import { useUserPlan } from "@/hooks/useUserPlan";
import { useTranslation } from "@/lib/i18n";

interface PendingScan {
  barcode: string;
  productName?: string;
}

interface ContributeStats {
  acceptedContributions: number;
  premiumUntil: string | null;
}

interface RecentScan {
  name: string;
  verdict: "safe" | "warning" | "high";
  at: number; // ms epoch
}

const PENDING_KEY = "skinscreen.pendingScan";
const MILESTONE = 30;
const FREE_DAILY_LIMIT = 12;
const SCAN_COUNT_KEY_PREFIX = "skinscreen.scans.";
const RECENT_SCANS_KEY = "skinscreen.recentScans";
const MAX_RECENT = 4;

function todayKey(): string {
  return SCAN_COUNT_KEY_PREFIX + new Date().toISOString().slice(0, 10);
}

function readScanCount(): number {
  try {
    const v = localStorage.getItem(todayKey());
    const n = v ? Number.parseInt(v, 10) : 0;
    return Number.isFinite(n) && n >= 0 ? n : 0;
  } catch {
    return 0;
  }
}

function writeScanCount(n: number) {
  try {
    localStorage.setItem(todayKey(), String(n));
  } catch {
    // ignore quota / private mode
  }
}

function readRecent(): RecentScan[] {
  try {
    const raw = localStorage.getItem(RECENT_SCANS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (r): r is RecentScan =>
          typeof r === "object" &&
          r !== null &&
          typeof (r as RecentScan).name === "string" &&
          typeof (r as RecentScan).at === "number" &&
          (r as RecentScan).verdict !== undefined,
      )
      .slice(0, MAX_RECENT);
  } catch {
    return [];
  }
}

function relativeWhen(
  at: number,
  t: (key: string, vars?: Record<string, string | number>) => string,
  locale: string,
): string {
  const diffMs = Date.now() - at;
  const diffMin = Math.round(diffMs / 60000);
  if (diffMin < 1) return t("scan.justNow");
  if (diffMin < 60) return t("scan.minAgoFmt", { n: diffMin });
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return diffHr === 1 ? t("scan.hourAgoOne") : t("scan.hoursAgoFmt", { n: diffHr });
  const d = new Date(at);
  const today = new Date();
  if (
    d.getFullYear() === today.getFullYear() &&
    d.getMonth() === today.getMonth() &&
    d.getDate() === today.getDate()
  ) {
    return t("scan.todayLabel");
  }
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (
    d.getFullYear() === yesterday.getFullYear() &&
    d.getMonth() === yesterday.getMonth() &&
    d.getDate() === yesterday.getDate()
  ) {
    return t("scan.yesterdayLabel");
  }
  return d.toLocaleDateString(locale, { weekday: "short" });
}

export default function ScanScreen() {
  const [, navigate] = useLocation();
  const [seed, setSeed] = useState<
    { mode: "single"; ingredients: string; productName?: string; autoRun: true } | null
  >(null);
  const [seedLoading, setSeedLoading] = useState(false);
  const [seedErrorKey, setSeedErrorKey] = useState<string | null>(null);
  const [seedProductName, setSeedProductName] = useState<string | null>(null);
  const [stats, setStats] = useState<ContributeStats | null>(null);
  const [scansToday, setScansToday] = useState<number>(() => readScanCount());
  const [recent, setRecent] = useState<RecentScan[]>(() => readRecent());
  const { isPremium } = useUserPlan();
  const { t, locale } = useTranslation();

  // Pull the authoritative per-user count from the server. Falls back to
  // the localStorage estimate while loading or for anon users.
  const refreshServerCount = () => {
    fetch("/api/stats/scans/today", { credentials: "include" })
      .then((r) => r.json())
      .then(
        (d: {
          authenticated: boolean;
          count: number | null;
        }) => {
          if (d.authenticated && typeof d.count === "number") {
            setScansToday(d.count);
            writeScanCount(d.count);
          }
        },
      )
      .catch(() => {});
  };

  useEffect(() => {
    refreshServerCount();
  }, []);

  // Listen for scan completions emitted by IngredientScanner: bump daily
  // counter and capture the recent scan for the lookup-home recents list.
  useEffect(() => {
    const onScan = (e: Event) => {
      const next = readScanCount() + 1;
      writeScanCount(next);
      setScansToday(next);
      // Reconcile with server count after the scan finishes. The endpoint
      // returns authoritative data for signed-in users and a no-op shape
      // for anon users, so it's always safe to call.
      refreshServerCount();

      const detail = (e as CustomEvent).detail as
        | { productName?: string; verdict?: "safe" | "warning" | "high" }
        | undefined;
      if (detail?.productName) {
        const entry: RecentScan = {
          name: detail.productName,
          verdict: detail.verdict ?? "safe",
          at: Date.now(),
        };
        setRecent((prev) => {
          const deduped = prev.filter(
            (r) => r.name.toLowerCase() !== entry.name.toLowerCase(),
          );
          const updated = [entry, ...deduped].slice(0, MAX_RECENT);
          try {
            localStorage.setItem(RECENT_SCANS_KEY, JSON.stringify(updated));
          } catch {
            // ignore quota errors
          }
          return updated;
        });
      }
    };
    window.addEventListener("skinscreen:scan-completed", onScan as EventListener);
    return () =>
      window.removeEventListener("skinscreen:scan-completed", onScan as EventListener);
  }, []);

  useEffect(() => {
    fetch("/api/contribute/stats", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setStats(d as ContributeStats))
      .catch(() => {});
  }, []);

  // Pick up "scan this product" payload set by the Browse screen.
  useEffect(() => {
    let raw: string | null = null;
    try {
      raw = sessionStorage.getItem(PENDING_KEY);
    } catch {
      return;
    }
    if (!raw) return;
    try {
      sessionStorage.removeItem(PENDING_KEY);
    } catch {
      // ignore
    }

    let parsed: PendingScan;
    try {
      parsed = JSON.parse(raw) as PendingScan;
    } catch {
      return;
    }
    if (!parsed.barcode) return;

    setSeedLoading(true);
    setSeedErrorKey(null);
    setSeedProductName(parsed.productName ?? null);

    fetch(`/api/barcode/${encodeURIComponent(parsed.barcode)}`, {
      credentials: "include",
    })
      .then((r) => r.json())
      .then(
        (data: {
          found?: boolean;
          ingredients?: string;
          productName?: string;
          brand?: string;
        }) => {
          if (data.found && data.ingredients) {
            const name =
              parsed.productName ??
              [data.brand, data.productName].filter(Boolean).join(" ");
            setSeedProductName(name || null);
            setSeed({
              mode: "single",
              ingredients: data.ingredients,
              productName: name || undefined,
              autoRun: true,
            });
            setTimeout(() => {
              document
                .getElementById("scanner-input")
                ?.scrollIntoView({ behavior: "smooth", block: "start" });
            }, 50);
          } else {
            setSeedErrorKey("scan.errIngredientsUnavail");
          }
        },
      )
      .catch(() => setSeedErrorKey("scan.errLoadFailed"))
      .finally(() => setSeedLoading(false));
  }, []);

  const milestoneProgress = useMemo(() => {
    const c = stats?.acceptedContributions ?? 0;
    const inCycle = c > 0 && c % MILESTONE === 0 ? MILESTONE : c % MILESTONE;
    const pct = Math.min(100, Math.round((inCycle / MILESTONE) * 100));
    return { count: c, inCycle, pct, remaining: MILESTONE - inCycle };
  }, [stats]);

  const remaining = Math.max(0, FREE_DAILY_LIMIT - scansToday);
  const overLimit = !isPremium && scansToday >= FREE_DAILY_LIMIT;

  const handleScannedFromCard = (ings: string, name: string) => {
    setSeed({
      mode: "single",
      ingredients: ings,
      productName: name || undefined,
      autoRun: true,
    });
    setSeedProductName(name || null);
    setTimeout(() => {
      document
        .getElementById("scanner-input")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
  };

  return (
    <AppShell title={t("scan.title")} subtitle={t("scan.subtitle")}>
      {/* SCAN PRODUCT — Variant A "morphing search" (camera viewfinder + search) */}
      <section className="mb-6 animate-pop-in">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
            {t("scan.heading")}
          </p>
          {isPremium ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-primary to-amber-400 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white shadow-sm">
              <Sparkles className="h-3 w-3" />
              {t("scan.premiumBadge")}
            </span>
          ) : (
            <button
              type="button"
              onClick={() => navigate("/app/profile")}
              data-touch-target
              className={`inline-flex min-h-[24px] items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-semibold transition-colors ${
                overLimit
                  ? "bg-amber-100 text-amber-900 hover:bg-amber-200"
                  : "bg-muted/60 text-muted-foreground hover:bg-muted"
              }`}
              aria-label={t("scan.freeScansAriaFmt", { used: scansToday, total: FREE_DAILY_LIMIT })}
            >
              {overLimit
                ? t("scan.dailyLimitGoPremium")
                : t("scan.freeScansLeftFmt", { remaining, total: FREE_DAILY_LIMIT })}
            </button>
          )}
        </div>

        <div className="overflow-hidden rounded-2xl border border-border/60 bg-white shadow-sm">
          {/* Camera viewfinder card — tap anywhere to open scanner */}
          <BarcodeScanButton
            onResult={handleScannedFromCard}
            triggerClassName="block w-full focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            triggerContent={
              <div className="relative flex h-[200px] items-center justify-center bg-black">
                {/* Faux viewfinder frame */}
                <div className="relative h-[120px] w-[240px] rounded-xl border-2 border-white/40">
                  <div
                    className="absolute left-0 right-0 top-1/2 h-0.5 bg-primary"
                    style={{
                      boxShadow: "0 0 8px hsl(var(--primary))",
                      animation: "scan 2s ease-in-out infinite",
                    }}
                  />
                </div>
                {/* Hint copy (Variant B) */}
                <div className="absolute bottom-4 left-0 right-0 text-center text-[13px] font-medium text-white/95">
                  {t("scan.viewfinderHint")}
                </div>
                {/* Tap hint top-right */}
                <div className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-white backdrop-blur-sm">
                  <Camera className="h-3 w-3" />
                  {t("scan.tap")}
                </div>
              </div>
            }
          />

          {/* Collapsed text input */}
          <button
            type="button"
            onClick={() => navigate("/app/browse")}
            data-touch-target
            className="flex w-full items-center gap-3 border-t border-border/60 px-4 py-3 text-left transition-colors hover:bg-muted/40"
            aria-label={t("scan.searchByName")}
          >
            <Search className="h-5 w-5 text-muted-foreground" />
            <span className="flex-1 text-[15px] text-muted-foreground">
              {t("scan.orTypeProduct")}
            </span>
            <PackageSearch className="h-5 w-5 text-muted-foreground" />
          </button>
        </div>
      </section>

      {/* Seed banner: a Browse-tapped product is auto-loading */}
      {(seedLoading || seedErrorKey) && (
        <div className="mb-3 flex items-center gap-3 rounded-2xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm">
          {seedLoading ? (
            <Loader2 className="h-4 w-4 shrink-0 animate-spin text-primary" />
          ) : (
            <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" />
          )}
          <span className="min-w-0 flex-1">
            {seedLoading
              ? t("scan.loadingFmt", { name: seedProductName ?? t("scan.productFallback") })
              : seedErrorKey
                ? t(seedErrorKey)
                : null}
          </span>
        </div>
      )}

      {/* RECENT SCANS — only on lookup home (when no analysis is running) */}
      {!seed && recent.length > 0 && (
        <section className="mb-6">
          <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
            {t("scan.recentScans")}
          </p>
          <div className="overflow-hidden rounded-2xl border border-border/60 bg-white shadow-sm">
            {recent.map((r, i) => (
              <div
                key={`${r.name}-${r.at}`}
                className={`flex items-center gap-4 px-4 py-3.5 ${
                  i < recent.length - 1 ? "border-b border-border/60" : ""
                }`}
              >
                <span
                  aria-hidden
                  className={`h-2 w-2 shrink-0 rounded-full ${
                    r.verdict === "safe"
                      ? "bg-green-500"
                      : r.verdict === "high"
                        ? "bg-red-500"
                        : "bg-amber-500"
                  }`}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[15px] font-medium leading-tight text-foreground">
                    {r.name}
                  </p>
                  <p className="mt-0.5 text-[13px] text-muted-foreground">
                    {relativeWhen(r.at, t, locale)}
                  </p>
                </div>
                <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground/60" />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* RECENT SCANS — empty state hint with browse / discover quick links */}
      {!seed && recent.length === 0 && (
        <section className="mb-6">
          <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
            {t("scan.getStarted")}
          </p>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => navigate("/app/browse")}
              data-touch-target
              className="flex flex-col items-start gap-1 rounded-2xl border border-border/60 bg-white p-3.5 text-left shadow-sm transition-colors hover:border-primary/40"
            >
              <PackageSearch className="h-5 w-5 text-primary" />
              <span className="text-[14px] font-semibold text-foreground">
                {t("scan.browseProducts")}
              </span>
              <span className="text-[12px] text-muted-foreground">
                {t("scan.browseHint")}
              </span>
            </button>
            <button
              type="button"
              onClick={() => navigate("/app/discover")}
              data-touch-target
              className="flex flex-col items-start gap-1 rounded-2xl border border-border/60 bg-white p-3.5 text-left shadow-sm transition-colors hover:border-primary/40"
            >
              <Compass className="h-5 w-5 text-primary" />
              <span className="text-[14px] font-semibold text-foreground">
                {t("scan.discoverArticles")}
              </span>
              <span className="text-[12px] text-muted-foreground">
                {t("scan.discoverHint")}
              </span>
            </button>
          </div>
        </section>
      )}

      {/* Scans-today summary — sits next to the gamification chip so free
          users always see how many scans they've done today and what the
          daily cap is. Hidden for premium (unlimited). */}
      {!isPremium && (
        <div
          className="mb-2 flex items-center justify-between text-[12px] text-muted-foreground"
          aria-live="polite"
        >
          <span>
            <span className="font-semibold text-foreground">
              {scansToday === 1
                ? t("scan.scansTodayOneFmt", { count: scansToday })
                : t("scan.scansTodayManyFmt", { count: scansToday })}
            </span>
            <span> · {t("scan.freeScansPerDayFmt", { total: FREE_DAILY_LIMIT })}</span>
          </span>
          {overLimit ? (
            <span className="font-semibold text-amber-700">{t("scan.limitReached")}</span>
          ) : (
            <span>{t("scan.leftFmt", { count: remaining })}</span>
          )}
        </div>
      )}

      {/* Gamification chip */}
      {stats !== null && (
        <button
          type="button"
          onClick={() => navigate("/app/profile")}
          data-touch-target
          className="mb-6 flex w-full items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50/70 px-4 py-3 text-left transition-colors hover:bg-amber-50"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-600">
            <Gift className="h-4 w-4" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[11px] font-bold uppercase tracking-widest text-amber-700">
              {t("scan.earnFreeMonth")}
            </span>
            <span className="block text-sm font-medium text-foreground">
              {t("scan.contributionsProgressFmt", { current: milestoneProgress.inCycle, total: MILESTONE })}{" "}
              <span className="text-muted-foreground">
                {t("scan.toGoFmt", { remaining: milestoneProgress.remaining })}
              </span>
            </span>
            <span className="mt-1.5 block h-1.5 w-full overflow-hidden rounded-full bg-amber-100">
              <span
                className="block h-full rounded-full bg-gradient-to-r from-primary to-amber-400 transition-all duration-500"
                style={{ width: `${milestoneProgress.pct}%` }}
              />
            </span>
          </span>
        </button>
      )}

      {/* RESULTS / SCANNER ENGINE — appears below as you scroll */}
      <section
        id="scanner-input"
        className="rounded-3xl border border-border/40 bg-white p-4 shadow-sm sm:p-6"
      >
        <IngredientScanner
          seed={seed}
          onSeedConsumed={() => {
            // Clear local seed once IngredientScanner has applied it, so the
            // lookup-home Recents / Get Started sections re-appear and the
            // user can do another lookup from the top.
            setSeed(null);
          }}
        />
      </section>

      {/* viewfinder scan-line keyframes — local to this page so we don't
          touch global stylesheets. */}
      <style>{`
        @keyframes scan {
          0%, 100% { transform: translateY(-58px); }
          50% { transform: translateY(58px); }
        }
      `}</style>
    </AppShell>
  );
}
