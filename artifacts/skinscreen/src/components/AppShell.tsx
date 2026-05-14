import { ReactNode } from "react";
import { BottomTabBar } from "@/components/BottomTabBar";
import { WarningIndicator } from "@/components/WarningIndicator";

interface AppShellProps {
  title?: string;
  subtitle?: string;
  rightSlot?: ReactNode;
  children: ReactNode;
}

export function AppShell({ title, subtitle, rightSlot, children }: AppShellProps) {
  const base = (import.meta.env.BASE_URL ?? "/").replace(/\/+$/, "") || "";

  return (
    <div className="min-h-screen" style={{ backgroundColor: "var(--cream)" }}>
      <a href="#main-content" className="skip-to-content">
        Skip to main content
      </a>
      <header
        className="sticky top-0 z-40 border-b bg-white/85 backdrop-blur-md"
        style={{ paddingTop: "var(--safe-top)", borderColor: "var(--line)" }}
      >
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-4">
          <a href={base + "/"} className="flex items-center gap-2" data-touch-target aria-label="Chimiq home">
            <img
              src="/favicon.svg"
              alt=""
              width={32}
              height={32}
              className="shrink-0 object-contain"
              style={{ width: 32, height: 32, objectFit: "contain" }}
              aria-hidden
            />
            <span
              aria-hidden
              className="leading-none tracking-tight"
              style={{
                fontFamily: '"Source Serif 4", "Iowan Old Style", Georgia, serif',
                color: "var(--rose-gold-deep)",
                fontWeight: 500,
                fontSize: 18,
                letterSpacing: "-0.01em",
              }}
            >
              Chimiq
            </span>
            <span className="sr-only">Chimiq</span>
          </a>
          <div className="flex min-h-[2.25rem] items-center justify-end gap-1">
            <WarningIndicator />
            {rightSlot && <div className="flex items-center">{rightSlot}</div>}
          </div>
        </div>

        {(title || subtitle) && (
          <div className="mx-auto max-w-3xl px-4 pb-3 pt-1">
            {title && (
              <h1
                className="leading-tight"
                style={{
                  fontFamily: '"Source Serif 4", "Iowan Old Style", Georgia, serif',
                  fontSize: 28,
                  color: "var(--ink)",
                  fontWeight: 500,
                }}
              >
                {title}
              </h1>
            )}
            {subtitle && (
              <p className="mt-1" style={{ fontSize: 13, color: "var(--ink-soft)" }}>
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
