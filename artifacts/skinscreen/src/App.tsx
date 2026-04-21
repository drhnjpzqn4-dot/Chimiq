import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { UpdateBanner } from "@/components/UpdateBanner";
import Home from "@/pages/Home";
import HomeA from "@/pages/HomeA";
import HomeB from "@/pages/HomeB";
import Pricing from "@/pages/Pricing";
import AppPage from "@/pages/AppPage";
import AdminPage from "@/pages/AdminPage";
import AdminRecipesPage from "@/pages/AdminRecipesPage";
import Discover from "@/pages/Discover";
import { MistakeDetail, WorryDetail } from "@/pages/DiscoverDetail";
import NotFound from "@/pages/not-found";

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
      <Route path="/discover/mistakes/:slug" component={MistakeDetail} />
      <Route path="/discover/worries/:slug" component={WorryDetail} />
      <Route path="/admin/submissions" component={AdminPage} />
      <Route path="/admin/recipes" component={AdminRecipesPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
        <UpdateBanner />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
