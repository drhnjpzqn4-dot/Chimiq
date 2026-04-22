import { useEffect, useState } from "react";
import { ThumbsUp, ThumbsDown, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

const SESSION_KEY = "skinscreen_discover_session_id";
const VOTE_KEY_PREFIX = "skinscreen_discover_vote:";

function getOrCreateSessionId(): string {
  if (typeof window === "undefined") return "";
  try {
    let id = window.localStorage.getItem(SESSION_KEY);
    if (!id) {
      id =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : Math.random().toString(36).slice(2) + Date.now().toString(36);
      window.localStorage.setItem(SESSION_KEY, id);
    }
    return id;
  } catch {
    return "";
  }
}

type Rating = "up" | "down";

interface DiscoverRatingProps {
  kind: "mistakes" | "worries";
  slug: string;
}

export function DiscoverRating({ kind, slug }: DiscoverRatingProps) {
  const voteKey = `${VOTE_KEY_PREFIX}${kind}:${slug}`;
  const [submitted, setSubmitted] = useState<Rating | null>(null);
  const [comment, setComment] = useState("");
  const [showComment, setShowComment] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedComment, setSavedComment] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const prior = window.localStorage.getItem(voteKey);
      if (prior === "up" || prior === "down") setSubmitted(prior);
    } catch {
      // ignore
    }
  }, [voteKey]);

  const submitVote = async (rating: Rating) => {
    if (pending) return;
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/discover/ratings", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug,
          kind,
          rating,
          sessionId: getOrCreateSessionId(),
        }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setError(data.error ?? "Could not save your rating.");
        setPending(false);
        return;
      }
      setSubmitted(rating);
      setShowComment(true);
      try {
        window.localStorage.setItem(voteKey, rating);
      } catch {
        // ignore
      }
    } catch {
      setError("Network error. Please try again.");
    }
    setPending(false);
  };

  const submitComment = async () => {
    if (!submitted || !comment.trim() || pending) return;
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/discover/ratings", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug,
          kind,
          rating: submitted,
          comment: comment.trim(),
          sessionId: getOrCreateSessionId(),
        }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setError(data.error ?? "Could not save your comment.");
        setPending(false);
        return;
      }
      setSavedComment(true);
      setShowComment(false);
    } catch {
      setError("Network error. Please try again.");
    }
    setPending(false);
  };

  return (
    <section
      className="my-10 p-5 sm:p-6 rounded-2xl bg-white border border-border/60"
      aria-labelledby="rating-heading"
    >
      <h2
        id="rating-heading"
        className="text-sm font-semibold uppercase tracking-wider text-foreground/70 mb-3"
      >
        Was this helpful?
      </h2>

      {!submitted ? (
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => submitVote("up")}
            disabled={pending}
            aria-label="This article was helpful"
            className={cn(
              "inline-flex items-center gap-2 px-5 py-2.5 rounded-full border-2 border-border bg-white",
              "text-sm font-semibold text-foreground hover:border-primary hover:text-primary",
              "transition-colors disabled:opacity-50 disabled:cursor-not-allowed",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
            )}
          >
            <ThumbsUp className="w-4 h-4" />
            Yes, helpful
          </button>
          <button
            type="button"
            onClick={() => submitVote("down")}
            disabled={pending}
            aria-label="This article was not helpful"
            className={cn(
              "inline-flex items-center gap-2 px-5 py-2.5 rounded-full border-2 border-border bg-white",
              "text-sm font-semibold text-foreground hover:border-foreground/40",
              "transition-colors disabled:opacity-50 disabled:cursor-not-allowed",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
            )}
          >
            <ThumbsDown className="w-4 h-4" />
            Not really
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="flex items-center gap-2 text-sm text-foreground" aria-live="polite">
            <CheckCircle2 className="w-4 h-4 text-primary" />
            Thanks — we logged that as
            <span className="font-semibold">{submitted === "up" ? " helpful" : " not helpful"}</span>.
          </p>

          {showComment && !savedComment && (
            <div className="space-y-2">
              <label htmlFor="rating-comment" className="block text-xs font-medium text-muted-foreground">
                Want to tell us more? (optional, max 500 characters)
              </label>
              <textarea
                id="rating-comment"
                value={comment}
                onChange={(e) => setComment(e.target.value.slice(0, 500))}
                rows={3}
                maxLength={500}
                placeholder="What was missing or unclear?"
                className={cn(
                  "w-full rounded-2xl border border-border bg-white px-4 py-3 text-sm text-foreground",
                  "placeholder:text-muted-foreground/60",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1",
                )}
              />
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={submitComment}
                  disabled={!comment.trim() || pending}
                  className={cn(
                    "inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-primary text-white text-sm font-semibold",
                    "hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
                  )}
                >
                  Send
                </button>
                <button
                  type="button"
                  onClick={() => setShowComment(false)}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1"
                >
                  Skip
                </button>
              </div>
            </div>
          )}

          {savedComment && (
            <p className="text-xs text-muted-foreground" aria-live="polite">
              Comment received — thank you!
            </p>
          )}
        </div>
      )}

      {error && (
        <p className="mt-3 text-xs text-red-700" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
