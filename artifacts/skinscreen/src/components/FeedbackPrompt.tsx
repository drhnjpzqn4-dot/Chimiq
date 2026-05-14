import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { MessageSquareHeart, X } from "lucide-react";
import { useTranslation } from "@/lib/i18n";
import { getBaseUrl } from "@/lib/base-url";
import { trackEvent } from "@/lib/analytics";
import { apiFetch } from "@/lib/api";

const STATE_KEY = "skinscreen.feedbackPrompt.v1";
const SESSION_COUNT_KEY = "skinscreen.feedbackPrompt.sessionCount";
const SESSION_FLAG_KEY = "skinscreen.feedbackPrompt.sessionStarted";
const DELAY_MS = 60_000;
const SUPPRESS_MS = 7 * 24 * 60 * 60 * 1000;

interface PersistedState {
  shownAt?: number;
  dismissedAt?: number;
  actedAt?: number;
  engagedAt?: number;
}

function markEngaged() {
  const fresh = readState();
  if (fresh.engagedAt) return;
  writeState({ ...fresh, engagedAt: Date.now() });
}

function isReturningSession(): boolean {
  try {
    if (sessionStorage.getItem(SESSION_FLAG_KEY)) {
      const count = parseInt(
        localStorage.getItem(SESSION_COUNT_KEY) ?? "0",
        10,
      );
      return Number.isFinite(count) && count >= 2;
    }
    sessionStorage.setItem(SESSION_FLAG_KEY, "1");
    const prev = parseInt(localStorage.getItem(SESSION_COUNT_KEY) ?? "0", 10);
    const next = (Number.isFinite(prev) ? prev : 0) + 1;
    localStorage.setItem(SESSION_COUNT_KEY, String(next));
    return next >= 2;
  } catch {
    return false;
  }
}

function readState(): PersistedState {
  try {
    const raw = localStorage.getItem(STATE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (parsed && typeof parsed === "object") return parsed as PersistedState;
    return {};
  } catch {
    return {};
  }
}

function writeState(next: PersistedState) {
  try {
    localStorage.setItem(STATE_KEY, JSON.stringify(next));
  } catch {
    // ignore quota / private mode
  }
}

function shouldSuppress(state: PersistedState): boolean {
  const now = Date.now();
  const last = Math.max(
    state.dismissedAt ?? 0,
    state.actedAt ?? 0,
    state.shownAt ?? 0,
  );
  if (!last) return false;
  return now - last < SUPPRESS_MS;
}

type Mode = "intro" | "form" | "thanks";

export function FeedbackPrompt() {
  const { t, locale } = useTranslation();
  const [location] = useLocation();
  const [visible, setVisible] = useState(false);
  const [mode, setMode] = useState<Mode>("intro");
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [delayElapsed, setDelayElapsed] = useState(false);
  const [engaged, setEngaged] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return !!readState().engagedAt;
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (shouldSuppress(readState())) return;

    if (isReturningSession()) {
      markEngaged();
      setEngaged(true);
    }

    const onScan = () => {
      markEngaged();
      setEngaged(true);
    };
    window.addEventListener(
      "skinscreen:scan-completed",
      onScan as EventListener,
    );

    const timer = window.setTimeout(() => {
      setDelayElapsed(true);
    }, DELAY_MS);

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener(
        "skinscreen:scan-completed",
        onScan as EventListener,
      );
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (engaged) return;
    if (location.startsWith("/app/discover")) {
      markEngaged();
      setEngaged(true);
    }
  }, [location, engaged]);

  useEffect(() => {
    if (!delayElapsed || !engaged || visible) return;
    const fresh = readState();
    if (shouldSuppress(fresh)) return;
    writeState({ ...fresh, shownAt: Date.now() });
    setVisible(true);
    trackEvent("feedback_prompt_shown");
  }, [delayElapsed, engaged, visible]);

  if (!visible) return null;

  const close = () => {
    setVisible(false);
  };

  const dismiss = () => {
    writeState({ ...readState(), dismissedAt: Date.now() });
    trackEvent("feedback_prompt_dismiss", { mode });
    close();
  };

  const openForm = () => {
    setMode("form");
    setError(null);
    trackEvent("feedback_prompt_open_form");
  };

  const submit = async () => {
    const trimmed = message.trim();
    if (!trimmed || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await apiFetch(`${getBaseUrl()}api/feedback`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: trimmed,
          email: email.trim() || undefined,
          locale,
          pageUrl:
            typeof window !== "undefined"
              ? window.location.href.slice(0, 2000)
              : undefined,
        }),
      });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      writeState({ ...readState(), actedAt: Date.now() });
      trackEvent("feedback_prompt_submit", { hasEmail: !!email.trim() });
      setMode("thanks");
      window.setTimeout(() => {
        setVisible(false);
      }, 2500);
    } catch {
      setError(t("feedbackPrompt.error"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-labelledby="feedback-prompt-title"
      aria-describedby="feedback-prompt-body"
      className="fixed left-1/2 z-[60] w-full max-w-md -translate-x-1/2 px-3 sm:px-0"
      style={{
        bottom:
          "calc(var(--tab-bar-height, 64px) + var(--safe-bottom, 0px) + 12px)",
      }}
    >
      <div className="relative flex items-start gap-3 rounded-2xl border border-primary/30 bg-white/95 p-4 pr-10 shadow-lg backdrop-blur">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <MessageSquareHeart className="h-4 w-4" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p
            id="feedback-prompt-title"
            className="text-[14px] font-semibold leading-tight text-foreground"
          >
            {t("feedbackPrompt.title")}
          </p>

          {mode === "intro" && (
            <>
              <p
                id="feedback-prompt-body"
                className="mt-0.5 text-[12px] leading-snug text-muted-foreground"
              >
                {t("feedbackPrompt.body")}
              </p>
              <div className="mt-3 flex items-center gap-2">
                <button
                  type="button"
                  onClick={openForm}
                  className="rounded-full bg-primary px-3 py-1.5 text-[12px] font-semibold text-white shadow-sm transition-colors hover:bg-primary/90"
                >
                  {t("feedbackPrompt.cta")}
                </button>
                <button
                  type="button"
                  onClick={dismiss}
                  className="rounded-full px-3 py-1.5 text-[12px] font-semibold text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground"
                >
                  {t("feedbackPrompt.dismiss")}
                </button>
              </div>
            </>
          )}

          {mode === "form" && (
            <form
              className="mt-2 space-y-2"
              onSubmit={(e) => {
                e.preventDefault();
                void submit();
              }}
            >
              <label className="sr-only" htmlFor="feedback-prompt-message">
                {t("feedbackPrompt.messageLabel")}
              </label>
              <textarea
                id="feedback-prompt-message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={t("feedbackPrompt.messagePlaceholder")}
                rows={3}
                maxLength={4000}
                required
                autoFocus
                className="w-full resize-none rounded-lg border border-border bg-white px-2.5 py-1.5 text-[12px] leading-snug text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary/40"
              />
              <label className="sr-only" htmlFor="feedback-prompt-email">
                {t("feedbackPrompt.emailLabel")}
              </label>
              <input
                id="feedback-prompt-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t("feedbackPrompt.emailPlaceholder")}
                maxLength={320}
                className="w-full rounded-lg border border-border bg-white px-2.5 py-1.5 text-[12px] leading-snug text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary/40"
              />
              {error && (
                <p
                  role="alert"
                  className="text-[11px] font-medium text-destructive"
                >
                  {error}
                </p>
              )}
              <div className="flex items-center gap-2 pt-0.5">
                <button
                  type="submit"
                  disabled={submitting || message.trim().length === 0}
                  className="rounded-full bg-primary px-3 py-1.5 text-[12px] font-semibold text-white shadow-sm transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {submitting
                    ? t("feedbackPrompt.submitting")
                    : t("feedbackPrompt.submit")}
                </button>
                <button
                  type="button"
                  onClick={dismiss}
                  className="rounded-full px-3 py-1.5 text-[12px] font-semibold text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground"
                >
                  {t("feedbackPrompt.cancel")}
                </button>
              </div>
            </form>
          )}

          {mode === "thanks" && (
            <p
              id="feedback-prompt-body"
              className="mt-1 text-[12px] leading-snug text-muted-foreground"
            >
              {t("feedbackPrompt.thanks")}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={mode === "thanks" ? close : dismiss}
          aria-label={t("feedbackPrompt.close")}
          className="absolute right-2 top-2 rounded-full p-1 text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
