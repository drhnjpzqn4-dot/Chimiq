import type { RoutineConflict } from "@workspace/api-client-react";
import { IngredientStatusDot, ShelfConflictBanner, type IngredientStatusLevel } from "@/components/IngredientStatusDot";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useTranslation } from "@/lib/i18n";

interface ProductDetailSheetProps {
  product: {
    productName: string;
    brand?: string | null;
    ingredients?: string | null;
  };
  status: IngredientStatusLevel;
  conflicts?: RoutineConflict[];
  onClose: () => void;
}

function splitIngredients(raw: string | null | undefined): string[] {
  return (raw ?? "")
    .split(/[,;\n]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function ProductDetailSheet({
  product,
  status,
  conflicts = [],
  onClose,
}: ProductDetailSheetProps) {
  const { t } = useTranslation();
  const ingredients = splitIngredients(product.ingredients);
  const substantiveConflicts = conflicts.filter((conflict) => conflict.severity !== "SAFE");

  return (
    <Sheet open onOpenChange={(open) => {
      if (!open) onClose();
    }}>
      <SheetContent side="bottom" className="max-h-[88vh] overflow-y-auto rounded-t-3xl p-0">
        <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-muted-foreground/20" />
        <SheetHeader className="px-5 pb-2 pt-5 text-left">
          {product.brand && (
            <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
              {product.brand}
            </p>
          )}
          <div className="flex items-start gap-2 pr-8">
            <IngredientStatusDot status={status} />
            <SheetTitle className="font-serif text-2xl font-medium leading-tight">
              {product.productName || t("shelf.unknownProduct")}
            </SheetTitle>
          </div>
        </SheetHeader>

        <div className="space-y-5 px-5 pb-8 pt-3">
          {substantiveConflicts.length > 0 && (
            <div className="space-y-2">
              {substantiveConflicts.map((conflict) => (
                <ShelfConflictBanner key={`${conflict.product1Name}-${conflict.product2Name}-${conflict.pair}`}>
                  <span className="block font-medium">{conflict.pair}</span>
                  <span className="mt-1 block font-normal leading-snug">{conflict.explanation}</span>
                </ShelfConflictBanner>
              ))}
            </div>
          )}

          <section>
            <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
              {t("productDetail.ingredients")}
            </h3>
            {ingredients.length > 0 ? (
              <ul className="mt-3 flex flex-wrap gap-1.5">
                {ingredients.map((ingredient, index) => (
                  <li
                    key={`${ingredient}-${index}`}
                    className="rounded-full border border-border/50 bg-muted/40 px-2.5 py-1 text-[12px] text-foreground"
                  >
                    {ingredient}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-muted-foreground">
                {t("productDetail.ingredientsMissing")}
              </p>
            )}
          </section>
        </div>
      </SheetContent>
    </Sheet>
  );
}
