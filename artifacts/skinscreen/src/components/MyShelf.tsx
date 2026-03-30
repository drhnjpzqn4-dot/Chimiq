import { useState, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetShelf,
  getGetShelfQueryKey,
  useAddToShelf,
  useRemoveFromShelf,
  useProductLookup,
  getProductLookupQueryKey,
} from "@workspace/api-client-react";
import { Sun, Moon, Plus, Trash2, Search, Layers, AlertTriangle, CheckCircle2, X } from "lucide-react";
import { FadeIn } from "@/components/FadeIn";

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

interface MyShelfProps {
  userId: string;
  displayName: string | null;
}

export function MyShelf({ displayName }: MyShelfProps) {
  const [tab, setTab] = useState<"morning" | "evening" | "both">("morning");
  const [showAddForm, setShowAddForm] = useState(false);
  const queryClient = useQueryClient();

  const shelfQuery = useGetShelf({ query: { queryKey: getGetShelfQueryKey() } });
  const removeMutation = useRemoveFromShelf();

  const allProducts = shelfQuery.data?.products ?? [];
  const filteredProducts = allProducts.filter((p) => {
    if (tab === "morning") return p.routineSlot === "morning" || p.routineSlot === "both";
    if (tab === "evening") return p.routineSlot === "evening" || p.routineSlot === "both";
    return true;
  });

  const handleAdded = useCallback(() => {
    setShowAddForm(false);
    queryClient.invalidateQueries({ queryKey: getGetShelfQueryKey() });
  }, [queryClient]);

  const handleRemove = useCallback(
    async (id: number) => {
      await removeMutation.mutateAsync({ id });
      queryClient.invalidateQueries({ queryKey: getGetShelfQueryKey() });
    },
    [removeMutation, queryClient],
  );

  return (
    <div className="bg-white rounded-3xl shadow-xl border border-border/40 overflow-hidden">
      <div className="bg-primary/8 px-6 py-4 border-b border-border/30 flex items-center justify-between">
        <div>
          <span className="font-serif text-lg font-semibold text-foreground">My Shelf</span>
          {displayName && (
            <span className="ml-2 text-sm text-muted-foreground">— {displayName}</span>
          )}
        </div>
        <span className="text-xs text-muted-foreground bg-primary/10 text-primary px-2.5 py-1 rounded-full font-medium">
          {allProducts.length} product{allProducts.length !== 1 ? "s" : ""}
        </span>
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
            <p className="text-xs text-muted-foreground/70 mt-1">
              Add your first {tab} product below
            </p>
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
    </div>
  );
}

export function MyShelfSection() {
  const [showConflictNote] = useState(false);

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

        {showConflictNote && null}

        <button className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-border text-muted-foreground text-sm hover:border-primary hover:text-primary transition-colors duration-200">
          <Plus className="w-4 h-4" />
          Add product
        </button>
      </div>
    </div>
  );
}
