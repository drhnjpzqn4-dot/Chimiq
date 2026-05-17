import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import {
  Search,
  AlertTriangle,
  Loader2,
  Gift,
  Sparkles,
  Camera,
  ScanLine,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { IngredientScanner } from "@/components/IngredientScanner";
import { BarcodeScanButton } from "@/components/BarcodeScanButton";
import { useUserPlan } from "@/hooks/useUserPlan";
import { useTranslation } from "@/lib/i18n";
import { isNative } from "@/lib/native";
import { apiFetch } from "@/lib/api";

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

interface ProductLookupResult {
  found: boolean;
  productName?: string;
  brand?: string;
  ingredients?: string;
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
  const [, setRecent] = useState<RecentScan[]>(() => readRecent());
  const [showScanner, setShowScanner] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [lookupResult, setLookupResult] = useState<ProductLookupResult | null>(null);
  const [lookupLoading, setLookupLoading] = useState(false);
  const { isPremium, trialEligible, trialDays } = useUserPlan();
  const { t } = useTranslation();

  // true on native (iOS/Android) or browsers with BarcodeDetector (Chrome on Android/desktop-with-camera)
  const canScanBarcode =
    typeof window !== "undefined" && (isNative() || "BarcodeDetector" in window);

  const openScanner = () => {
    setShowScanner(true);
    setTimeout(() => {
      document.getElementById("scanner-input")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
  };

  // Pull the authoritative per-user count from the server. Falls back to
  // the localStorage estimate while loading or for anon users.
  const refreshServerCount = () => {
    apiFetch("/api/stats/scans/today", { credentials: "include" })
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

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const trimmed = searchInput.trim();
      setSearchQuery(trimmed.length >= 2 ? trimmed : "");
      if (trimmed.length < 2) {
        setLookupResult(null);
      }
    }, 350);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    if (!searchQuery) {
      setLookupLoading(false);
      return;
    }
    let cancelled = false;
    setLookupLoading(true);
    apiFetch(`/api/product-lookup?q=${encodeURIComponent(searchQuery)}`, {
      credentials: "include",
    })
      .then(async (res) => {
        if (!res.ok) return { found: false };
        return (await res.json()) as ProductLookupResult;
      })
      .then((data) => {
        if (!cancelled) setLookupResult(data);
      })
      .catch(() => {
        if (!cancelled) setLookupResult({ found: false });
      })
      .finally(() => {
        if (!cancelled) setLookupLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [searchQuery]);

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
    apiFetch("/api/contribute/stats", { credentials: "include" })
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

    apiFetch(`/api/barcode/${encodeURIComponent(parsed.barcode)}`, {
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
      <div className="-mx-4 space-y-5 px-4 pb-6 sm:space-y-6" style={{ backgroundColor: "var(--cream)" }}>
      {/* SCAN PRODUCT — V11 choice cards (scan vs database) */}
      <section className="mb-6 animate-pop-in">
        <div className="mb-2 flex items-center justify-between">
          <p
            className="text-[11px] font-bold uppercase"
            style={{ letterSpacing: "0.08em", color: "#5E544C" }}
          >
            {t("scan.heading")}
          </p>
          {isPremium ? (
            <span
              className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white shadow-sm"
              style={{ backgroundColor: "#D29A55" }}
            >
              <Sparkles className="h-3 w-3" />
              {t("scan.premiumBadge")}
            </span>
          ) : (
            <button
              type="button"
              // When the free daily cap is hit, jump straight to the
              // pricing/checkout surface instead of profile so the trial
              // promise is one tap away. Under-limit chips still link to
              // profile (where users manage everything else).
              onClick={() => navigate(overLimit ? "/pricing" : "/app/profile")}
              data-touch-target
              className={`inline-flex min-h-[24px] items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-semibold transition-colors ${
                overLimit ? "" : "bg-muted/60 text-muted-foreground hover:bg-muted"
              }`}
              style={
                overLimit
                  ? { backgroundColor: "#FCE4E0", color: "#8C2A1A" }
                  : undefined
              }
              aria-label={t("scan.freeScansAriaFmt", { used: scansToday, total: FREE_DAILY_LIMIT })}
            >
              {overLimit
                ? trialEligible
                  ? t("scan.dailyLimitStartTrial", { days: trialDays })
                  : t("scan.dailyLimitGoPremium")
                : t("scan.freeScansLeftFmt", { remaining, total: FREE_DAILY_LIMIT })}
            </button>
          )}
        </div>

        <div
          className="mx-auto flex w-full max-w-md flex-col"
          style={{ gap: 12 }}
        >
          <div className="rounded-[20px] border border-[var(--line)] bg-white p-3 shadow-sm">
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <input
                type="text"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder={t("scan.searchPlaceholder")}
                data-touch-target
                className="h-12 w-full rounded-2xl border border-border/50 bg-[var(--cream)] pl-10 pr-14 text-[15px] font-medium text-foreground placeholder:text-muted-foreground focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
              {lookupLoading ? (
                <Loader2 className="absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
              ) : canScanBarcode ? (
                <BarcodeScanButton
                  onResult={handleScannedFromCard}
                  triggerClassName="absolute right-1.5 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-xl bg-primary text-white transition-opacity hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--sage)_40%,transparent)]"
                  triggerContent={<ScanLine className="h-4 w-4" aria-hidden />}
                />
              ) : null}
            </div>

            {lookupResult?.found && lookupResult.ingredients && (
              <button
                type="button"
                onClick={() => {
                  const name = [lookupResult.brand, lookupResult.productName].filter(Boolean).join(" ");
                  handleScannedFromCard(lookupResult.ingredients!, name || lookupResult.productName || searchQuery);
                }}
                className="mt-3 flex w-full items-center gap-3 rounded-2xl border border-primary/20 bg-primary/5 px-3 py-3 text-left transition-colors hover:bg-primary/10"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                  <Search className="h-4 w-4 text-primary" aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-foreground">
                    {lookupResult.productName}
                  </span>
                  {lookupResult.brand && (
                    <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                      {lookupResult.brand}
                    </span>
                  )}
                </span>
              </button>
            )}

            {searchQuery && lookupResult && !lookupResult.found && !lookupLoading && (
              <p className="mt-2 px-1 text-xs text-muted-foreground">{t("myShelf.productNotFound")}</p>
            )}
          </div>

          <button
            type="button"
            onClick={openScanner}
            data-touch-target
            className="inline-flex min-h-[44px] w-fit items-center gap-2 rounded-full px-3 text-sm font-semibold text-primary transition-colors hover:bg-primary/10"
          >
            <Camera className="h-4 w-4" aria-hidden />
            {t("scan.photoIngredients")}
          </button>
        </div>
      </section>

      {/* Seed banner: a Browse-tapped product is auto-loading */}
      {(seedLoading || seedErrorKey) && (
        <div
          className="mb-3 flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm"
          style={{ borderColor: "var(--line)", backgroundColor: "#FFFFFF" }}
        >
          {seedLoading ? (
            <Loader2 className="h-4 w-4 shrink-0 animate-spin" style={{ color: "#5E544C" }} />
          ) : (
            <AlertTriangle className="h-4 w-4 shrink-0" style={{ color: "#8A6217" }} />
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

      {/* GET STARTED section removed — browse/discover live in the bottom tab bar */}

      {/* Scans-today summary — sits next to the gamification chip so free
          users always see how many scans they've done today and what the
          daily cap is. Hidden for premium (unlimited). */}
      {!isPremium && (
        <div
          className="mb-2 flex items-center justify-between text-[12px] text-muted-foreground"
          aria-live="polite"
        >
          <span>
            <span className="font-semibold" style={{ color: "var(--ink)" }}>
              {scansToday === 1
                ? t("scan.scansTodayOneFmt", { count: scansToday })
                : t("scan.scansTodayManyFmt", { count: scansToday })}
            </span>
            <span> · {t("scan.freeScansPerDayFmt", { total: FREE_DAILY_LIMIT })}</span>
          </span>
          {overLimit ? (
            <span className="font-semibold" style={{ color: "#8A6217" }}>
              {t("scan.limitReached")}
            </span>
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
          className="mb-6 flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left shadow-sm transition-opacity hover:opacity-95"
          style={{ backgroundColor: "#F4D8A2" }}
        >
          <span
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white"
            style={{ backgroundColor: "#D29A55" }}
          >
            <Gift className="h-4 w-4" />
          </span>
          <span className="min-w-0 flex-1">
            <span
              className="block text-[11px] font-bold uppercase tracking-[0.14em]"
              style={{ color: "#D29A55" }}
            >
              {t("scan.earnFreeMonth")}
            </span>
            <span className="block text-sm font-medium text-foreground">
              {t("scan.contributionsProgressFmt", { current: milestoneProgress.inCycle, total: MILESTONE })}{" "}
              <span className="text-muted-foreground">
                {t("scan.toGoFmt", { remaining: milestoneProgress.remaining })}
              </span>
            </span>
            <span className="mt-1.5 block h-1.5 w-full overflow-hidden rounded-full bg-white/50">
              <span
                className="block h-full rounded-full transition-all duration-500"
                style={{ width: `${milestoneProgress.pct}%`, backgroundColor: "#D29A55" }}
              />
            </span>
          </span>
        </button>
      )}

      {/* RESULTS / SCANNER ENGINE — shown after a card is tapped or a barcode is scanned */}
      {(showScanner || seed !== null) && (
        <section
          id="scanner-input"
          className="rounded-3xl border border-border/40 bg-white p-4 shadow-sm sm:p-6"
        >
          <IngredientScanner
            seed={seed}
            scanVisualStyle
            onSeedConsumed={() => {
              // Clear the seed once IngredientScanner has applied it, but keep
              // showScanner=true so the user can do another manual lookup without
              // having to tap the card again.
              setSeed(null);
            }}
          />
        </section>
      )}

      </div>
    </AppShell>
  );
}
