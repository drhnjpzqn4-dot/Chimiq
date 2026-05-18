// Chimiq Design System — status-hjälpfunktioner
// FIX: runtime-funktioner hör inte hemma i types-filer.
// Se docs/DESIGN-SYSTEM.md

import type { StatusLevel } from "@/types/design-system";

/**
 * Konverterar Home.tsx:s gamla "warning"-värde till canonical StatusLevel.
 * Behövs under migrering tills Home.tsx:s RecentScanRow uppdateras.
 */
export function toStatusLevel(
  v: "safe" | "warning" | "high" | StatusLevel
): StatusLevel {
  if (v === "warning") return "caution";
  return v as StatusLevel;
}
