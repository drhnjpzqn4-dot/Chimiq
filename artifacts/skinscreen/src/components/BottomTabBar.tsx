import { useLocation, Link } from "wouter";
import type { LucideIcon } from "lucide-react";
import { Home, Package, ScanLine, Compass, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n";
import { useUnseenRecipeCount } from "@/hooks/useUnseenRecipeCount";

const ACTIVE_TAB = "var(--rose-gold-deep)";
const INACTIVE_TAB = "var(--ink-soft)";
const SAGE_FAB = "var(--sage)";

type TabItem = {
  id: string;
  labelKey: string;
  icon: LucideIcon;
  href: string;
  isCenterFab?: boolean;
};

const TABS: TabItem[] = [
  { id: "home", labelKey: "tabs.today", icon: Home, href: "/app/home" },
  { id: "shelf", labelKey: "tabs.shelf", icon: Package, href: "/app/shelf" },
  { id: "scan", labelKey: "tabs.scan", icon: ScanLine, href: "/app/scan", isCenterFab: true },
  { id: "discover", labelKey: "tabs.discover", icon: Compass, href: "/app/discover" },
  { id: "profile", labelKey: "tabs.profile", icon: User, href: "/app/profile" },
];

export function BottomTabBar() {
  const [location] = useLocation();
  const { t } = useTranslation();
  const unseenRecipes = useUnseenRecipeCount();

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-50 border-t bg-white/85 backdrop-blur-xl supports-[backdrop-filter]:bg-white/70"
      style={{
        paddingBottom: "var(--safe-bottom)",
        borderColor: "var(--line)",
        boxShadow: "0 -8px 24px -16px rgba(15, 23, 42, 0.12)",
      }}
    >
      <ul className="mx-auto flex max-w-xl items-end justify-around px-2 pb-0 pt-0">
        {TABS.map((tab) => {
          const active = location === tab.href || location.startsWith(`${tab.href}/`);
          const Icon = tab.icon;
          const showDot = tab.id === "profile" && unseenRecipes > 0;

          if (tab.isCenterFab) {
            return (
              <li key={tab.id} className="relative flex flex-1 flex-col items-center justify-end">
                <Link href={tab.href}>
                  <a
                    data-touch-target
                    aria-current={active ? "page" : undefined}
                    aria-label={`${t(tab.labelKey)}${active ? " (current page)" : ""}`}
                    className={cn(
                      "group relative flex flex-col items-center gap-1 pb-0.5 text-[11px] font-medium transition-colors",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--sage)_45%,transparent)] focus-visible:ring-offset-4 focus-visible:ring-offset-[var(--cream)]",
                      active ? "font-semibold" : "font-medium",
                    )}
                    style={{ color: active ? ACTIVE_TAB : INACTIVE_TAB }}
                  >
                    <span
                      className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full transition-transform duration-200"
                      style={{
                        marginTop: -26,
                        backgroundColor: SAGE_FAB,
                        border: "4px solid var(--cream)",
                        boxShadow: "0 6px 16px color-mix(in srgb, var(--sage) 35%, transparent)",
                      }}
                    >
                      <Icon
                        aria-hidden="true"
                        className="text-white transition-transform"
                        style={{ width: 26, height: 26 }}
                        strokeWidth={active ? 2.4 : 2}
                        color="#FFFFFF"
                      />
                    </span>
                    <span className="tracking-wide">{t(tab.labelKey)}</span>
                  </a>
                </Link>
              </li>
            );
          }

          return (
            <li key={tab.id} className="flex-1">
              <Link href={tab.href}>
                <a
                  data-touch-target
                  aria-current={active ? "page" : undefined}
                  aria-label={`${t(tab.labelKey)}${active ? " (current page)" : ""}${
                    showDot ? ` — ${unseenRecipes} new recipe updates` : ""
                  }`}
                  className={cn(
                    "group relative flex h-14 w-full flex-col items-center justify-center gap-0.5 rounded-2xl text-[11px] font-medium transition-colors",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--sage)_45%,transparent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--cream)]",
                  )}
                  style={{ color: active ? ACTIVE_TAB : INACTIVE_TAB }}
                >
                  <span
                    className={cn(
                      "relative flex h-9 w-12 items-center justify-center rounded-2xl transition-all duration-200",
                      active ? "scale-100" : "scale-95 group-hover:bg-[var(--cream)]",
                    )}
                    style={
                      active
                        ? { backgroundColor: "color-mix(in srgb, var(--rose-gold-deep) 12%, transparent)" }
                        : undefined
                    }
                  >
                    <Icon
                      aria-hidden="true"
                      className={cn("h-5 w-5 transition-transform", active ? "scale-110" : "scale-100")}
                      strokeWidth={active ? 2.4 : 2}
                      color={active ? ACTIVE_TAB : INACTIVE_TAB}
                    />
                    {showDot && (
                      <span
                        data-testid="tab-bar-recipes-dot"
                        aria-hidden="true"
                        className="absolute right-1.5 top-1 inline-flex h-2.5 w-2.5 rounded-full ring-2 ring-white"
                        style={{ backgroundColor: "var(--rose-gold-deep)" }}
                      />
                    )}
                  </span>
                  <span
                    className={cn(
                      "tracking-wide",
                      active ? "font-semibold" : "font-medium",
                    )}
                  >
                    {t(tab.labelKey)}
                  </span>
                </a>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
