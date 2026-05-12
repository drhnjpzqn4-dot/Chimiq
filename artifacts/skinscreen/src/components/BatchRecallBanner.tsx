import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, ChevronDown, ChevronUp } from "lucide-react";
import { useTranslation } from "@/lib/i18n";

interface RecallRow {
  id: number;
  title: string;
}

async function fetchRecentRecalls(): Promise<RecallRow[]> {
  const res = await fetch("/api/recalls/recent", { credentials: "include" });
  if (!res.ok) return [];
  const data = (await res.json()) as { recalls?: RecallRow[] };
  return data.recalls ?? [];
}

export default function BatchRecallBanner() {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const { data } = useQuery({
    queryKey: ["recalls-recent"],
    queryFn: fetchRecentRecalls,
    staleTime: 1000 * 60 * 2,
  });

  if (!data?.length) return null;

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
