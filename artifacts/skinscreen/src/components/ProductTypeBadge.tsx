export type ProductType = "skincare" | "haircare" | "cosmetics" | "other";

interface ProductTypeBadgeProps {
  productType?: ProductType | string | null;
  className?: string;
}

export function ProductTypeBadge({ productType, className }: ProductTypeBadgeProps) {
  if (productType === "cosmetics") {
    return (
      <span
        className={
          className ??
          "text-xs font-medium px-2 py-0.5 rounded-full border border-[var(--premium-gold)]/30 bg-[var(--premium-gold)]/15 text-[var(--premium-gold)]"
        }
      >
        Smink
      </span>
    );
  }
  if (productType === "skincare") {
    return (
      <span
        className={
          className ??
          "text-xs font-medium px-2 py-0.5 rounded-full border border-[var(--sage)]/20 bg-[var(--sage)]/10 text-[var(--sage)]"
        }
      >
        Hudvård
      </span>
    );
  }
  return null;
}
