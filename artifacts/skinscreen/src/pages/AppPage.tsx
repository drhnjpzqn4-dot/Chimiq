import { useEffect } from "react";
import { Switch, Route, Redirect } from "wouter";
import { useAuth } from "@workspace/replit-auth-web";
import { ChatPanel } from "@/components/ChatPanel";
import ScanScreen from "@/pages/app/Scan";
import ShelfScreen from "@/pages/app/Shelf";
import BrowseScreen from "@/pages/app/Browse";
import BrowseDetailScreen from "@/pages/app/BrowseDetail";
import DiscoverScreen from "@/pages/app/Discover";
import ProfileScreen from "@/pages/app/Profile";
import RecipeSubmitScreen from "@/pages/app/RecipeSubmit";
import ProblemsScreen from "@/pages/app/Problems";

export default function AppPage() {
  const { isLoading, isAuthenticated } = useAuth();
  const base = (import.meta.env.BASE_URL ?? "/").replace(/\/+$/, "") || "";

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      window.location.href = `/api/login?returnTo=${encodeURIComponent(base + "/app/scan")}`;
    }
  }, [isLoading, isAuthenticated, base]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAFAF8]">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-40 rounded-lg skeleton" />
          <div className="h-4 w-24 rounded-full skeleton" />
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <>
      <Switch>
        <Route path="/app" component={() => <Redirect to="/app/scan" />} />
        <Route path="/app/scan" component={ScanScreen} />
        <Route path="/app/browse" component={BrowseScreen} />
        <Route path="/app/browse/:barcode" component={BrowseDetailScreen} />
        <Route path="/app/problems" component={ProblemsScreen} />
        <Route path="/app/shelf" component={ShelfScreen} />
        <Route path="/app/discover" component={DiscoverScreen} />
        <Route path="/app/profile" component={ProfileScreen} />
        <Route path="/app/recipes/new" component={RecipeSubmitScreen} />
        <Route component={() => <Redirect to="/app/scan" />} />
      </Switch>
      <ChatPanel />
    </>
  );
}
