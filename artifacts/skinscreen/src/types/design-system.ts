// Chimiq Design System — delade TypeScript-typer
// ENBART typer här — inga funktioner, inga imports.
// Runtime-hjälpfunktioner → src/lib/status.ts
// Se docs/DESIGN-SYSTEM.md

export type StatusLevel = "safe" | "caution" | "high" | "unknown";

export type RoutineSlot =
  | "morning"
  | "evening"
  | "occasional"
  | "wishlist"
  | null;
