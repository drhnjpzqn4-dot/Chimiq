import { useState, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
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
  ChevronDown, ChevronUp, ExternalLink, Zap,
} from "lucide-react";
import { FadeIn } from "@/components/FadeIn";
import { cn } from "@/lib/utils";

type RoutineSlot = "morning" | "evening" | "both";

interface AddProductFormProps {
  onClose: () => void;
  onAdded: () => void;
}

function AddProductForm({ onClose, onAdded }: AddProductFormProps) {
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
    onAdded();
  }, [productName, ingredients, routineSlot, addMutation, onAdded]);

  return (
    <div className="bg-white rounded-2xl border border-border/60 shadow-lg p-6">
      <div className="flex items-center justify-between mb-5">
        <h3 className="font-serif text-lg font-semibold text-foreground">Add a product</h3>
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
            {m === "search" ? "Search product" : "Paste ingredients"}
          </button>
        ))}
      </div>

      {mode === "search" && (
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="e.g. CeraVe Moisturising Cream"
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-border/60 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50"
            />
          </div>

          {lookupQuery.isFetching && (
            <p className="text-xs text-muted-foreground mt-2 ml-1">Searching…</p>
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
                  Use this
                </button>
              </div>
            </div>
          )}

          {lookupQuery.data && !lookupQuery.data.found && search.length > 2 && !lookupQuery.isFetching && (
            <p className="text-xs text-muted-foreground mt-2 ml-1">
              Product not found — try pasting the ingredient list manually.
            </p>
          )}

          {productName && (
            <div className="mt-3">
              <p className="text-xs font-medium text-muted-foreground mb-1">Product name</p>
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
            <label className="text-xs font-medium text-muted-foreground block mb-1">Product name</label>
            <input
              type="text"
              placeholder="e.g. Cetaphil Gentle Cleanser"
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-border/60 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1">Ingredient list</label>
            <textarea
              placeholder="Paste the full ingredient list here…"
              value={ingredients}
              onChange={(e) => setIngredients(e.target.value)}
              rows={4}
              className="w-full px-3 py-2.5 rounded-xl border border-border/60 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
            />
          </div>
        </div>
      )}

      <div className="mb-5">
        <p className="text-xs font-medium text-muted-foreground mb-2">Routine</p>
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
              {slot.charAt(0).toUpperCase() + slot.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={handleSubmit}
        disabled={!productName.trim() || !ingredients.trim() || addMutation.isPending}
        className="w-full py-3 rounded-xl bg-primary text-white text-sm font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {addMutation.isPending ? "Adding…" : "Add to shelf"}
      </button>
    </div>
  );
}

function ConflictCard({ conflict, delay }: { conflict: RoutineConflict; delay?: number }) {
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
              <><ShieldOff className="w-3 h-3" /> HIGH RISK</>
            ) : (
              <><AlertTriangle className="w-3 h-3" /> CAUTION</>
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
          Check my routine
        </button>
      </div>
    );
  }

  if (analysisState.status === "loading") {
    return (
      <div className="px-4 pb-4 border-t border-border/30 pt-3">
        <div className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-primary/5 border border-primary/20 text-primary/70 text-sm">
          <Loader2 className="w-4 h-4 animate-spin" />
          Analysing your routine…
        </div>
      </div>
    );
  }

  if (analysisState.status === "error") {
    return (
      <div className="px-4 pb-4 border-t border-border/30 pt-3 space-y-2">
        <div className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm">
          <AlertTriangle className="w-4 h-4" />
          Analysis failed. Please try again.
        </div>
        <button
          onClick={onRun}
          className="w-full py-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          Retry
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
              ? "Routine check: all clear"
              : `${highRiskCount + cautionCount} conflict${highRiskCount + cautionCount !== 1 ? "s" : ""} found`}
          </span>
          {!overallSafe && (
            <div className="flex items-center gap-1">
              {highRiskCount > 0 && (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded-full bg-red-100 text-red-600 text-[10px] font-bold">
                  {highRiskCount} HIGH
                </span>
              )}
              {cautionCount > 0 && (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[10px] font-bold">
                  {cautionCount} CAUTION
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
            Clear
          </button>
          <button onClick={() => setOpen((v) => !v)} aria-label={open ? "Collapse" : "Expand"}>
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
                <p className="text-sm font-semibold text-[#16A34A]">No conflicts found</p>
                <p className="text-xs text-[#16A34A]/70 mt-0.5">
                  Your routine looks good! No documented harmful interactions detected across your products.
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
            Re-check after changes
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

export function MyShelf({ displayName }: MyShelfProps) {
  const [tab, setTab] = useState<"morning" | "evening">("morning");
  const [showAddForm, setShowAddForm] = useState(false);
  const [analysisState, setAnalysisState] = useState<AnalysisState>({ status: "idle" });
  const [loadingDemo, setLoadingDemo] = useState(false);
  const queryClient = useQueryClient();
  const analyzeRoutineMutation = useAnalyzeRoutine();
  const addMutation = useAddToShelf();

  const shelfQuery = useGetShelf({ query: { queryKey: getGetShelfQueryKey() } });
  const removeMutation = useRemoveFromShelf();

  const allProducts = shelfQuery.data?.products ?? [];
  const filteredProducts = allProducts.filter((p) => {
    if (tab === "morning") return p.routineSlot === "morning" || p.routineSlot === "both";
    if (tab === "evening") return p.routineSlot === "evening" || p.routineSlot === "both";
    return true;
  });

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
          <span className="font-serif text-lg font-semibold text-foreground">My Shelf</span>
          {displayName && (
            <span className="ml-2 text-sm text-muted-foreground">— {displayName}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {analysisData && (
            analysisData.overallSafe ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-100 text-[#16A34A] text-[10px] font-bold">
                <ShieldCheck className="w-3 h-3" /> All clear
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-100 text-red-600 text-[10px] font-bold">
                <ShieldOff className="w-3 h-3" />
                {analysisData.highRiskCount + analysisData.cautionCount} conflict{(analysisData.highRiskCount + analysisData.cautionCount) !== 1 ? "s" : ""}
              </span>
            )
          )}
          <span className="text-xs text-muted-foreground bg-primary/10 text-primary px-2.5 py-1 rounded-full font-medium">
            {allProducts.length} product{allProducts.length !== 1 ? "s" : ""}
          </span>
        </div>
      </div>

      <div className="flex border-b border-border/30">
        {(["morning", "evening"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-semibold uppercase tracking-widest transition-colors ${
              tab === t
                ? "text-foreground border-b-2 border-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t === "morning" ? (
              <Sun className="w-3.5 h-3.5 text-[#F59E0B]" />
            ) : (
              <Moon className="w-3.5 h-3.5 text-primary" />
            )}
            {t}
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
              No {tab} products yet
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
                  {loadingDemo ? "Loading…" : "Load example routine"}
                </button>
                <p className="text-[11px] text-muted-foreground/50 mt-1.5">
                  3 real products with documented conflicts
                </p>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground/70 mt-1">
                Add your first {tab} product below
              </p>
            )}
          </div>
        ) : (
          filteredProducts.map((product) => (
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
                aria-label="Remove product"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))
        )}
      </div>

      {showAddForm ? (
        <div className="p-4 border-t border-border/30">
          <AddProductForm onClose={() => setShowAddForm(false)} onAdded={handleAdded} />
        </div>
      ) : (
        <div className="px-4 pb-4">
          <button
            onClick={() => setShowAddForm(true)}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-border text-muted-foreground text-sm hover:border-primary hover:text-primary transition-colors duration-200"
          >
            <Plus className="w-4 h-4" />
            Add product
          </button>
        </div>
      )}

      <RoutineCheckPanel
        productCount={allProducts.length}
        analysisState={analysisState}
        onRun={handleRunAnalysis}
        onClear={resetAnalysis}
      />
    </div>
  );
}

export function MyShelfSection() {
  return (
    <div className="bg-white rounded-3xl shadow-xl border border-border/40 overflow-hidden">
      <div className="bg-primary/8 px-6 py-4 border-b border-border/30 flex items-center justify-between">
        <span className="font-serif text-lg font-semibold text-foreground">My Shelf</span>
        <span className="text-xs text-muted-foreground bg-primary/10 text-primary px-2.5 py-1 rounded-full font-medium">5 products</span>
      </div>

      <div className="p-6 space-y-6">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Sun className="w-4 h-4 text-[#F59E0B]" />
            <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Morning</span>
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
            <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Evening</span>
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
              <span className="ml-auto text-[10px] font-semibold text-red-500 uppercase tracking-wide">Conflict</span>
            </div>
          </div>
        </div>

        <button className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-border text-muted-foreground text-sm hover:border-primary hover:text-primary transition-colors duration-200">
          <Plus className="w-4 h-4" />
          Add product
        </button>
      </div>
    </div>
  );
}
