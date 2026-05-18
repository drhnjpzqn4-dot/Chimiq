import { useEffect, useState } from "react";
import { useAnalyzeRoutine, useGetShelf } from "@workspace/api-client-react";
import type {
  RoutineConflict,
  RoutineConflictResponse,
  ShelfProduct as ApiShelfProduct,
} from "@workspace/api-client-react";
import { useTranslation } from "@/lib/i18n";
import { apiFetch } from "@/lib/api";

type ShelfProduct = ApiShelfProduct;

type Verdict = "safe" | "caution" | "danger" | null;

type FlaggedIngredient = {
  name?: string;
  ingredient?: string;
  reason?: string;
  explanation?: string;
  severity?: string;
};

type AnalysisResult = {
  verdict?: string;
  overallSafe?: boolean;
  flaggedIngredients?: FlaggedIngredient[];
  flags?: FlaggedIngredient[];
  summary?: string;
  verdictSummary?: string;
};

type ReportProduct = ShelfProduct & {
  analysis_result_json?: AnalysisResult | null;
  analysisResultJson?: AnalysisResult | null;
  product_name?: string | null;
  brand?: string | null;
  image_url?: string | null;
  imageUrl?: string | null;
};

type ProductAnalysisMap = Record<number, AnalysisResult | null>;

function getAnalysis(product: ShelfProduct): AnalysisResult | null {
  const p = product as ReportProduct;
  return p.analysisResultJson ?? p.analysis_result_json ?? null;
}

function getProductName(product: ShelfProduct, fallback: string): string {
  const p = product as ReportProduct;
  return p.product_name ?? p.productName ?? fallback;
}

function getProductImageUrl(product: ShelfProduct): string | null {
  const p = product as ReportProduct;
  return p.image_url ?? p.imageUrl ?? null;
}

function verdictFromProduct(product: ShelfProduct): Verdict {
  const analysis = getAnalysis(product);
  if (!analysis) return null;
  if (analysis.verdict === "high") return "danger";
  if (analysis.verdict === "warning") return "caution";
  if (analysis.verdict) return analysis.verdict as Verdict;
  if (analysis.overallSafe === true) return "safe";
  const flags = analysis.flaggedIngredients ?? analysis.flags ?? [];
  if (
    flags.some((flag) =>
      String(flag.severity ?? "").toLowerCase().includes("high"),
    )
  ) {
    return "danger";
  }
  if (flags.length > 0) return "caution";
  return "safe";
}

function verdictLabel(verdict: Verdict, t: (key: string) => string): string {
  if (verdict === "danger") return t("product.danger");
  if (verdict === "caution") return t("product.caution");
  if (verdict === "safe") return t("product.safe");
  return t("report.noAnalysis");
}

function verdictColor(verdict: Verdict): string {
  if (verdict === "danger") return "#C94F4F";
  if (verdict === "caution") return "#BC8F3D";
  if (verdict === "safe") return "#3C5C44";
  return "#4D5450";
}

const SLOTS = [
  { key: "morning", labelKey: "report.morning", icon: "☀" },
  { key: "evening", labelKey: "report.evening", icon: "☾" },
  { key: "occasional", labelKey: "report.occasional", icon: "□" },
  { key: "wishlist", labelKey: "report.wishlist", icon: "◇" },
] as const;

function ProductCard({ product }: { product: ShelfProduct }) {
  const { t } = useTranslation();
  const verdict = verdictFromProduct(product);
  const analysis = getAnalysis(product);
  const flags = analysis?.flaggedIngredients ?? analysis?.flags ?? [];
  const summary = analysis?.summary ?? analysis?.verdictSummary ?? null;
  const name = getProductName(product, t("shelf.unknownProduct"));
  const imageUrl = getProductImageUrl(product);
  const brand = (product as ReportProduct).brand ?? null;

  return (
    <div
      style={{
        border: "1px solid #DDDAD0",
        borderRadius: 12,
        padding: "14px 16px",
        marginBottom: 12,
        pageBreakInside: "avoid",
        backgroundColor: "#FFFFFF",
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
        {imageUrl ? (
          <img
            src={imageUrl}
            alt=""
            style={{
              width: 56,
              height: 56,
              borderRadius: 8,
              objectFit: "cover",
              flexShrink: 0,
            }}
          />
        ) : (
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 8,
              flexShrink: 0,
              backgroundColor: "#E5E2D8",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 20,
              color: "#3C5C44",
            }}
          >
            CH
          </div>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontWeight: 600, fontSize: 14, color: "#2C1A0E" }}>
            {name}
          </p>
          {brand && (
            <p style={{ margin: "2px 0 0", fontSize: 12, color: "#4D5450" }}>
              {brand}
            </p>
          )}
          <span
            style={{
              display: "inline-block",
              marginTop: 6,
              backgroundColor: verdictColor(verdict),
              color: "#FFFFFF",
              borderRadius: 999,
              padding: "2px 10px",
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.04em",
            }}
          >
            {verdictLabel(verdict, t).toUpperCase()}
          </span>
        </div>
      </div>

      {summary && (
        <p style={{ margin: "10px 0 0", fontSize: 12, lineHeight: 1.55, color: "#4D5450" }}>
          {summary}
        </p>
      )}

      {flags.length > 0 && (
        <div style={{ marginTop: 10 }}>
          <p
            style={{
              margin: 0,
              fontSize: 11,
              fontWeight: 700,
              color: "#B5705B",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
            }}
          >
            Flaggade ingredienser
          </p>
          {flags
            .filter((flag) => flag.name ?? flag.ingredient)
            .map((flag, index) => (
              <div
                key={index}
                style={{
                  marginTop: 6,
                  paddingLeft: 10,
                  borderLeft: "2px solid #F2DECE",
                }}
              >
                <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: "#2C1A0E" }}>
                  {flag.name ?? flag.ingredient}
                </p>
                {(flag.reason ?? flag.explanation) && (
                  <p style={{ margin: "2px 0 0", fontSize: 11, color: "#4D5450", lineHeight: 1.4 }}>
                    {flag.reason ?? flag.explanation}
                  </p>
                )}
              </div>
            ))}
        </div>
      )}

      {!analysis && (
        <p style={{ margin: "10px 0 0", fontSize: 12, color: "#4D5450", fontStyle: "italic" }}>
          Analys saknas för denna produkt.
        </p>
      )}
    </div>
  );
}

function ConflictSection({ conflicts }: { conflicts: RoutineConflict[] }) {
  const substantive = conflicts.filter((conflict) => conflict.severity !== "SAFE");

  if (substantive.length === 0) {
    return (
      <p style={{ fontSize: 13, color: "#3C5C44", fontWeight: 600 }}>
        ✓ Inga konflikter identifierade i din rutin.
      </p>
    );
  }

  return (
    <div>
      {substantive.map((conflict, index) => (
        <div
          key={`${conflict.product1Name}-${conflict.product2Name}-${index}`}
          style={{
            border: "1px solid #EDD6CF",
            borderLeft: "4px solid #C94F4F",
            borderRadius: 8,
            padding: "12px 14px",
            marginBottom: 10,
            backgroundColor: "#FDF6F4",
            pageBreakInside: "avoid",
          }}
        >
          <p style={{ margin: 0, fontWeight: 700, fontSize: 13, color: "#2C1A0E" }}>
            {conflict.product1Name} + {conflict.product2Name}
          </p>
          <p style={{ margin: "4px 0 0", fontSize: 12, color: "#4D5450", lineHeight: 1.5 }}>
            {conflict.explanation}
          </p>
          <span
            style={{
              display: "inline-block",
              marginTop: 6,
              fontSize: 10,
              fontWeight: 700,
              color: conflict.severity === "HIGH_RISK" ? "#C94F4F" : "#8B6A1F",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
            }}
          >
            {conflict.severity === "HIGH_RISK" ? "⚠ Hög risk" : "⚠ Försiktighet"}
          </span>
        </div>
      ))}
    </div>
  );
}

export default function RoutineReport() {
  const { t } = useTranslation();
  const shelfQuery = useGetShelf({});
  const analyzeRoutine = useAnalyzeRoutine();
  const products = shelfQuery.data?.products ?? [];
  const [routineResult, setRoutineResult] =
    useState<RoutineConflictResponse | null>(null);
  const [routineAttempted, setRoutineAttempted] = useState(false);
  const [productAnalyses, setProductAnalyses] = useState<ProductAnalysisMap>({});
  const [isAnalyzingProducts, setIsAnalyzingProducts] = useState(false);

  useEffect(() => {
    if (products.length === 0 || routineAttempted || analyzeRoutine.isPending) return;

    setRoutineAttempted(true);
    analyzeRoutine
      .mutateAsync(undefined)
      .then((result) => {
        setRoutineResult(result);
      })
      .catch(() => {
        // Rapporten ska fortfarande gå att skriva ut även om konfliktanalysen faller.
      });
  }, [analyzeRoutine, products.length, routineAttempted]);

  useEffect(() => {
    const missingAnalysis = products.filter((product) => {
      if (getAnalysis(product) || productAnalyses[product.id] !== undefined) {
        return false;
      }
      return product.ingredients.trim().length > 0;
    });

    if (missingAnalysis.length === 0) return;

    let cancelled = false;
    setIsAnalyzingProducts(true);

    void Promise.all(
      missingAnalysis.map(async (product) => {
        try {
          const response = await apiFetch("/api/analyze-single", {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ingredients: product.ingredients }),
          });

          if (!response.ok) return [product.id, null] as const;
          const analysis = (await response.json()) as AnalysisResult;
          return [product.id, analysis] as const;
        } catch {
          return [product.id, null] as const;
        }
      }),
    ).then((entries) => {
      if (cancelled) return;
      setProductAnalyses((current) => ({
        ...current,
        ...Object.fromEntries(entries),
      }));
    }).finally(() => {
      if (!cancelled) setIsAnalyzingProducts(false);
    });

    return () => {
      cancelled = true;
    };
  }, [products, productAnalyses]);

  const isLoading = shelfQuery.isLoading || analyzeRoutine.isPending || isAnalyzingProducts;
  const today = new Date().toLocaleDateString("sv-SE", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  if (isLoading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#F1EFE8",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>CH</div>
          <p style={{ color: "#4D5450", fontFamily: "Georgia, serif" }}>
            Skapar din rapport...
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          @page { margin: 18mm 15mm; size: A4; }
          body { background: white !important; }
        }
        body { margin: 0; background: #F1EFE8; }
      `}</style>

      <div
        style={{
          maxWidth: 700,
          margin: "0 auto",
          padding: "24px 16px 60px",
          fontFamily: "'Inter', -apple-system, sans-serif",
          color: "#2C1A0E",
        }}
      >
        <div className="no-print" style={{ marginBottom: 24, textAlign: "right" }}>
          <button
            onClick={() => window.print()}
            style={{
              backgroundColor: "#3C5C44",
              color: "#FFFFFF",
              border: "none",
              borderRadius: 10,
              padding: "10px 22px",
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Spara som PDF
          </button>
        </div>

        <div
          style={{
            backgroundColor: "#3C5C44",
            borderRadius: 16,
            padding: "28px 28px 24px",
            marginBottom: 28,
            color: "#FFFFFF",
          }}
        >
          <p
            style={{
              margin: 0,
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              opacity: 0.75,
            }}
          >
            chimiq.com
          </p>
          <h1
            style={{
              margin: "8px 0 4px",
              fontSize: 26,
              fontWeight: 600,
              fontFamily: "Georgia, serif",
              lineHeight: 1.2,
            }}
          >
            Hudvårdsrutin-rapport
          </h1>
          <p style={{ margin: 0, fontSize: 13, opacity: 0.8 }}>{today}</p>
          <div style={{ marginTop: 16, display: "flex", gap: 20 }}>
            <span style={{ fontSize: 13 }}>
              <strong>{products.length}</strong> produkter
            </span>
            {routineResult && (
              <span style={{ fontSize: 13 }}>
                {routineResult.overallSafe
                  ? "✓ Rutinen är säker"
                  : `⚠ ${(routineResult.highRiskCount ?? 0) + (routineResult.cautionCount ?? 0)} varning${(routineResult.highRiskCount ?? 0) + (routineResult.cautionCount ?? 0) !== 1 ? "ar" : ""}`}
              </span>
            )}
          </div>
        </div>

        {SLOTS.map(({ key, labelKey, icon }) => {
          const slotProducts = products.filter((product) => {
            const slot = product.routineSlot as string | null;
            if (key === "wishlist") {
              return slot === "wishlist" || slot === null || slot === "both";
            }
            return slot === key;
          });

          if (slotProducts.length === 0) return null;

          return (
            <section key={key} style={{ marginBottom: 28 }}>
              <h2
                style={{
                  margin: "0 0 14px",
                  fontSize: 17,
                  fontWeight: 700,
                  fontFamily: "Georgia, serif",
                  color: "#2C1A0E",
                  borderBottom: "2px solid #DDDAD0",
                  paddingBottom: 8,
                }}
              >
                {icon} {t(labelKey)} ({slotProducts.length})
              </h2>
              {slotProducts.map((product) => {
                const reportProduct = {
                  ...product,
                  analysisResultJson:
                    getAnalysis(product) ?? productAnalyses[product.id] ?? null,
                } satisfies ReportProduct;

                return <ProductCard key={product.id} product={reportProduct} />;
              })}
            </section>
          );
        })}

        {routineResult && (
          <section style={{ marginBottom: 32, pageBreakBefore: "auto" }}>
            <h2
              style={{
                margin: "0 0 14px",
                fontSize: 17,
                fontWeight: 700,
                fontFamily: "Georgia, serif",
                color: "#2C1A0E",
                borderBottom: "2px solid #DDDAD0",
                paddingBottom: 8,
              }}
            >
              ⚠ Konflikter &amp; kombinationer
            </h2>
            <ConflictSection conflicts={routineResult.conflicts ?? []} />
          </section>
        )}

        <div
          style={{
            borderTop: "1px solid #DDDAD0",
            paddingTop: 20,
            marginTop: 8,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 16,
          }}
        >
          <div>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "#3C5C44" }}>
              Chimiq · chimiq.com
            </p>
            <p style={{ margin: "3px 0 0", fontSize: 11, color: "#4D5450" }}>
              Hudvård som tar dig på allvar
            </p>
          </div>
          <p
            style={{
              margin: 0,
              fontSize: 10,
              color: "#4D5450",
              maxWidth: 280,
              textAlign: "right",
              lineHeight: 1.5,
            }}
          >
            Rapporten är ett informationsunderlag och ersätter inte rådgivning från dermatolog eller läkare.
          </p>
        </div>
      </div>
    </>
  );
}
