import { useEffect, useState } from "react";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useTranslation } from "@/lib/i18n";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { apiFetch } from "@/lib/api";

interface RatingSummary {
  avg: number | null;
  count: number;
  myRating: number | null;
  eligible: boolean;
  eligibilityReason: "scanned" | "shelf" | null;
}

/**
 * Star rating widget for a scanned product. Displays the community average +
 * count for everyone; tap-to-rate is enabled only when the backend confirms
 * the user has either scanned the product or has it on their shelf (#97).
 */
export function ProductRating({
  barcode,
  productName,
  className,
}: {
  barcode: string;
  productName?: string;
  className?: string;
}) {
  const [summary, setSummary] = useState<RatingSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const { t } = useTranslation();
  const [hover, setHover] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!barcode) return;
    const ctrl = new AbortController();
    setLoading(true);
    const url = new URL("/api/products/" + encodeURIComponent(barcode) + "/rating", window.location.origin);
    if (productName) url.searchParams.set("name", productName);
    apiFetch(url.toString(), { credentials: "include", signal: ctrl.signal })
      .then((r) => (r.ok ? (r.json() as Promise<RatingSummary>) : null))
      .then((d) => setSummary(d))
      .catch(() => {})
      .finally(() => setLoading(false));
    return () => ctrl.abort();
  }, [barcode, productName]);

  const submit = async (stars: number) => {
    if (!summary?.eligible || submitting) return;
    setSubmitting(true);
    try {
      const r = await apiFetch("/api/products/" + encodeURIComponent(barcode) + "/rating", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ stars, productName }),
      });
      if (!r.ok) {
        const j = (await r.json().catch(() => ({}))) as { error?: string };
        toast.error(j.error ?? t("rating.errSaveFailed"));
        return;
      }
      const next = (await r.json()) as RatingSummary;
      setSummary(next);
      toast.success(t("rating.saved"));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !summary) {
    return (
      <div className={cn("flex items-center gap-1.5 h-5", className)}>
        <div className="flex gap-0.5">
          {[1, 2, 3, 4, 5].map((i) => (
            <Star key={i} className="w-4 h-4 text-muted-foreground/20" />
          ))}
        </div>
      </div>
    );
  }

  const displayValue =
    hover ?? summary.myRating ?? (summary.avg ? Math.round(summary.avg) : 0);
  const interactive = summary.eligible;

  const stars = (
    <div
      className="flex gap-0.5"
      onMouseLeave={() => setHover(null)}
    >
      {[1, 2, 3, 4, 5].map((i) => {
        const filled = i <= displayValue;
        return (
          <button
            key={i}
            type="button"
            disabled={!interactive || submitting}
            onMouseEnter={() => interactive && setHover(i)}
            onFocus={() => interactive && setHover(i)}
            onClick={() => submit(i)}
            aria-label={i === 1 ? t("rating.rateOneStar") : t("rating.rateStarsFmt", { n: i })}
            className={cn(
              "p-0.5 rounded transition-transform",
              interactive
                ? "cursor-pointer hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                : "cursor-default",
            )}
          >
            <Star
              className={cn(
                "w-4 h-4 transition-colors",
                filled
                  ? "fill-amber-400 text-amber-400"
                  : "text-muted-foreground/40",
              )}
            />
          </button>
        );
      })}
    </div>
  );

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {interactive ? (
        stars
      ) : (
        <TooltipProvider delayDuration={150}>
          <Tooltip>
            <TooltipTrigger asChild>
              <span tabIndex={0}>{stars}</span>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">
              {t("rating.tooltipScanFirst")}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
      <span className="text-xs text-muted-foreground">
        {summary.count > 0
          ? `${(summary.avg ?? 0).toFixed(1)} (${summary.count})`
          : interactive
            ? t("rating.beFirst")
            : t("rating.none")}
      </span>
      {summary.myRating != null && (
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground/70">
          · {t("rating.you")} {summary.myRating}★
        </span>
      )}
    </div>
  );
}
