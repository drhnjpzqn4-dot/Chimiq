import { ReactNode } from "react";
import { Loader2 } from "lucide-react";

// Design system — Lager 2: Molekyl
// Tom-lista-vy. En ikon, ett budskap, en hint-text, och en valfri CTA-knapp.
// Använd när en lista eller sektion är tom. EN komponent, EN källa-till-sanning.
// Se docs/DESIGN-SYSTEM.md

export interface EmptyStateProps {
  /** Lucide-ikon eller valfri ReactNode */
  icon?: ReactNode;
  /** Huvudbudskap — vad som saknas */
  message: string;
  /** Kortare hjälptext under budskapet */
  hint?: string;
  /** Valfri CTA-knapp */
  action?: {
    label: string;
    onClick: () => void;
    loading?: boolean;
    icon?: ReactNode;
  };
  /** Extra hjälptext under knappen (t.ex. "3 riktiga produkter") */
  actionNote?: string;
}

export function EmptyState({ icon, message, hint, action, actionNote }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      {icon && (
        <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10">
          {icon}
        </div>
      )}
      <p className="text-sm text-muted-foreground">{message}</p>
      {action ? (
        <div className="mt-3">
          <button
            type="button"
            onClick={action.onClick}
            disabled={action.loading}
            className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary transition-colors hover:bg-primary/15 disabled:opacity-60"
          >
            {action.loading ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              action.icon
            )}
            {action.label}
          </button>
          {actionNote && (
            <p className="mt-1.5 text-[11px] text-muted-foreground/50">{actionNote}</p>
          )}
        </div>
      ) : hint ? (
        <p className="mt-1 text-xs text-muted-foreground/70">{hint}</p>
      ) : null}
    </div>
  );
}
