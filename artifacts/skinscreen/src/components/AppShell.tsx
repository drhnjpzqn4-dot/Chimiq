import { ReactNode } from "react";
import { BottomTabBar } from "@/components/BottomTabBar";

interface AppShellProps {
  title?: string;
  subtitle?: string;
  rightSlot?: ReactNode;
  children: ReactNode;
}

export function AppShell({ title, subtitle, rightSlot, children }: AppShellProps) {
  const base = (import.meta.env.BASE_URL ?? "/").replace(/\/+$/, "") || "";

  return (
    <div className="min-h-screen bg-[#FAFAF8]">
      <a href="#main-content" className="skip-to-content">
        Skip to main content
      </a>
      <header
        className="sticky top-0 z-40 border-b border-border/30 bg-white/85 backdrop-blur-md"
        style={{ paddingTop: "var(--safe-top)" }}
      >
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-4">
          <a href={base + "/"} className="flex items-center gap-2" data-touch-target aria-label="Chimiq home">
            <span
              aria-hidden
              className="font-serif text-2xl font-bold leading-none tracking-tight"
              style={{ letterSpacing: "-0.01em", color: "#7BAF7A" }}
            >
              Chimiq
            </span>
            <span className="sr-only">Chimiq</span>
          </a>
          <div className="flex min-h-[2.25rem] items-center justify-end gap-2">
            {rightSlot}
            {/* SS-016: reserved for active conflict warning (V8); profile avatar removed from top bar */}
          </div>
        </div>

        {(title || subtitle) && (
          <div className="mx-auto max-w-3xl px-4 pb-3 pt-1">
            {title && (
              <h1 className="font-serif text-2xl font-semibold leading-tight text-foreground sm:text-3xl">
                {title}
              </h1>
            )}
            {subtitle && (
              <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
            )}
          </div>
        )}
      </header>

      <main id="main-content" tabIndex={-1} className="mx-auto max-w-3xl px-4 pt-4 pb-tab-bar animate-fade-up focus:outline-none">
        {children}
      </main>

      <BottomTabBar />
    </div>
  );
}
