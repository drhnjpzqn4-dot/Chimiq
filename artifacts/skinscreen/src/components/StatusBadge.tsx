// Design system — Lager 2: Molekyl
// Trafikljus-badge med dot + text.
// Beräknar alltid label internt — anroparen ger status + kontext,
// aldrig råtext. En ändring här påverkar hela appen.
// Se docs/DESIGN-SYSTEM.md

import { useTranslation } from "@/lib/i18n";
import type { StatusLevel } from "@/types/design-system";

interface StatusBadgeProps {
  status: StatusLevel;
  /** Produktnamnet som krockar — ger "Konflikt med {name}" */
  conflictWith?: string;
  /** Antal varningar vid status=caution — ger "N varning(ar)" */
  warningCount?: number;
  className?: string;
}

function useStatusLabel(
  status: StatusLevel,
  conflictWith?: string,
  warningCount?: number
): string {
  const { t } = useTranslation();
  if (status === "safe") return t("home.pillSafe");
  if (status === "high") {
    if (conflictWith)
      return `${t("home.pillHigh")} · ${conflictWith}`;
    return t("home.pillHigh");
  }
  // caution
  if (warningCount != null && warningCount > 0)
    return `${warningCount}\u00a0${t("home.pillCaution").toLowerCase()}`;
  return t("home.pillCaution");
}

export function StatusBadge({
  status,
  conflictWith,
  warningCount,
  className,
}: StatusBadgeProps) {
  const label = useStatusLabel(status, conflictWith, warningCount);
  return (
    <span
      className={[
        "status-badge",
        `status-badge--${status}`,
        className ?? "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <span className="status-badge__dot" aria-hidden />
      {label}
    </span>
  );
}
