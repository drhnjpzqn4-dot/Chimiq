import { X } from "lucide-react";
import { ProductCapture } from "@/components/ProductCapture";
import { useTranslation } from "@/lib/i18n";
import type { ProductResult } from "@/components/ScanEntry";

interface ContributeModalProps {
  barcode?: string;
  initialProductName?: string;
  initialBrand?: string;
  initialIngredients?: string;
  onSuccess?: (ingredients: string, productName: string) => void;
  onClose: () => void;
}

export function ContributeModal({
  barcode,
  initialProductName = "",
  initialBrand = "",
  initialIngredients = "",
  onSuccess,
  onClose,
}: ContributeModalProps) {
  const { t } = useTranslation();

  const handleAnalyzed = (result: ProductResult) => {
    const name =
      result.productName ?? result.product_name ?? t("contribute.scannedProductFallback");
    const ing = result.ingredients ?? initialIngredients;
    if (ing && onSuccess) {
      onSuccess(ing, name);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="relative max-h-[90vh] w-full max-w-md overflow-y-auto rounded-3xl bg-white shadow-2xl">
        {/* Sticky header */}
        <div className="sticky top-0 z-10 flex items-start justify-between border-b border-border/40 bg-white px-5 pb-3 pt-5">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              {t("contribute.helpUsAddProduct")}
            </p>
            <h2 className="mt-0.5 font-serif text-lg font-medium leading-tight text-foreground">
              {t("contribute.oneStepTitle")}
            </h2>
          </div>
          <button
            onClick={onClose}
            aria-label={t("contribute.close")}
            className="shrink-0 rounded-lg p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Formuläret */}
        <div className="p-5">
          <ProductCapture
            initialData={{
              productName: initialProductName,
              brand: initialBrand,
              barcode: barcode ?? "",
              ingredients: initialIngredients,
            }}
            onAnalyzed={handleAnalyzed}
          />
        </div>
      </div>
    </div>
  );
}
