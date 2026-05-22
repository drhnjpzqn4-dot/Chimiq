import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useGetShelf, getGetShelfQueryKey } from "@workspace/api-client-react";
import { ChevronRight } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import BatchRecallBanner from "@/components/BatchRecallBanner";
import { ProductDetailSheet, type ProductDetailProduct } from "@/components/ProductDetailSheet";
import { StatusBadge } from "@/components/StatusBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTranslation } from "@/lib/i18n";
import { PREMIUM_CONTRIBUTION_MILESTONE } from "@/pages/app/Shelf";
import { apiFetch } from "@/lib/api";
import { toStatusLevel } from "@/lib/status";

void [
  Link,
  ChevronRight,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
];

interface ContributeStats {
  acceptedContributions: number;
  premiumUntil: string | null;
}

const RECENT_SCANS_KEY = "skinscreen.recentScans";
const MAX_RECENT_HOME = 10;

interface RecentScanRow {
  name: string;
  verdict: "safe" | "warning" | "high";
  at: number;
  product?: ProductDetailProduct;
}

function readRecentScans(): RecentScanRow[] {
  try {
    const raw = localStorage.getItem(RECENT_SCANS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (r): r is RecentScanRow =>
          typeof r === "object" &&
          r !== null &&
          typeof (r as RecentScanRow).name === "string" &&
          typeof (r as RecentScanRow).at === "number" &&
          (r as RecentScanRow).verdict !== undefined,
      )
      .slice(0, MAX_RECENT_HOME);
  } catch {
    return [];
  }
}

export default function HomeScreen() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const displayName = user?.firstName ?? user?.email?.split("@")[0] ?? null;
  const [stats, setStats] = useState<ContributeStats | null>(null);
  const [recent, setRecent] = useState<RecentScanRow[]>(() => readRecentScans());
  const [detailProduct, setDetailProduct] = useState<ProductDetailProduct | null>(null);
  const [notes, setNotes] = useState<Array<{ id: string; productName?: string; text: string; date: string }>>(() => {
    try {
      return JSON.parse(localStorage.getItem("chimiq.diary") ?? "[]") as Array<{
        id: string;
        productName?: string;
        text: string;
        date: string;
      }>;
    } catch {
      return [];
    }
  });

  const shelfQuery = useGetShelf({
    query: { queryKey: getGetShelfQueryKey(), enabled: Boolean(user) },
  });

  useEffect(() => {
    apiFetch("/api/contribute/stats", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setStats(d as ContributeStats))
      .catch(() => {});
  }, []);

  const milestone = PREMIUM_CONTRIBUTION_MILESTONE;
  const contributed = stats?.acceptedContributions ?? 0;
  const progressInCycle =
    contributed > 0 && contributed % milestone === 0 ? milestone : contributed % milestone;
  const progressPct = useMemo(
    () => Math.min(100, Math.round((progressInCycle / milestone) * 100)),
    [progressInCycle, milestone],
  );

  const shelfProducts = shelfQuery.data?.products ?? [];

  useEffect(() => {
    function refreshRecent() {
      setRecent(readRecentScans());
    }
    refreshRecent();
    window.addEventListener("storage", refreshRecent);
    window.addEventListener("focus", refreshRecent);
    const onScanDone = () => refreshRecent();
    window.addEventListener("skinscreen:scan-completed", onScanDone as EventListener);
    return () => {
      window.removeEventListener("storage", refreshRecent);
      window.removeEventListener("focus", refreshRecent);
      window.removeEventListener("skinscreen:scan-completed", onScanDone as EventListener);
    };
  }, []);

  void setNotes;

  return (
    <AppShell
      pageLabel={t("tabs.today")}
      title={displayName ? t("home.greeting", { name: displayName }) : undefined}
      subtitle={t("home.subtitle")}
    >
      <div
        className="space-y-6 p-4 sm:p-5"
        style={{ backgroundColor: "var(--cream)" }}
        data-home-shelf-count={shelfProducts.length}
        data-home-contrib-pct={progressPct}
        data-home-stats={stats?.acceptedContributions ?? ""}
      >
        {/* SEKTION 0 — EU Safety Gate (recalls) — visar coming-soon-state
            tills pollern fyllt `recalls`-tabellen, sedan aktuella varningar.
            Synlig högt upp eftersom säkerhet är core value-prop. */}
        <BatchRecallBanner />

        {/* SEKTION 1 — Senast skannat */}
        {recent.length > 0 && (
          <section className="animate-pop-in">
            <p
              className="mb-2 text-[11px] font-bold uppercase tracking-widest"
              style={{ color: "var(--ink-soft)" }}
            >
              {t("home.recentScans")}
            </p>
            <div className="-mx-1 flex gap-2.5 overflow-x-auto px-1 pb-1">
              {recent.map((r) => (
                <button
                  key={`${r.name}-${r.at}`}
                  type="button"
                  data-touch-target
                  onClick={() => {
                    if (r.product) setDetailProduct(r.product);
                  }}
                  disabled={!r.product}
                  className="w-[130px] shrink-0 rounded-2xl border border-border/40 bg-white p-2.5 text-left shadow-sm transition-opacity active:opacity-70 disabled:cursor-default"
                >
                  <div className="text-[22px] leading-none" aria-hidden>
                    🧴
                  </div>
                  <p className="mt-1 line-clamp-2 text-[12px] font-semibold leading-snug text-foreground">
                    {r.name}
                  </p>
                  <StatusBadge status={toStatusLevel(r.verdict)} className="mt-1" />
                </button>
              ))}
            </div>
          </section>
        )}

        {/* SEKTION 2 — Sparade produkter */}
        <section>
          <p
            className="mb-2 text-[11px] font-bold uppercase tracking-widest"
            style={{ color: "var(--ink-soft)" }}
          >
            {t("home.savedProducts")}
          </p>
          {shelfProducts.length > 0 ? (
            <div className="overflow-hidden rounded-2xl border border-border/40 bg-white">
              {shelfProducts.slice(0, 5).map((product) => {
                const name = product.productName ?? t("shelf.unknownProduct");
                const detailProduct: ProductDetailProduct = {
                  shelfId: product.id,
                  product_name: name,
                  productName: name,
                  ingredients: product.ingredients,
                  image_url: product.imageUrl ?? null,
                  imageUrl: product.imageUrl ?? null,
                  analysisResultJson:
                    product.analysisResultJson as ProductDetailProduct["analysisResultJson"],
                };
                const brand = (product as { brand?: string | null }).brand ?? null;

                return (
                  <button
                    key={product.id}
                    type="button"
                    data-touch-target
                    onClick={() => setDetailProduct(detailProduct)}
                    className="flex w-full items-center gap-3 border-b border-border/30 px-4 py-3 text-left transition-colors last:border-b-0 hover:bg-[var(--cream)]"
                  >
                    <span className="text-xl leading-none" aria-hidden>
                      🧴
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-semibold" style={{ color: "var(--ink)" }}>
                        {name}
                      </span>
                      {brand && (
                        <span className="block truncate text-[11px]" style={{ color: "var(--ink-soft)" }}>
                          {brand}
                        </span>
                      )}
                    </span>
                  </button>
                );
              })}
              {shelfProducts.length > 5 && (
                <div className="px-4 py-2.5 text-center">
                  <span className="text-xs font-semibold" style={{ color: "var(--sage)" }}>
                    +{shelfProducts.length - 5} {t("home.moreProducts")}
                  </span>
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-2xl border-2 border-dashed border-border/50 bg-white/90 px-4 py-8 text-center">
              <p className="text-sm font-medium text-foreground">{t("home.savedProductsEmpty")}</p>
              <p className="mt-2 text-xs leading-relaxed" style={{ color: "var(--ink-soft)" }}>
                {t("home.savedProductsHint")}
              </p>
            </div>
          )}
        </section>

        {/* SEKTION 3 — Dagbok */}
        <section>
          <div className="mb-2 flex items-baseline justify-between gap-3">
            <p className="text-[11px] font-bold uppercase tracking-widest" style={{ color: "var(--ink-soft)" }}>
              {t("home.diary")}
            </p>
            <button
              type="button"
              data-touch-target
              className="shrink-0 text-[13px] font-semibold transition-opacity hover:opacity-80"
              style={{ color: "var(--sage-deep)" }}
              onClick={() => {
                /* Sprint 5: placeholder — diary editor routing later */
              }}
            >
              + {t("home.diaryAddNote")}
            </button>
          </div>
          {notes.length === 0 ? (
            <div className="rounded-2xl border-2 border-dashed border-border/50 bg-white/90 px-4 py-8 text-center">
              <p className="text-sm leading-relaxed" style={{ color: "var(--ink-soft)" }}>
                {t("home.diaryEmpty")}
              </p>
            </div>
          ) : (
            <ul className="space-y-2">
              {notes.map((n) => (
                <li
                  key={n.id}
                  className="flex gap-3 rounded-2xl border border-border/40 bg-white p-3.5 shadow-sm"
                >
                  <span className="shrink-0 text-xl leading-none" aria-hidden>
                    {n.productName ? "🧴" : "📝"}
                  </span>
                  <div className="min-w-0 flex-1 text-left">
                    {n.productName ? (
                      <p className="text-[11px] font-medium" style={{ color: "var(--ink-soft)" }}>
                        {n.productName}
                      </p>
                    ) : null}
                    <p className="text-[13px] font-semibold leading-snug text-foreground">{n.text}</p>
                    <p className="mt-1 text-xs leading-relaxed" style={{ color: "var(--ink-soft)" }}>
                      {n.date}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* SEKTION 4 — DIY-recept coming soon */}
        <section>
          <p
            className="mb-2 text-[11px] font-bold uppercase tracking-widest"
            style={{ color: "var(--ink-soft)" }}
          >
            {t("home.diyRecipes")}
          </p>
          <div
            className="rounded-2xl border-2 border-dashed border-[var(--line)] px-4 py-6 text-left"
            style={{ backgroundColor: "var(--rose-soft)" }}
          >
            <p className="text-sm font-semibold text-foreground">{t("home.diyComingSoon")}</p>
            <p className="mt-1.5 text-xs leading-relaxed" style={{ color: "var(--ink-soft)" }}>
              {t("home.diyComingSoonHint")}
            </p>
          </div>
        </section>

        {detailProduct && (
          <ProductDetailSheet
            product={detailProduct}
            onClose={() => setDetailProduct(null)}
          />
        )}
      </div>
    </AppShell>
  );
}
