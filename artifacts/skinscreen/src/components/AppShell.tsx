import { ReactNode } from "react";
import { useAuth } from "@workspace/replit-auth-web";
import { BottomTabBar } from "@/components/BottomTabBar";

interface AppShellProps {
  title?: string;
  subtitle?: string;
  rightSlot?: ReactNode;
  children: ReactNode;
}

export function AppShell({ title, subtitle, rightSlot, children }: AppShellProps) {
  const { user } = useAuth();
  const base = (import.meta.env.BASE_URL ?? "/").replace(/\/+$/, "") || "";

  return (
    <div className="min-h-screen bg-[#FAFAF8]">
      <header
        className="sticky top-0 z-40 border-b border-border/30 bg-white/85 backdrop-blur-md"
        style={{ paddingTop: "var(--safe-top)" }}
      >
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-4">
          <a href={base + "/"} className="flex items-center gap-2" data-touch-target>
            <img
              src={`${import.meta.env.BASE_URL}images/logo-chimiq-long.png`}
              alt="ChimIQ"
              className="h-7 w-auto"
            />
          </a>
          <div className="flex items-center gap-2">
            {rightSlot}
            {user && (
              <div
                aria-hidden
                className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/12 text-xs font-bold uppercase text-primary"
              >
                {(user.firstName ?? user.email ?? "U").slice(0, 1)}
              </div>
            )}
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

      <main className="mx-auto max-w-3xl px-4 pt-4 pb-tab-bar animate-fade-up">
        {children}
      </main>

      <BottomTabBar />
    </div>
  );
}
