import { useLocation, Link } from "wouter";
import { ScanLine, PackageSearch, Compass, User } from "lucide-react";
import { cn } from "@/lib/utils";

const TABS = [
  { id: "scan", label: "Scan", icon: ScanLine, href: "/app/scan" },
  { id: "browse", label: "Browse", icon: PackageSearch, href: "/app/browse" },
  { id: "discover", label: "Discover", icon: Compass, href: "/app/discover" },
  { id: "profile", label: "Profile", icon: User, href: "/app/profile" },
] as const;

export function BottomTabBar() {
  const [location] = useLocation();

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-border/40 bg-white/85 backdrop-blur-xl supports-[backdrop-filter]:bg-white/70"
      style={{
        paddingBottom: "var(--safe-bottom)",
        boxShadow: "0 -8px 24px -16px rgba(15, 23, 42, 0.12)",
      }}
    >
      <ul className="mx-auto flex max-w-xl items-stretch justify-around px-2">
        {TABS.map((tab) => {
          const active = location === tab.href || location.startsWith(`${tab.href}/`);
          const Icon = tab.icon;
          return (
            <li key={tab.id} className="flex-1">
              <Link href={tab.href}>
                <a
                  data-touch-target
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "group relative flex h-16 w-full flex-col items-center justify-center gap-0.5 rounded-2xl text-[11px] font-medium transition-colors",
                    active ? "text-primary" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <span
                    className={cn(
                      "flex h-9 w-12 items-center justify-center rounded-2xl transition-all duration-200",
                      active
                        ? "bg-primary/12 scale-100"
                        : "scale-95 group-hover:bg-muted",
                    )}
                  >
                    <Icon
                      className={cn(
                        "h-5 w-5 transition-transform",
                        active ? "scale-110" : "scale-100",
                      )}
                      strokeWidth={active ? 2.4 : 2}
                    />
                  </span>
                  <span
                    className={cn(
                      "tracking-wide",
                      active ? "font-semibold" : "font-medium",
                    )}
                  >
                    {tab.label}
                  </span>
                  {active && (
                    <span
                      aria-hidden
                      className="absolute -top-px h-[3px] w-8 rounded-full bg-primary"
                    />
                  )}
                </a>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
