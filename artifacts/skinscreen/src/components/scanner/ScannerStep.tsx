import { cn } from "@/lib/utils";

interface StepHeaderProps {
  index: number | string;
  title: string;
  description?: string;
  active?: boolean;
  hasConnector?: boolean;
  children?: React.ReactNode;
  /** SS-015: Scan page — sage titles, sage step ring. */
  visualVariant?: "default" | "scan";
}

export function StepHeader({
  index,
  title,
  description,
  active = true,
  hasConnector = true,
  children,
  visualVariant = "default",
}: StepHeaderProps) {
  const scan = visualVariant === "scan";
  return (
    <div className="flex gap-4 mb-2">
      <div className="shrink-0 flex flex-col items-center">
        <div
          className={cn(
            "w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0 transition-colors",
            active
              ? scan
                ? ""
                : "bg-primary"
              : "bg-muted-foreground/40",
          )}
          style={scan && active ? { backgroundColor: "#7BAF7A" } : undefined}
        >
          {index}
        </div>
        {hasConnector && (
          <div
            className={cn("w-px flex-1 mt-2", scan ? "bg-[#7BAF7A]/25" : "bg-primary/25")}
            style={{ minHeight: 24 }}
          />
        )}
      </div>
      <div className="flex-1 min-w-0 pb-8">
        <h3
          className={cn(
            "font-bold text-[17px] mb-0.5 mt-1.5",
            scan ? "tracking-[0.08em]" : "text-foreground",
          )}
          style={scan ? { color: "#7BAF7A" } : undefined}
        >
          {title}
        </h3>
        {description && (
          <p className="text-xs text-muted-foreground mb-4">{description}</p>
        )}
        {children}
      </div>
    </div>
  );
}

interface VerdictCardProps {
  tone: "safe" | "high" | "caution";
  icon: React.ReactNode;
  title: string;
  summary?: string;
}

export function VerdictCard({ tone, icon, title, summary }: VerdictCardProps) {
  const wrap =
    tone === "safe"
      ? "bg-green-50 border-green-200"
      : tone === "high"
        ? "bg-red-50/60 border-red-200"
        : "bg-amber-50/40 border-amber-200/70";
  const iconWrap =
    tone === "safe"
      ? "bg-green-100"
      : tone === "high"
        ? "bg-red-100"
        : "bg-amber-100";
  const titleColor =
    tone === "safe"
      ? "text-green-800"
      : tone === "high"
        ? "text-red-800"
        : "text-amber-800";
  const summaryColor =
    tone === "safe"
      ? "text-green-700"
      : tone === "high"
        ? "text-red-700"
        : "text-amber-700";

  return (
    <div
      className={cn(
        "rounded-3xl border p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center gap-4 shadow-sm animate-pop-in",
        wrap,
      )}
    >
      <div
        className={cn(
          "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0",
          iconWrap,
        )}
      >
        {icon}
      </div>
      <div>
        <h3
          className={cn(
            "text-xl sm:text-2xl font-serif font-semibold leading-tight",
            titleColor,
          )}
        >
          {title}
        </h3>
        {summary && (
          <p className={cn("text-sm mt-1 leading-relaxed", summaryColor)}>
            {summary}
          </p>
        )}
      </div>
    </div>
  );
}
