import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import {
  AlertTriangle,
  Loader2,
  Sparkles,
} from "lucide-react";
import { useAnalyzeSingle } from "@workspace/api-client-react";
import { AppShell } from "@/components/AppShell";
import { ContributeModal } from "@/components/ContributeModal";
import { GamificationBanner } from "@/components/GamificationBanner";
import { ProductDetailSheet, type ProductDetailProduct } from "@/components/ProductDetailSheet";
import { ScanEntry, type ProductResult } from "@/components/ScanEntry";
import { useUserPlan } from "@/hooks/useUserPlan";
import { useTranslation } from "@/lib/i18n";
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
  product?: ProductDetailProduct;
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
  const [seedLoading, setSeedLoading] = useState(false);
  const [seedErrorKey, setSeedErrorKey] = useState<string | null>(null);
  const [seedProductName, setSeedProductName] = useState<string | null>(null);
  const [stats, setStats] = useState<ContributeStats | null>(null);
  const [scansToday, setScansToday] = useState<number>(() => readScanCount());
  const [recent, setRecent] = useState<RecentScan[]>(() => readRecent());
  const [detailProduct, setDetailProduct] = useState<ProductDetailProduct | null>(null);
  const [contributeOpen, setContributeOpen] = useState(false);
  const [contributePrefill, setContributePrefill] = useState<{
    productName?: string;
    brand?: string;
    ingredients?: string;
  } | null>(null);
  const { isPremium, trialEligible, trialDays } = useUserPlan();
  const { t } = useTranslation();
  const analyzeSingle = useAnalyzeSingle({});

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

  // Back-compat: GamificationBanner used to navigate to
  // /app/scan?contribute=true. We now open the modal inline via the
  // banner's onClick, but other surfaces (Profile, etc.) might still link
  // here with the query param, so we honour it.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("contribute") === "true") {
      setContributeOpen(true);
      // Clean the URL so a refresh doesn't keep re-opening the modal.
      params.delete("contribute");
      const search = params.toString();
      const newUrl =
        window.location.pathname + (search ? `?${search}` : "") + window.location.hash;
      window.history.replaceState(null, "", newUrl);
    }
  }, []);

  useEffect(() => {
    refreshServerCount();
  }, []);

  // Listen for scan completions emitted by ScanEntry: bump daily
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
        | {
            productName?: string;
            verdict?: "safe" | "warning" | "high";
            product?: ProductDetailProduct;
            ingredients?: string;
            imageUrl?: string;
            analysis_result_json?: ProductDetailProduct["analysis_result_json"];
          }
        | undefined;
      if (detail?.productName) {
        const entry: RecentScan = {
          name: detail.productName,
          verdict: detail.verdict ?? "safe",
          at: Date.now(),
          product: detail.product ?? {
            product_name: detail.productName,
            productName: detail.productName,
            ingredients: detail.ingredients,
            image_url: detail.imageUrl ?? null,
            imageUrl: detail.imageUrl ?? null,
            analysis_result_json: detail.analysis_result_json ?? null,
          },
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
          imageUrl?: string | null;
        }) => {
          if (data.found && data.ingredients) {
            const ingredients = data.ingredients;
            const name =
              parsed.productName ??
              [data.brand, data.productName].filter(Boolean).join(" ");
            setSeedProductName(name || null);
            analyzeSingle.mutate(
              { data: { ingredients } },
              {
                onSuccess: (analysis) => {
                  const detail: ProductDetailProduct = {
                    product_name: name,
                    productName: name,
                    brand: data.brand,
                    ingredients,
                    image_url: data.imageUrl ?? null,
                    imageUrl: data.imageUrl ?? null,
                    analysis_result_json: analysis,
                  };
                  setDetailProduct(detail);
                  emitScanCompleted({
                    productName: name,
                    ingredients,
                    imageUrl: data.imageUrl ?? null,
                    analysis,
                    product: detail,
                  });
                },
              },
            );
          } else {
            setSeedErrorKey("scan.errIngredientsUnavail");
          }
        },
      )
      .catch(() => setSeedErrorKey("scan.errLoadFailed"))
      .finally(() => setSeedLoading(false));
  }, []);

  const remaining = Math.max(0, FREE_DAILY_LIMIT - scansToday);
  const overLimit = !isPremium && scansToday >= FREE_DAILY_LIMIT;

  // Replaces the analytics + recent-scans event that used to be emitted by
  // the old IngredientScanner. Computes a verdict from the analysis payload,
  // POSTs to /api/scan-events (for server-side counts), and dispatches the
  // browser custom event the Home and Scan recents-listeners already listen
  // for.
  const emitScanCompleted = (args: {
    productName: string;
    ingredients: string;
    imageUrl: string | null;
    analysis: unknown;
    product: ProductDetailProduct;
  }) => {
    if (typeof window === "undefined") return;
    const flagsArr =
      (args.analysis as { flags?: Array<{ severity?: string }> })?.flags ?? [];
    const overallSafe =
      (args.analysis as { overallSafe?: boolean })?.overallSafe ?? false;
    const hasHigh = flagsArr.some((f) => f?.severity === "HIGH_RISK");
    const verdict: "safe" | "warning" | "high" = overallSafe
      ? "safe"
      : hasHigh
        ? "high"
        : "warning";

    apiFetch("/api/scan-events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        productName: args.productName,
        verdict,
        scanMode: "single",
      }),
    }).catch(() => {});

    window.dispatchEvent(
      new CustomEvent("skinscreen:scan-completed", {
        detail: {
          kind: "single",
          productName: args.productName,
          verdict,
          ingredients: args.ingredients,
          imageUrl: args.imageUrl ?? undefined,
          analysis_result_json: args.analysis,
          product: args.product,
        },
      }),
    );
  };

  const handleScanResult = (product: ProductResult) => {
    const name = product.productName ?? product.product_name;
    const imageUrl = product.imageUrl ?? product.image_url ?? null;
    // Propagate barcode so ProductDetailSheet can tell whether the product
    // is in cached_products (real barcode) or a fresh OCR scan (no barcode)
    // — which controls whether the gold "Spara denna produkt"-bidragsknapp
    // is shown.
    const barcode = product.barcode ?? null;

    if (product.analysis_result_json) {
      const detail: ProductDetailProduct = {
        product_name: name,
        productName: name,
        brand: product.brand,
        barcode,
        ingredients: product.ingredients,
        image_url: imageUrl,
        imageUrl,
        analysis_result_json: product.analysis_result_json,
        productType: product.productType,
      };
      setDetailProduct(detail);
      emitScanCompleted({
        productName: name,
        ingredients: product.ingredients ?? "",
        imageUrl,
        analysis: product.analysis_result_json,
        product: detail,
      });
      return;
    }

    const ingredients = product.ingredients ?? "";
    if (!ingredients.trim()) return;

    // Önskat flöde (2026-06-01): öppna produktkortet DIREKT med det inklistrade,
    // UTAN att analysera. Analys är en egen knapp ("Analysera nu") inne i kortet.
    // Tidigare kördes analyzeSingle här först → om den hängde öppnades kortet aldrig
    // (orsaken till "verkar analysera men inget kort kommer upp").
    const detail: ProductDetailProduct = {
      product_name: name,
      productName: name,
      brand: product.brand,
      barcode,
      ingredients,
      image_url: imageUrl,
      imageUrl,
      analysis_result_json: null,
      productType: product.productType,
    };
    setDetailProduct(detail);

    // SS-078: registrera produkten i "Senaste skanningar" redan när kortet
    // öppnas (streckkod / OCR / bidrag) — inte bara när en cachad analys finns.
    // Tidigare dök t.ex. streckkods-skanningar aldrig upp i recents eftersom
    // analysen körs INNE i kortet och detta var den "analyslösa" grenen.
    if (name) {
      setRecent((prev) => {
        const entry: RecentScan = {
          name,
          verdict: "safe", // okänd tills användaren kör "Analysera nu"; ej visad som prick
          at: Date.now(),
          product: detail,
        };
        const deduped = prev.filter(
          (r) => r.name.toLowerCase() !== name.toLowerCase(),
        );
        const updated = [entry, ...deduped].slice(0, MAX_RECENT);
        try {
          localStorage.setItem(RECENT_SCANS_KEY, JSON.stringify(updated));
        } catch {
          // ignore quota / private-mode errors
        }
        return updated;
      });
    }
  };

  return (
    <AppShell pageLabel={t("tabs.scan")} subtitle={t("scan.subtitle")}>
      <div className="-mx-4 space-y-5 px-4 pb-6 sm:space-y-6" style={{ backgroundColor: "var(--cream)" }}>
      {/* SCAN PRODUCT — V11 choice cards (scan vs database) */}
      <section className="mb-6 animate-pop-in">
        <div className="mb-2 flex items-center justify-between">
          <p
            className="text-[11px] font-medium uppercase"
            style={{ letterSpacing: "0.08em", color: "var(--rose-gold)" }}
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

        <ScanEntry mode="all" onResult={handleScanResult} className="mx-auto max-w-md" />
      </section>

      {/* Seed banner: a Browse-tapped product is auto-loading */}
      {(seedLoading || seedErrorKey || analyzeSingle.isPending) && (
        <div
          className="mb-3 flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm"
          style={{ borderColor: "var(--line)", backgroundColor: "#FFFFFF" }}
        >
          {seedLoading || analyzeSingle.isPending ? (
            <Loader2 className="h-4 w-4 shrink-0 animate-spin" style={{ color: "#5E544C" }} />
          ) : (
            <AlertTriangle className="h-4 w-4 shrink-0" style={{ color: "#8A6217" }} />
          )}
          <span className="min-w-0 flex-1">
            {analyzeSingle.isPending
              ? t("scan.analyzing")
              : seedLoading
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

      {recent.length > 0 && (
        <section className="mb-6 space-y-2">
          <h2 className="text-sm font-medium" style={{ color: "var(--rose-gold)" }}>
            {t("scan.recentScans")}
          </h2>
          <div className="grid gap-2">
            {recent.map((entry) => (
              <button
                key={`${entry.name}-${entry.at}`}
                type="button"
                onClick={() =>
                  setDetailProduct(entry.product ?? {
                    product_name: entry.name,
                    productName: entry.name,
                    analysis_result_json: null,
                  })
                }
                className="rounded-2xl border border-[var(--line)] bg-white px-4 py-3 text-left shadow-sm transition-transform hover:-translate-y-0.5"
              >
                <span className="block text-sm font-semibold" style={{ color: "var(--ink)" }}>
                  {entry.name}
                </span>
                <span className="mt-0.5 block text-xs" style={{ color: "var(--ink-soft)" }}>
                  {new Date(entry.at).toLocaleDateString()}
                </span>
              </button>
            ))}
          </div>
        </section>
      )}

      {!isPremium && stats !== null && (
        <GamificationBanner
          contributionsCount={stats.acceptedContributions}
          targetCount={MILESTONE}
          className="mb-6"
          onClick={() => setContributeOpen(true)}
        />
      )}

      {detailProduct && (
        <ProductDetailSheet
          product={detailProduct}
          fromScan
          onClose={() => setDetailProduct(null)}
          onContribute={(prefill) => {
            setContributePrefill(prefill);
            setContributeOpen(true);
            setDetailProduct(null);
          }}
          onImageSaved={(newImageUrl) => {
            // Update the in-memory detail product so the current sheet shows
            // the permanent URL instead of the base64 preview.
            setDetailProduct((prev) =>
              prev ? { ...prev, image_url: newImageUrl, imageUrl: newImageUrl } : prev,
            );
            // Update the matching recent-scans entry in state + localStorage so
            // the image persists the next time the product is opened from the
            // recents list (fixes: image disappears after navigating away).
            const productName =
              (detailProduct.product_name ?? detailProduct.productName ?? "").toLowerCase();
            if (!productName) return;
            setRecent((prev) => {
              const updated = prev.map((entry) => {
                if (entry.name.toLowerCase() !== productName) return entry;
                return {
                  ...entry,
                  product: entry.product
                    ? { ...entry.product, image_url: newImageUrl, imageUrl: newImageUrl }
                    : entry.product,
                };
              });
              try {
                localStorage.setItem(RECENT_SCANS_KEY, JSON.stringify(updated));
              } catch {
                // ignore quota / private-mode errors
              }
              return updated;
            });
          }}
        />
      )}

      {contributeOpen && (
        <ContributeModal
          initialProductName={contributePrefill?.productName}
          initialBrand={contributePrefill?.brand}
          initialIngredients={contributePrefill?.ingredients}
          onClose={() => {
            setContributeOpen(false);
            setContributePrefill(null);
          }}
          // VIKTIGT: onSuccess stänger INTE modalen — ContributeModal har
          // ett internt success-state (CheckCircle + tack-meddelande) som
          // ska visas tills användaren klickar "Klar". Vi refreshar bara
          // contribution stats i bakgrunden så GamificationBanner-räknaren
          // uppdateras när bidraget godkänns av moderation.
          onSuccess={() => {
            apiFetch("/api/contribute/stats", { credentials: "include" })
              .then((r) => r.json())
              .then((d) => setStats(d as ContributeStats))
              .catch(() => {});
          }}
        />
      )}

      </div>
    </AppShell>
  );
}
