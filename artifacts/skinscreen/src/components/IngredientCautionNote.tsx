import { Info } from "lucide-react";
import { useTranslation } from "@/lib/i18n";

/**
 * IngredientCautionNote — lugn rosa påminnelse att en ingrediensanalys bygger på
 * den lista vi har: formuleringar ändras över tid (innovation) och varierar
 * mellan länder (regelverk), och foto på runda flaskor kan missa ingredienser.
 *
 * SS-081c: ENDA stället där den här texten bor. Vill du ändra ordalydelsen,
 * ändra i18n-nyckeln `ingredientCaution.note` (sv/en/fr/es) — inte här.
 * Återanvänd komponenten överallt en analys VISAS (produktkort, rutin, m.m.).
 * (OCR-ögonblicket har sin egen, starkare "runda flaskor"-not i IngredientsCapture.)
 */
export function IngredientCautionNote({ className }: { className?: string }) {
  const { t } = useTranslation();
  return (
    <div
      className={`flex items-start gap-2 rounded-xl px-3 py-2 ${className ?? ""}`}
      style={{ backgroundColor: "var(--rose-soft)", color: "var(--rose-gold-deep)" }}
    >
      <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <p className="flex-1 text-xs leading-relaxed">{t("ingredientCaution.note")}</p>
    </div>
  );
}
