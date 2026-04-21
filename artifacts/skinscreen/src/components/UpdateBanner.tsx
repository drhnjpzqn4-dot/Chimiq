import { useEffect, useState } from "react";
import { RefreshCw, X } from "lucide-react";
import { applySwUpdate, isUpdateAvailable, onSwUpdate } from "@/lib/register-sw";

const DISMISS_KEY = "skinscreen:update-dismissed-build";

export function UpdateBanner() {
  const [visible, setVisible] = useState(false);
  const [reloading, setReloading] = useState(false);

  useEffect(() => {
    const evaluate = () => {
      if (!isUpdateAvailable()) return;
      // The dismiss key stores the build that was dismissed. Because the SW
      // ships a new bundle on each release the storage value won't match the
      // newly-active build, so the banner re-appears. We use a per-session
      // dismiss flag to avoid annoying the user during a single session.
      try {
        const dismissed = sessionStorage.getItem(DISMISS_KEY);
        if (dismissed === "1") return;
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
      sessionStorage.setItem(DISMISS_KEY, "1");
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
            New version available
          </p>
          <p className="text-[11px] leading-tight text-muted-foreground">
            Refresh to get the latest improvements.
          </p>
        </div>
        <button
          type="button"
          onClick={handleRefresh}
          disabled={reloading}
          className="rounded-full bg-primary px-3 py-1.5 text-[12px] font-semibold text-white shadow-sm transition-colors hover:bg-primary/90 disabled:opacity-60"
        >
          {reloading ? "Refreshing…" : "Refresh"}
        </button>
        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Dismiss update notice"
          className="rounded-full p-1 text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
