import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, ChevronDown, ChevronUp, ShieldCheck } from "lucide-react";
import { useTranslation } from "@/lib/i18n";
import { apiFetch } from "@/lib/api";

interface RecallRow {
  id: number;
  title: string;
}

async function fetchRecentRecalls(): Promise<RecallRow[]> {
  const res = await apiFetch("/api/recalls/recent", { credentials: "include" });
  if (!res.ok) return [];
  const data = (await res.json()) as { recalls?: RecallRow[] };
  return data.recalls ?? [];
}

/**
 * BatchRecallBanner — visar EU Safety Gate-bevakning på Idag-sidan.
 *
 * Två states:
 * 1. **Aktiva recalls** (data.length > 0): amber-bannern med expandable lista
 *    av aktuella återkallanden.
 * 2. **Coming-soon** (data.length === 0): informativ "Snart"-banner som visar
 *    att featuren existerar och vad den kommer göra. Killer-feature-synlighet
 *    för försäljning även innan pollern fyllt tabellen.
 *
 * Backend: `/api/recalls/recent` (max 5 senaste recalls). När Sprint 4
 * implementerar hyllematchning byggs personlig varning (röd) ovanpå.
 */
export default function BatchRecallBanner() {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const { data, isLoading } = useQuery({
    queryKey: ["recalls-recent"],
    queryFn: fetchRecentRecalls,
    staleTime: 1000 * 60 * 2,
  });

  // Dölj under loading för att inte flimra
  if (isLoading) return null;

  // Coming-soon-state: tom tabell men featuren finns och kommer aktiveras
  // när pollern fyller på. Visar värdeproposition för användaren och fungerar
  // som försäljnings-teaser.
  if (!data?.length) {
    return (
      <div
        className="rounded-2xl border p-3.5 shadow-sm"
        style={{
          borderColor: "var(--line)",
          backgroundColor: "var(--cream-warm)",
        }}
      >
        <div className="flex items-start gap-2.5">
          <ShieldCheck
            className="mt-0.5 h-5 w-5 shrink-0"
            style={{ color: "var(--sage)" }}
            aria-hidden
          />
          <div className="min-w-0 flex-1">
            <p
              className="text-sm font-semibold leading-snug"
              style={{ color: "var(--ink)" }}
            >
              {t("recalls.comingSoonTitle")}
            </p>
            <p
              className="mt-1 text-xs leading-snug"
              style={{ color: "var(--ink-soft)" }}
            >
              {t("recalls.comingSoonHint")}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Aktiva recalls
  return (
    <div className="rounded-2xl border border-amber-200/80 bg-amber-50/95 p-3.5 shadow-sm">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-start gap-2.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 rounded-lg"
        aria-expanded={expanded}
      >
        <AlertTriangle
          className="mt-0.5 h-5 w-5 shrink-0 text-amber-600"
          aria-hidden
        />
        <span className="min-w-0 flex-1 text-sm font-semibold leading-snug text-amber-950">
          {t("recalls.bannerCta")}
        </span>
        <span className="sr-only">
          {expanded ? t("recalls.toggleHide") : t("recalls.toggleShow")}
        </span>
        {expanded ? (
          <ChevronUp className="h-5 w-5 shrink-0 text-amber-800" aria-hidden />
        ) : (
          <ChevronDown className="h-5 w-5 shrink-0 text-amber-800" aria-hidden />
        )}
      </button>
      {expanded && (
        <ul className="mt-3 space-y-1.5 border-t border-amber-200/60 pt-3 pl-8 text-sm text-amber-950/90">
          {data.map((r) => (
            <li key={r.id} className="leading-snug">
              {r.title}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
