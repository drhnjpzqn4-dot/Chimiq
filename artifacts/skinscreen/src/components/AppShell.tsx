import { ReactNode } from "react";
import { BottomTabBar } from "@/components/BottomTabBar";
import { WarningIndicator } from "@/components/WarningIndicator";

interface AppShellProps {
  title?: string;
  subtitle?: string;
  pageLabel?: string;
  rightSlot?: ReactNode;
  children: ReactNode;
}

export function AppShell({ title, subtitle, pageLabel, rightSlot, children }: AppShellProps) {
  const base = (import.meta.env.BASE_URL ?? "/").replace(/\/+$/, "") || "";

  // Subtitle-only (no big title) → visa undertitel inline i header-raden
  const inlineSubtitle = subtitle && !title;

  return (
    <div
      className="flex flex-col"
      style={{
        height: "100dvh",
        overflow: "hidden",
        backgroundColor: "var(--cream)",
      }}
    >
      <a href="#main-content" className="skip-to-content">
        Skip to main content
      </a>

      {/* ── Header ── */}
      <header
        className="shrink-0 border-b bg-white"
        style={{ paddingTop: "var(--safe-top)", borderColor: "var(--line)" }}
      >
        <div className="relative mx-auto flex h-14 max-w-3xl items-center justify-between px-4">
          <a href={base + "/"} className="flex items-center gap-2" data-touch-target aria-label="Chimiq home">
            <img
              src="/favicon.svg"
              alt=""
              width={44}
              height={44}
              className="shrink-0 object-contain"
              style={{ width: 44, height: 44, objectFit: "contain" }}
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

          {/* Höger sida: pageLabel + inline subtitle (om ingen stor titel) */}
          <div className="flex min-w-0 max-w-[58%] flex-col items-end justify-center gap-0">
            {pageLabel && (
              <span
                aria-hidden
                className="text-right"
                style={{
                  fontFamily: '"Source Serif 4", "Iowan Old Style", Georgia, serif',
                  fontSize: 22,
                  color: "var(--ink)",
                  fontWeight: 500,
                  letterSpacing: "-0.01em",
                  lineHeight: 1.2,
                }}
              >
                {pageLabel}
              </span>
            )}
            {inlineSubtitle && (
              <span
                aria-hidden
                className="text-right"
                style={{ fontSize: 11, color: "var(--ink-soft)", lineHeight: 1.3 }}
              >
                {subtitle}
              </span>
            )}
            <div className="flex items-center gap-3">
              <WarningIndicator />
              {rightSlot && <div className="flex items-center">{rightSlot}</div>}
            </div>
          </div>
        </div>

        {/* Stor titel + subtitle (t.ex. Idag-fliken med "Hej, Piff") */}
        {(title || (subtitle && !inlineSubtitle)) && (
          <div className="mx-auto max-w-3xl px-4 pb-2 pt-0">
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
            {subtitle && !inlineSubtitle && (
              <p className={title ? "mt-1" : ""} style={{ fontSize: 13, color: "var(--ink-soft)" }}>
                {subtitle}
              </p>
            )}
          </div>
        )}
      </header>

      {/* ── Scrollbar innehåll ── */}
      <main
        id="main-content"
        tabIndex={-1}
        className="mx-auto w-full max-w-3xl flex-1 overflow-y-auto px-4 pt-4 animate-fade-up focus:outline-none"
        style={{ WebkitOverflowScrolling: "touch" } as React.CSSProperties}
      >
        {children}
        {/* Extra utrymme i botten så sista innehållet inte döljs */}
        <div className="h-6" aria-hidden />
      </main>

      {/* ── Tab-bar — fast i flex-kolumnen, rör sig aldrig ── */}
      <BottomTabBar />
    </div>
  );
}
