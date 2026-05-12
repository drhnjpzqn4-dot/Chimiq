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
    <div className="min-h-screen" style={{ backgroundColor: "#FAF6F2" }}>
      <a href="#main-content" className="skip-to-content">
        Skip to main content
      </a>
      <header
        className="sticky top-0 z-40 border-b bg-white/85 backdrop-blur-md"
        style={{ paddingTop: "var(--safe-top)", borderColor: "#EAE3DC" }}
      >
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-4">
          <a href={base + "/"} className="flex items-center gap-2" data-touch-target aria-label="Chimiq home">
            <img
              src="/favicon.svg"
              alt=""
              width={28}
              height={28}
              className="shrink-0 object-contain"
              style={{ width: 28, height: 28, objectFit: "contain" }}
              aria-hidden
            />
            <span
              aria-hidden
              className="leading-none tracking-tight"
              style={{
                fontFamily: '"Iowan Old Style", Georgia, serif',
                color: "#A06D54",
                fontWeight: 600,
                fontSize: 28,
                letterSpacing: "-0.01em",
              }}
            >
              Chimiq
            </span>
            <span className="sr-only">Chimiq</span>
          </a>
          <div
            className="flex min-h-[2.25rem] min-w-[2.25rem] items-center justify-end gap-2"
            style={{ opacity: rightSlot ? 1 : 0 }}
            aria-hidden={!rightSlot}
          >
            {rightSlot}
            {/* SS-016: reserved for active conflict warning (V8); profile avatar removed from top bar */}
          </div>
        </div>

        {(title || subtitle) && (
          <div className="mx-auto max-w-3xl px-4 pb-3 pt-1">
            {title && (
              <h1
                className="leading-tight"
                style={{
                  fontFamily: '"Iowan Old Style", Georgia, serif',
                  fontSize: 28,
                  color: "#1F1A17",
                  fontWeight: 600,
                }}
              >
                {title}
              </h1>
            )}
            {subtitle && (
              <p className="mt-1" style={{ fontSize: 13, color: "#5E544C" }}>
                {subtitle}
              </p>
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
