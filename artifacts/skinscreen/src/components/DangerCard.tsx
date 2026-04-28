import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Info, ExternalLink } from "lucide-react";
import { FadeIn } from "@/components/FadeIn";
import { useTranslation } from "@/lib/i18n";

export interface DangerCardProps {
  pair: string;
  risk: string;
  citation: string;
  citationUrl: string;
  severity: "HIGH RISK" | "CAUTION";
  delay?: number;
}

export function DangerCard({ pair, risk, citation, citationUrl, severity, delay = 0 }: DangerCardProps) {
  const { t } = useTranslation();
  const isHighRisk = severity === "HIGH RISK";
  const severityLabel = isHighRisk
    ? t("dangerZone.severityHigh")
    : t("dangerZone.severityCaution");
  const sourceLabel = t("dangerCard.source");

  return (
    <FadeIn delay={delay} fullWidth>
      <div className="flex flex-col justify-between h-full p-6 sm:p-8 bg-white rounded-3xl border border-border/60 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
        <div>
          <div className="flex items-start justify-between gap-4 mb-4">
            <h3 className="text-xl sm:text-2xl font-serif font-semibold text-foreground leading-tight">
              {pair}
            </h3>
            <Badge variant={isHighRisk ? "destructive" : "warning"} className="shrink-0 font-sans tracking-wide uppercase text-[10px]">
              {isHighRisk ? <AlertTriangle className="w-3 h-3 mr-1" /> : <Info className="w-3 h-3 mr-1" />}
              {severityLabel}
            </Badge>
          </div>

          <p className="text-muted-foreground leading-relaxed mb-6">
            {risk}
          </p>
        </div>

        <div className="pt-4 border-t border-border/50 mt-auto">
          <a
            href={citationUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-muted-foreground/70 flex items-start gap-2 hover:text-primary transition-colors group"
          >
            <ExternalLink className="w-3 h-3 mt-0.5 shrink-0 group-hover:text-primary transition-colors" />
            <span className="italic leading-snug">
              <span className="font-semibold not-italic text-muted-foreground/90">{sourceLabel} </span>
              {citation}
            </span>
          </a>
        </div>
      </div>
    </FadeIn>
  );
}
