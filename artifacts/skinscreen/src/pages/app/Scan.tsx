import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import {
  Camera,
  PackageSearch,
  PackagePlus,
  AlertTriangle,
  Loader2,
  Gift,
  Sparkles,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { IngredientScanner } from "@/components/IngredientScanner";
import { ContributeModal } from "@/components/ContributeModal";
import { useUserPlan } from "@/hooks/useUserPlan";

interface PendingScan {
  barcode: string;
  productName?: string;
}

interface ContributeStats {
  acceptedContributions: number;
  premiumUntil: string | null;
}

const PENDING_KEY = "skinscreen.pendingScan";
const MILESTONE = 30;
const FREE_DAILY_LIMIT = 12;
const SCAN_COUNT_KEY_PREFIX = "skinscreen.scans.";

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

export default function ScanScreen() {
  const [, navigate] = useLocation();
  const [showContribute, setShowContribute] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [seed, setSeed] = useState<{ mode: "single"; ingredients: string; autoRun: true } | null>(
    null,
  );
  const [seedLoading, setSeedLoading] = useState(false);
  const [seedError, setSeedError] = useState<string | null>(null);
  const [seedProductName, setSeedProductName] = useState<string | null>(null);
  const [stats, setStats] = useState<ContributeStats | null>(null);
  const [scansToday, setScansToday] = useState<number>(() => readScanCount());
  const { isPremium } = useUserPlan();

  // Listen for scan completions emitted by IngredientScanner and bump the
  // local daily counter. Stored in localStorage with a date-stamped key so it
  // resets at midnight (user-local). Backend per-user enforcement is tracked
  // separately as follow-up #65.
  useEffect(() => {
    const onScan = () => {
      const next = readScanCount() + 1;
      writeScanCount(next);
      setScansToday(next);
    };
    window.addEventListener("skinscreen:scan-completed", onScan);
    return () => window.removeEventListener("skinscreen:scan-completed", onScan);
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
    setSeedError(null);
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
              autoRun: true,
            });
            // Smooth-scroll to results once the seed is applied.
            setTimeout(() => {
              document
                .getElementById("scanner-input")
                ?.scrollIntoView({ behavior: "smooth", block: "start" });
            }, 50);
          } else {
            setSeedError("This product's ingredient list isn't available right now.");
          }
        },
      )
      .catch(() => setSeedError("Could not load that product. Try again."))
      .finally(() => setSeedLoading(false));
  }, []);

  const milestoneProgress = useMemo(() => {
    const c = stats?.acceptedContributions ?? 0;
    const inCycle = c > 0 && c % MILESTONE === 0 ? MILESTONE : c % MILESTONE;
    const pct = Math.min(100, Math.round((inCycle / MILESTONE) * 100));
    return { count: c, inCycle, pct, remaining: MILESTONE - inCycle };
  }, [stats]);

  const tapToScan = () => {
    setScanning(true);
    setTimeout(() => {
      setScanning(false);
      document
        .getElementById("scanner-input")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 280);
  };

  const chips = [
    {
      label: "Common problems",
      icon: AlertTriangle,
      onClick: () => navigate("/app/problems"),
    },
    {
      label: "Browse products",
      icon: PackageSearch,
      onClick: () => navigate("/app/browse"),
    },
    {
      label: "Add a product",
      icon: PackagePlus,
      onClick: () => setShowContribute(true),
    },
  ];

  const remaining = Math.max(0, FREE_DAILY_LIMIT - scansToday);
  const overLimit = !isPremium && scansToday >= FREE_DAILY_LIMIT;

  return (
    <AppShell
      title="Scan a product"
      subtitle="Snap a label, paste ingredients, or compare two products."
    >
      {/* Hero scan card */}
      <section className="mb-4 animate-pop-in">
        <div className="relative overflow-hidden rounded-3xl border border-primary/15 bg-gradient-to-br from-primary/[0.07] via-white to-rose-50/40 p-5 shadow-sm">
          <div
            className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-primary/15 blur-3xl"
            aria-hidden
          />
          {/* Plan / scans-today pill — visible above the fold */}
          <div className="relative mb-3 flex justify-end">
            {isPremium ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-primary to-amber-400 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-white shadow-sm">
                <Sparkles className="h-3 w-3" />
                Premium
              </span>
            ) : (
              <button
                type="button"
                onClick={() => navigate("/app/profile")}
                data-touch-target
                className={`inline-flex min-h-[28px] items-center gap-1 rounded-full px-3 py-1 text-[11px] font-semibold transition-colors ${
                  overLimit
                    ? "bg-amber-100 text-amber-900 hover:bg-amber-200"
                    : "bg-white/80 text-foreground hover:bg-white"
                }`}
                aria-label={`${scansToday} of ${FREE_DAILY_LIMIT} free scans used today`}
              >
                {overLimit
                  ? `Daily free limit reached · Go Premium`
                  : `${scansToday} / ${FREE_DAILY_LIMIT} free scans today · ${remaining} left`}
              </button>
            )}
          </div>

          <div className="relative flex items-start gap-4">
            <button
              type="button"
              onClick={tapToScan}
              data-touch-target
              className="group relative flex h-20 w-20 shrink-0 items-center justify-center rounded-3xl bg-primary text-white shadow-lg shadow-primary/25 transition-transform active:scale-95"
              aria-label="Start scanning"
            >
              <span
                className="absolute inset-0 rounded-3xl bg-primary animate-ring-pulse"
                aria-hidden
              />
              <Camera
                className={`relative h-8 w-8 ${scanning ? "animate-tap-bounce" : ""}`}
              />
            </button>
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-widest text-primary">
                Tap to scan
              </p>
              <p className="mt-0.5 font-serif text-xl font-semibold leading-tight text-foreground">
                Quick scan a label
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Get safety flags + safer alternatives in seconds.
              </p>
              <button
                type="button"
                onClick={() =>
                  document
                    .getElementById("scanner-input")
                    ?.scrollIntoView({ behavior: "smooth", block: "start" })
                }
                className="mt-1.5 inline-flex items-center text-xs font-semibold text-primary underline-offset-2 hover:underline"
              >
                Or paste ingredients →
              </button>
            </div>
          </div>

          <div className="relative mt-5 grid grid-cols-3 gap-2">
            {chips.map((q) => (
              <button
                key={q.label}
                type="button"
                onClick={q.onClick}
                data-touch-target
                className="flex min-h-[64px] flex-col items-center justify-center gap-1 rounded-2xl border border-border/50 bg-white/85 px-2 py-2.5 text-[11px] font-medium leading-tight text-foreground transition-all hover:border-primary/40 hover:bg-white"
              >
                <q.icon className="h-4 w-4 text-primary" />
                <span className="text-center">{q.label}</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Gamification chip */}
      {stats !== null && (
        <button
          type="button"
          onClick={() => navigate("/app/profile")}
          data-touch-target
          className="mb-4 flex w-full items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50/70 px-4 py-3 text-left transition-colors hover:bg-amber-50"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-600">
            <Gift className="h-4 w-4" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[11px] font-bold uppercase tracking-widest text-amber-700">
              Earn 1 free month
            </span>
            <span className="block text-sm font-medium text-foreground">
              {milestoneProgress.inCycle} of {MILESTONE} contributions —{" "}
              <span className="text-muted-foreground">
                {milestoneProgress.remaining} to go
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

      {/* Seed banner: a Browse-tapped product is auto-loading */}
      {(seedLoading || seedError) && (
        <div className="mb-3 flex items-center gap-3 rounded-2xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm">
          {seedLoading ? (
            <Loader2 className="h-4 w-4 shrink-0 animate-spin text-primary" />
          ) : (
            <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" />
          )}
          <span className="min-w-0 flex-1">
            {seedLoading
              ? `Loading ${seedProductName ?? "product"}…`
              : seedError}
          </span>
        </div>
      )}

      <section
        id="scanner-input"
        className="rounded-3xl border border-border/40 bg-white p-4 shadow-sm sm:p-6"
      >
        <IngredientScanner seed={seed} />
      </section>

      {showContribute && (
        <ContributeModal onClose={() => setShowContribute(false)} />
      )}
    </AppShell>
  );
}
