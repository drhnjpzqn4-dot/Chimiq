import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Camera, Check, Plus } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n";

interface GapsResponse {
  barcode: string;
  productName: string | null;
  brand: string | null;
  hasIngredients: boolean;
  hasFrontImage: boolean;
  missing: {
    productName: boolean;
    brand: boolean;
    ingredients: boolean;
    frontImage: boolean;
  };
}

type FieldKey = "productName" | "brand" | "frontImage";

const FIELD_LABEL_KEYS: Record<FieldKey, string> = {
  productName: "gapFill.fieldProductName",
  brand: "gapFill.fieldBrand",
  frontImage: "gapFill.fieldFrontImage",
};

/**
 * Inline "Help complete this product" card on the results page (#98). Reads
 * which fields the cached product is missing and lets the user fill any one
 * of them in place via the gap-fill PATCH endpoint. Hides itself entirely if
 * the product has no gaps to fill or eligibility is rejected.
 */
export function InlineGapFill({
  barcode,
  productName,
  className,
}: {
  barcode: string;
  productName?: string;
  className?: string;
}) {
  const { t } = useTranslation();
  const [gaps, setGaps] = useState<GapsResponse | null>(null);
  const [activeField, setActiveField] = useState<FieldKey | null>(null);
  const [value, setValue] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [completed, setCompleted] = useState<Set<FieldKey>>(new Set());
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!barcode) return;
    const ctrl = new AbortController();
    fetch(`/api/products/${encodeURIComponent(barcode)}/gaps`, {
      credentials: "include",
      signal: ctrl.signal,
    })
      .then((r) => (r.ok ? (r.json() as Promise<GapsResponse>) : null))
      .then((d) => setGaps(d))
      .catch(() => {});
    return () => ctrl.abort();
  }, [barcode]);

  if (!gaps) return null;

  const missingFields = (Object.keys(gaps.missing) as Array<keyof typeof gaps.missing>)
    .filter((k) => gaps.missing[k] && k !== "ingredients") // hide ingredients gap-fill from inline UI; ContributeModal handles that
    .map((k) => k as FieldKey)
    .filter((k) => !completed.has(k));

  if (missingFields.length === 0) return null;

  const submit = async (payload: Record<string, string>, field: FieldKey) => {
    setSubmitting(true);
    try {
      const r = await fetch(
        `/api/products/${encodeURIComponent(barcode)}/contribute`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            // Hint the server with the *current* product name (used only for
            // shelf-eligibility lookup). Never overwrite a typed field — the
            // user's submitted payload takes precedence.
            productName: productName ?? undefined,
            ...payload,
          }),
        },
      );
      if (!r.ok) {
        const j = (await r.json().catch(() => ({}))) as { error?: string };
        toast.error(j.error ?? t("gapFill.errSaveFailed"));
        return;
      }
      toast.success(t("gapFill.thanks"));
      setCompleted((s) => new Set(s).add(field));
      setActiveField(null);
      setValue("");
    } finally {
      setSubmitting(false);
    }
  };

  const onPickPhoto = (file: File) => {
    if (file.size > 6_000_000) {
      toast.error(t("gapFill.errPhotoTooLarge"));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== "string") return;
      const base64 = result.split(",")[1] ?? "";
      void submit({ frontImageBase64: base64 }, "frontImage");
    };
    reader.readAsDataURL(file);
  };

  return (
    <div
      className={cn(
        "rounded-2xl border border-border/50 bg-secondary/30 p-3.5 space-y-2.5",
        className,
      )}
    >
      <div className="flex items-center gap-2">
        <Plus className="w-3.5 h-3.5 text-muted-foreground" />
        <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
          {t("gapFill.title")}
        </p>
      </div>

      {!activeField ? (
        <div className="flex flex-wrap gap-1.5">
          {missingFields.map((f) =>
            f === "frontImage" ? (
              <Button
                key={f}
                variant="outline"
                size="sm"
                className="h-7 text-xs gap-1.5"
                onClick={() => fileRef.current?.click()}
                disabled={submitting}
              >
                <Camera className="w-3 h-3" /> {t("gapFill.addFmt", { field: t(FIELD_LABEL_KEYS[f]).toLowerCase() })}
              </Button>
            ) : (
              <Button
                key={f}
                variant="outline"
                size="sm"
                className="h-7 text-xs"
                onClick={() => {
                  setActiveField(f);
                  setValue("");
                }}
                disabled={submitting}
              >
                {t("gapFill.plusFmt", { field: t(FIELD_LABEL_KEYS[f]) })}
              </Button>
            ),
          )}
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onPickPhoto(file);
              e.target.value = "";
            }}
          />
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <Input
            autoFocus
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={t("gapFill.enterPlaceholderFmt", { field: t(FIELD_LABEL_KEYS[activeField]).toLowerCase() })}
            className="h-8 text-sm"
            disabled={submitting}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                setActiveField(null);
                setValue("");
              }
            }}
          />
          <Button
            size="sm"
            className="h-8"
            disabled={submitting || value.trim().length === 0}
            onClick={() => {
              const trimmed = value.trim();
              if (!trimmed) return;
              const payload: Record<string, string> = {};
              if (activeField === "productName") payload["productName"] = trimmed;
              if (activeField === "brand") payload["brand"] = trimmed;
              void submit(payload, activeField);
            }}
          >
            <Check className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-muted-foreground"
            onClick={() => {
              setActiveField(null);
              setValue("");
            }}
          >
            {t("gapFill.cancel")}
          </Button>
        </div>
      )}
    </div>
  );
}
