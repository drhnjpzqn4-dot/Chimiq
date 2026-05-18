// Design system — Lager 2: Molekyl
// Slim horisontell produktrad.
// FIX: yttre div är INTE klickbar. Klick sker via två separata
// <button>-element: __main (öppnar) och __remove (tar bort).
// En div med role="button" är ett tillgänglighets-antipattern.
// BESLUT-SS-070: listvy visar kategori-ikon, aldrig produktbild.
// Se docs/DESIGN-SYSTEM.md

import { Sun, Moon, CalendarDays, FlaskConical, Trash2 } from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";
import type { StatusLevel, RoutineSlot } from "@/types/design-system";

interface ProductListRowProps {
  productName: string;
  brand?: string | null;
  routineSlot?: RoutineSlot;
  status: StatusLevel;
  conflictWith?: string;
  warningCount?: number;
  onOpen: () => void;
  onRemove?: () => void;
  removeAriaLabel?: string;
  removeDisabled?: boolean;
  /** true = visa ingen ta-bort-knapp (t.ex. senaste skanningar) */
  readOnly?: boolean;
}

function SlotIcon({ slot }: { slot: RoutineSlot }) {
  const p = { strokeWidth: 1.75 };
  if (slot === "morning")
    return <Sun    className="h-5 w-5" {...p}
                   style={{ color: "var(--sage)" }} />;
  if (slot === "evening")
    return <Moon   className="h-5 w-5" {...p}
                   style={{ color: "var(--sage)" }} />;
  if (slot === "occasional")
    return <CalendarDays className="h-5 w-5" {...p}
                         style={{ color: "var(--ink-soft)" }} />;
  return   <FlaskConical className="h-5 w-5" {...p}
                         style={{ color: "var(--ink-soft)" }} />;
}

export function ProductListRow({
  productName,
  brand,
  routineSlot,
  status,
  conflictWith,
  warningCount,
  onOpen,
  onRemove,
  removeAriaLabel = "Ta bort",
  removeDisabled,
  readOnly = false,
}: ProductListRowProps) {
  return (
    <div className="product-list-row">

      {/* Huvud-knapp: ikon + namn + badge */}
      <button
        type="button"
        className="product-list-row__main"
        onClick={onOpen}
      >
        <div className="product-list-row__icon">
          <SlotIcon slot={routineSlot ?? null} />
        </div>
        <div className="product-list-row__body">
          <span className="product-list-row__name">{productName}</span>
          {brand && (
            <span className="product-list-row__brand">{brand}</span>
          )}
          <StatusBadge
            status={status}
            conflictWith={conflictWith}
            warningCount={warningCount}
            className="mt-1"
          />
        </div>
      </button>

      {/* Ta bort-knapp: syster, aldrig nästlad i huvud-knappen */}
      {!readOnly && onRemove && (
        <button
          type="button"
          className="product-list-row__remove"
          onClick={onRemove}
          disabled={removeDisabled}
          aria-label={removeAriaLabel}
        >
          <Trash2 className="h-4 w-4" />
        </button>
      )}

    </div>
  );
}
