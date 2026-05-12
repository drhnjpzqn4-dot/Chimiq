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
          className={cn("mb-0.5 mt-1.5 text-[17px] font-bold", scan ? "tracking-[0.08em]" : "text-foreground")}
          style={scan ? { color: "#1F1A17" } : undefined}
        >
          {title}
        </h3>
        {description && (
          <p className="mb-4 text-xs text-muted-foreground" style={scan ? { fontSize: 13, color: "#5E544C" } : undefined}>
            {description}
          </p>
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
  const wrapStyle =
    tone === "safe"
      ? { backgroundColor: "#E8F2E5", border: "1px solid #EAE3DC" }
      : tone === "high"
        ? { backgroundColor: "rgba(252, 228, 224, 0.65)", border: "1px solid #EAE3DC" }
        : { backgroundColor: "rgba(251, 243, 220, 0.55)", border: "1px solid #EAE3DC" };
  const iconWrapStyle =
    tone === "safe"
      ? { backgroundColor: "#E8F2E5" }
      : tone === "high"
        ? { backgroundColor: "#FCE4E0" }
        : { backgroundColor: "#FBF3DC" };
  const titleColor = tone === "safe" ? "#5B8F5A" : tone === "high" ? "#8C2A1A" : "#8A6217";
  const summaryColor = tone === "safe" ? "#5E544C" : tone === "high" ? "#8C2A1A" : "#8A6217";

  return (
    <div
      className="flex animate-pop-in flex-col items-start gap-4 rounded-3xl p-6 shadow-sm sm:flex-row sm:items-center sm:p-8"
      style={wrapStyle}
    >
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl" style={iconWrapStyle}>
        {icon}
      </div>
      <div>
        <h3 className="font-serif text-xl font-semibold leading-tight sm:text-2xl" style={{ color: titleColor }}>
          {title}
        </h3>
        {summary && (
          <p className="mt-1 text-sm leading-relaxed" style={{ color: summaryColor }}>
            {summary}
          </p>
        )}
      </div>
    </div>
  );
}
