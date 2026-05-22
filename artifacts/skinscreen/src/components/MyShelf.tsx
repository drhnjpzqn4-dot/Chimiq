import { useState, useCallback, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ContributeModal } from "@/components/ContributeModal";
import { ScanEntry, type ProductResult } from "@/components/ScanEntry";
import {
  useGetShelf,
  getGetShelfQueryKey,
  useAddToShelf,
  useRemoveFromShelf,
  useAnalyzeRoutine,
} from "@workspace/api-client-react";
import type { RoutineConflict, RoutineConflictResponse } from "@workspace/api-client-react";
import {
  Sun, Moon, Plus, Search, AlertTriangle,
  X, ShieldCheck, ShieldOff, Loader2,
  ChevronDown, ChevronUp, ChevronRight, ExternalLink, Zap, FileText, Lock, PackagePlus,
  Clock, Heart, CalendarDays, Bookmark, Package,
} from "lucide-react";
import PaywallModal from "@/components/PaywallModal";
import { FadeIn } from "@/components/FadeIn";
import { ProductListRow } from "@/components/ProductListRow";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useUserPlan } from "@/hooks/useUserPlan";
import { useTranslation } from "@/lib/i18n";
import { trackEvent } from "@/lib/analytics";
import { toStatusLevel } from "@/lib/status";
import type { RoutineSlot, StatusLevel } from "@/types/design-system";
import {
  ShelfConflictBanner,
  type IngredientStatusLevel,
} from "@/components/IngredientStatusDot";
import { ProductDetailSheet, type ProductDetailProduct } from "@/components/ProductDetailSheet";

function normName(s: string) {
  return s.trim().toLowerCase();
}

function conflictsInvolvingProduct(
  productName: string,
  conflicts: RoutineConflict[] | undefined,
): RoutineConflict[] {
  if (!conflicts?.length) return [];
  const n = normName(productName);
  return conflicts.filter(
    (c) => normName(c.product1Name) === n || normName(c.product2Name) === n,
  );
}

function dotForConflicts(pc: RoutineConflict[]): IngredientStatusLevel {
  const substantive = pc.filter((c) => c.severity !== "SAFE");
  if (!substantive.length) return "safe";
  if (substantive.some((c) => c.severity === "HIGH_RISK")) return "high";
  if (substantive.some((c) => c.severity === "CAUTION")) return "caution";
  return "safe";
}

function pickBannerConflict(pc: RoutineConflict[]): RoutineConflict | null {
  const substantive = pc.filter((c) => c.severity !== "SAFE");
  if (!substantive.length) return null;
  const hi = substantive.find((c) => c.severity === "HIGH_RISK");
  if (hi) return hi;
  return substantive[0] ?? null;
}

type AddProductRoutineSlot = Exclude<RoutineSlot, null>;

interface AddProductFormProps {
  onClose: () => void;
  onAdded: () => void;
}

function AddProductForm({ onClose, onAdded }: AddProductFormProps) {
  const { t } = useTranslation();
  // Refaktorerad enligt BESLUT-SS-068: hyllans Lägg till-flöde använder
  // nu samma <ScanEntry> som /app/scan och ContributeModal — EN modul,
  // identiskt beteende överallt där användaren letar upp/skannar en
  // produkt. Slot-väljaren + Lägg till-knappen är hyllan-specifika och
  // visas EFTER att en produkt valts via ScanEntry's onResult.
  const [productName, setProductName] = useState("");
  const [brand, setBrand] = useState<string | undefined>(undefined);
  const [ingredients, setIngredients] = useState("");
  const [routineSlot, setRoutineSlot] = useState<AddProductRoutineSlot>("wishlist");
  const addMutation = useAddToShelf();

  const handleScanResult = (product: ProductResult) => {
    const name = product.productName ?? product.product_name;
    setProductName(name);
    setBrand(product.brand);
    setIngredients(product.ingredients ?? "");
  };

  const handleSubmit = useCallback(async () => {
    if (!productName.trim() || !ingredients.trim()) return;
    await addMutation.mutateAsync({
      data: { productName: productName.trim(), ingredients: ingredients.trim(), routineSlot },
    });
    trackEvent("product_save", {
      product_name: productName.trim(),
      routine_slot: routineSlot,
      entry_mode: "scan-entry",
    });
    onAdded();
  }, [productName, ingredients, routineSlot, addMutation, onAdded]);

  const hasProduct = productName.trim().length > 0 && ingredients.trim().length > 0;

  return (
    <div className="bg-white rounded-2xl border border-border/60 shadow-lg p-6">
      <div className="flex items-center justify-between mb-5">
        <h3 className="font-serif text-lg font-medium text-foreground">{t("myShelf.addProduct")}</h3>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Delad ScanEntry — sök / barcode / fota — exakt samma UI som
          /app/scan-sidan (SS-068). När användaren väljer ett förslag eller
          klickar Analysera på ScanEntry's egna flöde, anropas handleScanResult
          som fyller productName + brand + ingredients. */}
      <ScanEntry
        mode="all"
        onResult={handleScanResult}
        className="mb-5"
      />

      {/* När en produkt har valts: visa den valda produkten + rutin-väljaren
          + Lägg till-knappen. Detta logiska flöde (val först, sen var-i-rutinen,
          sen submit) gör det tydligt vad användaren håller på att lägga till. */}
      {hasProduct && (
        <>
          <div
            className="mb-5 rounded-xl border p-3"
            style={{ borderColor: "var(--line)", backgroundColor: "var(--cream-warm)" }}
          >
            <p
              className="text-[10px] font-semibold uppercase tracking-wider"
              style={{ color: "var(--ink-soft)" }}
            >
              {t("myShelf.selectedProduct")}
            </p>
            <p className="mt-1 text-sm font-semibold" style={{ color: "var(--ink)" }}>
              {productName}
            </p>
            {brand && (
              <p className="mt-0.5 text-xs" style={{ color: "var(--ink-soft)" }}>
                {brand}
              </p>
            )}
          </div>

          <div className="mb-5">
            <p className="text-xs font-medium text-muted-foreground mb-2">{t("myShelf.routine")}</p>
            <div className="flex flex-wrap gap-2">
              {(["morning", "evening", "occasional", "wishlist"] as AddProductRoutineSlot[]).map((slot) => (
                <button
                  key={slot}
                  onClick={() => setRoutineSlot(slot)}
                  className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-all duration-150 ${
                    routineSlot === slot
                      ? "border-transparent text-white"
                      : "border-border/60 bg-white text-muted-foreground hover:border-primary/40"
                  }`}
                  style={
                    routineSlot === slot
                      ? { backgroundColor: "var(--sage)" }
                      : undefined
                  }
                >
                  {slot === "morning" && <Sun className="w-3 h-3" />}
                  {slot === "evening" && <Moon className="w-3 h-3" />}
                  {slot === "occasional" && <CalendarDays className="w-3 h-3" />}
                  {slot === "wishlist" && <Bookmark className="w-3 h-3" />}
                  {t(`myShelf.slot.${slot}`)}
                </button>
              ))}
            </div>
          </div>

          {/* Sage = "för dig" (SS-067) — Lägg till på hyllan är en egen-handling */}
          <button
            onClick={handleSubmit}
            disabled={!productName.trim() || !ingredients.trim() || addMutation.isPending}
            className="w-full rounded-xl py-3 text-sm font-semibold text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-50"
            style={{ backgroundColor: "var(--sage)" }}
          >
            {addMutation.isPending ? t("myShelf.adding") : t("myShelf.addToShelf")}
          </button>
        </>
      )}
    </div>
  );
}

function ConflictCard({ conflict, delay }: { conflict: RoutineConflict; delay?: number }) {
  const { t } = useTranslation();
  const isHighRisk = conflict.severity === "HIGH_RISK";
  return (
    <FadeIn delay={delay} fullWidth>
      <div
        className="rounded-2xl border p-4"
        style={
          isHighRisk
            ? { backgroundColor: "rgba(252, 228, 224, 0.55)", borderColor: "var(--line)" }
            : { backgroundColor: "rgba(251, 243, 220, 0.5)", borderColor: "var(--line)" }
        }
      >
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="min-w-0">
            <p className="text-xs font-semibold text-muted-foreground mb-0.5">
              {conflict.product1Name} + {conflict.product2Name}
            </p>
            <p className="text-sm font-serif font-medium text-foreground leading-snug">
              {conflict.pair}
            </p>
          </div>
          <span
            className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full font-semibold uppercase tracking-wider"
            style={
              isHighRisk
                ? {
                    backgroundColor: "#FCE4E0",
                    color: "#8C2A1A",
                    fontSize: 10,
                    padding: "3px 8px",
                    fontWeight: 600,
                  }
                : {
                    backgroundColor: "#FBF3DC",
                    color: "#8A6217",
                    fontSize: 10,
                    padding: "3px 8px",
                    fontWeight: 600,
                  }
            }
          >
            {isHighRisk ? (
              <><ShieldOff className="w-3 h-3" /> {t("myShelf.severityHighRisk")}</>
            ) : (
              <><AlertTriangle className="w-3 h-3" /> {t("myShelf.severityCaution")}</>
            )}
          </span>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed mb-2.5">{conflict.explanation}</p>
        <a
          href={conflict.citationUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[10px] text-muted-foreground/60 flex items-start gap-1.5 hover:text-primary transition-colors"
        >
          <ExternalLink className="w-3 h-3 mt-0.5 shrink-0" />
          <span className="italic leading-snug">{conflict.citation}</span>
        </a>
      </div>
    </FadeIn>
  );
}

type AnalysisState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error" }
  | { status: "done"; data: RoutineConflictResponse };

interface RoutineCheckPanelProps {
  productCount: number;
  analysisState: AnalysisState;
  onRun: () => void;
  onClear: () => void;
}

function RoutineCheckPanel({ productCount, analysisState, onRun, onClear }: RoutineCheckPanelProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(true);

  if (analysisState.status === "idle") {
    return null;
  }

  if (analysisState.status === "loading") {
    return (
      <div className="px-4 pb-4 border-t border-border/30 pt-3">
        <div className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-primary/5 border border-primary/20 text-primary/70 text-sm">
          <Loader2 className="w-4 h-4 animate-spin" />
          {t("myShelf.analysing")}
        </div>
      </div>
    );
  }

  if (analysisState.status === "error") {
    return (
      <div className="px-4 pb-4 border-t border-border/30 pt-3 space-y-2">
        <div className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm">
          <AlertTriangle className="w-4 h-4" />
          {t("myShelf.analysisFailed")}
        </div>
        <button
          onClick={onRun}
          className="w-full py-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          {t("myShelf.retry")}
        </button>
      </div>
    );
  }

  const { conflicts, overallSafe, highRiskCount, cautionCount } = analysisState.data;

  return (
    <div className="border-t border-border/30">
      <div className="w-full flex items-center justify-between gap-2 px-4 py-3 hover:bg-[#FAFAF8] transition-colors">
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-2 flex-1 min-w-0 text-left"
          aria-expanded={open}
        >
          {overallSafe ? (
            <ShieldCheck className="h-4 w-4 shrink-0" style={{ color: "var(--sage-deep)" }} />
          ) : highRiskCount > 0 ? (
            <ShieldOff className="h-4 w-4 shrink-0" style={{ color: "#8C2A1A" }} />
          ) : (
            <AlertTriangle className="h-4 w-4 shrink-0" style={{ color: "#8A6217" }} />
          )}
          <span className="text-sm font-medium text-foreground">
            {overallSafe
              ? t("myShelf.routineAllClear")
              : (highRiskCount + cautionCount === 1
                  ? t("myShelf.oneConflict")
                  : t("myShelf.manyConflictsFmt").replace("{count}", String(highRiskCount + cautionCount)))}
          </span>
          {!overallSafe && (
            <div className="flex items-center gap-1">
              {highRiskCount > 0 && (
                <span
                  className="inline-flex items-center rounded-full font-semibold"
                  style={{
                    backgroundColor: "#FCE4E0",
                    color: "#8C2A1A",
                    fontSize: 10,
                    padding: "3px 8px",
                    fontWeight: 600,
                  }}
                >
                  {highRiskCount} {t("myShelf.high")}
                </span>
              )}
              {cautionCount > 0 && (
                <span
                  className="inline-flex items-center rounded-full font-semibold"
                  style={{
                    backgroundColor: "#FBF3DC",
                    color: "#8A6217",
                    fontSize: 10,
                    padding: "3px 8px",
                    fontWeight: 600,
                  }}
                >
                  {cautionCount} {t("myShelf.cautionShort")}
                </span>
              )}
            </div>
          )}
        </button>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={onClear}
            className="text-[10px] text-muted-foreground/50 hover:text-muted-foreground transition-colors px-1"
          >
            {t("myShelf.clear")}
          </button>
          <button onClick={() => setOpen((v) => !v)} aria-label={open ? t("myShelf.collapse") : t("myShelf.expand")}>
            {open ? (
              <ChevronUp className="w-4 h-4 text-muted-foreground/60" />
            ) : (
              <ChevronDown className="w-4 h-4 text-muted-foreground/60" />
            )}
          </button>
        </div>
      </div>

      {open && (
        <div className="px-4 pb-4">
          {overallSafe ? (
            <div
              className="flex items-center gap-3 rounded-2xl border p-4"
              style={{ backgroundColor: "#E8F2E5", borderColor: "var(--line)" }}
            >
              <ShieldCheck className="h-5 w-5 shrink-0" style={{ color: "var(--sage-deep)" }} />
              <div>
                <p className="text-sm font-semibold" style={{ color: "var(--sage-deep)" }}>
                  {t("myShelf.noConflicts")}
                </p>
                <p className="mt-0.5 text-xs" style={{ color: "#5E544C" }}>
                  {t("myShelf.routineLooksGood")}
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {conflicts.map((conflict, i) => (
                <ConflictCard
                  key={`${conflict.product1Name}-${conflict.product2Name}-${conflict.pair}`}
                  conflict={conflict}
                  delay={i * 0.07}
                />
              ))}
            </div>
          )}
          <button
            onClick={onClear}
            className="mt-3 w-full text-xs text-muted-foreground/60 hover:text-muted-foreground py-1.5 transition-colors"
          >
            {t("myShelf.recheck")}
          </button>
        </div>
      )}
    </div>
  );
}

interface MyShelfProps {
  userId: string;
  displayName: string | null;
}

const DEMO_PRODUCTS = [
  {
    productName: "Neutrogena Rapid Clear BP Wash",
    ingredients: "Water, Sodium C14-16 Olefin Sulfonate, PEG-80 Sorbitan Laurate, Cocamidopropyl Betaine, Glycerin, Sodium Lauroamphoacetate, Sodium Hydroxide, Hydroxyethylcellulose, Benzoyl Peroxide 10%, Glycol Distearate, Cocamide MEA, Laureth-4, Citric Acid, Tetrasodium EDTA",
    routineSlot: "morning" as const,
  },
  {
    productName: "RoC Retinol Correxion Serum",
    ingredients: "Water, Dimethicone, Glycerin, Isopropyl Isostearate, Caprylic/Capric Triglyceride, PEG-100 Stearate, Propylene Glycol, Glyceryl Stearate, Cetyl Alcohol, Niacinamide, Retinol, Sodium Hyaluronate, Tocopherol, Phenoxyethanol, Ethylhexylglycerin, Disodium EDTA, Carbomer, Triethanolamine",
    routineSlot: "evening" as const,
  },
  {
    productName: "Paula's Choice 8% AHA Gel",
    ingredients: "Water, Glycolic Acid 8%, Butylene Glycol, Sodium Hydroxide, Phenyl Trimethicone, Aloe Barbadensis Leaf Extract, Allantoin, Chamomilla Recutita Flower Extract, Polysorbate 20, Tetrasodium EDTA, Methylparaben",
    routineSlot: "evening" as const,
  },
];

type ShelfFilter = "morgon" | "kväll" | "ibland" | "sparat";

const FREE_TIER_LIMIT = 2;

function conflictsBetweenNames(
  conflicts: RoutineConflict[] | undefined,
  nameA: string,
  nameB: string,
): RoutineConflict[] {
  if (!conflicts?.length) return [];
  const a = normName(nameA);
  const b = normName(nameB);
  return conflicts.filter(
    (c) =>
      (normName(c.product1Name) === a && normName(c.product2Name) === b) ||
      (normName(c.product1Name) === b && normName(c.product2Name) === a),
  );
}

function FreeShelfComboBanner({
  products,
  analysisState,
}: {
  products: { productName: string }[];
  analysisState: AnalysisState;
}) {
  const { t } = useTranslation();
  if (products.length < FREE_TIER_LIMIT) return null;

  const [p1, p2] = products;
  let substantive: RoutineConflict[] = [];
  if (analysisState.status === "done") {
    const between = conflictsBetweenNames(analysisState.data.conflicts, p1.productName, p2.productName);
    substantive = between.filter((c) => c.severity !== "SAFE");
  }

  const hasIssue = substantive.length > 0;
  const high = substantive.some((c) => c.severity === "HIGH_RISK");

  return (
    <div className="mt-3 space-y-2">
      <div
        className="rounded-2xl border p-4"
        style={
          hasIssue
            ? high
              ? {
                  backgroundColor: "color-mix(in srgb, var(--rose-soft) 85%, transparent)",
                  borderColor: "var(--line)",
                }
              : {
                  backgroundColor: "color-mix(in srgb, var(--amber-soft) 80%, transparent)",
                  borderColor: "var(--line)",
                }
            : { backgroundColor: "var(--green-soft)", borderColor: "var(--line)" }
        }
      >
        <p className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: "var(--ink-soft)" }}>
          {t("shelf.freeComboTitle")}
        </p>
        {hasIssue ? (
          <p className="mt-2 text-sm font-medium leading-snug" style={{ color: "var(--ink)" }}>
            {substantive.length === 1 ? t("myShelf.oneConflict") : t("myShelf.manyConflictsFmt").replace("{count}", String(substantive.length))}
          </p>
        ) : (
          <>
            <p className="mt-2 text-sm font-semibold leading-snug" style={{ color: "var(--sage-deep)" }}>
              {t("shelf.freeComboOk")}
            </p>
            {analysisState.status !== "done" && (
              <p className="mt-1 text-xs leading-relaxed" style={{ color: "var(--ink-soft)" }}>
                {t("myShelf.routineLooksGood")}
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function GoldShelfUpsellCard({ onOpenPaywall }: { onOpenPaywall: () => void }) {
  const { t } = useTranslation();
  return (
    <div
      className="mt-3 rounded-2xl border p-4 shadow-sm"
      style={{
        backgroundColor: "var(--gold-soft)",
        borderColor: "var(--gold)",
        borderWidth: 1,
        borderStyle: "solid",
      }}
    >
      <p className="font-serif text-base font-medium leading-snug" style={{ color: "var(--ink)" }}>
        {t("shelf.upgradeCard")}
      </p>
      <button
        type="button"
        data-touch-target
        onClick={onOpenPaywall}
        className="mt-3 w-full rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90"
        style={{ backgroundColor: "var(--gold)" }}
      >
        {t("paywall.trialCta")}
      </button>
    </div>
  );
}

function LockedPremiumSlotCard({ onOpenPaywall }: { onOpenPaywall: () => void }) {
  const { t } = useTranslation();
  return (
    <button
      type="button"
      data-touch-target
      onClick={onOpenPaywall}
      aria-label={t("shelf.lockedSlotAriaLabel")}
      className="flex min-h-[160px] w-full flex-col items-center justify-center gap-2 rounded-2xl px-3 py-4 text-center transition-opacity hover:opacity-95"
      style={{
        backgroundColor: "var(--gold-soft)",
        borderWidth: 1.5,
        borderStyle: "dashed",
        borderColor: "var(--gold)",
      }}
    >
      <Lock className="h-6 w-6 shrink-0" strokeWidth={1.75} style={{ color: "var(--gold)" }} aria-hidden />
      <span className="whitespace-pre-line text-xs font-semibold leading-snug" style={{ color: "var(--gold)" }}>
        {t("shelf.lockedSlotLabel")}
      </span>
      <span className="text-xs font-semibold" style={{ color: "var(--gold)" }}>
        {t("shelf.lockedSlotCta")}
      </span>
    </button>
  );
}

function DashedAddSlotCard({ onAdd }: { onAdd: () => void }) {
  const { t } = useTranslation();
  return (
    <button
      type="button"
      data-touch-target
      onClick={onAdd}
      className="flex min-h-[160px] w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border text-muted-foreground transition-colors duration-200 hover:border-primary hover:text-primary"
    >
      <Plus className="h-6 w-6" aria-hidden />
      <span className="text-xs font-medium">{t("myShelf.addProductBtn")}</span>
    </button>
  );
}

export function MyShelf({ displayName }: MyShelfProps) {
  const { t } = useTranslation();
  const [shelfFilter, setShelfFilter] = useState<ShelfFilter>("morgon");
  const [removeTarget, setRemoveTarget] = useState<{ id: number; name: string } | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showContributeModal, setShowContributeModal] = useState(false);
  const [detailProduct, setDetailProduct] = useState<{
    product: ProductDetailProduct;
    status: IngredientStatusLevel;
    conflicts: RoutineConflict[];
  } | null>(null);
  const [analysisState, setAnalysisState] = useState<AnalysisState>({ status: "idle" });
  const [loadingDemo, setLoadingDemo] = useState(false);
  const queryClient = useQueryClient();
  const analyzeRoutineMutation = useAnalyzeRoutine();
  const addMutation = useAddToShelf();
  const { isPremium } = useUserPlan();
  const [paywallOpen, setPaywallOpen] = useState(false);

  const shelfQuery = useGetShelf({ query: { queryKey: getGetShelfQueryKey() } });
  const removeMutation = useRemoveFromShelf();

  const allProducts = shelfQuery.data?.products ?? [];
  const filteredProducts = allProducts.filter((p) => {
    const slot = p.routineSlot as string | null;
    if (shelfFilter === "morgon") return slot === "morning";
    if (shelfFilter === "kväll") return slot === "evening";
    if (shelfFilter === "ibland") return slot === "occasional";
    return slot === null || slot === "wishlist" || slot === "both";
  });
  const isFree = !isPremium;
  const gridProducts = useMemo(() => {
    if (isPremium) return filteredProducts;
    return filteredProducts.slice(0, FREE_TIER_LIMIT);
  }, [isPremium, filteredProducts, allProducts]);

  const freeVisibleForCombo = useMemo(() => allProducts.slice(0, FREE_TIER_LIMIT), [allProducts]);

  const resetAnalysis = useCallback(() => {
    setAnalysisState({ status: "idle" });
    analyzeRoutineMutation.reset();
  }, [analyzeRoutineMutation]);

  const handleRunAnalysis = useCallback(() => {
    setAnalysisState({ status: "loading" });
    analyzeRoutineMutation.mutate(undefined, {
      onSuccess: (data) => setAnalysisState({ status: "done", data }),
      onError: () => setAnalysisState({ status: "error" }),
    });
  }, [analyzeRoutineMutation]);

  const handleAdded = useCallback(() => {
    setShowAddForm(false);
    queryClient.invalidateQueries({ queryKey: getGetShelfQueryKey() });
    resetAnalysis();
  }, [queryClient, resetAnalysis]);

  const handleRemove = useCallback(
    async (id: number) => {
      await removeMutation.mutateAsync({ id });
      queryClient.invalidateQueries({ queryKey: getGetShelfQueryKey() });
      resetAnalysis();
    },
    [removeMutation, queryClient, resetAnalysis],
  );

  const handleLoadDemo = useCallback(async () => {
    setLoadingDemo(true);
    try {
      for (const product of DEMO_PRODUCTS) {
        await addMutation.mutateAsync({ data: product });
      }
      queryClient.invalidateQueries({ queryKey: getGetShelfQueryKey() });
      resetAnalysis();
    } finally {
      setLoadingDemo(false);
    }
  }, [addMutation, queryClient, resetAnalysis]);

  const analysisData = analysisState.status === "done" ? analysisState.data : null;

  return (
    <>
      <div className="border-b border-border/30 px-2 py-2">
        <div className="-mx-1 flex gap-2 overflow-x-auto pb-0.5" style={{ WebkitOverflowScrolling: "touch" }}>
          {(["morgon", "kväll", "ibland", "sparat"] as const).map((key) => {
            const active = shelfFilter === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setShelfFilter(key)}
                data-touch-target
                className="shrink-0 whitespace-nowrap transition-colors"
                style={{
                  borderRadius: 8,
                  padding: "10px 16px",
                  fontSize: 13,
                  fontWeight: 500,
                  fontFamily: "var(--font-sans, ui-sans-serif, system-ui, sans-serif)",
                  ...(active
                    ? {
                        backgroundColor: "var(--sage)",
                        color: "#FFFFFF",
                        border: "1px solid transparent",
                      }
                    : {
                        backgroundColor: "var(--cream-warm)",
                        color: "var(--ink-soft)",
                        border: "1px solid var(--line)",
                      }),
                }}
              >
                {t(`shelf.tab${key[0].toUpperCase()}${key.slice(1)}`)}
              </button>
            );
          })}
        </div>
      </div>

      <div className="min-h-[160px] py-2" style={{ backgroundColor: "var(--cream)" }}>
        {shelfQuery.isLoading ? (
          <div className="grid grid-cols-2 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-40 rounded-2xl bg-white/80 animate-pulse" style={{ borderRadius: 16 }} />
            ))}
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10">
              {shelfFilter === "morgon" ? (
                <Sun className="h-5 w-5 text-primary" />
              ) : shelfFilter === "kväll" ? (
                <Moon className="h-5 w-5 text-primary" />
              ) : shelfFilter === "ibland" ? (
                <Clock className="h-5 w-5 text-primary" />
              ) : shelfFilter === "sparat" ? (
                <Heart className="h-5 w-5 text-primary" />
              ) : (
                <Package className="h-5 w-5 text-primary" />
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              {shelfFilter === "morgon"
                  ? t("myShelf.emptyMorning")
                  : shelfFilter === "kväll"
                    ? t("myShelf.emptyEvening")
                    : shelfFilter === "ibland"
                      ? t("myShelf.emptyOccasional")
                      : t("myShelf.emptyWishlist")}
            </p>
            {shelfQuery.isSuccess && allProducts.length === 0 ? (
              <div className="mt-3">
                <button
                  type="button"
                  onClick={handleLoadDemo}
                  disabled={loadingDemo}
                  className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary transition-colors hover:bg-primary/15 disabled:opacity-60"
                >
                  {loadingDemo ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Zap className="h-3 w-3" />
                  )}
                  {loadingDemo ? t("myShelf.loading") : t("myShelf.loadExample")}
                </button>
                <p className="mt-1.5 text-[11px] text-muted-foreground/50">{t("myShelf.threeRealProducts")}</p>
              </div>
            ) : (
              <p className="mt-1 text-xs text-muted-foreground/70">
                {shelfFilter === "morgon"
                    ? t("myShelf.addFirstMorning")
                    : shelfFilter === "kväll"
                      ? t("myShelf.addFirstEvening")
                      : shelfFilter === "ibland"
                        ? t("myShelf.addFirstOccasional")
                        : t("myShelf.addFirstWishlist")}
              </p>
            )}
          </div>
        ) : (
          <>
            <div className="space-y-2 px-2 pb-2">
              {gridProducts.map((product) => {
                const productName =
                  product.productName?.trim() || t("shelf.unknownProduct");
                const pc = conflictsInvolvingProduct(
                  productName, analysisData?.conflicts
                );
                const status: StatusLevel = analysisData
                  ? toStatusLevel(dotForConflicts(pc))
                  : "unknown";
                const bannerConflict = pickBannerConflict(pc);
                const topConflictName = bannerConflict
                  ? bannerConflict.product1Name === productName
                    ? bannerConflict.product2Name
                    : bannerConflict.product1Name
                  : undefined;

                return (
                  <div key={product.id} className="flex flex-col gap-1">
                    <ProductListRow
                      productName={productName}
                      brand={(product as { brand?: string | null }).brand ?? null}
                      routineSlot={
                        product.routineSlot as RoutineSlot
                      }
                      status={status}
                      conflictWith={topConflictName}
                      warningCount={status === "caution" ? pc.length : undefined}
                      onOpen={() =>
                        setDetailProduct({
                          product: {
                            shelfId: product.id,
                            product_name: productName,
                            productName,
                            ingredients: product.ingredients,
                            brand: (product as { brand?: string | null }).brand ?? null,
                            image_url: product.imageUrl ?? null,
                            imageUrl: product.imageUrl ?? null,
                            analysisResultJson: product.analysisResultJson ?? null,
                            routineSlot: product.routineSlot,
                          },
                          status,
                          conflicts: pc,
                        })
                      }
                      onRemove={() =>
                        setRemoveTarget({ id: product.id, name: productName })
                      }
                      removeAriaLabel={t("myShelf.removeProduct")}
                      removeDisabled={removeMutation.isPending}
                    />
                    {bannerConflict && (
                      <ShelfConflictBanner>
                        <span className="block font-medium">
                          {bannerConflict.pair}
                        </span>
                        <span
                          className="mt-1 block font-normal leading-snug"
                          style={{ color: "var(--rose-gold-deep)" }}
                        >
                          {bannerConflict.explanation}
                        </span>
                      </ShelfConflictBanner>
                    )}
                  </div>
                );
              })}

              {isFree && allProducts.length >= FREE_TIER_LIMIT && (
                <>
                  <LockedPremiumSlotCard
                    key="lock-a"
                    onOpenPaywall={() => setPaywallOpen(true)}
                  />
                  <LockedPremiumSlotCard
                    key="lock-b"
                    onOpenPaywall={() => setPaywallOpen(true)}
                  />
                </>
              )}
              {isFree && allProducts.length < FREE_TIER_LIMIT && (
                <DashedAddSlotCard onAdd={() => setShowAddForm(true)} />
              )}
            </div>
            {isFree && allProducts.length >= FREE_TIER_LIMIT && (
              <>
                <FreeShelfComboBanner products={freeVisibleForCombo} analysisState={analysisState} />
                <GoldShelfUpsellCard onOpenPaywall={() => setPaywallOpen(true)} />
              </>
            )}
          </>
        )}
      </div>

      {showAddForm ? (
        <div className="p-4 border-t border-border/30">
          <AddProductForm onClose={() => setShowAddForm(false)} onAdded={handleAdded} />
        </div>
      ) : (
        <div className="space-y-2 px-4 pb-4">

          {/* FIX: btn-dashed signalerar "tom plats att fylla" */}
          {(isPremium ||
            (isFree && allProducts.length < FREE_TIER_LIMIT)) && (
            <button
              type="button"
              onClick={() => setShowAddForm(true)}
              className="btn-dashed"
            >
              <Plus className="h-4 w-4" />
              {t("myShelf.addProductBtn")}
            </button>
          )}

          {allProducts.length >= 2 &&
            analysisState.status === "idle" && (
            <button
              type="button"
              onClick={handleRunAnalysis}
              className="btn-primary"
            >
              <Zap className="h-4 w-4" />
              {t("myShelf.checkMyRoutine")}
            </button>
          )}

          <button
            type="button"
            onClick={() => setShowContributeModal(true)}
            className="btn-contribute"
          >
            <span className="flex items-center gap-2">
              <PackagePlus className="h-4 w-4" />
              {t("myShelf.contributeCta")}
            </span>
            <ChevronRight className="h-4 w-4"
                          style={{ color: "var(--rose-gold)" }} />
          </button>

        </div>
      )}

      <AlertDialog
        open={removeTarget !== null}
        onOpenChange={(open) => {
          if (!open) setRemoveTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {removeTarget
                ? t("myShelf.removeDialogTitle", { name: removeTarget.name })
                : ""}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("myShelf.removeDialogDescription")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("myShelf.removeDialogCancel")}</AlertDialogCancel>
            <AlertDialogAction
              className={cn(buttonVariants({ variant: "destructive" }))}
              onClick={() => {
                if (removeTarget) void handleRemove(removeTarget.id);
                setRemoveTarget(null);
              }}
            >
              {t("myShelf.removeDialogConfirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {showContributeModal && (
        <ContributeModal
          onClose={() => setShowContributeModal(false)}
        />
      )}

      {detailProduct && (
        <ProductDetailSheet
          product={detailProduct.product}
          status={detailProduct.status}
          conflicts={detailProduct.conflicts}
          onClose={() => setDetailProduct(null)}
        />
      )}

      <RoutineCheckPanel
        productCount={allProducts.length}
        analysisState={analysisState}
        onRun={handleRunAnalysis}
        onClear={resetAnalysis}
      />

      <div className="mx-4 mb-4 mt-2">
        {isPremium ? (
          <button
            type="button"
            data-touch-target
            onClick={() => {
              const base = (import.meta.env.BASE_URL ?? "/").replace(/\/+$/, "") || "";
              window.open(`${base}/app/report`, "_blank", "noopener,noreferrer");
            }}
            className="relative flex w-full items-center gap-3 rounded-xl border border-border/40 bg-white px-4 py-3 text-left shadow-sm transition-[transform,box-shadow] hover:-translate-y-0.5"
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <FileText className="h-4 w-4 text-primary" aria-hidden />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium leading-tight text-foreground">{t("shelf.exportPdfCta")}</p>
              <p className="mt-0.5 text-xs text-muted-foreground/70">{t("myShelf.downloadPdfHint")}</p>
            </div>
          </button>
        ) : (
          <div className="relative flex cursor-not-allowed items-center gap-3 rounded-xl border border-dashed border-primary/30 bg-primary/[0.03] px-4 py-3 opacity-90 group">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <FileText className="h-4 w-4 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium leading-tight text-foreground">{t("myShelf.downloadPdf")}</p>
              <p className="mt-0.5 text-xs text-muted-foreground/70">{t("myShelf.downloadPdfHint")}</p>
            </div>
            <div className="flex shrink-0 items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-primary">
              <Lock className="h-3 w-3" />
              <span className="text-[11px] font-semibold uppercase tracking-wide">{t("myShelf.premium")}</span>
            </div>
          </div>
        )}
      </div>
      <PaywallModal open={paywallOpen} onOpenChange={setPaywallOpen} />
    </>
  );
}

export function MyShelfSection() {
  const { t } = useTranslation();
  return (
    <div className="bg-white rounded-3xl shadow-xl border border-border/40 overflow-hidden">
      <div className="bg-primary/8 px-6 py-4 border-b border-border/30 flex items-center justify-between">
        <span className="font-serif text-lg font-medium text-foreground">{t("myShelf.title")}</span>
        <span className="text-xs text-muted-foreground bg-primary/10 text-primary px-2.5 py-1 rounded-full font-medium">{t("myShelf.manyProductsCountFmt").replace("{count}", "5")}</span>
      </div>

      <div className="p-6 space-y-6">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Sun className="w-4 h-4 text-[#F59E0B]" />
            <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{t("myShelf.morning")}</span>
          </div>
          <div className="space-y-2">
            {["Vitamin C Serum", "Hyaluronic Acid", "SPF 50 Sunscreen"].map((p) => (
              <div key={p} className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-[#FAFAF8] border border-border/30">
                <span className="w-2 h-2 rounded-full bg-[#22C55E] shrink-0" />
                <span className="text-sm text-foreground">{p}</span>
              </div>
            ))}
          </div>
        </div>

        <div>
          <div className="flex items-center gap-2 mb-3">
            <Moon className="w-4 h-4 text-[var(--sage)]" />
            <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{t("myShelf.evening")}</span>
          </div>
          <div className="space-y-2">
            {["Retinol 0.5%", "Niacinamide Serum"].map((p) => (
              <div key={p} className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-[#FAFAF8] border border-border/30">
                <span className="w-2 h-2 rounded-full bg-[#22C55E] shrink-0" />
                <span className="text-sm text-foreground">{p}</span>
              </div>
            ))}
            <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-red-50 border border-red-200">
              <AlertTriangle className="w-3.5 h-3.5 text-red-500 shrink-0" />
              <span className="text-sm text-red-700">Glycolic Acid Toner</span>
              <span className="ml-auto text-[10px] font-semibold text-red-500 uppercase tracking-wide">{t("myShelf.severityConflictShort")}</span>
            </div>
          </div>
        </div>

        <button className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-border text-muted-foreground text-sm hover:border-primary hover:text-primary transition-colors duration-200">
          <Plus className="w-4 h-4" />
          {t("myShelf.addProductBtn")}
        </button>
      </div>
    </div>
  );
}
