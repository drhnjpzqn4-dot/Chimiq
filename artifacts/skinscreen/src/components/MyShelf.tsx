import { useState, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { ContributeModal } from "@/components/ContributeModal";
import {
  useGetShelf,
  getGetShelfQueryKey,
  useAddToShelf,
  useRemoveFromShelf,
  useAnalyzeRoutine,
  useProductLookup,
  getProductLookupQueryKey,
} from "@workspace/api-client-react";
import type { RoutineConflict, RoutineConflictResponse } from "@workspace/api-client-react";
import {
  Sun, Moon, Plus, Trash2, Search, Layers, AlertTriangle,
  CheckCircle2, X, ShieldCheck, ShieldOff, Loader2,
  ChevronDown, ChevronUp, ExternalLink, Zap, FileText, Lock, PackagePlus, Sparkles, Check,
} from "lucide-react";
import { FadeIn } from "@/components/FadeIn";
import { cn } from "@/lib/utils";
import { useUserPlan } from "@/hooks/useUserPlan";
import { useTranslation } from "@/lib/i18n";
import { trackEvent } from "@/lib/analytics";

type RoutineSlot = "morning" | "evening" | "both";

interface AddProductFormProps {
  onClose: () => void;
  onAdded: () => void;
}

function AddProductForm({ onClose, onAdded }: AddProductFormProps) {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const [productName, setProductName] = useState("");
  const [ingredients, setIngredients] = useState("");
  const [routineSlot, setRoutineSlot] = useState<RoutineSlot>("both");
  const [mode, setMode] = useState<"search" | "manual">("search");
  const [searchQuery, setSearchQuery] = useState("");

  const lookupQuery = useProductLookup(
    { q: searchQuery },
    {
      query: {
        enabled: searchQuery.length > 2,
        queryKey: getProductLookupQueryKey({ q: searchQuery }),
      },
    },
  );

  const addMutation = useAddToShelf();

  const handleSearchSelect = useCallback(() => {
    if (lookupQuery.data?.found && lookupQuery.data.productName && lookupQuery.data.ingredients) {
      setProductName(lookupQuery.data.productName);
      setIngredients(lookupQuery.data.ingredients);
    }
  }, [lookupQuery.data]);

  const handleSearch = useCallback((value: string) => {
    setSearch(value);
    const trimmed = value.trim();
    if (trimmed.length > 2) {
      setSearchQuery(trimmed);
    }
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!productName.trim() || !ingredients.trim()) return;
    await addMutation.mutateAsync({
      data: { productName: productName.trim(), ingredients: ingredients.trim(), routineSlot },
    });
    trackEvent("product_save", {
      product_name: productName.trim(),
      routine_slot: routineSlot,
      entry_mode: mode,
    });
    onAdded();
  }, [productName, ingredients, routineSlot, addMutation, onAdded, mode]);

  return (
    <div className="bg-white rounded-2xl border border-border/60 shadow-lg p-6">
      <div className="flex items-center justify-between mb-5">
        <h3 className="font-serif text-lg font-semibold text-foreground">{t("myShelf.addProduct")}</h3>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex gap-2 mb-5 p-1 bg-[#F5F5F7] rounded-xl">
        {(["search", "manual"] as const).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
              mode === m
                ? "bg-white text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {m === "search" ? t("myShelf.searchProduct") : t("myShelf.pasteIngredients")}
          </button>
        ))}
      </div>

      {mode === "search" && (
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder={t("myShelf.searchPlaceholder")}
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-border/60 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50"
            />
          </div>

          {lookupQuery.isFetching && (
            <p className="text-xs text-muted-foreground mt-2 ml-1">{t("myShelf.searching")}</p>
          )}

          {lookupQuery.data?.found && (
            <div className="mt-2 p-3 rounded-xl bg-primary/5 border border-primary/20">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-medium text-foreground">{lookupQuery.data.productName}</p>
                  {lookupQuery.data.brand && (
                    <p className="text-xs text-muted-foreground">{lookupQuery.data.brand}</p>
                  )}
                </div>
                <button
                  onClick={handleSearchSelect}
                  className="shrink-0 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
                >
                  {t("myShelf.useThis")}
                </button>
              </div>
            </div>
          )}

          {lookupQuery.data && !lookupQuery.data.found && search.length > 2 && !lookupQuery.isFetching && (
            <p className="text-xs text-muted-foreground mt-2 ml-1">
              {t("myShelf.productNotFound")}
            </p>
          )}

          {productName && (
            <div className="mt-3">
              <p className="text-xs font-medium text-muted-foreground mb-1">{t("myShelf.productName")}</p>
              <input
                type="text"
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-border/60 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
          )}
        </div>
      )}

      {mode === "manual" && (
        <div className="mb-4 space-y-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1">{t("myShelf.productName")}</label>
            <input
              type="text"
              placeholder={t("myShelf.manualPlaceholder")}
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-border/60 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1">{t("myShelf.ingredientList")}</label>
            <textarea
              placeholder={t("myShelf.ingredientsPlaceholder")}
              value={ingredients}
              onChange={(e) => setIngredients(e.target.value)}
              rows={4}
              className="w-full px-3 py-2.5 rounded-xl border border-border/60 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
            />
          </div>
        </div>
      )}

      <div className="mb-5">
        <p className="text-xs font-medium text-muted-foreground mb-2">{t("myShelf.routine")}</p>
        <div className="flex gap-2">
          {(["morning", "evening", "both"] as RoutineSlot[]).map((slot) => (
            <button
              key={slot}
              onClick={() => setRoutineSlot(slot)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all duration-150 ${
                routineSlot === slot
                  ? "bg-primary text-white border-primary"
                  : "bg-white text-muted-foreground border-border/60 hover:border-primary/40"
              }`}
            >
              {slot === "morning" && <Sun className="w-3 h-3" />}
              {slot === "evening" && <Moon className="w-3 h-3" />}
              {slot === "both" && <Layers className="w-3 h-3" />}
              {t(`myShelf.slot.${slot}`)}
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={handleSubmit}
        disabled={!productName.trim() || !ingredients.trim() || addMutation.isPending}
        className="w-full py-3 rounded-xl bg-primary text-white text-sm font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {addMutation.isPending ? t("myShelf.adding") : t("myShelf.addToShelf")}
      </button>
    </div>
  );
}

function ConflictCard({ conflict, delay }: { conflict: RoutineConflict; delay?: number }) {
  const { t } = useTranslation();
  const isHighRisk = conflict.severity === "HIGH_RISK";
  return (
    <FadeIn delay={delay} fullWidth>
      <div className={cn(
        "p-4 rounded-2xl border",
        isHighRisk ? "bg-red-50/70 border-red-200" : "bg-amber-50/50 border-amber-200/70",
      )}>
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="min-w-0">
            <p className="text-xs font-semibold text-muted-foreground mb-0.5">
              {conflict.product1Name} + {conflict.product2Name}
            </p>
            <p className="text-sm font-serif font-semibold text-foreground leading-snug">
              {conflict.pair}
            </p>
          </div>
          <span className={cn(
            "shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider whitespace-nowrap",
            isHighRisk ? "bg-red-100 text-red-600" : "bg-amber-100 text-amber-700",
          )}>
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
    if (productCount < 2) return null;
    return (
      <div className="px-4 pb-4 border-t border-border/30 pt-3">
        <button
          onClick={onRun}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium transition-all duration-200 bg-primary/10 text-primary hover:bg-primary/15 border border-primary/20"
        >
          <Zap className="w-4 h-4" />
          {t("myShelf.checkMyRoutine")}
        </button>
      </div>
    );
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
            <ShieldCheck className="w-4 h-4 text-[#22C55E] shrink-0" />
          ) : highRiskCount > 0 ? (
            <ShieldOff className="w-4 h-4 text-red-500 shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
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
                <span className="inline-flex items-center px-1.5 py-0.5 rounded-full bg-red-100 text-red-600 text-[10px] font-bold">
                  {highRiskCount} {t("myShelf.high")}
                </span>
              )}
              {cautionCount > 0 && (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[10px] font-bold">
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
            <div className="flex items-center gap-3 p-4 rounded-2xl bg-green-50 border border-green-200">
              <ShieldCheck className="w-5 h-5 text-[#22C55E] shrink-0" />
              <div>
                <p className="text-sm font-semibold text-[#16A34A]">{t("myShelf.noConflicts")}</p>
                <p className="text-xs text-[#16A34A]/70 mt-0.5">
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

type ShelfTab = "morning" | "evening" | "both";

const FREE_TIER_LIMIT = 2;

interface UpgradeCardProps {
  onUpgrade: () => void;
}

function UpgradeCard({ onUpgrade }: UpgradeCardProps) {
  const { t } = useTranslation();
  const { trialEligible, trialDays } = useUserPlan();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [billing, setBilling] = useState<"monthly" | "yearly">("yearly");
  const benefits = [
    t("myShelf.benefit1"),
    t("myShelf.benefit2"),
    t("myShelf.benefit3"),
    t("myShelf.benefit4"),
  ];

  const handleClick = async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/payments/checkout", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: billing }),
      });
      if (!res.ok) {
        // Fallback to pricing page if checkout endpoint fails (e.g. not configured)
        onUpgrade();
        return;
      }
      const data = (await res.json()) as { url?: string };
      if (data.url) {
        window.location.href = data.url;
      } else {
        onUpgrade();
      }
    } catch {
      setError(t("myShelf.errCheckout"));
      setLoading(false);
    }
  };

  return (
    <div className="rounded-2xl bg-gradient-to-br from-primary/8 via-primary/5 to-amber-50/40 border border-primary/30 p-5 shadow-sm">
      <div className="flex items-center gap-2 mb-2">
        <Sparkles className="w-4 h-4 text-primary" />
        <p className="text-[11px] font-bold uppercase tracking-widest text-primary">
          {t("myShelf.premium")}
        </p>
      </div>
      <p className="font-serif text-xl font-semibold text-foreground leading-tight mb-3">
        {t("myShelf.upgradeUnlock")}
      </p>

      <div className="inline-flex items-center bg-white/70 border border-primary/20 rounded-full p-0.5 mb-3">
        <button
          type="button"
          onClick={() => setBilling("monthly")}
          className={`px-3 py-1 rounded-full text-[11px] font-semibold transition-colors ${
            billing === "monthly"
              ? "bg-primary text-white"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {t("myShelf.monthly")}
        </button>
        <button
          type="button"
          onClick={() => setBilling("yearly")}
          className={`px-3 py-1 rounded-full text-[11px] font-semibold transition-colors flex items-center gap-1.5 ${
            billing === "yearly"
              ? "bg-primary text-white"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {t("myShelf.yearly")}
          <span
            className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold ${
              billing === "yearly"
                ? "bg-white text-primary"
                : "bg-primary/15 text-primary"
            }`}
          >
            {t("myShelf.saveBadge")}
          </span>
        </button>
      </div>

      <p className="text-sm text-muted-foreground mb-4">
        <span className="font-bold text-foreground">
          {billing === "yearly" ? t("myShelf.priceYearly") : t("myShelf.priceMonthly")}
        </span>
        {billing === "yearly" ? t("myShelf.yearlyDetail") : ""}{t("myShelf.cancelAnytime")}
      </p>
      <ul className="space-y-1.5 mb-4">
        {benefits.map((b) => (
          <li key={b} className="flex items-start gap-2 text-xs text-foreground">
            <Check className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
            <span>{b}</span>
          </li>
        ))}
      </ul>
      <button
        onClick={handleClick}
        disabled={loading}
        className="w-full py-3 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition-colors shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {loading
          ? t("myShelf.startingCheckout")
          : trialEligible
            ? t("pricing.startTrialCta", { days: trialDays })
            : t("myShelf.upgradePriceFmt").replace("{price}", billing === "yearly" ? t("myShelf.priceYearly") : t("myShelf.priceMonthly"))}
      </button>
      {error && (
        <p className="text-[11px] text-red-600 text-center mt-2">{error}</p>
      )}
      {trialEligible ? (
        <p className="text-[10px] text-primary/80 text-center mt-2 font-medium">
          {t("pricing.trialFinePrint", {
            days: trialDays,
            price: billing === "yearly" ? t("myShelf.priceYearly") : t("myShelf.priceMonthly"),
          })}
        </p>
      ) : (
        <p className="text-[10px] text-muted-foreground/60 text-center mt-2">
          {t("myShelf.contributeAlt")}
        </p>
      )}
    </div>
  );
}

function LockedSlotCard({ index, onUpgrade }: { index: number; onUpgrade: () => void }) {
  const { t } = useTranslation();
  return (
    <button
      onClick={onUpgrade}
      className="w-full group flex items-center gap-3 px-4 py-2.5 rounded-xl bg-[#FAFAF8] border border-dashed border-primary/30 hover:border-primary/60 hover:bg-primary/[0.04] transition-colors text-left"
    >
      <div className="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
        <Lock className="w-3 h-3 text-primary" />
      </div>
      <span className="text-sm text-muted-foreground flex-1 min-w-0">
        {t("myShelf.slotLockedFmt").replace("{index}", String(index))}
      </span>
      <span className="text-[10px] font-semibold text-primary uppercase tracking-wide bg-primary/10 px-2 py-0.5 rounded-full shrink-0 group-hover:bg-primary/15 transition-colors">
        {t("myShelf.premium")}
      </span>
    </button>
  );
}

export function MyShelf({ displayName }: MyShelfProps) {
  const { t } = useTranslation();
  const [tab, setTab] = useState<ShelfTab>("morning");
  const [showAddForm, setShowAddForm] = useState(false);
  const [showContributeModal, setShowContributeModal] = useState(false);
  const [analysisState, setAnalysisState] = useState<AnalysisState>({ status: "idle" });
  const [loadingDemo, setLoadingDemo] = useState(false);
  const queryClient = useQueryClient();
  const analyzeRoutineMutation = useAnalyzeRoutine();
  const addMutation = useAddToShelf();
  const [, navigate] = useLocation();
  const { plan } = useUserPlan();

  const shelfQuery = useGetShelf({ query: { queryKey: getGetShelfQueryKey() } });
  const removeMutation = useRemoveFromShelf();

  const allProducts = shelfQuery.data?.products ?? [];
  const filteredProducts = allProducts.filter((p) => {
    if (tab === "morning") return p.routineSlot === "morning" || p.routineSlot === "both";
    if (tab === "evening") return p.routineSlot === "evening" || p.routineSlot === "both";
    return true;
  });
  const isFree = plan === "free";
  // Locked-slot placeholders only after free user has reached their limit
  const lockedSlotsCount = isFree && allProducts.length >= FREE_TIER_LIMIT ? 2 : 0;
  const handleUpgrade = useCallback(() => navigate("/pricing"), [navigate]);

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
    <div className="bg-white rounded-3xl shadow-xl border border-border/40 overflow-hidden">
      <div className="bg-primary/8 px-6 py-4 border-b border-border/30 flex items-center justify-between">
        <div>
          <span className="font-serif text-lg font-semibold text-foreground">{t("myShelf.title")}</span>
          {displayName && (
            <span className="ml-2 text-sm text-muted-foreground">— {displayName}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {analysisData && (
            analysisData.overallSafe ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-100 text-[#16A34A] text-[10px] font-bold">
                <ShieldCheck className="w-3 h-3" /> {t("myShelf.allClear")}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-100 text-red-600 text-[10px] font-bold">
                <ShieldOff className="w-3 h-3" />
                {(analysisData.highRiskCount + analysisData.cautionCount) === 1
                  ? t("myShelf.oneConflictBadge")
                  : t("myShelf.manyConflictsBadgeFmt").replace("{count}", String(analysisData.highRiskCount + analysisData.cautionCount))}
              </span>
            )
          )}
          <span className="text-xs text-muted-foreground bg-primary/10 text-primary px-2.5 py-1 rounded-full font-medium">
            {allProducts.length === 1
              ? t("myShelf.oneProductCount")
              : t("myShelf.manyProductsCountFmt").replace("{count}", String(allProducts.length))}
          </span>
        </div>
      </div>

      <div className="flex border-b border-border/30">
        {(["morning", "evening", "both"] as ShelfTab[]).map((tabKey) => (
          <button
            key={tabKey}
            onClick={() => setTab(tabKey)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-semibold uppercase tracking-widest transition-colors ${
              tab === tabKey
                ? "text-foreground border-b-2 border-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tabKey === "morning" && <Sun className="w-3.5 h-3.5 text-[#F59E0B]" />}
            {tabKey === "evening" && <Moon className="w-3.5 h-3.5 text-primary" />}
            {tabKey === "both" && <Layers className="w-3.5 h-3.5 text-primary" />}
            {tabKey === "morning" ? t("myShelf.morning") : tabKey === "evening" ? t("myShelf.evening") : t("myShelf.tabBoth")}
          </button>
        ))}
      </div>

      <div className="p-4 space-y-2 min-h-[160px]">
        {shelfQuery.isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-10 rounded-xl bg-[#F5F5F7] animate-pulse" />
            ))}
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center mb-3">
              {tab === "morning" ? (
                <Sun className="w-5 h-5 text-primary" />
              ) : (
                <Moon className="w-5 h-5 text-primary" />
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              {tab === "morning" ? t("myShelf.emptyMorning") : tab === "evening" ? t("myShelf.emptyEvening") : t("myShelf.emptyBoth")}
            </p>
            {shelfQuery.isSuccess && allProducts.length === 0 ? (
              <div className="mt-3">
                <button
                  type="button"
                  onClick={handleLoadDemo}
                  disabled={loadingDemo}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary bg-primary/10 hover:bg-primary/15 px-3 py-1.5 rounded-full transition-colors disabled:opacity-60"
                >
                  {loadingDemo ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Zap className="w-3 h-3" />
                  )}
                  {loadingDemo ? t("myShelf.loading") : t("myShelf.loadExample")}
                </button>
                <p className="text-[11px] text-muted-foreground/50 mt-1.5">
                  {t("myShelf.threeRealProducts")}
                </p>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground/70 mt-1">
                {tab === "morning" ? t("myShelf.addFirstMorning") : tab === "evening" ? t("myShelf.addFirstEvening") : t("myShelf.addFirstBoth")}
              </p>
            )}
          </div>
        ) : (
          <>
            {filteredProducts.map((product) => (
              <div
                key={product.id}
                className="group flex items-center gap-3 px-4 py-2.5 rounded-xl bg-[#FAFAF8] border border-border/30 hover:border-border/50 transition-colors"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-[#22C55E] shrink-0" />
                <span className="text-sm text-foreground flex-1 min-w-0 truncate">{product.productName}</span>
                {product.routineSlot === "both" && (
                  <span className="text-[10px] text-muted-foreground/60 shrink-0">AM+PM</span>
                )}
                <button
                  onClick={() => handleRemove(product.id)}
                  disabled={removeMutation.isPending}
                  className="opacity-0 group-hover:opacity-100 text-muted-foreground/50 hover:text-red-400 transition-all ml-1"
                  aria-label={t("myShelf.removeProduct")}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}

            {isFree && lockedSlotsCount > 0 && (
              <div className="space-y-2 pt-1">
                {Array.from({ length: lockedSlotsCount }).map((_, i) => (
                  <LockedSlotCard
                    key={`locked-${i}`}
                    index={allProducts.length + i + 1}
                    onUpgrade={handleUpgrade}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {showAddForm ? (
        <div className="p-4 border-t border-border/30">
          <AddProductForm onClose={() => setShowAddForm(false)} onAdded={handleAdded} />
        </div>
      ) : (
        <div className="px-4 pb-4 space-y-3">
          {isFree && allProducts.length >= FREE_TIER_LIMIT ? (
            <UpgradeCard onUpgrade={handleUpgrade} />
          ) : (
            <button
              onClick={() => setShowAddForm(true)}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-border text-muted-foreground text-sm hover:border-primary hover:text-primary transition-colors duration-200"
            >
              <Plus className="w-4 h-4" />
              {t("myShelf.addProductBtn")}
            </button>
          )}
          <button
            onClick={() => setShowContributeModal(true)}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-amber-200 bg-amber-50/50 text-amber-700 text-xs font-medium hover:bg-amber-50 hover:border-amber-300 transition-colors duration-200"
          >
            <PackagePlus className="w-3.5 h-3.5" />
            {t("myShelf.contributeCta")}
          </button>
        </div>
      )}

      {showContributeModal && (
        <ContributeModal
          onClose={() => setShowContributeModal(false)}
        />
      )}

      <RoutineCheckPanel
        productCount={allProducts.length}
        analysisState={analysisState}
        onRun={handleRunAnalysis}
        onClear={resetAnalysis}
      />

      <div className="mx-4 mb-4 mt-2">
        <div className="relative flex items-center gap-3 px-4 py-3 rounded-xl border border-dashed border-primary/30 bg-primary/[0.03] cursor-not-allowed group">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <FileText className="w-4 h-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground leading-tight">{t("myShelf.downloadPdf")}</p>
            <p className="text-xs text-muted-foreground/70 mt-0.5">{t("myShelf.downloadPdfHint")}</p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0 bg-primary/10 text-primary px-2.5 py-1 rounded-full">
            <Lock className="w-3 h-3" />
            <span className="text-[11px] font-semibold uppercase tracking-wide">{t("myShelf.premium")}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function MyShelfSection() {
  const { t } = useTranslation();
  return (
    <div className="bg-white rounded-3xl shadow-xl border border-border/40 overflow-hidden">
      <div className="bg-primary/8 px-6 py-4 border-b border-border/30 flex items-center justify-between">
        <span className="font-serif text-lg font-semibold text-foreground">{t("myShelf.title")}</span>
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
            <Moon className="w-4 h-4 text-[#7BAF7A]" />
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
