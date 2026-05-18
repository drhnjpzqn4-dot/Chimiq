// Design system — Lager 2: Molekyl
// "N PRODUKTER" + valfri CTA höger.
// Se docs/DESIGN-SYSTEM.md

interface SectionHeaderProps {
  label: string;
  count?: number;
  ctaLabel?: string;
  onCta?: () => void;
  className?: string;
}

export function SectionHeader({
  label,
  count,
  ctaLabel,
  onCta,
  className,
}: SectionHeaderProps) {
  return (
    <div className={["section-header", className].filter(Boolean).join(" ")}>
      <span className="section-header__label">
        {count != null ? `${count} ${label}` : label}
      </span>
      {ctaLabel && onCta && (
        <button
          type="button"
          onClick={onCta}
          className="section-header__cta"
        >
          {ctaLabel}
        </button>
      )}
    </div>
  );
}
