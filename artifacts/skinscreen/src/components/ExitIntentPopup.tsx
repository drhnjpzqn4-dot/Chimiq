import { useCallback, useEffect, useRef, useState } from "react";
import { X, ScanLine } from "lucide-react";
import { useTranslation } from "@/lib/i18n";
import { trackEvent } from "@/lib/analytics";

const STORAGE_KEY = "chimiq.exitPopup.shown";

interface ExitIntentPopupProps {
  enabled: boolean;
  onCta: () => void;
}

export function ExitIntentPopup({ enabled, onCta }: ExitIntentPopupProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const armedRef = useRef(false);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const pushedActiveRef = useRef(false);
  const suppressPopOnceRef = useRef(false);

  const consumePushedState = useCallback(() => {
    if (!pushedActiveRef.current || typeof window === "undefined") return;
    pushedActiveRef.current = false;
    suppressPopOnceRef.current = true;
    try {
      window.history.back();
    } catch {
      suppressPopOnceRef.current = false;
    }
  }, []);

  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;
    try {
      if (window.localStorage.getItem(STORAGE_KEY) === "1") return;
    } catch {
      // ignore
    }

    const armTimer = window.setTimeout(() => {
      armedRef.current = true;
    }, 1500);

    const trigger = () => {
      if (!armedRef.current) return;
      armedRef.current = false;
      setOpen(true);
      try {
        window.localStorage.setItem(STORAGE_KEY, "1");
      } catch {
        // ignore
      }
      trackEvent("exit_popup_shown", { page: "signup" });
    };

    const onMouseLeave = (e: MouseEvent) => {
      if (e.clientY <= 0) trigger();
    };

    try {
      window.history.pushState({ chimiqExitGuard: true }, "");
      pushedActiveRef.current = true;
    } catch {
      // ignore
    }

    const onPopState = () => {
      if (suppressPopOnceRef.current) {
        suppressPopOnceRef.current = false;
        return;
      }
      pushedActiveRef.current = false;
      trigger();
    };

    document.documentElement.addEventListener("mouseleave", onMouseLeave);
    window.addEventListener("popstate", onPopState);

    return () => {
      window.clearTimeout(armTimer);
      document.documentElement.removeEventListener("mouseleave", onMouseLeave);
      window.removeEventListener("popstate", onPopState);
      consumePushedState();
    };
  }, [enabled, consumePushedState]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleDismiss();
    };
    window.addEventListener("keydown", onKey);
    dialogRef.current?.focus();
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleDismiss = () => {
    setOpen(false);
    consumePushedState();
    trackEvent("exit_popup_dismiss", { page: "signup" });
  };

  const handleCta = () => {
    setOpen(false);
    consumePushedState();
    trackEvent("exit_popup_cta_click", { page: "signup" });
    onCta();
  };

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="exit-popup-title"
      className="fixed inset-0 z-[1100] flex items-end sm:items-center justify-center bg-black/55 backdrop-blur-sm px-4 py-6"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleDismiss();
      }}
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-6 sm:p-8 relative outline-none"
      >
        <button
          type="button"
          onClick={handleDismiss}
          aria-label={t("exitPopup.close")}
          className="absolute top-3 right-3 h-9 w-9 inline-flex items-center justify-center rounded-full text-muted-foreground hover:bg-border/30 hover:text-foreground transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary-strong">
          <ScanLine className="h-7 w-7" />
        </div>

        <h2
          id="exit-popup-title"
          className="text-2xl font-serif font-semibold text-foreground mb-3"
        >
          {t("exitPopup.title")}
        </h2>
        <p className="text-sm text-muted-foreground leading-relaxed mb-6">
          {t("exitPopup.body")}
        </p>

        <button
          type="button"
          onClick={handleCta}
          className="w-full py-3 rounded-full bg-primary-strong text-white text-sm font-semibold hover:bg-primary-strong/90 transition-colors"
        >
          {t("exitPopup.cta")}
        </button>
        <button
          type="button"
          onClick={handleDismiss}
          className="w-full mt-2 py-2.5 rounded-full text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          {t("exitPopup.dismiss")}
        </button>
      </div>
    </div>
  );
}
