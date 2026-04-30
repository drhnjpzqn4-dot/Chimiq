import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@workspace/replit-auth-web";
import { useLoginWithConsent } from "@/components/ConsentGate";
import {
  Loader2,
  CheckCircle2,
  XCircle,
  LogOut,
  ShieldCheck,
  AlertTriangle,
  ShieldAlert,
  MessageSquareWarning,
} from "lucide-react";

interface AiVerdict {
  riskLevel: "safe" | "caution" | "high_risk";
  summary: string;
  flagged: { ingredient: string; reason: string; severity: string }[];
  warnings: string[];
  saferSwaps: { from: string; to: string; why: string }[];
}

interface RecipeRow {
  id: string;
  submitterId: string;
  title: string;
  category: string;
  skinTypes: string[];
  ingredients: { name: string; amount?: string; notes?: string }[];
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

export default function AdminRecipesPage() {
  const { user, isLoading, isAuthenticated, logout } = useAuth();
  const [recipes, setRecipes] = useState<RecipeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});

  const { requestLogin } = useLoginWithConsent();
  const base = (import.meta.env.BASE_URL ?? "/").replace(/\/+$/, "") || "";

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      requestLogin(base + "/admin/recipes");
    }
  }, [isLoading, isAuthenticated, base, requestLogin]);

  const fetchRecipes = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/recipes", { credentials: "include" });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        setError(data.error ?? "Failed to load recipes.");
        setLoading(false);
        return;
      }
      const data = (await res.json()) as { recipes: RecipeRow[] };
      setRecipes(data.recipes);
    } catch {
      setError("Network error loading recipes.");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (isAuthenticated) fetchRecipes();
  }, [isAuthenticated, fetchRecipes]);

  const act = async (id: string, action: "approve" | "request-changes" | "reject") => {
    setActionLoading((prev) => ({ ...prev, [id]: true }));
    try {
      const res = await fetch(`/api/admin/recipes/${id}/${action}`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note: notes[id]?.trim() || undefined }),
      });
      if (res.ok) {
        setRecipes((prev) => prev.filter((r) => r.id !== id));
      }
    } finally {
      setActionLoading((prev) => ({ ...prev, [id]: false }));
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAFAF8]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }
  if (!isAuthenticated || !user) return null;

  return (
    <div className="min-h-screen bg-[#FAFAF8]">
      <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-border/30">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <a href={base + "/"}>
            <img
              src={`${import.meta.env.BASE_URL}images/logo-chimiq-long.png`}
              alt="ChimIQ"
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
        <div className="mb-8">
          <h1 className="text-3xl font-serif font-semibold text-foreground mb-1">DIY recipe queue</h1>
          <p className="text-muted-foreground text-base">
            Review crowdsourced DIY recipes. The AI safety verdict is shown alongside each.
          </p>
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
            <p className="text-lg font-serif font-semibold text-foreground mb-1">All caught up</p>
            <p className="text-muted-foreground text-sm">No recipes awaiting review.</p>
          </div>
        )}

        {!loading && !error && recipes.length > 0 && (
          <div className="space-y-6">
            <p className="text-sm text-muted-foreground">
              {recipes.length} recipe{recipes.length !== 1 ? "s" : ""} pending
            </p>
            {recipes.map((r) => {
              const isProcessing = actionLoading[r.id];
              const risk = r.riskLevel ? RISK[r.riskLevel] : null;
              return (
                <div key={r.id} className="bg-white rounded-2xl border border-border/60 shadow-sm overflow-hidden">
                  <div className="px-6 py-4 bg-muted/30 border-b border-border/40 flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="font-serif text-lg font-semibold text-foreground">{r.title}</h2>
                        <span className="text-[11px] px-2 py-0.5 rounded-full bg-primary/10 text-primary capitalize">
                          {r.category}
                        </span>
                        {risk && (
                          <span className={`text-[11px] px-2 py-0.5 rounded-full ${risk.bg} ${risk.text} flex items-center gap-1`}>
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

                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                        Ingredients
                      </p>
                      <ul className="space-y-1 text-sm">
                        {r.ingredients.map((ing, i) => (
                          <li key={i}>
                            <span className="font-medium">{ing.name}</span>
                            {ing.amount && <span className="text-muted-foreground"> — {ing.amount}</span>}
                            {ing.notes && <span className="text-muted-foreground"> ({ing.notes})</span>}
                          </li>
                        ))}
                      </ul>
                    </div>

                    {r.method && (
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
                          Method
                        </p>
                        <p className="whitespace-pre-line text-sm text-foreground/90">{r.method}</p>
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
                        {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
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
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
