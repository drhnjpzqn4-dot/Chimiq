import { useEffect } from "react";
import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { UpdateBanner } from "@/components/UpdateBanner";
import { onOfflineReady } from "@/lib/register-sw";
import { useToast } from "@/hooks/use-toast";
import Home from "@/pages/Home";
import HomeA from "@/pages/HomeA";
import HomeB from "@/pages/HomeB";
import Pricing from "@/pages/Pricing";
import AppPage from "@/pages/AppPage";
import AdminPage from "@/pages/AdminPage";
import AdminRecipesPage from "@/pages/AdminRecipesPage";
import RecipesPage from "@/pages/Recipes";
import RecipeDetailPage from "@/pages/RecipeDetail";
import Discover from "@/pages/Discover";
import { MistakeDetail, WorryDetail } from "@/pages/DiscoverDetail";
import NotFound from "@/pages/not-found";
import PrivacyPolicy from "@/pages/legal/PrivacyPolicy";
import TermsOfService from "@/pages/legal/TermsOfService";
import MedicalDisclaimer from "@/pages/legal/MedicalDisclaimer";
import { useNativeAuthDeepLink } from "@/hooks/useNativeAuthDeepLink";
import { AUTH_REFRESH_EVENT } from "@workspace/replit-auth-web";
import { I18nProvider } from "@/lib/i18n";
import { ConsentGateProvider } from "@/components/ConsentGate";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
    },
  },
});

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/a" component={HomeA} />
      <Route path="/b" component={HomeB} />
      <Route path="/pricing" component={Pricing} />
      <Route path="/app" component={AppPage} />
      <Route path="/app/:rest*" component={AppPage} />
      <Route path="/discover" component={Discover} />
      <Route path="/recipes" component={RecipesPage} />
      <Route path="/recipes/:id" component={RecipeDetailPage} />
      <Route path="/discover/mistakes/:slug" component={MistakeDetail} />
      <Route path="/discover/worries/:slug" component={WorryDetail} />
      <Route path="/admin/submissions" component={AdminPage} />
      <Route path="/admin/recipes" component={AdminRecipesPage} />
      <Route path="/legal/privacy" component={PrivacyPolicy} />
      <Route path="/legal/terms" component={TermsOfService} />
      <Route path="/legal/medical-disclaimer" component={MedicalDisclaimer} />
      <Route component={NotFound} />
    </Switch>
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

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <I18nProvider>
        <ConsentGateProvider>
          <TooltipProvider>
            <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
              <NativeBootstrap />
              <Router />
            </WouterRouter>
            <Toaster />
            <UpdateBanner />
            <OfflineReadyNotifier />
          </TooltipProvider>
        </ConsentGateProvider>
      </I18nProvider>
    </QueryClientProvider>
  );
}

export default App;
