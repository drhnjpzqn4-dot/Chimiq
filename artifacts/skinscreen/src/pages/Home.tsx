import { lazy, Suspense, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@workspace/replit-auth-web";
import { ScanLine, Sparkles } from "lucide-react";
import { generalConfig } from "@/lib/landing-config";
import { useTranslation } from "@/lib/i18n";

const LandingPage = lazy(() =>
  import("@/components/LandingPage").then((m) => ({ default: m.LandingPage })),
);

function isStandaloneDisplay(): boolean {
  if (typeof window === "undefined") return false;
  if (window.matchMedia?.("(display-mode: standalone)").matches) return true;
  // iOS Safari home-screen flag
  return Boolean((window.navigator as { standalone?: boolean }).standalone);
}

/**
 * One-screen welcome shown ONLY to signed-out users who have launched the
 * app from a home-screen icon (PWA standalone mode) or the future native
 * shell. The full marketing landing page is reserved for browser tabs.
 */
function StandaloneWelcome() {
  const { t } = useTranslation();
  const [, navigate] = useLocation();
  return (
    <main
      className="flex min-h-[100dvh] flex-col bg-gradient-to-br from-rose-50 via-white to-amber-50 px-6"
      style={{
        paddingTop: "max(env(safe-area-inset-top, 0px), 1.5rem)",
        paddingBottom: "max(env(safe-area-inset-bottom, 0px), 1.5rem)",
      }}
    >
      <div className="flex flex-1 flex-col items-center justify-center text-center">
        <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-primary text-white shadow-lg shadow-primary/30">
          <ScanLine className="h-10 w-10" />
        </div>
        <h1 className="font-serif text-3xl font-medium leading-tight text-foreground">
          Chimiq
        </h1>
        <p className="mt-2 text-sm font-medium uppercase tracking-widest text-primary">
          {t("homeStandalone.kicker")}
        </p>
        <p className="mt-6 max-w-sm text-base text-muted-foreground">
          {t("homeStandalone.body")}
        </p>
      </div>
      <div className="space-y-3 pb-2">
        <button
          type="button"
          onClick={() => navigate("/signup?next=" + encodeURIComponent("/app/scan"))}
          data-touch-target
          className="flex min-h-[52px] w-full items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-3 text-base font-semibold text-white shadow-lg shadow-primary/25 transition-transform active:scale-[0.98]"
        >
          <Sparkles className="h-4 w-4" />
          {t("homeStandalone.cta")}
        </button>
        <p className="text-center text-xs text-muted-foreground">
          {t("homeStandalone.priceNote")}
        </p>
      </div>
    </main>
  );
}

export default function Home() {
  const { isAuthenticated, isLoading } = useAuth();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (isLoading) return;
    if (isAuthenticated && isStandaloneDisplay()) {
      navigate("/app/scan", { replace: true });
    }
  }, [isAuthenticated, isLoading, navigate]);

  if (isLoading) return null;

  // Standalone PWA / native shell: never show the marketing landing page.
  // Signed-in users get redirected above; signed-out users get the
  // one-screen welcome.
  if (!isAuthenticated && isStandaloneDisplay()) {
    return <StandaloneWelcome />;
  }

  return (
    <Suspense fallback={null}>
      <LandingPage config={generalConfig} />
    </Suspense>
  );
}
