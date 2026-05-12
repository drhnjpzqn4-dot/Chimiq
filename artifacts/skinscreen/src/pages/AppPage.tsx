import { lazy, Suspense, useEffect } from "react";
import { Switch, Route, Redirect, useLocation } from "wouter";
import { useAuth } from "@workspace/replit-auth-web";
import { ChatPanelLauncher } from "@/components/ChatPanelLauncher";
import { trackEvent, trackMetaStandard } from "@/lib/analytics";
import { useUserPlan } from "@/hooks/useUserPlan";

const ScanScreen = lazy(() => import("@/pages/app/Scan"));
const HomeScreen = lazy(() => import("@/pages/app/Home"));
const ShelfScreen = lazy(() => import("@/pages/app/Shelf"));
const BrowseScreen = lazy(() => import("@/pages/app/Browse"));
const BrowseDetailScreen = lazy(() => import("@/pages/app/BrowseDetail"));
const DiscoverScreen = lazy(() => import("@/pages/app/Discover"));
const ProfileScreen = lazy(() => import("@/pages/app/Profile"));
const RecipeSubmitScreen = lazy(() => import("@/pages/app/RecipeSubmit"));
const ProblemsScreen = lazy(() => import("@/pages/app/Problems"));
const LeaderboardScreen = lazy(() => import("@/pages/app/Leaderboard"));
const RewardsScreen = lazy(() => import("@/pages/app/Rewards"));

function AppRouteFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FAFAF8]">
      <div className="flex flex-col items-center gap-4">
        <div className="h-10 w-40 rounded-lg skeleton" />
        <div className="h-4 w-24 rounded-full skeleton" />
      </div>
    </div>
  );
}

export default function AppPage() {
  const { isLoading, isAuthenticated } = useAuth();
  const { isPremium } = useUserPlan();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate("/signup?next=" + encodeURIComponent("/app/scan"), { replace: true });
    }
    if (!isLoading && isAuthenticated) {
      try {
        const pending = sessionStorage.getItem("skinscreen.signup_pending");
        if (pending) {
          sessionStorage.removeItem("skinscreen.signup_pending");
          if (pending === "signup") {
            trackEvent("sign_up_complete", { method: "replit" });
            trackMetaStandard("CompleteRegistration", { method: "replit" });
          } else {
            trackEvent("login_complete", { method: "replit" });
          }
        }
      } catch {}
    }
  }, [isLoading, isAuthenticated, navigate]);

  if (isLoading) {
    return <AppRouteFallback />;
  }

  if (!isAuthenticated) return null;

  return (
    <>
      <Suspense fallback={<AppRouteFallback />}>
        <Switch>
          <Route path="/app" component={() => <Redirect to="/app/scan" />} />
          <Route path="/app/home" component={HomeScreen} />
          <Route path="/app/scan" component={ScanScreen} />
          <Route path="/app/browse" component={BrowseScreen} />
          <Route path="/app/browse/:barcode" component={BrowseDetailScreen} />
          <Route path="/app/problems" component={ProblemsScreen} />
          <Route path="/app/shelf" component={ShelfScreen} />
          <Route path="/app/discover" component={DiscoverScreen} />
          <Route path="/app/profile" component={ProfileScreen} />
          <Route path="/app/recipes/new" component={RecipeSubmitScreen} />
          <Route path="/app/leaderboard" component={LeaderboardScreen} />
          <Route path="/app/rewards" component={RewardsScreen} />
          <Route component={() => <Redirect to="/app/scan" />} />
        </Switch>
      </Suspense>
      <ChatPanelLauncher isPremium={isPremium} />
    </>
  );
}
