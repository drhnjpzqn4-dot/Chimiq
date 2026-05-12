import { lazy, Suspense, useEffect } from "react";
import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { UpdateBanner } from "@/components/UpdateBanner";
import { FeedbackPrompt } from "@/components/FeedbackPrompt";
import { onOfflineReady } from "@/lib/register-sw";
import { useToast } from "@/hooks/use-toast";
import Home from "@/pages/Home";
import { useNativeAuthDeepLink } from "@/hooks/useNativeAuthDeepLink";
import { AUTH_REFRESH_EVENT } from "@workspace/replit-auth-web";
import { I18nProvider } from "@/lib/i18n";
import { ConsentGateProvider } from "@/components/ConsentGate";
import { CookieBanner } from "@/components/CookieBanner";
import { startAnalyticsLoader } from "@/lib/analytics";
import { isNative } from "@/lib/native";

const HomeA = lazy(() => import("@/pages/HomeA"));
const HomeB = lazy(() => import("@/pages/HomeB"));
const Pricing = lazy(() => import("@/pages/Pricing"));
const Signup = lazy(() => import("@/pages/Signup"));
const LoginPage = lazy(() => import("@/pages/LoginPage"));
const ResetPasswordPage = lazy(() => import("@/pages/ResetPasswordPage"));
const AppPage = lazy(() => import("@/pages/AppPage"));
const OnboardingFlow = lazy(() => import("@/pages/OnboardingFlow"));
const AdminPage = lazy(() => import("@/pages/AdminPage"));
const AdminRecipesPage = lazy(() => import("@/pages/AdminRecipesPage"));
const AdminUsersPage = lazy(() => import("@/pages/AdminUsersPage"));
const AdminTesterPromoHistoryPage = lazy(
  () => import("@/pages/AdminTesterPromoHistoryPage"),
);
const AdminFunnelPage = lazy(() => import("@/pages/AdminFunnelPage"));
const RecipesPage = lazy(() => import("@/pages/Recipes"));
const RecipeDetailPage = lazy(() => import("@/pages/RecipeDetail"));
const Discover = lazy(() => import("@/pages/Discover"));
const MistakeDetail = lazy(() =>
  import("@/pages/DiscoverDetail").then((m) => ({ default: m.MistakeDetail })),
);
const WorryDetail = lazy(() =>
  import("@/pages/DiscoverDetail").then((m) => ({ default: m.WorryDetail })),
);
const NotFound = lazy(() => import("@/pages/not-found"));
const PrivacyPolicy = lazy(() => import("@/pages/legal/PrivacyPolicy"));
const TermsOfService = lazy(() => import("@/pages/legal/TermsOfService"));
const MedicalDisclaimer = lazy(() => import("@/pages/legal/MedicalDisclaimer"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
    },
  },
});

function RouteFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FAFAF8]">
      <div className="flex flex-col items-center gap-4">
        <div className="h-10 w-40 rounded-lg skeleton" />
        <div className="h-4 w-24 rounded-full skeleton" />
      </div>
    </div>
  );
}

/**
 * Handles Supabase hash tokens in the URL (#access_token=...).
 * Occurs after magic links and password reset links.
 * Exchanges the token for a server session cookie.
 */
function HashTokenHandler() {
  useEffect(() => {
    const hash = window.location.hash;
    if (!hash.includes("access_token=")) return;
    const params = new URLSearchParams(hash.substring(1));
    const access_token = params.get("access_token");
    const refresh_token = params.get("refresh_token");
    const type = params.get("type");
    if (!access_token) return;

    // Clear the hash from the URL immediately
    window.history.replaceState({}, "", window.location.pathname + window.location.search);

    if (type === "recovery") {
      // Password reset — go to reset page with token in query string
      const dest = `/reset-password?access_token=${encodeURIComponent(access_token)}${refresh_token ? `&refresh_token=${encodeURIComponent(refresh_token)}` : ""}`;
      window.location.href = dest;
      return;
    }

    // Regular sign-in / magic link — exchange for server session
    fetch("/api/auth/token-exchange", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ access_token, refresh_token }),
    })
      .then((res) => { if (res.ok) window.location.reload(); })
      .catch(console.error);
  }, []);
  return null;
}

function Router() {
  return (
    <Suspense fallback={<RouteFallback />}>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/a" component={HomeA} />
        <Route path="/b" component={HomeB} />
        <Route path="/pricing" component={Pricing} />
        <Route path="/signup" component={Signup} />
        <Route path="/login" component={LoginPage} />
        <Route path="/reset-password" component={ResetPasswordPage} />
        <Route path="/onboarding" component={OnboardingFlow} />
        <Route path="/app" component={AppPage} />
        <Route path="/app/:rest*" component={AppPage} />
        <Route path="/discover" component={Discover} />
        <Route path="/recipes" component={RecipesPage} />
        <Route path="/recipes/:id" component={RecipeDetailPage} />
        <Route path="/discover/mistakes/:slug" component={MistakeDetail} />
        <Route path="/discover/worries/:slug" component={WorryDetail} />
        <Route path="/admin/submissions" component={AdminPage} />
        <Route path="/admin/recipes" component={AdminRecipesPage} />
        <Route path="/admin/users" component={AdminUsersPage} />
        <Route
          path="/admin/tester-promo/history"
          component={AdminTesterPromoHistoryPage}
        />
        <Route path="/admin/funnel" component={AdminFunnelPage} />
        <Route path="/legal/privacy" component={PrivacyPolicy} />
        <Route path="/legal/terms" component={TermsOfService} />
        <Route path="/legal/medical-disclaimer" component={MedicalDisclaimer} />
        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

function NativeBootstrap() {
  useNativeAuthDeepLink(() => {
    // After the OS routes the OAuth callback back into the app, force every
    // useAuth() consumer to re-fetch /api/auth/user so Premium-gated UI
    // unlocks without a manual reload.
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event(AUTH_REFRESH_EVENT));
    }
  });
  return null;
}

/**
 * Mounts once and shows a single confirmation toast the first time the
 * service worker finishes caching the app for offline use. The
 * register-sw helper replays the event for late subscribers, so this is
 * safe to mount inside a deferred-render tree.
 */
function OfflineReadyNotifier() {
  const { toast } = useToast();
  useEffect(() => {
    let dismissed = false;
    const unsubscribe = onOfflineReady(() => {
      if (dismissed) return;
      dismissed = true;
      toast({
        title: "Installed",
        description: "Chimiq now works offline.",
        duration: 5000,
      });
    });
    return () => {
      dismissed = true;
      unsubscribe();
    };
  }, [toast]);
  return null;
}

function AnalyticsBootstrap() {
  useEffect(() => {
    if (isNative()) return;
    return startAnalyticsLoader();
  }, []);
  return null;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <I18nProvider>
        <ConsentGateProvider>
          <TooltipProvider>
            <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
              <NativeBootstrap />
              <HashTokenHandler />
      <Router />
            </WouterRouter>
            <Toaster />
            <UpdateBanner />
            <FeedbackPrompt />
            <OfflineReadyNotifier />
            <AnalyticsBootstrap />
            {!isNative() && <CookieBanner />}
          </TooltipProvider>
        </ConsentGateProvider>
      </I18nProvider>
    </QueryClientProvider>
  );
}

export default App;
