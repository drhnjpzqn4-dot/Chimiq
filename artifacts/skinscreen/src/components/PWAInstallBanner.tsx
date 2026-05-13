import { useEffect, useState } from "react";
import { Smartphone, X, Share, MoreVertical } from "lucide-react";

const DISMISS_KEY = "skinscreen-pwa-install-dismissed";

type Platform = "ios" | "android" | "other";

function detectPlatform(): Platform {
  if (typeof navigator === "undefined") return "other";
  const ua = navigator.userAgent || "";
  if (/iPad|iPhone|iPod/i.test(ua) && !(window as { MSStream?: unknown }).MSStream) return "ios";
  if (/Android/i.test(ua)) return "android";
  return "other";
}

function isMobileViewport(): boolean {
  if (typeof window === "undefined") return false;
  return window.innerWidth < 640;
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  const mqStandalone = window.matchMedia?.("(display-mode: standalone)").matches;
  const iosStandalone = (window.navigator as { standalone?: boolean }).standalone === true;
  return Boolean(mqStandalone || iosStandalone);
}

export function PWAInstallBanner() {
  const [visible, setVisible] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [platform, setPlatform] = useState<Platform>("other");

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (isStandalone()) return;
    if (!isMobileViewport()) return;
    const dismissed = localStorage.getItem(DISMISS_KEY);
    if (dismissed) return;
    const p = detectPlatform();
    setPlatform(p === "other" ? "ios" : p);
    const t = setTimeout(() => setVisible(true), 1200);
    return () => clearTimeout(t);
  }, []);

  if (!visible) return null;

  const handleDismiss = () => {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setVisible(false);
  };

  return (
    <div
      className="fixed bottom-3 left-3 right-3 z-[60] sm:hidden"
      role="dialog"
      aria-label="Install Chimiq as an app"
    >
      <div className="bg-white border border-[#E8F0E8] rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.12)] overflow-hidden">
        <div className="flex items-start gap-3 p-3">
          <div className="w-10 h-10 rounded-xl bg-[color-mix(in_srgb,var(--sage)_10%,transparent)] flex items-center justify-center shrink-0">
            <Smartphone className="w-5 h-5 text-[var(--sage)]" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground leading-tight">
              Install Chimiq as an app
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Add to your home screen for one-tap access.
            </p>
            {!expanded && (
              <button
                onClick={() => setExpanded(true)}
                className="text-xs font-medium text-[var(--sage)] mt-2 hover:underline"
              >
                Show me how
              </button>
            )}
          </div>
          <button
            onClick={handleDismiss}
            aria-label="Dismiss install banner"
            className="text-muted-foreground hover:text-foreground transition-colors p-1 -mr-1 -mt-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {expanded && (
          <div className="border-t border-[#E8F0E8] px-3 py-3 bg-[#F7FAF7] text-xs text-foreground/80 leading-relaxed space-y-2">
            {platform === "ios" ? (
              <>
                <p className="font-medium text-foreground">On iPhone (Safari):</p>
                <ol className="list-decimal pl-4 space-y-1">
                  <li className="flex items-center gap-1.5 flex-wrap">
                    <span>Tap</span>
                    <Share className="inline w-3.5 h-3.5 text-[var(--sage)]" />
                    <span>the Share button</span>
                  </li>
                  <li>Scroll and choose <strong>Add to Home Screen</strong></li>
                  <li>Tap <strong>Add</strong> in the top right</li>
                </ol>
              </>
            ) : (
              <>
                <p className="font-medium text-foreground">On Android (Chrome):</p>
                <ol className="list-decimal pl-4 space-y-1">
                  <li className="flex items-center gap-1.5 flex-wrap">
                    <span>Tap the</span>
                    <MoreVertical className="inline w-3.5 h-3.5 text-[var(--sage)]" />
                    <span>menu</span>
                  </li>
                  <li>Choose <strong>Install app</strong> or <strong>Add to Home screen</strong></li>
                  <li>Confirm <strong>Install</strong></li>
                </ol>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
