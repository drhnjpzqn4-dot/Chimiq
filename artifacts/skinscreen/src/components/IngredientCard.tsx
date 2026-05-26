interface IngredientCardProps {
  slug: string;
  display: string;
  severity: "HIGH_RISK" | "CAUTION";
  hint_se: string;
  commonIn_se?: string[];
  medicallyReviewed?: boolean;
  onClick: (slug: string) => void;
}

export function IngredientCard({
  slug,
  display,
  severity,
  hint_se,
  commonIn_se,
  medicallyReviewed,
  onClick,
}: IngredientCardProps) {
  return (
    <button
      type="button"
      className="w-full rounded-xl border border-[var(--line)] bg-white p-4 text-left transition-colors hover:bg-[var(--cream-warm)]"
      onClick={() => onClick(slug)}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                severity === "HIGH_RISK"
                  ? "bg-red-100 text-red-700"
                  : "bg-amber-100 text-amber-700"
              }`}
            >
              {severity === "HIGH_RISK" ? "Hög risk" : "Varning"}
            </span>
            {medicallyReviewed ? (
              <span className="text-xs font-medium text-[var(--sage)]">Forskning</span>
            ) : null}
          </div>
          <h3 className="mb-1 text-sm font-semibold text-[var(--ink)]">{display}</h3>
          <p className="line-clamp-2 text-xs text-[var(--ink-soft)]">{hint_se}</p>
          {commonIn_se && commonIn_se.length > 0 ? (
            <p className="mt-1 text-xs text-[var(--ink-soft)]">
              Finns i: {commonIn_se.slice(0, 3).join(", ")}
            </p>
          ) : null}
        </div>
        <span className="text-lg text-[var(--ink-soft)]" aria-hidden>
          ›
        </span>
      </div>
    </button>
  );
}
