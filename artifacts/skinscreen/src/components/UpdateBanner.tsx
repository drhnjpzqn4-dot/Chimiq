import { useEffect, useState } from "react";
import { RefreshCw, X } from "lucide-react";
import {
  applySwUpdate,
  getUpdateToken,
  isUpdateAvailable,
  onSwUpdate,
} from "@/lib/register-sw";
import { useTranslation } from "@/lib/i18n";

const DISMISS_KEY = "skinscreen:update-dismissed-token";

export function UpdateBanner() {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);
  const [reloading, setReloading] = useState(false);

  useEffect(() => {
    const evaluate = () => {
      if (!isUpdateAvailable()) return;
      const token = getUpdateToken();
      // Dismissals are scoped to the specific update token. When a *new*
      // update arrives in the same session the token changes, so a previously
      // dismissed banner re-appears for the new release.
      try {
        const dismissed = sessionStorage.getItem(DISMISS_KEY);
        if (token && dismissed === token) return;
      } catch {
        // sessionStorage unavailable (private mode, etc.) — show anyway
      }
      setVisible(true);
    };

    evaluate();
    const unsub = onSwUpdate(evaluate);
    return unsub;
  }, []);

  const handleRefresh = async () => {
    setReloading(true);
    try {
      await applySwUpdate();
    } catch {
      window.location.reload();
    }
  };

  const handleDismiss = () => {
    setVisible(false);
    try {
      const token = getUpdateToken();
      if (token) sessionStorage.setItem(DISMISS_KEY, token);
    } catch {
      // ignore
    }
  };

  if (!visible) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed left-1/2 z-[60] -translate-x-1/2 px-3 sm:px-0 w-full max-w-md"
      style={{ bottom: "calc(var(--tab-bar-height, 64px) + 12px + var(--safe-bottom, 0px))" }}
    >
      <div className="flex items-center gap-3 rounded-2xl border border-primary/30 bg-white/95 p-3 pl-4 shadow-lg backdrop-blur">
        <RefreshCw className="h-4 w-4 shrink-0 text-primary" />
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold leading-tight text-foreground">
            {t("updateBanner.title")}
          </p>
          <p className="text-[11px] leading-tight text-muted-foreground">
            {t("updateBanner.body")}
          </p>
        </div>
        <button
          type="button"
          onClick={handleRefresh}
          disabled={reloading}
          className="rounded-full bg-primary px-3 py-1.5 text-[12px] font-semibold text-white shadow-sm transition-colors hover:bg-primary/90 disabled:opacity-60"
        >
          {reloading ? t("updateBanner.refreshing") : t("updateBanner.refresh")}
        </button>
        <button
          type="button"
          onClick={handleDismiss}
          aria-label={t("updateBanner.dismiss")}
          className="rounded-full p-1 text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
