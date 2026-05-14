import { useEffect, useMemo, useState, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import {
  Loader2,
  CheckCircle2,
  XCircle,
  LogOut,
  ShieldCheck,
  AlertTriangle,
  ShieldAlert,
  MessageSquareWarning,
  Search,
  Pencil,
  X,
  Save,
  Plus,
  Trash2,
} from "lucide-react";
import { AdminRouteGuard } from "@/components/AdminRouteGuard";
import { apiFetch } from "@/lib/api";

interface AiVerdict {
  riskLevel: "safe" | "caution" | "high_risk";
  summary: string;
  flagged: { ingredient: string; reason: string; severity: string }[];
  warnings: string[];
  saferSwaps: { from: string; to: string; why: string }[];
}

interface Ingredient {
  name: string;
  amount?: string;
  notes?: string;
}

interface RecipeRow {
  id: string;
  submitterId: string;
  title: string;
  category: string;
  skinTypes: string[];
  ingredients: Ingredient[];
  method: string | null;
  photoUrl: string | null;
  aiVerdict: AiVerdict | null;
  riskLevel: "safe" | "caution" | "high_risk" | null;
  status: string;
  adminNote: string | null;
  createdAt: string;
}

const RISK: Record<string, { bg: string; text: string; label: string }> = {
  safe: { bg: "bg-green-100", text: "text-green-700", label: "Safe" },
  caution: { bg: "bg-amber-100", text: "text-amber-700", label: "Caution" },
  high_risk: { bg: "bg-red-100", text: "text-red-700", label: "High risk" },
};

const STATUS_TABS = [
  { key: "pending", label: "Pending" },
  { key: "changes_requested", label: "Changes" },
  { key: "approved", label: "Approved" },
  { key: "rejected", label: "Rejected" },
  { key: "all", label: "All" },
] as const;

const CATEGORIES = [
  "cleanser",
  "toner",
  "serum",
  "moisturizer",
  "mask",
  "exfoliant",
  "oil",
  "balm",
  "mist",
  "scrub",
  "other",
] as const;

const SKIN_TYPES = ["dry", "oily", "combination", "sensitive", "normal", "all"] as const;

type StatusFilter = (typeof STATUS_TABS)[number]["key"];
type RiskFilter = "" | "safe" | "caution" | "high_risk";
type CategoryFilter = "" | (typeof CATEGORIES)[number];

interface EditDraft {
  title: string;
  category: string;
  skinTypes: string[];
  ingredients: Ingredient[];
  method: string;
}

export default function AdminRecipesPage() {
  return (
    <AdminRouteGuard>
      <AdminRecipesPageInner />
    </AdminRouteGuard>
  );
}

function AdminRecipesPageInner() {
  const { user, isLoading, isAuthenticated, logout } = useAuth();
  const [recipes, setRecipes] = useState<RecipeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("pending");
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("");
  const [riskFilter, setRiskFilter] = useState<RiskFilter>("");
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkNote, setBulkNote] = useState("");
  const [bulkLoading, setBulkLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<EditDraft | null>(null);
  const [editSaving, setEditSaving] = useState(false);

  const [, navigate] = useLocation();
  const base = (import.meta.env.BASE_URL ?? "/").replace(/\/+$/, "") || "";

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate(`/signup?next=${encodeURIComponent(base + "/admin/recipes")}`);
    }
  }, [isLoading, isAuthenticated, base, navigate]);

  // Debounce the search input → query.
  useEffect(() => {
    const t = setTimeout(() => setSearchQuery(searchInput.trim()), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const fetchRecipes = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set("status", statusFilter);
      if (categoryFilter) params.set("category", categoryFilter);
      if (riskFilter) params.set("riskLevel", riskFilter);
      if (searchQuery) params.set("q", searchQuery);
      const res = await apiFetch(`/api/admin/recipes?${params.toString()}`, {
        credentials: "include",
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setError(data.error ?? "Failed to load recipes.");
        setLoading(false);
        return;
      }
      const data = (await res.json()) as { recipes: RecipeRow[] };
      setRecipes(data.recipes);
      setSelected((prev) => {
        const next = new Set<string>();
        const ids = new Set(data.recipes.map((r) => r.id));
        prev.forEach((id) => {
          if (ids.has(id)) next.add(id);
        });
        return next;
      });
    } catch {
      setError("Network error loading recipes.");
    }
    setLoading(false);
  }, [statusFilter, categoryFilter, riskFilter, searchQuery]);

  useEffect(() => {
    if (isAuthenticated) fetchRecipes();
  }, [isAuthenticated, fetchRecipes]);

  const act = async (id: string, action: "approve" | "request-changes" | "reject") => {
    setActionLoading((prev) => ({ ...prev, [id]: true }));
    try {
      const res = await apiFetch(`/api/admin/recipes/${id}/${action}`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note: notes[id]?.trim() || undefined }),
      });
      if (res.ok) {
        // If the current view doesn't include the new status, drop it from the
        // list. Otherwise refetch to keep counts honest.
        if (statusFilter === "pending" || statusFilter !== "all") {
          setRecipes((prev) => prev.filter((r) => r.id !== id));
        } else {
          fetchRecipes();
        }
      }
    } finally {
      setActionLoading((prev) => ({ ...prev, [id]: false }));
    }
  };

  const startEdit = (r: RecipeRow) => {
    setEditingId(r.id);
    setEditDraft({
      title: r.title,
      category: r.category,
      skinTypes: [...r.skinTypes],
      ingredients: r.ingredients.map((i) => ({ ...i })),
      method: r.method ?? "",
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditDraft(null);
  };

  const saveEdit = async () => {
    if (!editingId || !editDraft) return;
    setEditSaving(true);
    try {
      const res = await apiFetch(`/api/admin/recipes/${editingId}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editDraft.title,
          category: editDraft.category,
          skinTypes: editDraft.skinTypes,
          ingredients: editDraft.ingredients.filter((i) => i.name.trim()),
          method: editDraft.method,
        }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        alert(data.error ?? "Failed to save edits.");
        return;
      }
      const data = (await res.json()) as { recipe: RecipeRow };
      setRecipes((prev) => prev.map((r) => (r.id === editingId ? { ...r, ...data.recipe } : r)));
      cancelEdit();
    } finally {
      setEditSaving(false);
    }
  };

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAllVisible = () => {
    setSelected((prev) =>
      prev.size === recipes.length ? new Set() : new Set(recipes.map((r) => r.id)),
    );
  };

  const bulkAct = async (action: "approve" | "request-changes" | "reject") => {
    if (selected.size === 0) return;
    setBulkLoading(true);
    try {
      const res = await apiFetch("/api/admin/recipes/bulk", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ids: Array.from(selected),
          action,
          note: bulkNote.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        alert(data.error ?? "Bulk action failed.");
        return;
      }
      setBulkNote("");
      setSelected(new Set());
      fetchRecipes();
    } finally {
      setBulkLoading(false);
    }
  };

  const filtersActive = useMemo(
    () => statusFilter !== "pending" || categoryFilter || riskFilter || searchQuery,
    [statusFilter, categoryFilter, riskFilter, searchQuery],
  );

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAFAF8]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }
  if (!isAuthenticated || !user) return null;

  return (
    <div className="min-h-screen bg-[#FAFAF8] pb-32">
      <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-border/30">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <a href={base + "/"}>
            <img
              src={`${import.meta.env.BASE_URL}images/logo-chimiq-long.png`}
              alt="Chimiq"
              className="h-8 w-auto"
            />
          </a>
          <div className="flex items-center gap-3">
            <a
              href={base + "/admin/submissions"}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Products →
            </a>
            <a
              href={base + "/admin/funnel"}
              className="text-xs text-muted-foreground hover:text-foreground hidden sm:inline"
            >
              Funnel →
            </a>
            <span className="flex items-center gap-1.5 text-xs font-medium text-primary px-3 py-1.5 rounded-full bg-primary/10">
              <ShieldCheck className="w-3.5 h-3.5" />
              Admin
            </span>
            <button
              onClick={logout}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5 rounded-lg hover:bg-border/20"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Log out</span>
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
        <div className="mb-6">
          <h1 className="text-3xl font-serif font-medium text-foreground mb-1">
            DIY recipe queue
          </h1>
          <p className="text-muted-foreground text-base">
            Filter, search, edit, and moderate crowdsourced DIY recipes.
          </p>
        </div>

        {/* Filter bar */}
        <div className="bg-white rounded-2xl border border-border/60 p-4 mb-6 space-y-3">
          <div className="flex flex-wrap gap-2">
            {STATUS_TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => setStatusFilter(t.key)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                  statusFilter === t.key
                    ? "bg-primary text-white"
                    : "bg-muted/40 text-muted-foreground hover:bg-muted"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search title or ingredient…"
                className="w-full pl-9 pr-8 py-2 rounded-xl border border-border/60 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white"
              />
              {searchInput && (
                <button
                  onClick={() => setSearchInput("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-muted"
                >
                  <X className="w-3 h-3 text-muted-foreground" />
                </button>
              )}
            </div>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value as CategoryFilter)}
              className="px-3 py-2 rounded-xl border border-border/60 text-sm bg-white capitalize focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value="">All categories</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c} className="capitalize">
                  {c}
                </option>
              ))}
            </select>
            <select
              value={riskFilter}
              onChange={(e) => setRiskFilter(e.target.value as RiskFilter)}
              className="px-3 py-2 rounded-xl border border-border/60 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value="">All risk levels</option>
              <option value="safe">Safe</option>
              <option value="caution">Caution</option>
              <option value="high_risk">High risk</option>
            </select>
            {filtersActive && (
              <button
                onClick={() => {
                  setStatusFilter("pending");
                  setCategoryFilter("");
                  setRiskFilter("");
                  setSearchInput("");
                }}
                className="text-xs text-muted-foreground hover:text-foreground underline"
              >
                Reset
              </button>
            )}
          </div>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        )}

        {!loading && error && (
          <div className="rounded-2xl bg-red-50 border border-red-200 p-6 text-center">
            <p className="text-red-600 font-medium">{error}</p>
          </div>
        )}

        {!loading && !error && recipes.length === 0 && (
          <div className="rounded-2xl bg-white border border-border/60 p-12 text-center">
            <CheckCircle2 className="w-12 h-12 text-green-400 mx-auto mb-4" />
            <p className="text-lg font-serif font-medium text-foreground mb-1">
              No recipes match these filters
            </p>
            <p className="text-muted-foreground text-sm">
              Adjust the filters above or reset to the default view.
            </p>
          </div>
        )}

        {!loading && !error && recipes.length > 0 && (
          <div className="space-y-6">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <p className="text-sm text-muted-foreground">
                {recipes.length} recipe{recipes.length !== 1 ? "s" : ""} ·{" "}
                <button
                  onClick={selectAllVisible}
                  className="text-primary underline hover:text-primary/80"
                >
                  {selected.size === recipes.length ? "Clear selection" : "Select all"}
                </button>
              </p>
            </div>
            {recipes.map((r) => {
              const isProcessing = actionLoading[r.id];
              const risk = r.riskLevel ? RISK[r.riskLevel] : null;
              const isEditing = editingId === r.id && editDraft;
              const isSelected = selected.has(r.id);
              return (
                <div
                  key={r.id}
                  className={`bg-white rounded-2xl border shadow-sm overflow-hidden transition-colors ${
                    isSelected ? "border-primary/60 ring-2 ring-primary/20" : "border-border/60"
                  }`}
                >
                  <div className="px-6 py-4 bg-muted/30 border-b border-border/40 flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelect(r.id)}
                        className="mt-1.5 w-4 h-4 rounded border-border/60 text-primary focus:ring-primary/30"
                        aria-label={`Select ${r.title}`}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h2 className="font-serif text-lg font-medium text-foreground">
                            {r.title}
                          </h2>
                          <span className="text-[11px] px-2 py-0.5 rounded-full bg-primary/10 text-primary capitalize">
                            {r.category}
                          </span>
                          <span className="text-[11px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground capitalize">
                            {r.status.replace("_", " ")}
                          </span>
                          {risk && (
                            <span
                              className={`text-[11px] px-2 py-0.5 rounded-full ${risk.bg} ${risk.text} flex items-center gap-1`}
                            >
                              {r.riskLevel === "high_risk" ? (
                                <ShieldAlert className="w-3 h-3" />
                              ) : r.riskLevel === "caution" ? (
                                <AlertTriangle className="w-3 h-3" />
                              ) : (
                                <CheckCircle2 className="w-3 h-3" />
                              )}
                              {risk.label}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          Submitted {new Date(r.createdAt).toLocaleDateString()} · skin types:{" "}
                          {r.skinTypes.join(", ")}
                        </p>
                      </div>
                    </div>
                    {!isEditing && (
                      <button
                        onClick={() => startEdit(r)}
                        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground px-2.5 py-1.5 rounded-lg hover:bg-white border border-transparent hover:border-border/60"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                        Edit
                      </button>
                    )}
                  </div>

                  <div className="p-6 space-y-4">
                    {r.aiVerdict && (
                      <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
                          AI safety summary
                        </p>
                        <p className="text-sm">{r.aiVerdict.summary}</p>
                        {r.aiVerdict.flagged.length > 0 && (
                          <ul className="mt-3 space-y-1.5">
                            {r.aiVerdict.flagged.map((f, i) => (
                              <li key={i} className="text-sm">
                                <span className="font-semibold">{f.ingredient}:</span>{" "}
                                <span className="text-muted-foreground">{f.reason}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    )}

                    {isEditing ? (
                      <EditPanel
                        draft={editDraft!}
                        onChange={setEditDraft}
                        onSave={saveEdit}
                        onCancel={cancelEdit}
                        saving={editSaving}
                      />
                    ) : (
                      <>
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                            Ingredients
                          </p>
                          <ul className="space-y-1 text-sm">
                            {r.ingredients.map((ing, i) => (
                              <li key={i}>
                                <span className="font-medium">{ing.name}</span>
                                {ing.amount && (
                                  <span className="text-muted-foreground"> — {ing.amount}</span>
                                )}
                                {ing.notes && (
                                  <span className="text-muted-foreground"> ({ing.notes})</span>
                                )}
                              </li>
                            ))}
                          </ul>
                        </div>

                        {r.method && (
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
                              Method
                            </p>
                            <p className="whitespace-pre-line text-sm text-foreground/90">
                              {r.method}
                            </p>
                          </div>
                        )}

                        <div>
                          <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1 block">
                            Admin note (optional, sent with action)
                          </label>
                          <textarea
                            value={notes[r.id] ?? ""}
                            onChange={(e) =>
                              setNotes((prev) => ({ ...prev, [r.id]: e.target.value }))
                            }
                            rows={2}
                            maxLength={1000}
                            placeholder="Why are you approving / asking for changes / rejecting?"
                            className="w-full px-3 py-2 rounded-xl border border-border/60 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white resize-none"
                          />
                        </div>

                        <div className="flex flex-wrap items-center gap-3 pt-1">
                          <button
                            onClick={() => act(r.id, "approve")}
                            disabled={isProcessing}
                            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary/90 disabled:opacity-50"
                          >
                            {isProcessing ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <CheckCircle2 className="w-4 h-4" />
                            )}
                            Approve & publish
                          </button>
                          <button
                            onClick={() => act(r.id, "request-changes")}
                            disabled={isProcessing}
                            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-amber-300 text-amber-700 text-sm font-medium hover:bg-amber-50 disabled:opacity-50"
                          >
                            <MessageSquareWarning className="w-4 h-4" />
                            Request changes
                          </button>
                          <button
                            onClick={() => act(r.id, "reject")}
                            disabled={isProcessing}
                            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-destructive/40 text-destructive text-sm font-medium hover:bg-red-50 disabled:opacity-50"
                          >
                            <XCircle className="w-4 h-4" />
                            Reject
                          </button>
                          {r.adminNote && (
                            <p className="text-xs text-muted-foreground italic ml-auto max-w-xs truncate">
                              Last note: {r.adminNote}
                            </p>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Sticky bulk-action bar */}
      {selected.size > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-border/60 shadow-lg">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 flex flex-wrap items-center gap-3">
            <span className="text-sm font-semibold text-foreground">
              {selected.size} selected
            </span>
            <input
              type="text"
              value={bulkNote}
              onChange={(e) => setBulkNote(e.target.value)}
              placeholder="Optional note for all"
              maxLength={1000}
              className="flex-1 min-w-[160px] px-3 py-1.5 rounded-lg border border-border/60 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            <button
              onClick={() => bulkAct("approve")}
              disabled={bulkLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-white text-sm font-semibold hover:bg-primary/90 disabled:opacity-50"
            >
              {bulkLoading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <CheckCircle2 className="w-3.5 h-3.5" />
              )}
              Approve all
            </button>
            <button
              onClick={() => bulkAct("request-changes")}
              disabled={bulkLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-amber-300 text-amber-700 text-sm font-medium hover:bg-amber-50 disabled:opacity-50"
            >
              <MessageSquareWarning className="w-3.5 h-3.5" />
              Request changes
            </button>
            <button
              onClick={() => bulkAct("reject")}
              disabled={bulkLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-destructive/40 text-destructive text-sm font-medium hover:bg-red-50 disabled:opacity-50"
            >
              <XCircle className="w-3.5 h-3.5" />
              Reject all
            </button>
            <button
              onClick={() => setSelected(new Set())}
              className="text-xs text-muted-foreground hover:text-foreground underline"
            >
              Clear
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function EditPanel({
  draft,
  onChange,
  onSave,
  onCancel,
  saving,
}: {
  draft: EditDraft;
  onChange: (d: EditDraft) => void;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
}) {
  const update = (patch: Partial<EditDraft>) => onChange({ ...draft, ...patch });

  const updateIngredient = (idx: number, patch: Partial<Ingredient>) => {
    const next = draft.ingredients.map((i, j) => (j === idx ? { ...i, ...patch } : i));
    update({ ingredients: next });
  };

  const removeIngredient = (idx: number) => {
    if (draft.ingredients.length <= 2) return;
    update({ ingredients: draft.ingredients.filter((_, j) => j !== idx) });
  };

  const addIngredient = () => {
    if (draft.ingredients.length >= 40) return;
    update({ ingredients: [...draft.ingredients, { name: "" }] });
  };

  const toggleSkinType = (s: string) => {
    const has = draft.skinTypes.includes(s);
    update({
      skinTypes: has ? draft.skinTypes.filter((x) => x !== s) : [...draft.skinTypes, s],
    });
  };

  return (
    <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-primary">
          Edit before approve
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="text-[11px] font-semibold text-muted-foreground uppercase mb-1 block">
            Title
          </label>
          <input
            type="text"
            value={draft.title}
            onChange={(e) => update({ title: e.target.value })}
            maxLength={120}
            className="w-full px-3 py-2 rounded-lg border border-border/60 text-sm bg-white"
          />
        </div>
        <div>
          <label className="text-[11px] font-semibold text-muted-foreground uppercase mb-1 block">
            Category
          </label>
          <select
            value={draft.category}
            onChange={(e) => update({ category: e.target.value })}
            className="w-full px-3 py-2 rounded-lg border border-border/60 text-sm bg-white capitalize"
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c} className="capitalize">
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="text-[11px] font-semibold text-muted-foreground uppercase mb-1 block">
          Skin types
        </label>
        <div className="flex flex-wrap gap-2">
          {SKIN_TYPES.map((s) => {
            const on = draft.skinTypes.includes(s);
            return (
              <button
                key={s}
                onClick={() => toggleSkinType(s)}
                className={`px-2.5 py-1 rounded-full text-xs font-medium capitalize transition-colors ${
                  on
                    ? "bg-primary text-white"
                    : "bg-white border border-border/60 text-muted-foreground hover:bg-muted"
                }`}
              >
                {s}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-[11px] font-semibold text-muted-foreground uppercase">
            Ingredients
          </label>
          <button
            onClick={addIngredient}
            disabled={draft.ingredients.length >= 40}
            className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 disabled:opacity-40"
          >
            <Plus className="w-3 h-3" /> Add
          </button>
        </div>
        <div className="space-y-2">
          {draft.ingredients.map((ing, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                type="text"
                value={ing.name}
                onChange={(e) => updateIngredient(i, { name: e.target.value })}
                placeholder="Name"
                maxLength={120}
                className="flex-1 px-2 py-1.5 rounded-lg border border-border/60 text-sm bg-white"
              />
              <input
                type="text"
                value={ing.amount ?? ""}
                onChange={(e) => updateIngredient(i, { amount: e.target.value })}
                placeholder="Amount"
                maxLength={60}
                className="w-24 px-2 py-1.5 rounded-lg border border-border/60 text-sm bg-white"
              />
              <input
                type="text"
                value={ing.notes ?? ""}
                onChange={(e) => updateIngredient(i, { notes: e.target.value })}
                placeholder="Notes"
                maxLength={200}
                className="w-32 px-2 py-1.5 rounded-lg border border-border/60 text-sm bg-white"
              />
              <button
                onClick={() => removeIngredient(i)}
                disabled={draft.ingredients.length <= 2}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-red-50 disabled:opacity-30"
                aria-label="Remove ingredient"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>

      <div>
        <label className="text-[11px] font-semibold text-muted-foreground uppercase mb-1 block">
          Method
        </label>
        <textarea
          value={draft.method}
          onChange={(e) => update({ method: e.target.value })}
          rows={6}
          maxLength={4000}
          className="w-full px-3 py-2 rounded-lg border border-border/60 text-sm bg-white resize-y"
        />
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={onSave}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary/90 disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save edits
        </button>
        <button
          onClick={onCancel}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 rounded-xl border border-border/60 text-sm font-medium text-muted-foreground hover:bg-muted disabled:opacity-50"
        >
          <X className="w-4 h-4" />
          Cancel
        </button>
      </div>
    </div>
  );
}
