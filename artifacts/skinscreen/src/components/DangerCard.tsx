import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Info } from "lucide-react";
import { FadeIn } from "@/components/FadeIn";

export interface DangerCardProps {
  pair: string;
  risk: string;
  citation: string;
  severity: "HIGH RISK" | "CAUTION";
  delay?: number;
}

export function DangerCard({ pair, risk, citation, severity, delay = 0 }: DangerCardProps) {
  const isHighRisk = severity === "HIGH RISK";

  return (
    <FadeIn delay={delay} fullWidth>
      <div className="group relative flex flex-col justify-between h-full p-6 sm:p-8 bg-card rounded-3xl border border-border/60 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
        <div>
          <div className="flex items-start justify-between gap-4 mb-4">
            <h3 className="text-xl sm:text-2xl font-serif font-semibold text-foreground leading-tight">
              {pair}
            </h3>
            <Badge variant={isHighRisk ? "destructive" : "warning"} className="shrink-0 font-sans tracking-wide uppercase text-[10px]">
              {isHighRisk ? <AlertTriangle className="w-3 h-3 mr-1" /> : <Info className="w-3 h-3 mr-1" />}
              {severity}
            </Badge>
          </div>
          
          <p className="text-muted-foreground leading-relaxed mb-6">
            {risk}
          </p>
        </div>

        <div className="pt-4 border-t border-border/50 mt-auto">
          <p className="text-xs text-muted-foreground/70 flex items-start gap-2">
            <span className="font-semibold text-muted-foreground/90">Source:</span>
            <span className="italic leading-snug">{citation}</span>
          </p>
        </div>
      </div>
    </FadeIn>
  );
}
