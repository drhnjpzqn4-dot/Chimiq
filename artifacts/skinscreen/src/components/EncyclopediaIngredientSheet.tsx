import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

export interface EncyclopediaIngredientDetail {
  slug: string;
  display: string;
  category: string;
  severity: "HIGH_RISK" | "CAUTION";
  hint_se: string;
  description_se?: string;
  commonIn_se?: string[];
  aliases?: string[];
  citation: string;
  citationUrl: string;
  medicallyReviewed?: boolean;
}

const CATEGORY_LABELS: Record<string, string> = {
  ENDOCRINE_DISRUPTOR: "Hormonstörande ämne",
  FORMALDEHYDE_RELEASER: "Formaldehydfrigörare",
  FRAGRANCE: "Parfymallergener",
  HARSH_PRESERVATIVE: "Aggressivt konserveringsmedel",
  PHOTOSENSITISER: "Ljuskänslighetshöjare",
  KNOWN_ALLERGEN: "Känd allergen",
  NANOPARTICLE: "Nanopartikel",
  HEAVY_METAL: "Tungmetall",
  CARCINOGEN: "Cancerframkallande ämne",
  CAUTION: "Varning",
};

interface EncyclopediaIngredientSheetProps {
  ingredient: EncyclopediaIngredientDetail | null;
  open: boolean;
  onClose: () => void;
}

export function EncyclopediaIngredientSheet({
  ingredient,
  open,
  onClose,
}: EncyclopediaIngredientSheetProps) {
  return (
    <Sheet open={open} onOpenChange={(next) => !next && onClose()}>
      <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto rounded-t-2xl">
        {ingredient ? (
          <>
            <SheetHeader className="mb-4 text-left">
              <div className="mb-1 flex flex-wrap items-center gap-2">
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    ingredient.severity === "HIGH_RISK"
                      ? "bg-red-100 text-red-700"
                      : "bg-amber-100 text-amber-700"
                  }`}
                >
                  {ingredient.severity === "HIGH_RISK" ? "Hög risk" : "Varning"}
                </span>
                <span className="text-xs text-[var(--ink-soft)]">
                  {CATEGORY_LABELS[ingredient.category] ?? ingredient.category}
                </span>
              </div>
              <SheetTitle className="text-left text-xl font-bold text-[var(--ink)]">
                {ingredient.display}
              </SheetTitle>
            </SheetHeader>

            <div className="space-y-5 pb-6">
              <section>
                <h4 className="mb-1 text-sm font-semibold text-[var(--ink)]">Vad är det?</h4>
                <p className="text-sm leading-relaxed text-[var(--ink-soft)]">
                  {ingredient.description_se ?? ingredient.hint_se}
                </p>
              </section>

              {ingredient.commonIn_se && ingredient.commonIn_se.length > 0 ? (
                <section>
                  <h4 className="mb-2 text-sm font-semibold text-[var(--ink)]">Vanligt i</h4>
                  <div className="flex flex-wrap gap-2">
                    {ingredient.commonIn_se.map((product) => (
                      <span
                        key={product}
                        className="rounded-full bg-[var(--cream-warm)] px-3 py-1 text-xs text-[var(--ink-soft)]"
                      >
                        {product}
                      </span>
                    ))}
                  </div>
                </section>
              ) : null}

              {ingredient.aliases && ingredient.aliases.length > 0 ? (
                <section>
                  <h4 className="mb-1 text-sm font-semibold text-[var(--ink)]">Kallas även</h4>
                  <p className="text-xs text-[var(--ink-soft)]">{ingredient.aliases.join(", ")}</p>
                </section>
              ) : null}

              <section className="border-t border-[var(--line)] pt-4">
                {ingredient.medicallyReviewed ? (
                  <p className="mb-1 text-xs font-medium text-[var(--sage)]">
                    Baserat på medicinsk forskning
                  </p>
                ) : null}
                <p className="text-xs text-[var(--ink-soft)]">{ingredient.citation}</p>
                <a
                  href={ingredient.citationUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 block text-xs text-[var(--sage)] underline"
                >
                  Läs källan
                </a>
              </section>
            </div>
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
