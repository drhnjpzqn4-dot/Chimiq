import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@workspace/replit-auth-web";
import { Loader2, CheckCircle2, XCircle, LogOut, ShieldCheck } from "lucide-react";

interface Submission {
  id: string;
  barcode: string;
  productName: string | null;
  brand: string | null;
  ingredients: string | null;
  submittedAt: string;
  submittedBy: string | null;
  status: string;
  aiReviewNote: string | null;
  frontImageUrl: string | null;
  ingredientsImageUrl: string | null;
}

export default function AdminPage() {
  const { user, isLoading, isAuthenticated, logout } = useAuth();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editMap, setEditMap] = useState<Record<string, { productName: string; brand: string; ingredients: string }>>({});
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});

  const base = (import.meta.env.BASE_URL ?? "/").replace(/\/+$/, "") || "";

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      window.location.href = `/api/login?returnTo=${encodeURIComponent(base + "/admin/submissions")}`;
    }
  }, [isLoading, isAuthenticated, base]);

  const fetchSubmissions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/submissions", { credentials: "include" });
      if (!res.ok) {
        const data = await res.json() as { error?: string };
        setError(data.error ?? "Failed to load submissions.");
        setLoading(false);
        return;
      }
      const data = await res.json() as { submissions: Submission[] };
      setSubmissions(data.submissions);
      const initial: typeof editMap = {};
      for (const s of data.submissions) {
        initial[s.id] = {
          productName: s.productName ?? "",
          brand: s.brand ?? "",
          ingredients: s.ingredients ?? "",
        };
      }
      setEditMap(initial);
    } catch {
      setError("Network error loading submissions.");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (isAuthenticated) fetchSubmissions();
  }, [isAuthenticated, fetchSubmissions]);

  const handleApprove = async (id: string) => {
    const edit = editMap[id];
    if (!edit?.ingredients.trim()) return;
    setActionLoading((prev) => ({ ...prev, [id]: true }));
    try {
      const res = await fetch(`/api/admin/submissions/${id}/approve`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productName: edit.productName.trim() || undefined,
          brand: edit.brand.trim() || undefined,
          ingredients: edit.ingredients.trim(),
        }),
      });
      if (res.ok) {
        setSubmissions((prev) => prev.filter((s) => s.id !== id));
      }
    } finally {
      setActionLoading((prev) => ({ ...prev, [id]: false }));
    }
  };

  const handleReject = async (id: string) => {
    setActionLoading((prev) => ({ ...prev, [id]: true }));
    try {
      const res = await fetch(`/api/admin/submissions/${id}/reject`, {
        method: "POST",
        credentials: "include",
      });
      if (res.ok) {
        setSubmissions((prev) => prev.filter((s) => s.id !== id));
      }
    } finally {
      setActionLoading((prev) => ({ ...prev, [id]: false }));
    }
  };

  const updateEdit = (id: string, field: "productName" | "brand" | "ingredients", value: string) => {
    setEditMap((prev) => ({ ...prev, [id]: { ...prev[id], [field]: value } }));
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
          <h1 className="text-3xl font-serif font-semibold text-foreground mb-1">Submission Queue</h1>
          <p className="text-muted-foreground text-base">
            Review crowdsourced product submissions that need manual verification.
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

        {!loading && !error && submissions.length === 0 && (
          <div className="rounded-2xl bg-white border border-border/60 p-12 text-center">
            <CheckCircle2 className="w-12 h-12 text-green-400 mx-auto mb-4" />
            <p className="text-lg font-serif font-semibold text-foreground mb-1">Queue is clear</p>
            <p className="text-muted-foreground text-sm">No submissions awaiting review.</p>
          </div>
        )}

        {!loading && !error && submissions.length > 0 && (
          <div className="space-y-6">
            <p className="text-sm text-muted-foreground">
              {submissions.length} submission{submissions.length !== 1 ? "s" : ""} pending review
            </p>
            {submissions.map((s) => {
              const edit = editMap[s.id] ?? { productName: s.productName ?? "", brand: s.brand ?? "", ingredients: s.ingredients ?? "" };
              const isProcessing = actionLoading[s.id];
              return (
                <div key={s.id} className="bg-white rounded-2xl border border-border/60 shadow-sm overflow-hidden">
                  <div className="px-6 py-4 bg-muted/30 border-b border-border/40 flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground font-mono">{s.barcode}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Submitted {new Date(s.submittedAt).toLocaleDateString()}
                        {s.submittedBy ? ` · by user ${s.submittedBy.slice(0, 8)}…` : ""}
                      </p>
                    </div>
                    {s.aiReviewNote && (
                      <span className="text-[11px] px-2 py-1 rounded-full bg-amber-100 text-amber-700 shrink-0">
                        AI: {s.aiReviewNote}
                      </span>
                    )}
                  </div>

                  <div className="p-6 space-y-4">
                    {(s.frontImageUrl || s.ingredientsImageUrl) && (
                      <div className="grid grid-cols-2 gap-3">
                        {s.frontImageUrl && (
                          <div>
                            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">Front photo</p>
                            <img
                              src={s.frontImageUrl}
                              alt="Product front"
                              className="w-full h-36 object-contain rounded-xl border border-border/60 bg-muted/20"
                            />
                          </div>
                        )}
                        {s.ingredientsImageUrl && (
                          <div>
                            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">Ingredients photo</p>
                            <img
                              src={s.ingredientsImageUrl}
                              alt="Ingredients label"
                              className="w-full h-36 object-contain rounded-xl border border-border/60 bg-muted/20"
                            />
                          </div>
                        )}
                      </div>
                    )}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1 block">
                          Product name
                        </label>
                        <input
                          type="text"
                          value={edit.productName}
                          onChange={(e) => updateEdit(s.id, "productName", e.target.value)}
                          className="w-full px-3 py-2 rounded-xl border border-border/60 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white"
                          placeholder="Product name"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1 block">
                          Brand
                        </label>
                        <input
                          type="text"
                          value={edit.brand}
                          onChange={(e) => updateEdit(s.id, "brand", e.target.value)}
                          className="w-full px-3 py-2 rounded-xl border border-border/60 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white"
                          placeholder="Brand"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1 block">
                        Ingredient list
                      </label>
                      <textarea
                        value={edit.ingredients}
                        onChange={(e) => updateEdit(s.id, "ingredients", e.target.value)}
                        rows={5}
                        className="w-full px-3 py-2 rounded-xl border border-border/60 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white resize-none"
                        placeholder="Paste or correct the ingredient list…"
                      />
                    </div>

                    <div className="flex items-center gap-3 pt-2">
                      <button
                        onClick={() => handleApprove(s.id)}
                        disabled={!edit.ingredients.trim() || isProcessing}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        {isProcessing ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <CheckCircle2 className="w-4 h-4" />
                        )}
                        Approve & publish
                      </button>
                      <button
                        onClick={() => handleReject(s.id)}
                        disabled={isProcessing}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl border border-destructive/40 text-destructive text-sm font-medium hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
