import { useEffect } from "react";
import { useAuth } from "@workspace/replit-auth-web";
import { MyShelf } from "@/components/MyShelf";
import { ScanLine, LogOut } from "lucide-react";

export default function AppPage() {
  const { user, isLoading, isAuthenticated, logout } = useAuth();

  const base = (import.meta.env.BASE_URL ?? "/").replace(/\/+$/, "") || "";

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      window.location.href = `/api/login?returnTo=${encodeURIComponent(base + "/app")}`;
    }
  }, [isLoading, isAuthenticated, base]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAFAF8]">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-40 rounded-lg bg-border/30 animate-pulse" />
          <div className="h-4 w-24 rounded-full bg-border/20 animate-pulse" />
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return null;
  }

  const displayName = user.firstName ?? user.email?.split("@")[0] ?? "there";

  return (
    <div className="min-h-screen bg-[#FAFAF8]">
      <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-border/30">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <a href={base + "/"}>
            <img
              src={`${import.meta.env.BASE_URL}images/logo-chimiq-long.png`}
              alt="ChimIQ"
              className="h-8 w-auto"
            />
          </a>
          <button
            onClick={logout}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5 rounded-lg hover:bg-border/20"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Log out</span>
          </button>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-serif font-semibold text-foreground mb-1">
            Welcome back, {displayName}
          </h1>
          <p className="text-muted-foreground text-base">
            Your skincare shelf — check your routine and scan new products.
          </p>
        </div>

        <div className="mb-8">
          <MyShelf userId={user.id} displayName={displayName} />
        </div>

        <div className="text-center py-6">
          <a
            href={`${base}/#try-it-now`}
            className="inline-flex items-center gap-2.5 bg-primary hover:bg-primary/90 text-white px-8 py-4 rounded-full text-base font-semibold transition-all duration-200 shadow-md hover:shadow-lg hover:-translate-y-0.5"
          >
            <ScanLine className="w-5 h-5" />
            Scan a product
          </a>
          <p className="text-muted-foreground text-sm mt-3">
            Paste an ingredient list or scan a barcode to check against your shelf.
          </p>
        </div>
      </main>
    </div>
  );
}
