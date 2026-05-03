import { useEffect, useState } from "react";
import { MessageSquareHeart, X } from "lucide-react";
import { useTranslation } from "@/lib/i18n";

const STATE_KEY = "skinscreen.feedbackPrompt.v1";
const DELAY_MS = 60_000;
const SUPPRESS_MS = 7 * 24 * 60 * 60 * 1000;
const FEEDBACK_URL = "mailto:hello@chimiq.com?subject=Chimiq%20feedback";

interface PersistedState {
  shownAt?: number;
  dismissedAt?: number;
  actedAt?: number;
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

export function FeedbackPrompt() {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (shouldSuppress(readState())) return;

    const timer = window.setTimeout(() => {
      const fresh = readState();
      if (shouldSuppress(fresh)) return;
      writeState({ ...fresh, shownAt: Date.now() });
      setVisible(true);
    }, DELAY_MS);

    return () => window.clearTimeout(timer);
  }, []);

  if (!visible) return null;

  const dismiss = () => {
    writeState({ ...readState(), dismissedAt: Date.now() });
    setVisible(false);
  };

  const act = () => {
    writeState({ ...readState(), actedAt: Date.now() });
    setVisible(false);
    try {
      window.open(FEEDBACK_URL, "_blank", "noopener,noreferrer");
    } catch {
      window.location.href = FEEDBACK_URL;
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
          <p
            id="feedback-prompt-body"
            className="mt-0.5 text-[12px] leading-snug text-muted-foreground"
          >
            {t("feedbackPrompt.body")}
          </p>
          <div className="mt-3 flex items-center gap-2">
            <button
              type="button"
              onClick={act}
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
        </div>
        <button
          type="button"
          onClick={dismiss}
          aria-label={t("feedbackPrompt.close")}
          className="absolute right-2 top-2 rounded-full p-1 text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
