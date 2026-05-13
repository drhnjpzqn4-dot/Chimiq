import { useEffect, useMemo, useState } from "react";
import { Loader2, ThumbsUp, ThumbsDown, MessageSquare, TrendingUp, TrendingDown } from "lucide-react";

interface Aggregate {
  slug: string;
  kind: "mistakes" | "worries";
  ups: number;
  downs: number;
  total: number;
}

interface RecentComment {
  id: string;
  slug: string;
  kind: "mistakes" | "worries";
  rating: "up" | "down";
  comment: string | null;
  createdAt: string;
}

interface RatingsResponse {
  aggregates: Aggregate[];
  recentComments: RecentComment[];
}

function score(a: Aggregate): number {
  if (a.total === 0) return 0;
  return a.ups / a.total;
}

export function DiscoverRatingsAdmin() {
  const [data, setData] = useState<RatingsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/admin/discover/ratings", { credentials: "include" });
        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as { error?: string };
          if (!cancelled) setError(body.error ?? "Failed to load ratings.");
        } else {
          const body = (await res.json()) as RatingsResponse;
          if (!cancelled) setData(body);
        }
      } catch {
        if (!cancelled) setError("Network error loading ratings.");
      }
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const sorted = useMemo(() => {
    if (!data) return { top: [] as Aggregate[], bottom: [] as Aggregate[] };
    const ranked = [...data.aggregates].filter((a) => a.total > 0);
    const byScoreDesc = [...ranked].sort((a, b) => score(b) - score(a) || b.total - a.total);
    const byScoreAsc = [...ranked].sort((a, b) => score(a) - score(b) || b.total - a.total);
    return { top: byScoreDesc.slice(0, 5), bottom: byScoreAsc.slice(0, 5) };
  }, [data]);

  return (
    <section aria-labelledby="discover-ratings-heading">
      <div className="mb-6">
        <h2 id="discover-ratings-heading" className="text-2xl font-serif font-medium text-foreground mb-1">
          Discover article ratings
        </h2>
        <p className="text-sm text-muted-foreground">
          Thumbs up / down votes from readers, plus the most recent free-text comments.
        </p>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      )}

      {!loading && error && (
        <div className="rounded-2xl bg-red-50 border border-red-200 p-4 text-sm text-red-700">{error}</div>
      )}

      {!loading && !error && data && (
        <div className="space-y-6">
          {data.aggregates.length === 0 ? (
            <div className="rounded-2xl bg-white border border-border/60 p-6 text-center text-sm text-muted-foreground">
              No ratings collected yet.
            </div>
          ) : (
            <>
              <div className="grid gap-6 sm:grid-cols-2">
                <RatingList
                  title="Top performing"
                  icon={<TrendingUp className="w-4 h-4 text-emerald-600" />}
                  rows={sorted.top}
                  emptyText="Not enough votes yet."
                />
                <RatingList
                  title="Needs work"
                  icon={<TrendingDown className="w-4 h-4 text-red-600" />}
                  rows={sorted.bottom}
                  emptyText="Not enough votes yet."
                />
              </div>

              <div className="rounded-2xl bg-white border border-border/60 overflow-hidden">
                <div className="px-5 py-3 border-b border-border/40">
                  <h3 className="text-sm font-semibold text-foreground">All articles ({data.aggregates.length})</h3>
                </div>
                <div className="divide-y divide-border/30">
                  {[...data.aggregates]
                    .sort((a, b) => b.total - a.total)
                    .map((a) => (
                      <div key={`${a.kind}-${a.slug}`} className="px-5 py-3 flex items-center justify-between gap-4 text-sm">
                        <div className="min-w-0">
                          <p className="font-medium text-foreground truncate">{a.slug}</p>
                          <p className="text-xs text-muted-foreground capitalize">{a.kind}</p>
                        </div>
                        <div className="flex items-center gap-3 shrink-0 text-xs">
                          <span className="inline-flex items-center gap-1 text-emerald-700">
                            <ThumbsUp className="w-3.5 h-3.5" /> {a.ups}
                          </span>
                          <span className="inline-flex items-center gap-1 text-red-700">
                            <ThumbsDown className="w-3.5 h-3.5" /> {a.downs}
                          </span>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </>
          )}

          <div className="rounded-2xl bg-white border border-border/60 overflow-hidden">
            <div className="px-5 py-3 border-b border-border/40 flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold text-foreground">
                Recent comments ({data.recentComments.length})
              </h3>
            </div>
            {data.recentComments.length === 0 ? (
              <p className="px-5 py-6 text-sm text-muted-foreground text-center">No free-text feedback yet.</p>
            ) : (
              <ul className="divide-y divide-border/30">
                {data.recentComments.map((c) => (
                  <li key={c.id} className="px-5 py-4">
                    <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground mb-1.5">
                      <span className="inline-flex items-center gap-1.5">
                        {c.rating === "up" ? (
                          <ThumbsUp className="w-3.5 h-3.5 text-emerald-700" />
                        ) : (
                          <ThumbsDown className="w-3.5 h-3.5 text-red-700" />
                        )}
                        <span className="font-medium text-foreground capitalize">{c.kind}</span>
                        <span className="font-mono">/ {c.slug}</span>
                      </span>
                      <span>{new Date(c.createdAt).toLocaleString()}</span>
                    </div>
                    <p className="text-sm text-foreground whitespace-pre-wrap">{c.comment}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

function RatingList({
  title,
  icon,
  rows,
  emptyText,
}: {
  title: string;
  icon: React.ReactNode;
  rows: Aggregate[];
  emptyText: string;
}) {
  return (
    <div className="rounded-2xl bg-white border border-border/60 p-5">
      <div className="flex items-center gap-2 mb-3">
        {icon}
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      </div>
      {rows.length === 0 ? (
        <p className="text-xs text-muted-foreground">{emptyText}</p>
      ) : (
        <ul className="space-y-2">
          {rows.map((a) => {
            const pct = a.total > 0 ? Math.round((a.ups / a.total) * 100) : 0;
            return (
              <li key={`${a.kind}-${a.slug}`} className="flex items-center justify-between gap-3 text-sm">
                <div className="min-w-0">
                  <p className="font-medium text-foreground truncate">{a.slug}</p>
                  <p className="text-xs text-muted-foreground capitalize">
                    {a.kind} · {a.total} vote{a.total === 1 ? "" : "s"}
                  </p>
                </div>
                <span className="text-xs font-semibold text-foreground tabular-nums">{pct}% 👍</span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
