import { useEffect, useState } from "react";
import { useLocation, useRoute } from "wouter";
import {
  ArrowLeft,
  ScanLine,
  Check,
  Sparkles,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { useTranslation } from "@/lib/i18n";
import { apiFetch } from "@/lib/api";

interface ProductDetail {
  barcode: string;
  productName: string;
  brand: string;
  imageUrl: string | null;
  ingredients: string;
  cachedAt: string;
  category: string;
  verifiedSafe: boolean;
}

function splitIngredients(raw: string): string[] {
  return raw
    .split(/[,;\n]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export default function BrowseDetailScreen() {
  const [, params] = useRoute<{ barcode: string }>("/app/browse/:barcode");
  const [, navigate] = useLocation();
  const { t } = useTranslation();
  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const barcode = params?.barcode ?? "";

  useEffect(() => {
    if (!barcode) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    apiFetch(`/api/products/${encodeURIComponent(barcode)}`, {
      credentials: "include",
    })
      .then(async (r) => {
        if (r.status === 404) throw new Error("not-found");
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return (await r.json()) as ProductDetail;
      })
      .then((data) => {
        if (!cancelled) setProduct(data);
      })
      .catch((e: Error) => {
        if (cancelled) return;
        setError(
          e.message === "not-found"
            ? t("browseDetail.errorNotFound")
            : t("browseDetail.errorLoad"),
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [barcode, t]);

  const scanThis = () => {
    if (!product) return;
    try {
      sessionStorage.setItem(
        "skinscreen.pendingScan",
        JSON.stringify({
          barcode: product.barcode,
          productName: [product.brand, product.productName].filter(Boolean).join(" "),
        }),
      );
    } catch {
      // ignore quota errors
    }
    navigate("/app/scan");
  };

  return (
    <AppShell title={t("browseDetail.headerTitle")}>
      <button
        type="button"
        onClick={() => navigate("/app/browse")}
        data-touch-target
        className="mb-3 inline-flex min-h-[44px] items-center gap-1.5 rounded-full bg-white/60 px-3 py-1.5 text-sm font-medium text-foreground hover:bg-white"
        aria-label={t("browseDetail.backToBrowse")}
      >
        <ArrowLeft className="h-4 w-4" />
        {t("browseDetail.backToBrowse")}
      </button>

      {loading && (
        <div className="flex items-center justify-center rounded-3xl bg-white py-16 shadow-sm">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      )}

      {error && !loading && (
        <div className="rounded-3xl border border-amber-200 bg-amber-50 p-6 text-center shadow-sm">
          <AlertTriangle className="mx-auto h-8 w-8 text-amber-600" />
          <p className="mt-2 text-sm font-medium text-amber-900">{error}</p>
        </div>
      )}

      {product && !loading && (
        <>
          <section className="overflow-hidden rounded-3xl border border-border/40 bg-white shadow-sm">
            <div className="flex items-stretch gap-4 p-4">
              <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-primary/10 via-white to-amber-50">
                {product.imageUrl ? (
                  <img
                    src={product.imageUrl}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <Sparkles className="h-9 w-9 text-primary/60" aria-hidden />
                )}
              </div>
              <div className="min-w-0 flex-1">
                {product.brand && (
                  <p className="truncate text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                    {product.brand}
                  </p>
                )}
                <h2 className="font-serif text-xl font-medium leading-tight text-foreground">
                  {product.productName}
                </h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  {t(`browse.cat.${product.category}`)} · {t("browseDetail.barcodeLabel", { code: product.barcode })}
                </p>
                {product.verifiedSafe && (
                  <span className="mt-2 inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-emerald-700">
                    <Check className="mr-1 h-[14px] w-[14px] shrink-0" aria-hidden />
                    {t("browse.verifiedSafe")}
                  </span>
                )}
              </div>
            </div>
            <div className="border-t border-border/40 p-4">
              <button
                type="button"
                onClick={scanThis}
                data-touch-target
                className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-3 text-sm font-semibold text-white shadow-md shadow-primary/25 transition-transform active:scale-95"
              >
                <ScanLine className="h-4 w-4" />
                {t("browseDetail.scanCta")}
              </button>
              <p className="mt-2 text-center text-[11px] text-muted-foreground">
                {t("browseDetail.scanHint")}
              </p>
            </div>
          </section>

          <section className="mt-4 rounded-3xl border border-border/40 bg-white p-4 shadow-sm">
            <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
              {t("browseDetail.fullIngredients")}
            </h3>
            <ul className="mt-3 flex flex-wrap gap-1.5">
              {splitIngredients(product.ingredients).map((ing, i) => (
                <li
                  key={`${ing}-${i}`}
                  className="rounded-full border border-border/50 bg-muted/40 px-2.5 py-1 text-[12px] text-foreground"
                >
                  {ing}
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
    </AppShell>
  );
}
