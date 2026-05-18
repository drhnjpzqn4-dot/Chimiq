import { ChevronRight } from "lucide-react";
import { useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n";

interface GamificationBannerProps {
  contributionsCount: number;
  targetCount?: number;
  className?: string;
  /**
   * Optional click handler. When provided, replaces the default
   * `navigate("/app/scan?contribute=true")` behaviour. Use this when the
   * banner sits inside a page that wants to open ContributeModal inline
   * instead of round-tripping through the URL.
   */
  onClick?: () => void;
}

export function GamificationBanner({
  contributionsCount,
  targetCount = 30,
  className,
  onClick,
}: GamificationBannerProps) {
  const [, navigate] = useLocation();
  const { t } = useTranslation();
  const current =
    contributionsCount > 0 && contributionsCount % targetCount === 0
      ? targetCount
      : Math.max(0, contributionsCount % targetCount);

  return (
    <button
      type="button"
      data-touch-target
      onClick={() => {
        if (onClick) {
          onClick();
          return;
        }
        navigate("/app/scan?contribute=true");
      }}
      className={cn(
        "flex w-full items-center justify-between gap-3 rounded-full border px-4 py-3 text-left shadow-sm transition-opacity hover:opacity-95",
        className,
      )}
      style={{
        background: "color-mix(in srgb, var(--sage) 10%, var(--cream))",
        borderColor: "color-mix(in srgb, var(--sage) 30%, transparent)",
      }}
    >
      <span className="min-w-0 text-sm font-medium" style={{ color: "var(--sage-deep)" }}>
        {t("gamification.progressOf", { n: current, target: targetCount })}
      </span>
      <span
        className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold"
        style={{ color: "var(--sage)" }}
      >
        {t("gamification.earnFreeMonth")}
        <ChevronRight className="h-4 w-4" aria-hidden />
      </span>
    </button>
  );
}
