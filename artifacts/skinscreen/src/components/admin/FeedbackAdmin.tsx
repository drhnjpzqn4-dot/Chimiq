import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Loader2,
  MessageSquare,
  Mail,
  Search,
  Archive,
  CheckCheck,
  RotateCcw,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

const PAGE_SIZE = 50;

type FeedbackStatus = "new" | "read" | "archived";
type StatusFilter = FeedbackStatus | "all";

interface Submission {
  id: number;
  message: string;
  email: string | null;
  locale: string | null;
  pageUrl: string | null;
  userAgent: string | null;
  status: FeedbackStatus;
  createdAt: string;
  userId: string | null;
  userEmail: string | null;
  userName: string | null;
}

interface ListResponse {
  submissions: Submission[];
  total: number;
  page: number;
  pageSize: number;
  counts: { new: number; read: number; archived: number; total: number };
}

const STATUS_TABS: { value: StatusFilter; label: string }[] = [
  { value: "new", label: "New" },
  { value: "read", label: "Read" },
  { value: "archived", label: "Archived" },
  { value: "all", label: "All" },
];

const HAS_EMAIL_OPTIONS: { value: "any" | "yes" | "no"; label: string }[] = [
  { value: "any", label: "Any" },
  { value: "yes", label: "Has email" },
  { value: "no", label: "Anonymous" },
];

function statusPill(status: FeedbackStatus): string {
  if (status === "new") return "bg-amber-100 text-amber-700";
  if (status === "read") return "bg-sky-100 text-sky-700";
  return "bg-muted text-muted-foreground";
}

export function FeedbackAdmin() {
  const [data, setData] = useState<ListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState<StatusFilter>("new");
  const [hasEmail, setHasEmail] = useState<"any" | "yes" | "no">("any");
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const [actionLoading, setActionLoading] = useState<Record<number, boolean>>({});

  // Reset to page 1 when filters change so the user isn't stuck on a page
  // that no longer exists in the new filtered view.
  useEffect(() => {
    setPage(1);
  }, [statusFilter, hasEmail, debouncedSearch, from, to]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchInput.trim()), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const fetchList = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        status: statusFilter,
        hasEmail,
        page: String(page),
        pageSize: String(PAGE_SIZE),
      });
      if (debouncedSearch) params.set("q", debouncedSearch);
      if (from) params.set("from", from);
      if (to) {
        // Treat the "to" date input as end-of-day so the day's submissions
        // are included rather than cut off at 00:00.
        const end = new Date(to);
        end.setHours(23, 59, 59, 999);
        if (!Number.isNaN(end.getTime())) params.set("to", end.toISOString());
      }
      const res = await fetch(`/api/admin/feedback?${params.toString()}`, {
        credentials: "include",
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        setError(body.error ?? "Failed to load feedback.");
        setLoading(false);
        return;
      }
      const body = (await res.json()) as ListResponse;
      setData(body);
    } catch {
      setError("Network error loading feedback.");
    }
    setLoading(false);
  }, [statusFilter, hasEmail, debouncedSearch, from, to, page]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  const updateStatus = async (id: number, next: FeedbackStatus) => {
    setActionLoading((prev) => ({ ...prev, [id]: true }));
    try {
      const res = await fetch(`/api/admin/feedback/${id}/status`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      if (res.ok) await fetchList();
    } finally {
      setActionLoading((prev) => ({ ...prev, [id]: false }));
    }
  };

  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;

  const headline = useMemo(() => {
    if (loading) return "Loading…";
    if (!data || data.submissions.length === 0) {
      return "No feedback matches these filters.";
    }
    const noun = data.total === 1 ? "submission" : "submissions";
    const base = `${data.total} ${noun}`;
    return totalPages > 1 ? `${base} · page ${page} of ${totalPages}` : base;
  }, [loading, data, page, totalPages]);

  return (
    <section aria-labelledby="feedback-admin-heading">
      <div className="mb-6">
        <h2
          id="feedback-admin-heading"
          className="text-2xl font-serif font-medium text-foreground mb-1"
        >
          User feedback
        </h2>
        <p className="text-sm text-muted-foreground">
          Triage in-product feedback submissions. Mark as read once seen, or
          archive when resolved.
        </p>
      </div>

      <div className="mb-4 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          {STATUS_TABS.map((t) => {
            const active = statusFilter === t.value;
            const count =
              t.value === "all"
                ? data?.counts.total
                : data?.counts[t.value as FeedbackStatus];
            return (
              <button
                key={t.value}
                type="button"
                onClick={() => setStatusFilter(t.value)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                  active
                    ? "bg-primary text-white border-primary"
                    : "bg-white text-muted-foreground border-border/60 hover:border-primary/40 hover:text-foreground"
                }`}
              >
                {t.label}
                {typeof count === "number" && (
                  <span
                    className={`ml-1.5 tabular-nums ${active ? "opacity-90" : "opacity-70"}`}
                  >
                    ({count})
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto_auto]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="search"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search feedback message…"
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-border/60 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white"
            />
          </div>
          <select
            value={hasEmail}
            onChange={(e) => setHasEmail(e.target.value as typeof hasEmail)}
            className="px-3 py-2 rounded-xl border border-border/60 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/30"
            aria-label="Filter by email presence"
          >
            {HAS_EMAIL_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="px-3 py-2 rounded-xl border border-border/60 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/30"
            aria-label="From date"
          />
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="px-3 py-2 rounded-xl border border-border/60 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/30"
            aria-label="To date"
          />
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      )}

      {!loading && error && (
        <div className="rounded-2xl bg-red-50 border border-red-200 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {!loading && !error && data && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">{headline}</p>

          {data.submissions.length === 0 ? (
            <div className="rounded-2xl bg-white border border-border/60 p-8 text-center">
              <MessageSquare className="w-10 h-10 text-muted-foreground/60 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">
                Nothing to triage right now.
              </p>
            </div>
          ) : (
            <ul className="space-y-3">
              {data.submissions.map((s) => {
                const busy = !!actionLoading[s.id];
                const contactEmail = s.email ?? s.userEmail;
                return (
                  <li
                    key={s.id}
                    className="bg-white rounded-2xl border border-border/60 shadow-sm overflow-hidden"
                  >
                    <div className="px-5 py-3 bg-muted/30 border-b border-border/40 flex items-start justify-between gap-3 flex-wrap">
                      <div className="min-w-0 text-xs text-muted-foreground space-y-0.5">
                        <p>
                          <span className="font-mono">#{s.id}</span>
                          <span className="mx-1.5">·</span>
                          {new Date(s.createdAt).toLocaleString()}
                          {s.locale && (
                            <>
                              <span className="mx-1.5">·</span>
                              <span className="uppercase">{s.locale}</span>
                            </>
                          )}
                        </p>
                        {(s.userName || s.userEmail || s.userId) && (
                          <p className="truncate">
                            User:{" "}
                            <span className="text-foreground">
                              {s.userName || s.userEmail || s.userId?.slice(0, 8) + "…"}
                            </span>
                          </p>
                        )}
                      </div>
                      <span
                        className={`text-[11px] px-2.5 py-1 rounded-full font-semibold capitalize ${statusPill(
                          s.status,
                        )}`}
                      >
                        {s.status}
                      </span>
                    </div>

                    <div className="p-5 space-y-3">
                      <p className="text-sm text-foreground whitespace-pre-wrap break-words">
                        {s.message}
                      </p>

                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        {contactEmail && (
                          <a
                            href={`mailto:${contactEmail}`}
                            className="inline-flex items-center gap-1 text-primary hover:underline"
                          >
                            <Mail className="w-3.5 h-3.5" />
                            {contactEmail}
                          </a>
                        )}
                        {s.pageUrl && (
                          <a
                            href={s.pageUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 hover:text-foreground hover:underline truncate max-w-full"
                            title={s.pageUrl}
                          >
                            <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                            <span className="truncate">{s.pageUrl}</span>
                          </a>
                        )}
                      </div>

                      <div className="flex items-center gap-2 pt-1 flex-wrap">
                        {s.status !== "read" && (
                          <button
                            onClick={() => updateStatus(s.id, "read")}
                            disabled={busy}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border/60 text-xs font-medium text-foreground hover:bg-border/20 disabled:opacity-50 transition-colors"
                          >
                            {busy ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <CheckCheck className="w-3.5 h-3.5" />
                            )}
                            Mark as read
                          </button>
                        )}
                        {s.status !== "archived" && (
                          <button
                            onClick={() => updateStatus(s.id, "archived")}
                            disabled={busy}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border/60 text-xs font-medium text-foreground hover:bg-border/20 disabled:opacity-50 transition-colors"
                          >
                            {busy ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Archive className="w-3.5 h-3.5" />
                            )}
                            Archive
                          </button>
                        )}
                        {s.status !== "new" && (
                          <button
                            onClick={() => updateStatus(s.id, "new")}
                            disabled={busy}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border/60 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-border/20 disabled:opacity-50 transition-colors"
                          >
                            {busy ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <RotateCcw className="w-3.5 h-3.5" />
                            )}
                            Reopen
                          </button>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          {data.submissions.length > 0 && totalPages > 1 && (
            <div className="flex items-center justify-between gap-3 pt-2">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1 || loading}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border/60 text-xs font-medium text-foreground hover:bg-border/20 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                Previous
              </button>
              <span className="text-xs text-muted-foreground tabular-nums">
                Page {page} of {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages || loading}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border/60 text-xs font-medium text-foreground hover:bg-border/20 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Next
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
