import { useEffect, useState, type FormEvent } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import {
  MessageCircle,
  Sparkles,
  Compass,
  Info,
  ArrowRight,
  Loader2,
  Send,
  Heart,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { FindDermatologist } from "@/components/FindDermatologist";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "@/lib/i18n";
import { apiFetch } from "@/lib/api";

/** BESLUT-SS-017: community tips UI off until dermatologist Q&A ships. */
const ENABLE_COMMUNITY_TIPS = false;

/** BESLUT-SS-017: verified dermatologist Q&A — UI off until first expert is onboarded. */
const ENABLE_DERMATOLOGIST_QA = false;

const TOP_10_MISTAKES = [
  { titleKey: "discover.mistake1Title", bodyKey: "discover.mistake1Body" },
  { titleKey: "discover.mistake2Title", bodyKey: "discover.mistake2Body" },
  { titleKey: "discover.mistake3Title", bodyKey: "discover.mistake3Body" },
  { titleKey: "discover.mistake4Title", bodyKey: "discover.mistake4Body" },
  { titleKey: "discover.mistake5Title", bodyKey: "discover.mistake5Body" },
] as const;

interface TipFeedItem {
  id: string;
  body: string;
  createdAt: string;
  authorId: string;
  authorDisplayName: string;
  voteCount: number;
  viewerHasVoted: boolean;
}

const TIP_MAX = 280;
const TIP_MIN = 8;

interface FeaturedRecipe {
  id: string;
  title: string;
  category: string;
  photoUrl: string | null;
}

export default function DiscoverScreen() {
  const { isAuthenticated } = useAuth();
  const { t } = useTranslation();
  const [tips, setTips] = useState<TipFeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState("");
  const [posting, setPosting] = useState(false);
  const [postError, setPostError] = useState<string | null>(null);

  const featuredRecipesQuery = useQuery({
    queryKey: ["discover-recipes-featured"],
    queryFn: async (): Promise<FeaturedRecipe[]> => {
      const res = await apiFetch("/api/recipes?limit=3", { credentials: "include" });
      if (!res.ok) return [];
      const data = (await res.json()) as { recipes?: FeaturedRecipe[] };
      return (data.recipes ?? []).slice(0, 3);
    },
    staleTime: 1000 * 60 * 5,
  });

  const loadTips = () => {
    setLoading(true);
    apiFetch("/api/tips", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setTips((d as { tips?: TipFeedItem[] }).tips ?? []))
      .catch(() => setTips([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!ENABLE_COMMUNITY_TIPS) return;
    loadTips();
  }, []);

  const submitTip = async (e: FormEvent) => {
    e.preventDefault();
    if (draft.trim().length < TIP_MIN) {
      setPostError(t("discover.tipMinError", { min: TIP_MIN }));
      return;
    }
    setPosting(true);
    setPostError(null);
    try {
      const res = await apiFetch("/api/tips", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: draft.trim() }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setPostError(data.error ?? t("discover.tipPostError"));
      } else {
        setDraft("");
        loadTips();
      }
    } catch {
      setPostError(t("discover.tipNetworkError"));
    } finally {
      setPosting(false);
    }
  };

  const toggleVote = async (tip: TipFeedItem) => {
    // Optimistic
    setTips((prev) =>
      prev.map((t) =>
        t.id === tip.id
          ? {
              ...t,
              viewerHasVoted: !t.viewerHasVoted,
              voteCount: t.voteCount + (t.viewerHasVoted ? -1 : 1),
            }
          : t,
      ),
    );
    try {
      const method = tip.viewerHasVoted ? "DELETE" : "POST";
      const res = await apiFetch(`/api/tips/${tip.id}/vote`, {
        method,
        credentials: "include",
      });
      if (!res.ok) {
        // Revert
        loadTips();
      }
    } catch {
      loadTips();
    }
  };

  return (
    <AppShell pageLabel={t("tabs.discover")} subtitle={t("discover.subtitle")}>
      {/* AI chat hero */}
      <section className="mb-6 animate-pop-in">
        <div className="relative overflow-hidden rounded-3xl bg-sage-deep p-5 text-white shadow-xl">
          <div className="absolute -right-12 -top-12 h-48 w-48 bg-sage/35 rounded-full blur-3xl" aria-hidden />
          <div className="relative flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/10">
              <MessageCircle className="h-6 w-6 text-white/90" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-widest text-white/70">{t("discover.aiAskAnything")}</p>
              <p className="mt-0.5 font-serif text-xl font-medium leading-tight">
                {t("discover.aiTitle")}
              </p>
              <p className="mt-1 text-sm text-white/70">
                {t("discover.aiSubtitle")}
              </p>
              <p className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-white/80">
                <Sparkles className="h-3.5 w-3.5" />
                {t("discover.aiHint")}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Problems deep-link — direkt efter AI-chat, före Top 5 */}
      <section className="mb-4 animate-pop-in">
        <Link href="/app/problems">
          <a
            data-touch-target
            className="flex items-center gap-3 rounded-3xl border border-border/50 bg-white p-4 shadow-sm transition-transform hover:-translate-y-0.5"
          >
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Compass className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-serif text-base font-medium text-foreground">
                {t("discover.diyProblemsTitle")}
              </p>
              <p className="text-xs text-muted-foreground">{t("discover.diyProblemsSubtitle")}</p>
            </div>
            <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
          </a>
        </Link>
      </section>

      {/* Top mistakes (curated) */}
      <section className="mb-6 rounded-2xl border border-border/40 bg-white p-4 shadow-sm sm:p-5">
        <h2
          className="mb-4 leading-tight"
          style={{
            fontFamily: '"Source Serif 4", "Iowan Old Style", Georgia, serif',
            fontSize: 20,
            fontWeight: 500,
            color: "var(--ink)",
          }}
        >
          {t("discover.top10Title")}
        </h2>
        <ul className="space-y-4">
          {TOP_10_MISTAKES.map((item, index) => (
            <li key={item.titleKey} className="flex gap-3">
              <div
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold tabular-nums"
                style={{
                  backgroundColor: "var(--rose-soft)",
                  color: "var(--rose-gold-deep)",
                }}
              >
                {index + 1}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold leading-snug" style={{ color: "var(--ink)" }}>
                  {t(item.titleKey)}
                </p>
                <p className="mt-1 text-xs leading-relaxed" style={{ color: "var(--ink-soft)" }}>
                  {t(item.bodyKey)}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* Dermatologist Q&A teaser (hidden until recruitment) */}
      {ENABLE_DERMATOLOGIST_QA ? (
        <section className="mb-6" aria-hidden />
      ) : (
        <section className="mb-6">
          <div
            className="rounded-2xl border border-dashed p-4 sm:p-5"
            style={{
              backgroundColor: "var(--cream-warm)",
              borderColor: "var(--line)",
            }}
          >
            <p
              className="text-[11px] font-semibold uppercase tracking-widest"
              style={{ color: "var(--ink-soft)" }}
            >
              {t("discover.dermQAComingSoon")}
            </p>
            <h3
              className="mt-2 font-serif text-base font-medium leading-tight"
              style={{ color: "var(--ink)" }}
            >
              {t("discover.dermQATitle")}
            </h3>
            <p className="mt-1 text-xs leading-relaxed" style={{ color: "var(--ink-soft)" }}>
              {t("discover.dermQASubtitle")}
            </p>
          </div>
        </section>
      )}

      {/* DIY recipes */}
      <section className="mb-6">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2
            className="leading-tight"
            style={{
              fontFamily: '"Source Serif 4", "Iowan Old Style", Georgia, serif',
              fontSize: 28,
              fontWeight: 500,
              color: "var(--ink)",
            }}
          >
            {t("discover.diyTitle")}
          </h2>
          <Link href="/recipes">
            <a
              data-touch-target
              className="inline-flex items-center gap-0.5 text-xs font-semibold text-primary hover:underline"
            >
              {t("discover.diyAllRecipes")}
              <ArrowRight className="h-3.5 w-3.5" aria-hidden />
            </a>
          </Link>
        </div>

        {featuredRecipesQuery.isLoading ? (
          <div className="grid gap-3 sm:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-28 rounded-2xl skeleton" />
            ))}
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-3">
            {(featuredRecipesQuery.data ?? []).map((r) => (
              <Link key={r.id} href={`/recipes/${r.id}`}>
                <a data-touch-target className="block h-full">
                  <Card className="h-full border-border/40 bg-white shadow-sm transition-transform hover:-translate-y-0.5">
                    <CardContent className="p-3">
                      <div className="mb-2 aspect-[4/3] w-full overflow-hidden rounded-xl bg-muted/50">
                        {r.photoUrl ? (
                          <img
                            src={r.photoUrl}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full min-h-[72px] items-center justify-center text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                            {r.category}
                          </div>
                        )}
                      </div>
                      <p className="font-serif text-sm font-medium leading-snug text-foreground line-clamp-2">
                        {r.title}
                      </p>
                    </CardContent>
                  </Card>
                </a>
              </Link>
            ))}
          </div>
        )}

        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <Link href="/app/recipes/new">
            <a
              data-touch-target
              className="inline-flex items-center gap-0.5 text-xs font-semibold text-primary hover:underline"
            >
              {t("discover.diyContribute")}
              <ArrowRight className="h-3.5 w-3.5" aria-hidden />
            </a>
          </Link>
        </div>
      </section>

      {/* Tip composer */}
      {ENABLE_COMMUNITY_TIPS && isAuthenticated && (
        <section className="mb-6">
          <div className="rounded-3xl border border-border/40 bg-white p-4 shadow-sm">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="font-serif text-base font-medium text-foreground">{t("discover.shareTip")}</h2>
              <Link href="/app/rewards">
                <a className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary-strong hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-strong focus-visible:ring-offset-2 focus-visible:ring-offset-white rounded">
                  <Info className="h-3 w-3" /> {t("discover.rewards")}
                </a>
              </Link>
            </div>
            <form onSubmit={submitTip}>
              <textarea
                value={draft}
                onChange={(e) => {
                  setDraft(e.target.value.slice(0, TIP_MAX));
                  if (postError) setPostError(null);
                }}
                placeholder={t("discover.tipPlaceholder")}
                rows={3}
                aria-label={t("discover.tipAriaLabel")}
                className="w-full resize-none rounded-2xl border border-border/40 bg-[#FAFAF8] p-3 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
              <div className="mt-2 flex items-center justify-between gap-2">
                <p
                  className={`text-[11px] ${
                    draft.length > TIP_MAX - 20 ? "text-amber-600" : "text-muted-foreground"
                  }`}
                >
                  {draft.length}/{TIP_MAX}
                </p>
                <button
                  type="submit"
                  disabled={posting || draft.trim().length < TIP_MIN}
                  data-touch-target
                  className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs font-semibold text-white shadow-md shadow-primary/20 transition-transform active:scale-[0.98] disabled:opacity-40 disabled:shadow-none"
                >
                  {posting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                  {t("discover.post")}
                </button>
              </div>
              {postError && (
                <p role="alert" className="mt-2 text-xs text-destructive">
                  {postError}
                </p>
              )}
            </form>
          </div>
        </section>
      )}

      {/* Tips feed */}
      {ENABLE_COMMUNITY_TIPS && (
      <section className="mb-8">
        <div className="mb-3 flex items-center justify-between">
          <h2
            className="leading-tight"
            style={{
              fontFamily: '"Source Serif 4", "Iowan Old Style", Georgia, serif',
              fontSize: 28,
              fontWeight: 500,
              color: "var(--ink)",
            }}
          >
            {t("discover.topTips")}
          </h2>
          <span className="text-xs text-muted-foreground/70">{t("discover.last30Days")}</span>
        </div>

        {loading && (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-24 rounded-3xl skeleton" />
            ))}
          </div>
        )}

        {!loading && tips.length === 0 && (
          <div className="rounded-3xl border border-dashed border-border/60 bg-white p-8 text-center">
            <Sparkles className="mx-auto mb-2 h-6 w-6 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">
              {t("discover.emptyTips")}
            </p>
          </div>
        )}

        <div className="space-y-3">
          {tips.map((tip, i) => (
            <article
              key={tip.id}
              className="rounded-3xl border border-border/40 bg-white p-4 shadow-sm transition-all"
              style={{ animation: "fade-up 0.4s cubic-bezier(0.22,1,0.36,1) both", animationDelay: `${i * 40}ms` }}
            >
              <p className="font-serif text-sm leading-relaxed text-foreground">{tip.body}</p>
              <div className="mt-3 flex items-center justify-between text-xs">
                <span className="text-muted-foreground">
                  {t("discover.tipBy")} <span className="font-semibold text-foreground">{tip.authorDisplayName}</span>
                </span>
                <button
                  type="button"
                  onClick={() => isAuthenticated && toggleVote(tip)}
                  disabled={!isAuthenticated}
                  data-touch-target
                  aria-label={tip.viewerHasVoted ? t("discover.removeVote") : t("discover.upvoteTip")}
                  aria-pressed={tip.viewerHasVoted}
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-strong focus-visible:ring-offset-2 focus-visible:ring-offset-white ${
                    tip.viewerHasVoted
                      ? "bg-primary/15 text-primary-strong"
                      : "bg-muted text-foreground/80 hover:bg-primary/10 hover:text-primary-strong"
                  }`}
                >
                  <Heart
                    className={`h-3.5 w-3.5 ${tip.viewerHasVoted ? "fill-current" : ""}`}
                    aria-hidden
                  />
                  {tip.voteCount}
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>
      )}

      {/* Find dermatologist */}
      <section className="mb-2 -mx-4">
        <div className="rounded-3xl bg-[#F5F5F7] mx-4 overflow-hidden">
          <FindDermatologist />
        </div>
      </section>

      <p className="mt-2 flex items-center justify-center gap-1.5 text-center text-xs text-muted-foreground/60">
        <Compass className="h-3 w-3" />
        {t("discover.footnote")}
      </p>
    </AppShell>
  );
}
