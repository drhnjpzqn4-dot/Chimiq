import { useEffect, useState, useCallback, useMemo } from "react";
import { useAuth } from "@workspace/replit-auth-web";
import { useLoginWithConsent } from "@/components/ConsentGate";
import {
  Loader2,
  CheckCircle2,
  XCircle,
  LogOut,
  ShieldCheck,
  Search,
  Clock,
} from "lucide-react";
import { DiscoverRatingsAdmin } from "@/components/admin/DiscoverRatingsAdmin";

interface Submission {
  id: string;
  barcode: string;
  productName: string | null;
  brand: string | null;
  ingredients: string | null;
  submittedAt: string;
  reviewedAt: string | null;
  submittedBy: string | null;
  status: string;
  aiReviewNote: string | null;
  reviewNote: string | null;
  frontImageUrl: string | null;
  ingredientsImageUrl: string | null;
}

type StatusFilter = "pending" | "approved" | "rejected" | "all";

const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "all", label: "All" },
];

function statusBadge(status: string): { label: string; className: string } {
  switch (status) {
    case "approved":
      return { label: "Approved", className: "bg-green-100 text-green-700" };
    case "rejected":
      return { label: "Rejected", className: "bg-red-100 text-red-700" };
    case "needs_admin":
      return { label: "Pending review", className: "bg-amber-100 text-amber-700" };
    case "ai_reviewing":
      return { label: "AI reviewing", className: "bg-sky-100 text-sky-700" };
    case "pending":
      return { label: "Pending", className: "bg-amber-100 text-amber-700" };
    default:
      return { label: status, className: "bg-muted text-muted-foreground" };
  }
}

export default function AdminPage() {
  const { user, isLoading, isAuthenticated, logout } = useAuth();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editMap, setEditMap] = useState<
    Record<string, { productName: string; brand: string; ingredients: string }>
  >({});
  const [rejectMap, setRejectMap] = useState<
    Record<string, { open: boolean; reason: string; error: string | null }>
  >({});
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});

  // Filter state for the queue / history view (#73). Pending is the default
  // landing view since that's the only state with actionable buttons.
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("pending");
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const { requestLogin } = useLoginWithConsent();
  const base = (import.meta.env.BASE_URL ?? "/").replace(/\/+$/, "") || "";

  // Debounce search input by 300ms so each keystroke doesn't refire the
  // server query.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchInput.trim()), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      requestLogin(base + "/admin/submissions");
    }
  }, [isLoading, isAuthenticated, base, requestLogin]);

  const fetchSubmissions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ status: statusFilter });
      if (debouncedSearch) params.set("q", debouncedSearch);
      const res = await fetch(`/api/admin/submissions?${params.toString()}`, {
        credentials: "include",
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setError(data.error ?? "Failed to load submissions.");
        setLoading(false);
        return;
      }
      const data = (await res.json()) as { submissions: Submission[] };
      setSubmissions(data.submissions);
      // Seed edit drafts only for pending rows; reviewed rows are read-only.
      const initial: typeof editMap = {};
      for (const s of data.submissions) {
        if (s.status === "needs_admin") {
          initial[s.id] = {
            productName: s.productName ?? "",
            brand: s.brand ?? "",
            ingredients: s.ingredients ?? "",
          };
        }
      }
      setEditMap(initial);
    } catch {
      setError("Network error loading submissions.");
    }
    setLoading(false);
  }, [statusFilter, debouncedSearch]);

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
        // Refetch instead of optimistically removing — the row should still
        // appear under the Approved / All views.
        await fetchSubmissions();
      }
    } finally {
      setActionLoading((prev) => ({ ...prev, [id]: false }));
    }
  };

  const openReject = (id: string) => {
    setRejectMap((prev) => ({
      ...prev,
      [id]: { open: true, reason: prev[id]?.reason ?? "", error: null },
    }));
  };

  const cancelReject = (id: string) => {
    setRejectMap((prev) => ({ ...prev, [id]: { open: false, reason: "", error: null } }));
  };

  const updateRejectReason = (id: string, value: string) => {
    setRejectMap((prev) => ({ ...prev, [id]: { open: true, reason: value, error: null } }));
  };

  const handleReject = async (id: string) => {
    const reason = rejectMap[id]?.reason.trim() ?? "";
    if (!reason) {
      setRejectMap((prev) => ({
        ...prev,
        [id]: { open: true, reason: prev[id]?.reason ?? "", error: "Please add a short reason." },
      }));
      return;
    }
    setActionLoading((prev) => ({ ...prev, [id]: true }));
    try {
      const res = await fetch(`/api/admin/submissions/${id}/reject`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      if (res.ok) {
        setRejectMap((prev) => {
          const next = { ...prev };
          delete next[id];
          return next;
        });
        await fetchSubmissions();
      } else {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setRejectMap((prev) => ({
          ...prev,
          [id]: { open: true, reason, error: data.error ?? "Failed to reject." },
        }));
      }
    } finally {
      setActionLoading((prev) => ({ ...prev, [id]: false }));
    }
  };

  const updateEdit = (
    id: string,
    field: "productName" | "brand" | "ingredients",
    value: string,
  ) => {
    setEditMap((prev) => ({ ...prev, [id]: { ...prev[id], [field]: value } }));
  };

  const headline = useMemo(() => {
    if (loading) return "Loading…";
    if (submissions.length === 0) return "No submissions match these filters.";
    const noun = submissions.length === 1 ? "submission" : "submissions";
    if (statusFilter === "pending") return `${submissions.length} ${noun} pending review`;
    if (statusFilter === "approved") return `${submissions.length} approved ${noun}`;
    if (statusFilter === "rejected") return `${submissions.length} rejected ${noun}`;
    return `${submissions.length} ${noun}`;
  }, [loading, submissions.length, statusFilter]);

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
              alt="Chimiq"
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

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-10 space-y-12">
        <DiscoverRatingsAdmin />

        <div>
          <div className="mb-6">
            <h1 className="text-3xl font-serif font-semibold text-foreground mb-1">
              Submission Queue
            </h1>
            <p className="text-muted-foreground text-base">
              Review crowdsourced product submissions and look back at recent decisions.
            </p>
          </div>

          {/* Filter bar — status tabs + search. Mirrors the recipes admin
              UX so admins switch between tools without relearning controls. */}
          <div className="mb-6 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              {STATUS_FILTERS.map((f) => {
                const active = statusFilter === f.value;
                return (
                  <button
                    key={f.value}
                    type="button"
                    onClick={() => setStatusFilter(f.value)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                      active
                        ? "bg-primary text-white border-primary"
                        : "bg-white text-muted-foreground border-border/60 hover:border-primary/40 hover:text-foreground"
                    }`}
                  >
                    {f.label}
                  </button>
                );
              })}
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="search"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search by barcode, product name, or brand…"
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-border/60 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white"
              />
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

          {!loading && !error && submissions.length === 0 && (
            <div className="rounded-2xl bg-white border border-border/60 p-12 text-center">
              <CheckCircle2 className="w-12 h-12 text-green-400 mx-auto mb-4" />
              <p className="text-lg font-serif font-semibold text-foreground mb-1">
                Nothing here
              </p>
              <p className="text-muted-foreground text-sm">{headline}</p>
            </div>
          )}

          {!loading && !error && submissions.length > 0 && (
            <div className="space-y-6">
              <p className="text-sm text-muted-foreground">{headline}</p>
              {submissions.map((s) => {
                const isPending = s.status === "needs_admin";
                const edit =
                  editMap[s.id] ?? {
                    productName: s.productName ?? "",
                    brand: s.brand ?? "",
                    ingredients: s.ingredients ?? "",
                  };
                const isProcessing = actionLoading[s.id];
                const badge = statusBadge(s.status);
                return (
                  <div
                    key={s.id}
                    className="bg-white rounded-2xl border border-border/60 shadow-sm overflow-hidden"
                  >
                    <div className="px-6 py-4 bg-muted/30 border-b border-border/40 flex items-start justify-between gap-4 flex-wrap">
                      <div className="min-w-0">
                        <p className="text-xs text-muted-foreground font-mono truncate">
                          {s.barcode}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Submitted {new Date(s.submittedAt).toLocaleDateString()}
                          {s.submittedBy ? ` · by user ${s.submittedBy.slice(0, 8)}…` : ""}
                          {s.reviewedAt && (
                            <>
                              {" · reviewed "}
                              {new Date(s.reviewedAt).toLocaleDateString()}
                            </>
                          )}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span
                          className={`text-[11px] px-2.5 py-1 rounded-full font-semibold ${badge.className}`}
                        >
                          {badge.label}
                        </span>
                        {s.aiReviewNote && (
                          <span className="text-[11px] px-2 py-1 rounded-full bg-amber-100 text-amber-700">
                            AI: {s.aiReviewNote}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="p-6 space-y-4">
                      {(s.frontImageUrl || s.ingredientsImageUrl) && (
                        <div className="grid grid-cols-2 gap-3">
                          {s.frontImageUrl && (
                            <div>
                              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                                Front photo
                              </p>
                              <img
                                src={`/api/storage${s.frontImageUrl}`}
                                alt="Product front"
                                className="w-full h-36 object-contain rounded-xl border border-border/60 bg-muted/20"
                              />
                            </div>
                          )}
                          {s.ingredientsImageUrl && (
                            <div>
                              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                                Ingredients photo
                              </p>
                              <img
                                src={`/api/storage${s.ingredientsImageUrl}`}
                                alt="Ingredients label"
                                className="w-full h-36 object-contain rounded-xl border border-border/60 bg-muted/20"
                              />
                            </div>
                          )}
                        </div>
                      )}

                      {isPending ? (
                        <>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1 block">
                                Product name
                              </label>
                              <input
                                type="text"
                                value={edit.productName}
                                onChange={(e) =>
                                  updateEdit(s.id, "productName", e.target.value)
                                }
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
                              onChange={(e) =>
                                updateEdit(s.id, "ingredients", e.target.value)
                              }
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
                            {!rejectMap[s.id]?.open && (
                              <button
                                onClick={() => openReject(s.id)}
                                disabled={isProcessing}
                                className="flex items-center gap-2 px-4 py-2 rounded-xl border border-destructive/40 text-destructive text-sm font-medium hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                              >
                                <XCircle className="w-4 h-4" />
                                Reject
                              </button>
                            )}
                          </div>
                          {rejectMap[s.id]?.open && (
                            <div className="mt-3 rounded-xl border border-destructive/30 bg-red-50/40 p-3 space-y-2">
                              <label className="text-[11px] font-semibold text-destructive uppercase tracking-wide block">
                                Reason for rejection
                              </label>
                              <input
                                type="text"
                                value={rejectMap[s.id]?.reason ?? ""}
                                onChange={(e) => updateRejectReason(s.id, e.target.value)}
                                maxLength={500}
                                autoFocus
                                placeholder="e.g. photos blurry, ingredients unreadable…"
                                className="w-full px-3 py-2 rounded-lg border border-destructive/30 text-sm focus:outline-none focus:ring-2 focus:ring-destructive/30 bg-white"
                              />
                              {rejectMap[s.id]?.error && (
                                <p className="text-xs text-destructive">
                                  {rejectMap[s.id]?.error}
                                </p>
                              )}
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => handleReject(s.id)}
                                  disabled={isProcessing || !rejectMap[s.id]?.reason.trim()}
                                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-destructive text-white text-xs font-semibold hover:bg-destructive/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                  {isProcessing ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  ) : (
                                    <XCircle className="w-3.5 h-3.5" />
                                  )}
                                  Confirm reject
                                </button>
                                <button
                                  onClick={() => cancelReject(s.id)}
                                  disabled={isProcessing}
                                  className="px-3 py-1.5 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-border/20 transition-colors"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          )}
                        </>
                      ) : (
                        // Read-only history view for already-reviewed items.
                        <>
                          {(s.productName || s.brand) && (
                            <p className="text-sm font-semibold text-foreground">
                              {s.productName?.trim() || "(no name)"}
                              {s.brand && (
                                <span className="font-normal text-muted-foreground">
                                  {" · "}
                                  {s.brand}
                                </span>
                              )}
                            </p>
                          )}
                          {s.ingredients && (
                            <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">
                              <span className="font-semibold text-foreground/80">
                                Ingredients:{" "}
                              </span>
                              {s.ingredients}
                            </p>
                          )}
                          {s.status === "rejected" && s.reviewNote && (
                            <p className="rounded-xl border border-destructive/20 bg-red-50/40 p-3 text-xs text-destructive">
                              <span className="font-semibold">Rejection note: </span>
                              {s.reviewNote}
                            </p>
                          )}
                          {!s.reviewNote && !s.aiReviewNote && (
                            <p className="text-xs text-muted-foreground italic flex items-center gap-1.5">
                              <Clock className="w-3 h-3" />
                              No reviewer notes recorded.
                            </p>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
