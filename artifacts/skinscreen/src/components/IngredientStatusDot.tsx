import type { CSSProperties, ReactNode } from "react";
import { AlertTriangle } from "lucide-react";

/** BESLUT-SS-021: shelf ingredient / conflict status indicator */
export type IngredientStatusLevel = "safe" | "caution" | "high";

const RED_DEEP = "#8E3A26";

const DOT: Record<IngredientStatusLevel, CSSProperties> = {
  safe: {
    width: 10,
    height: 10,
    borderRadius: "50%",
    backgroundColor: "#DCE7DC",
    border: "1.5px solid var(--sage)",
    boxSizing: "border-box",
    flexShrink: 0,
  },
  caution: {
    width: 10,
    height: 10,
    borderRadius: "50%",
    backgroundColor: "#F0E2BC",
    border: "1.5px solid #8B6A1F",
    boxSizing: "border-box",
    flexShrink: 0,
  },
  high: {
    width: 10,
    height: 10,
    borderRadius: "50%",
    backgroundColor: "#EDD6CF",
    border: "1.5px solid #8E3A26",
    boxSizing: "border-box",
    flexShrink: 0,
  },
};

export function IngredientStatusDot({ status }: { status: IngredientStatusLevel }) {
  return <span style={DOT[status]} aria-hidden />;
}

/** Kombinationskonflikt: full-width banner under the product card (not a pill). */
export function ShelfConflictBanner({ children }: { children: ReactNode }) {
  return (
    <div
      className="flex w-full items-start gap-2"
      style={{
        backgroundColor: "#EDD6CF",
        borderRadius: 8,
        padding: "6px 10px",
      }}
    >
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" style={{ width: 16, height: 16, color: RED_DEEP }} aria-hidden />
      <div
        className="min-w-0 flex-1 leading-snug"
        style={{
          fontSize: 13,
          fontWeight: 500,
          fontFamily: "var(--font-sans, ui-sans-serif, system-ui, sans-serif)",
          color: RED_DEEP,
        }}
      >
        {children}
      </div>
    </div>
  );
}
