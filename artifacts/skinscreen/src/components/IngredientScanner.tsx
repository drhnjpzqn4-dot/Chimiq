import { useState, useRef, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { BarcodeScanButton } from "@/components/BarcodeScanButton";
import {
  useAnalyzeIngredients,
  useAnalyzeSingle,
  useScanLabel,
  useProductLookup,
  useSuggestAlternatives,
  getProductLookupQueryKey,
} from "@workspace/api-client-react";
import type { IngredientFlag, SkinProfile, AlternativeSuggestion } from "@workspace/api-client-react";
import { DangerCard } from "@/components/DangerCard";
import { IngredientDetailSheet, type IngredientDetailFlag } from "@/components/IngredientDetailSheet";
import { ProductRating } from "@/components/ProductRating";
import { InlineGapFill } from "@/components/InlineGapFill";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FadeIn } from "@/components/FadeIn";
import { StepHeader, VerdictCard } from "@/components/scanner/ScannerStep";
import { useTranslation } from "@/lib/i18n";
import { trackEvent } from "@/lib/analytics";
import {
  Loader2,
  FlaskConical,
  ShieldCheck,
  AlertTriangle,
  ExternalLink,
  Camera,
  Search,
  ArrowLeftRight,
  Zap,
  X,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  Sparkles,
  Check,
  Ban,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ConflictResult } from "@workspace/api-client-react";

const PLACEHOLDER_SINGLE = `Aqua, Glycerin, Niacinamide, Retinol, Dimethicone, Cetearyl Alcohol, DMDM Hydantoin, Sodium Hyaluronate, Butylene Glycol, Fragrance, Carbomer`;
const PLACEHOLDER_1 = `Aqua, Glycerin, Niacinamide, Retinol, Dimethicone, Cetearyl Alcohol, Phenoxyethanol, Sodium Hyaluronate, Butylene Glycol, Carbomer`;
const PLACEHOLDER_2 = `Aqua, Ascorbic Acid (Vitamin C 20%), Glycolic Acid, Propylene Glycol, Tocopherol, Ferulic Acid, Sodium Hydroxide, Panthenol`;

const SKIN_PROFILES: { value: SkinProfile; labelKey: string; emoji: string }[] = [
  { value: "sensitive", labelKey: "scanner.skinType.sensitive", emoji: "🌸" },
  { value: "young", labelKey: "scanner.skinType.young", emoji: "✨" },
  { value: "mature", labelKey: "scanner.skinType.mature", emoji: "🍃" },
  { value: "pregnant", labelKey: "scanner.skinType.pregnant", emoji: "🤱" },
];

const FLAG_CATEGORY_KEYS: Record<string, string> = {
  ENDOCRINE_DISRUPTOR: "scanner.flagCategory.endocrineDisruptor",
  FORMALDEHYDE_RELEASER: "scanner.flagCategory.formaldehydeReleaser",
  FRAGRANCE: "scanner.flagCategory.fragrance",
  HARSH_PRESERVATIVE: "scanner.flagCategory.harshPreservative",
  PHOTOSENSITISER: "scanner.flagCategory.photosensitiser",
  KNOWN_ALLERGEN: "scanner.flagCategory.knownAllergen",
  NANOPARTICLE: "scanner.flagCategory.nanoparticle",
  CAUTION: "scanner.flagCategory.caution",
};

function SkinProfileSelector({
  value,
  onChange,
}: {
  value: SkinProfile | undefined;
  onChange: (v: SkinProfile | undefined) => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs font-semibold uppercase tracking-wider mb-2 text-primary">{t("scanner.yourSkinType")}</p>
      <div className="flex flex-wrap gap-2">
        {SKIN_PROFILES.map((p) => (
          <button
            key={p.value}
            type="button"
            onClick={() => onChange(value === p.value ? undefined : p.value)}
            className={cn(
              "inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-150",
              "border focus:outline-none focus:ring-2 focus:ring-primary/40",
              value === p.value
                ? "border-transparent shadow-sm"
                : "bg-white border-border/60 text-muted-foreground hover:border-primary/40 hover:text-foreground",
            )}
            data-touch-target
            style={value === p.value ? { backgroundColor: "hsl(var(--primary))", color: "#fff", borderColor: "hsl(var(--primary))" } : {}}
          >
            {t(p.labelKey)}
          </button>
        ))}
      </div>
    </div>
  );
}

interface ProductSearchProps {
  onIngredients: (ingredients: string, productName: string) => void;
  disabled?: boolean;
}

function ProductSearch({ onIngredients, disabled }: ProductSearchProps) {
  const { t } = useTranslation();
  const [inputVal, setInputVal] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [autoFilled, setAutoFilled] = useState<string | null>(null);
  const autoFilledRef = useRef(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      const trimmed = inputVal.trim();
      autoFilledRef.current = false;
      setAutoFilled(null);
      setDebouncedQ(trimmed.length >= 3 ? trimmed : "");
    }, 500);
    return () => clearTimeout(timer);
  }, [inputVal]);

  const { data, isFetching } = useProductLookup(
    { q: debouncedQ },
    { query: { queryKey: getProductLookupQueryKey({ q: debouncedQ }), enabled: debouncedQ.length >= 3 } },
  );

  useEffect(() => {
    if (!isFetching && data?.found && data.ingredients && !autoFilledRef.current) {
      autoFilledRef.current = true;
      onIngredients(data.ingredients, data.productName ?? debouncedQ);
      setAutoFilled(data.productName ?? debouncedQ);
      setInputVal("");
      setDebouncedQ("");
    }
  }, [isFetching, data, debouncedQ, onIngredients]);

  const clear = () => {
    setInputVal("");
    setDebouncedQ("");
    setAutoFilled(null);
    autoFilledRef.current = false;
  };

  return (
    <div className="mb-2">
      {autoFilled ? (
        <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-primary/5 border border-primary/20">
          <p className="text-xs font-medium text-primary truncate flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
            {t("scanner.autoFilledFmt").replace("{name}", autoFilled)}
          </p>
          <button
            type="button"
            onClick={clear}
            className="shrink-0 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
          >
            {t("scanner.clear")}
          </button>
        </div>
      ) : (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            placeholder={t("scanner.searchPlaceholder")}
            disabled={disabled}
            data-touch-target
            className={cn(
              "w-full pl-9 pr-9 py-2.5 text-sm rounded-2xl border border-border/60 bg-white",
              "placeholder:text-muted-foreground text-foreground",
              "focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50",
              "transition-all duration-150 disabled:opacity-50 shadow-sm",
            )}
          />
          {isFetching && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground animate-spin" />
          )}
          {inputVal && !isFetching && (
            <button
              type="button"
              onClick={clear}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-muted-foreground transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          {!isFetching && debouncedQ.length >= 3 && data && !data.found && (
            <p className="mt-1.5 text-[11px] text-muted-foreground px-1 animate-fade-up">
              {t("scanner.notFoundManual")}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

interface ProductTextAreaProps {
  label: string;
  index: number;
  value: string;
  onChange: (val: string) => void;
  placeholder: string;
}

function ProductTextArea({ label, index, value, onChange, placeholder }: ProductTextAreaProps) {
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [scanError, setScanError] = useState<string | null>(null);

  const scanLabel = useScanLabel({
    mutation: {
      onSuccess: (data) => {
        onChange(data.ingredients);
        setScanError(null);
      },
      onError: (err) => {
        const apiError = (err as Error & { response?: { data?: { error?: string } } })?.response
          ?.data?.error;
        setScanError(
          apiError ??
            t("scanner.errReadLabel"),
        );
      },
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setScanError(null);
    const reader = new FileReader();
    reader.onerror = () => setScanError(t("scanner.errReadFile"));
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const img = new Image();
      img.onerror = () => setScanError(t("scanner.errDecode"));
      img.onload = () => {
        const MAX_EDGE = 1500;
        let { width, height } = img;
        if (width > MAX_EDGE || height > MAX_EDGE) {
          if (width >= height) { height = Math.round((height * MAX_EDGE) / width); width = MAX_EDGE; }
          else { width = Math.round((width * MAX_EDGE) / height); height = MAX_EDGE; }
        }
        const canvas = document.createElement("canvas");
        canvas.width = width; canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) { setScanError(t("scanner.errImgProcessing")); return; }
        ctx.drawImage(img, 0, 0, width, height);
        const base64 = canvas.toDataURL("image/jpeg", 0.85).split(",")[1];
        scanLabel.mutate({ data: { imageBase64: base64, mimeType: "image/jpeg" } });
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-semibold text-foreground tracking-wide uppercase flex items-center gap-2">
        <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center font-bold">
          {index}
        </span>
        {label}
      </label>
      <div className="relative">
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={6}
          maxLength={3000}
          className={cn(
            "w-full resize-none rounded-2xl border border-border/60 bg-white px-4 py-3.5 pr-14",
            "text-sm text-foreground placeholder:text-muted-foreground leading-relaxed",
            "focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/60",
            "transition-all duration-200 shadow-sm",
          )}
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={scanLabel.isPending}
          title={t("scanner.scanLabelPhoto")}
          data-touch-target
          className={cn(
            "absolute top-2.5 right-2.5 w-10 h-10 flex items-center justify-center rounded-2xl",
            "bg-primary/10 text-primary hover:bg-primary/20 active:animate-tap-bounce",
            "transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed",
            "focus:outline-none focus:ring-2 focus:ring-primary/40",
          )}
        >
          {scanLabel.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={scanLabel.isPending}
          className="text-[11px] text-primary hover:text-primary transition-colors flex items-center gap-1 disabled:opacity-50"
        >
          <Camera className="w-3 h-3" />
          {t("scanner.snapLabel")}
        </button>
        <div className="flex items-center gap-2 shrink-0">
          {scanError && <p className="text-[11px] text-destructive leading-snug">{scanError}</p>}
          <p className="text-[11px] text-muted-foreground">{value.length}/3000</p>
        </div>
      </div>
    </div>
  );
}

function FlagCard({
  flag,
  delay,
  onOpenProfile,
}: {
  flag: IngredientFlag;
  delay?: number;
  onOpenProfile?: () => void;
}) {
  const { t } = useTranslation();
  const isHighRisk = flag.severity === "HIGH_RISK";
  // High-risk flags expand by default so users can't miss the explanation.
  // Caution flags collapse by default to keep the results list scannable on
  // mobile when a product has many minor flags.
  const [open, setOpen] = useState(isHighRisk);
  const headingId = `flag-${flag.ingredient.replace(/\W+/g, "-").toLowerCase()}`;
  const panelId = `${headingId}-panel`;
  return (
    <FadeIn delay={delay} fullWidth>
      <div className={cn(
        "flex flex-col h-full rounded-3xl border shadow-sm overflow-hidden",
        isHighRisk
          ? "bg-red-50/60 border-red-200"
          : "bg-amber-50/40 border-amber-200/70",
      )}>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls={panelId}
          id={headingId}
          className="text-left p-5 sm:p-6 flex items-start justify-between gap-3 hover:bg-black/[0.02] transition-colors focus:outline-none focus:ring-2 focus:ring-primary/30 rounded-3xl"
          data-touch-target
        >
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base sm:text-lg font-serif font-semibold text-foreground leading-tight">
                {flag.ingredient}
              </h3>
              <Badge
                variant={isHighRisk ? "destructive" : "warning"}
                className="inline-flex shrink-0 items-center text-[10px] font-sans tracking-wide uppercase"
              >
                {isHighRisk ? (
                  <>
                    <Ban className="mr-1 h-[14px] w-[14px] shrink-0" aria-hidden />
                    {t("scanner.highRisk")}
                  </>
                ) : (
                  <>
                    <AlertTriangle className="mr-1 h-[14px] w-[14px] shrink-0" aria-hidden />
                    {t("scanner.caution")}
                  </>
                )}
              </Badge>
            </div>
            <span className={cn(
              "inline-block mt-1.5 text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full",
              isHighRisk ? "bg-red-100 text-red-600" : "bg-amber-100 text-amber-700",
            )}>
              {FLAG_CATEGORY_KEYS[flag.category] ? t(FLAG_CATEGORY_KEYS[flag.category]) : flag.category}
            </span>
            {!open && (
              <p className="mt-2 text-xs text-muted-foreground">{t("scanner.tapToSeeWhy")}</p>
            )}
          </div>
          <ChevronRight
            className={cn(
              "w-4 h-4 mt-1 shrink-0 text-muted-foreground transition-transform duration-200",
              open ? "rotate-90" : "rotate-0",
            )}
            aria-hidden="true"
          />
        </button>
        {open && (
          <div
            id={panelId}
            role="region"
            aria-labelledby={headingId}
            className="px-5 sm:px-6 pb-5 sm:pb-6"
          >
            <p className="text-sm text-muted-foreground leading-relaxed mb-4">{flag.explanation}</p>
            {onOpenProfile && (
              <button
                type="button"
                onClick={onOpenProfile}
                data-touch-target
                className={cn(
                  "mb-3 inline-flex items-center gap-1 text-xs font-semibold transition-colors",
                  isHighRisk
                    ? "text-red-700 hover:text-red-800"
                    : "text-amber-700 hover:text-amber-800",
                )}
              >
                {t("scanner.seeFullProfile")}
              </button>
            )}
            <div className="pt-3 border-t border-border/40">
              <a
                href={flag.citationUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-muted-foreground flex items-start gap-2 hover:text-primary transition-colors group"
              >
                <ExternalLink className="w-3 h-3 mt-0.5 shrink-0" />
                <span className="italic leading-snug">
                  <span className="font-semibold not-italic text-muted-foreground">{t("scanner.source")}</span>
                  {flag.citation}
                </span>
              </a>
            </div>
          </div>
        )}
      </div>
    </FadeIn>
  );
}

function SafeCard({ result, delay }: { result: ConflictResult; delay?: number }) {
  const { t } = useTranslation();
  return (
    <FadeIn delay={delay} fullWidth>
      <div className="flex flex-col justify-between h-full p-6 sm:p-8 bg-white rounded-3xl border border-green-200 shadow-sm">
        <div>
          <div className="flex items-start justify-between gap-4 mb-4">
            <h3 className="text-xl sm:text-2xl font-serif font-semibold text-foreground leading-tight">
              {result.pair}
            </h3>
            <Badge className="inline-flex shrink-0 items-center bg-green-100 text-green-700 border-green-200 hover:bg-green-100 font-sans tracking-wide uppercase text-[10px]">
              <Check className="mr-1 h-[14px] w-[14px] shrink-0" aria-hidden />
              {t("scanner.safe")}
            </Badge>
          </div>
          <p className="text-muted-foreground leading-relaxed mb-6">{result.explanation}</p>
        </div>
        <div className="pt-4 border-t border-border/50 mt-auto">
          <a
            href={result.citationUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-muted-foreground flex items-start gap-2 hover:text-primary transition-colors group"
          >
            <ExternalLink className="w-3 h-3 mt-0.5 shrink-0" />
            <span className="italic leading-snug">
              <span className="font-semibold not-italic text-muted-foreground">{t("scanner.source")}</span>
              {result.citation}
            </span>
          </a>
        </div>
      </div>
    </FadeIn>
  );
}

function AlternativeCard({ alt, delay }: { alt: AlternativeSuggestion; delay?: number }) {
  const { t } = useTranslation();
  return (
    <FadeIn delay={delay} fullWidth>
      <div className="flex flex-col h-full p-5 rounded-3xl border border-primary/20 bg-primary/[0.03] shadow-sm">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-primary mb-0.5">{alt.brand}</p>
            <h4 className="text-base font-serif font-semibold text-foreground leading-tight">{alt.name}</h4>
          </div>
          <span className="shrink-0 inline-flex items-center px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-semibold uppercase tracking-wide whitespace-nowrap">
            <Check className="mr-1 h-[14px] w-[14px] shrink-0" aria-hidden />
            {t("scanner.saferPick")}
          </span>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed mb-3 flex-1">{alt.whySafer}</p>
        <div className="pt-2.5 border-t border-border/40">
          <p className="text-[11px] text-primary font-medium">{alt.keyImprovement}</p>
        </div>
      </div>
    </FadeIn>
  );
}

function AlternativesSection({
  ingredients,
  flaggedIngredients,
}: {
  ingredients: string;
  flaggedIngredients: string[];
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(true);
  const suggestMutation = useSuggestAlternatives({ mutation: {} });

  useEffect(() => {
    if (flaggedIngredients.length > 0 && ingredients.trim()) {
      suggestMutation.mutate({
        data: { ingredients, flaggedIngredients },
      });
    }
  }, [ingredients, flaggedIngredients.join(",")]);

  const alternatives = suggestMutation.data?.alternatives ?? [];
  const inferredType = suggestMutation.data?.inferredProductType;
  const isLoading = suggestMutation.isPending;
  const isError = suggestMutation.isError;

  return (
    <FadeIn>
      <div className="rounded-3xl border border-primary/20 overflow-hidden">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="w-full flex items-center justify-between gap-3 px-6 py-4 bg-primary/5 hover:bg-primary/8 transition-colors text-left"
        >
          <div className="flex items-center gap-2.5">
            <Sparkles className="w-4 h-4 text-primary shrink-0" />
            <span className="text-sm font-semibold text-foreground">
              {t("scanner.whatToUse")}
              {inferredType && <span className="font-normal text-muted-foreground ml-1">· {inferredType}</span>}
            </span>
            {isLoading && <Loader2 className="w-3.5 h-3.5 text-primary animate-spin" />}
          </div>
          {open ? (
            <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" />
          ) : (
            <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
          )}
        </button>

        {open && (
          <div className="px-6 py-5">
            {isLoading && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="h-40 rounded-3xl skeleton"
                    style={{ animationDelay: `${i * 0.15}s` }}
                  />
                ))}
              </div>
            )}

            {isError && (
              <p className="text-sm text-muted-foreground text-center py-4">
                {t("scanner.altsLoadFailed")}
              </p>
            )}

            {!isLoading && !isError && alternatives.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                {t("scanner.noAlts")}
              </p>
            )}

            {!isLoading && alternatives.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {alternatives.map((alt, i) => (
                  <AlternativeCard key={`${alt.brand}-${alt.name}`} alt={alt} delay={i * 0.1} />
                ))}
              </div>
            )}

            <p className="text-[10px] text-muted-foreground text-center mt-4">
              {t("scanner.altsDisclaimer")}
            </p>
          </div>
        )}
      </div>
    </FadeIn>
  );
}

export interface ScannerSeed {
  mode: "single" | "compare";
  product1?: string;
  product1Name?: string;
  product2?: string;
  product2Name?: string;
  ingredients?: string;
  /** Product name for single-mode seeds (used in result header + scan-completed
      event so recents show the real product, not "Scanned product"). */
  productName?: string;
  autoRun?: boolean;
}

// Verified against Open Beauty Facts (https://world.openbeautyfacts.org). Each
// `imageUrl` was confirmed to return HTTP 200 at the time the list was last
// expanded. Keep entries pointing at OBF `front_*.400.jpg` thumbnails so the
// `ProductImageThumb` lazy-load + fallback behaviour stays consistent.
const QUICK_START_PRODUCTS: { name: string; imageUrl: string; ingredients: string }[] = [
  {
    name: "CeraVe Moisturising Cream",
    imageUrl: "https://images.openbeautyfacts.org/images/products/333/787/559/7470/front_en.3.400.jpg",
    ingredients: "Aqua/Water, Glycerin, Caprylic/Capric Triglyceride, Cetearyl Alcohol, Ceteareth-20, Petrolatum, Potassium Phosphate, Ceramide NP, Ceramide AP, Ceramide EOP, Carbomer, Dimethicone, Behentrimonium Methosulfate, Sodium Lauroyl Lactylate, Sodium Hyaluronate, Cholesterol, Phenoxyethanol, Disodium EDTA, Dipotassium Phosphate, Tocopherol, Phytosphingosine, Xanthan Gum, Ethylhexylglycerin",
  },
  {
    name: "CeraVe SA Smoothing Cleanser",
    imageUrl: "https://images.openbeautyfacts.org/images/products/333/787/579/5456/front_en.14.400.jpg",
    ingredients: "Aqua/Water, Sodium Lauroyl Sarcosinate, Cocamidopropyl Hydroxysultaine, Glycerin, Niacinamide, Gluconolactone, Sodium Methyl Cocoyl Taurate, PEG-150 Pentaerythrityl Tetrastearate, Ceramide NP, Ceramide AP, Ceramide EOP, Carbomer, Calcium Gluconate, Salicylic Acid, Sodium Benzoate, Sodium Lauroyl Lactylate, Cholesterol, Phenoxyethanol, Disodium EDTA, Tetrasodium EDTA, Hyaluronic Acid, Phytosphingosine, Xanthan Gum, Ethylhexylglycerin",
  },
  {
    name: "The Ordinary Granactive Retinoid 5% in Squalane",
    imageUrl: "https://images.openbeautyfacts.org/images/products/076/991/519/3954/front_en.14.400.jpg",
    ingredients: "Squalane, C12-15 Alkyl Benzoate, Bisabolol, Dimethyl Isosorbide, Caprylic/Capric Triglyceride, Simmondsia Chinensis (Jojoba) Seed Oil, Hydroxypinacolone Retinoate, Solanum Lycopersicum (Tomato) Fruit Extract, Rosmarinus Officinalis (Rosemary) Leaf Extract, Hydroxymethoxyphenyl Decanone",
  },
  {
    name: "The Ordinary Lactic Acid 10% + HA",
    imageUrl: "https://images.openbeautyfacts.org/images/products/076/991/519/0373/front_en.12.400.jpg",
    ingredients: "Aqua (Water), Lactic Acid, Glycerin, Pentylene Glycol, Propanediol, Sodium Hydroxide, Sodium Hyaluronate Crosspolymer, Tasmannia Lanceolata Fruit/Leaf Extract, Acacia Senegal Gum, Xanthan Gum, Isoceteth-20, Trisodium Ethylenediamine Disuccinate, Ethylhexylglycerin, 1,2-Hexanediol, Caprylyl Glycol",
  },
  {
    name: "La Roche-Posay Cicaplast Baume B5+",
    imageUrl: "https://images.openbeautyfacts.org/images/products/333/787/581/6847/front_fr.12.400.jpg",
    ingredients: "Eau/Water, Hydrogenated Polyisobutene, Dimethicone, Glycerin, Butyrospermum Parkii (Shea) Butter, Panthenol, Zea Mays (Corn) Starch, Propanediol, Butylene Glycol, Cetyl PEG/PPG-10/1 Dimethicone, Trihydroxystearin, Centella Asiatica Leaf Extract, Polymnia Sonchifolia Root Juice, Zinc Gluconate, Madecassoside, Manganese Gluconate, Alpha-Glucan Oligosaccharide, Silica, Aluminum Hydroxide, Magnesium Sulfate, Mannose, Capryloyl Glycine, Caprylyl Glycol, Vitreoscilla Ferment, Citric Acid, Trisodium Ethylenediamine Disuccinate",
  },
  {
    name: "La Roche-Posay Toleriane Dermallergo Fluid",
    imageUrl: "https://images.openbeautyfacts.org/images/products/333/787/575/7669/front_en.5.400.jpg",
    ingredients: "Aqua, Glycerin, Coco-Caprylate/Caprate, Dimethicone, Niacinamide, Sodium Hyaluronate, Squalane, Carnosine, Tocopherol, Pentylene Glycol, Caprylyl Glycol, Citric Acid, Xanthan Gum, Disodium EDTA, Phenoxyethanol",
  },
  {
    name: "Cetaphil Gentle Skin Cleanser",
    imageUrl: "https://images.openbeautyfacts.org/images/products/890/600/527/4106/front_en.6.400.jpg",
    ingredients: "Aqua, Glycerin, Cetearyl Alcohol, Panthenol, Niacinamide, Pantolactone, Xanthan Gum, Sodium Cocoyl Isethionate, Sodium Benzoate, Citric Acid",
  },
  {
    name: "Vichy Mineral 89",
    imageUrl: "https://images.openbeautyfacts.org/images/products/333/787/554/3248/front_en.5.400.jpg",
    ingredients: "Aqua/Water, PEG/PPG/Polybutylene Glycol-8/5/3 Glycerin, Glycerin, Butylene Glycol, Methyl Gluceth-20, Carbomer, Sodium Hyaluronate, Phenoxyethanol, Caprylyl Glycol, Citric Acid, Biosaccharide Gum-1",
  },
  {
    name: "Garnier Micellar Cleansing Water",
    imageUrl: "https://images.openbeautyfacts.org/images/products/360/054/193/8489/front_en.25.400.jpg",
    ingredients: "Aqua/Water, Hexylene Glycol, Glycerin, Poloxamer 184, Disodium Cocoamphodiacetate, Disodium EDTA, Myrtrimonium Bromide",
  },
  {
    name: "Clinique Moisture Surge 100H",
    imageUrl: "https://images.openbeautyfacts.org/images/products/019/233/306/6942/front_en.3.400.jpg",
    ingredients: "Water/Aqua/Eau, Dimethicone, Butylene Glycol, Glycerin, Trisiloxane, Trehalose, Sucrose, Ammonium Acryloyldimethyltaurate/VP Copolymer, Hydroxyethyl Urea, Camellia Sinensis (Green Tea) Leaf Extract, Silybum Marianum (Lady's Thistle) Extract, Betula Alba (Birch) Bark Extract, Saccharomyces Lysate Extract, Aloe Barbadensis Leaf Water, Aloe Barbadensis Leaf Extract, Thermus Thermophilus Ferment, Caffeine, Sorbitol, Palmitoyl Hexapeptide-12, Sodium Hyaluronate, Caprylyl Glycol, Oleth-10, Phenoxyethanol",
  },
  {
    name: "Neutrogena Hydro Boost Cleansing Gel",
    imageUrl: "https://images.openbeautyfacts.org/images/products/357/466/132/0700/front_de.4.400.jpg",
    ingredients: "Aqua, Glycerin, Cocamidopropyl Hydroxysultaine, Sodium Cocoyl Isethionate, Sodium Methyl Cocoyl Taurate, Sodium Hydrolyzed Potato Starch Dodecenylsuccinate, Hydrolyzed Hyaluronic Acid, Ethylhexylglycerin, Linoleamidopropyl PG-Dimonium Chloride Phosphate, Polyquaternium-10, Polysorbate 20, Sodium Isethionate, Sodium Lauryl Sulfate, Sodium C14-16 Olefin Sulfonate, Sodium Chloride, Propylene Glycol, Disodium EDTA, Citric Acid, Sodium Hydroxide, Hydroxyacetophenone, Tocopherol",
  },
  {
    name: "Paula's Choice Skin Perfecting 6% Mandelic + 2% Lactic",
    imageUrl: "https://images.openbeautyfacts.org/images/products/200/000/015/2356/front_en.3.400.jpg",
    ingredients: "Water, Mandelic Acid, Butylene Glycol, Lactic Acid, Glycerin, Sodium Hydroxide, Pentylene Glycol, Camellia Sinensis (Green Tea) Leaf Extract, Glycyrrhiza Glabra (Licorice) Root Extract, Allantoin, Bisabolol, Beta-Glucan, Sodium Hyaluronate, Tocopheryl Acetate, Sodium Citrate, Disodium EDTA, Phenoxyethanol",
  },
  {
    name: "Weleda Skin Food",
    imageUrl: "https://images.openbeautyfacts.org/images/products/359/620/007/7555/front_fr.8.400.jpg",
    ingredients: "Water (Aqua), Helianthus Annuus (Sunflower) Seed Oil, Glycerin, Alcohol, Glyceryl Stearate Citrate, Beeswax (Cera Alba), Theobroma Cacao (Cocoa) Seed Butter, Cetearyl Alcohol, Butyrospermum Parkii (Shea) Butter, Limonene, Viola Tricolor Extract, Chamomilla Recutita (Matricaria) Flower Extract, Calendula Officinalis Flower Extract, Lanolin, Carrageenan, Xanthan Gum, Lactic Acid, Glyceryl Caprylate, Fragrance (Parfum), Linalool, Geraniol, Citral",
  },
  {
    name: "Drunk Elephant C-Firma Vitamin C Serum",
    imageUrl: "https://images.openbeautyfacts.org/images/products/085/655/600/4111/front_en.3.400.jpg",
    ingredients: "Water/Aqua/Eau, Dimethyl Isosorbide, Ascorbic Acid, Laureth-23, Glycerin, Lactobacillus/Pumpkin Ferment Extract, Sclerocarya Birrea Seed Oil, Dipotassium Glycyrrhizate, Glycyrrhiza Glabra (Licorice) Root Extract, Vitis Vinifera (Grape) Juice Extract, Phyllanthus Emblica Fruit Extract, Camellia Sinensis Leaf Extract, Tocopherol, Lactobacillus/Punica Granatum Fruit Ferment Extract, Sodium Hyaluronate Crosspolymer, Hydrolyzed Quinoa, Phytosterols, Glutamylamidoethyl Imidazole",
  },
  {
    name: "Eucerin Urea Repair Plus Lotion",
    imageUrl: "https://images.openbeautyfacts.org/images/products/400/580/002/4245/front_fr.4.400.jpg",
    ingredients: "Aqua, Urea, Glycerin, Isopropyl Stearate, Dicaprylyl Ether, Glyceryl Glucoside, Sodium Lactate, Butyrospermum Parkii Butter, Polyglyceryl-4 Diisostearate/Polyhydroxystearate/Sebacate, Tapioca Starch, Carnitine, Cetearyl Alcohol, Ceramide NP, Arginine HCL, Sodium PCA, Histidine HCl, Lactic Acid, Mannitol, Arginine, Serine, Sucrose, PCA, Citrulline, Glycogen, Alanine, Threonine, Glutamic Acid, Lysine HCl, Sodium Chloride, 1,2-Hexanediol, Phenoxyethanol, Potassium Sorbate",
  },
  {
    name: "Bioderma Sébium Hydra",
    imageUrl: "https://images.openbeautyfacts.org/images/products/340/134/884/0421/front_en.3.400.jpg",
    ingredients: "Aqua/Water/Eau, Glycerin, Paraffinum Liquidum, Pentylene Glycol, Cetearyl Alcohol, Niacinamide, Squalane, Mannose, Ginkgo Biloba Leaf Extract, Xylitol, Rhamnose, Tocopheryl Acetate, Disodium EDTA, Allantoin, Citric Acid, Phenoxyethanol",
  },
  {
    name: "Eucerin Aquaphor Healing Ointment",
    imageUrl: "https://images.openbeautyfacts.org/images/products/400/580/015/8650/front_en.3.400.jpg",
    ingredients: "Petrolatum, Mineral Oil, Ceresin, Lanolin Alcohol, Panthenol, Glycerin, Bisabolol",
  },
  {
    name: "Nuxe Rêve de Miel Gel Lavant",
    imageUrl: "https://images.openbeautyfacts.org/images/products/326/468/002/5891/front_fr.4.400.jpg",
    ingredients: "Aqua/Water, Glycerin, Sodium Cocoamphoacetate, Sodium Lauroyl Sarcosinate, Lauryl Glucoside, Parfum/Fragrance, Mel/Honey, Sunflower Seed Oil PEG-8 Esters, Sodium Cocoyl Glutamate, Sodium Lauryl Glucose Carboxylate, Acrylates/C10-30 Alkyl Acrylate Crosspolymer, Phenoxyethanol, Gluconolactone, Sodium Hydroxide, Glyceryl Oleate, Citric Acid, Allantoin, Sodium Benzoate, Tetrasodium Glutamate Diacetate, 1,2-Hexanediol, Caprylyl Glycol, Calcium Gluconate",
  },
  {
    name: "NIVEA Men Protect & Care Moisturising Cream",
    imageUrl: "https://images.openbeautyfacts.org/images/products/400/580/891/6719/front_nl.17.400.jpg",
    ingredients: "Aqua, Glycerin, Ethylhexyl Cocoate, Cetyl Alcohol, Hydrogenated Coco-Glycerides, Isopropyl Palmitate, Glyceryl Stearate Citrate, Methylpropanediol, Aluminum Starch Octenylsuccinate, Myristyl Myristate, Tocopheryl Acetate, Aloe Barbadensis Leaf Juice, Glyceryl Glucoside, 1,2-Hexanediol, Dimethicone, Sodium Carbomer, Trisodium EDTA, Phenoxyethanol, Benzyl Alcohol, Limonene, Linalool, Parfum",
  },
  {
    name: "Aveeno Eczema Therapy Daily Moisturizing Cream",
    imageUrl: "https://images.openbeautyfacts.org/images/products/038/137/115/1059/front_en.3.400.jpg",
    ingredients: "Active Ingredient: Colloidal Oatmeal 1%. Inactive Ingredients: Water, Glycerin, Distearyldimonium Chloride, Petrolatum, Isopropyl Palmitate, Cetyl Alcohol, Dimethicone, Sodium Chloride, Avena Sativa (Oat) Kernel Flour, Avena Sativa (Oat) Kernel Oil, Benzalkonium Chloride",
  },
  {
    name: "RoC Retinol Correxion Night Serum Capsules",
    imageUrl: "https://images.openbeautyfacts.org/images/products/121/000/080/0237/front_fr.3.400.jpg",
    ingredients: "Caprylic/Capric Triglyceride, Dimethicone, Cyclopentasiloxane, Squalane, Polyglyceryl-3 Diisostearate, Retinol, Tocopherol, BHT, Polysorbate 20, Phenoxyethanol",
  },
];

function ProductImageThumb({
  src,
  size,
  radius,
}: {
  src?: string;
  size: number;
  radius: number;
}) {
  const [erroredSrc, setErroredSrc] = useState<string | null>(null);
  const errored = !!src && erroredSrc === src;
  if (!src || errored) {
    return (
      <div
        className="flex items-center justify-center shrink-0"
        style={{
          width: size,
          height: size,
          borderRadius: radius,
          background: "#E8F4E8",
          border: "1px solid #C9E4C9",
        }}
      >
        <FlaskConical style={{ width: size * 0.45, height: size * 0.45, color: "#7BAF7A" }} />
      </div>
    );
  }
  return (
    <img
      src={src}
      alt=""
      loading="lazy"
      onError={() => setErroredSrc(src)}
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        objectFit: "cover",
        border: "1px solid #E0EDE0",
        flexShrink: 0,
        display: "block",
      }}
    />
  );
}

function QuickStartDropdown({
  onSelect,
  disabled,
}: {
  onSelect: (ingredients: string, productName: string, imageUrl: string) => void;
  disabled?: boolean;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<typeof QUICK_START_PRODUCTS[0] | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [open]);

  const handleSelect = (product: typeof QUICK_START_PRODUCTS[0]) => {
    setSelected(product);
    setOpen(false);
    onSelect(product.ingredients, product.name, product.imageUrl);
  };

  return (
    <div className="mb-3 relative" ref={containerRef}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        data-touch-target
        className={cn(
          "w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl border border-border/60 bg-white text-sm shadow-sm",
          "focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50",
          "transition-all duration-150 disabled:opacity-50 cursor-pointer hover:border-primary/40",
        )}
      >
        {selected ? (
          <ProductImageThumb src={selected.imageUrl} size={40} radius={50} />
        ) : (
          <div
            className="flex items-center justify-center shrink-0"
            style={{ width: 40, height: 40, borderRadius: 50, background: "#F3F8F3", border: "1px solid #E0EDE0" }}
          >
            <Search style={{ width: 16, height: 16, color: "#9BA9A0" }} />
          </div>
        )}
        <span className={cn("flex-1 text-left truncate", selected ? "text-foreground font-medium" : "text-muted-foreground")}>
          {selected ? selected.name : t("scanner.selectProduct")}
        </span>
        {open ? <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" /> : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />}
      </button>

      {open && (
        <div
          className="absolute z-50 left-0 right-0 mt-1 bg-white rounded-2xl border border-border/60 shadow-lg overflow-hidden"
          style={{ maxHeight: 320, overflowY: "auto" }}
        >
          {QUICK_START_PRODUCTS.map((p) => (
            <button
              key={p.name}
              type="button"
              onClick={() => handleSelect(p)}
              data-touch-target
              className="w-full flex items-center gap-3 px-3 py-3 hover:bg-[#F3F8F3] transition-colors text-left"
            >
              <ProductImageThumb src={p.imageUrl} size={40} radius={50} />
              <span className="text-sm text-foreground leading-snug truncate">{p.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function IngredientScanner({
  ctaLabel,
  seed: externalSeed,
  onSeedConsumed,
}: {
  ctaLabel?: { single: string; compare: string };
  seed?: ScannerSeed | null;
  /** Fires once after a non-null seed has been applied to internal state, so
      the parent can clear its own seed prop and re-show lookup-home sections
      (recents / get-started) for the next interaction. */
  onSeedConsumed?: () => void;
} = {}) {
  const { t } = useTranslation();
  const [mode, setMode] = useState<"single" | "compare">("single");
  // Persist the user's last skin-type choice so returning users don't have to
  // re-pick it on every scan. Stored in localStorage; gracefully ignores any
  // legacy/invalid value.
  const [skinProfile, setSkinProfile] = useState<SkinProfile | undefined>(() => {
    if (typeof window === "undefined") return undefined;
    try {
      const stored = window.localStorage.getItem("skinscreen.skinProfile");
      if (!stored) return undefined;
      const valid = SKIN_PROFILES.some((o) => o.value === stored);
      return valid ? (stored as SkinProfile) : undefined;
    } catch {
      return undefined;
    }
  });
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      if (skinProfile) {
        window.localStorage.setItem("skinscreen.skinProfile", skinProfile);
      } else {
        window.localStorage.removeItem("skinscreen.skinProfile");
      }
    } catch {
      // ignore quota / disabled storage
    }
  }, [skinProfile]);
  const [ingredients, setIngredients] = useState("");
  const [productName, setProductName] = useState<string>("");
  const [product1, setProduct1] = useState("");
  const [product1Name, setProduct1Name] = useState<string>("");
  const [product2, setProduct2] = useState("");
  const [product2Name, setProduct2Name] = useState<string>("");
  const [productImage, setProductImage] = useState<string>("");
  const [product1Image, setProduct1Image] = useState<string>("");
  const [product2Image, setProduct2Image] = useState<string>("");
  // Barcode of the most recently scanned single product. Drives the rating
  // widget on the results header (#97); empty for paste-only flows.
  const [productBarcode, setProductBarcode] = useState<string>("");
  const [submitted, setSubmitted] = useState(false);
  const [quickStartResetKey, setQuickStartResetKey] = useState(0);
  const resultsRef = useRef<HTMLDivElement>(null);

  // Ingredient detail drawer (#99): tap any chip in the results to see what it
  // does, regulatory status, and the flag explanation if any.
  const [chipDetail, setChipDetail] = useState<{
    ingredient: string;
    flag: IngredientDetailFlag | null;
  } | null>(null);

  // Holds the product name(s) for an in-flight seeded auto-run. React state
  // updates inside applySeed are not yet flushed when analyze*.mutate() is
  // called in the same tick, so onSuccess can read stale state. The ref lets
  // onSuccess pull the deterministic name set by applySeed and is then cleared.
  const pendingScanNameRef = useRef<string | null>(null);

  const emitScanCompleted = (
    kind: "single" | "compare",
    extra?: { productName?: string; verdict?: "safe" | "warning" | "high" },
  ) => {
    if (typeof window === "undefined") return;
    trackEvent("scan_complete", {
      scan_mode: kind,
      product_name: extra?.productName,
      verdict: extra?.verdict,
    });
    if (extra?.verdict) {
      fetch("/api/scan-events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          productName: extra.productName,
          verdict: extra.verdict,
          scanMode: kind,
        }),
      }).catch(() => {});
    }
    window.dispatchEvent(
      new CustomEvent("skinscreen:scan-completed", {
        detail: { kind, ...extra },
      }),
    );
  };
  const analyzeSingle = useAnalyzeSingle({
    mutation: {
      onSuccess: (data) => {
        const flagsArr = (data as { flags?: Array<{ severity?: string }> }).flags ?? [];
        const overallSafe = (data as { overallSafe?: boolean }).overallSafe ?? false;
        const hasHigh = flagsArr.some((f) => f?.severity === "HIGH_RISK");
        const verdict: "safe" | "warning" | "high" = overallSafe
          ? "safe"
          : hasHigh
            ? "high"
            : "warning";
        const pendingName = pendingScanNameRef.current;
        pendingScanNameRef.current = null;
        emitScanCompleted("single", {
          productName: pendingName ?? productName ?? undefined,
          verdict,
        });
      },
    },
  });
  const analyzeCompare = useAnalyzeIngredients({
    mutation: {
      onSuccess: (data) => {
        const conflicts = (data as { conflicts?: Array<{ severity?: string }> }).conflicts ?? [];
        const overallSafe = (data as { overallSafe?: boolean }).overallSafe ?? false;
        const hasHigh = conflicts.some((c) => c?.severity === "HIGH_RISK");
        const verdict: "safe" | "warning" | "high" =
          overallSafe && conflicts.length === 0
            ? "safe"
            : hasHigh
              ? "high"
              : "warning";
        const compareName = [product1Name, product2Name].filter(Boolean).join(" + ");
        const pendingName = pendingScanNameRef.current;
        pendingScanNameRef.current = null;
        emitScanCompleted("compare", {
          productName: pendingName || compareName || undefined,
          verdict,
        });
      },
    },
  });

  const flagOutdated = async (hash: string | undefined) => {
    if (!hash) return;
    try {
      const res = await fetch("/api/analysis-cache/flag", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ hash }),
      });
      if (res.ok) {
        toast.success(t("scanner.flagThanks"));
      } else {
        toast.error(t("scanner.flagFailed"));
      }
    } catch {
      toast.error(t("scanner.flagFailed"));
    }
  };

  const resetResults = () => setSubmitted(false);

  const applySeed = useCallback((s: ScannerSeed) => {
    setMode(s.mode);
    setSubmitted(false);
    analyzeSingle.reset();
    analyzeCompare.reset();
    if (s.mode === "compare") {
      setProduct1(s.product1 ?? "");
      setProduct1Name(s.product1Name ?? "");
      setProduct2(s.product2 ?? "");
      setProduct2Name(s.product2Name ?? "");
      setIngredients("");
      setProductName("");
      if (s.autoRun && s.product1 && s.product2) {
        // Seed the deterministic name for the in-flight auto-run so
        // onSuccess doesn't depend on un-flushed React state.
        const compareName = [s.product1Name, s.product2Name]
          .filter(Boolean)
          .join(" + ");
        pendingScanNameRef.current = compareName || null;
        setSubmitted(true);
        analyzeCompare.mutate({ data: { product1: s.product1, product2: s.product2 } });
      }
    } else {
      setIngredients(s.ingredients ?? "");
      setProductName(s.productName ?? "");
      setProduct1("");
      setProduct1Name("");
      setProduct2("");
      setProduct2Name("");
      if (s.autoRun && s.ingredients) {
        pendingScanNameRef.current = s.productName ?? null;
        setSubmitted(true);
        analyzeSingle.mutate({ data: { ingredients: s.ingredients } });
      }
    }
  }, [analyzeSingle, analyzeCompare]);

  const lastAppliedSeedRef = useRef<ScannerSeed | null>(null);
  useEffect(() => {
    if (externalSeed && lastAppliedSeedRef.current !== externalSeed) {
      lastAppliedSeedRef.current = externalSeed;
      applySeed(externalSeed);
      // Notify parent so it can clear its seed prop without re-applying.
      onSeedConsumed?.();
    }
  }, [externalSeed, applySeed, onSeedConsumed]);

  const singleResult = submitted && analyzeSingle.isSuccess && analyzeSingle.data ? analyzeSingle.data : null;
  const compareResult = submitted && analyzeCompare.isSuccess && analyzeCompare.data ? analyzeCompare.data : null;

  useEffect(() => {
    if ((singleResult || compareResult) && resultsRef.current) {
      resultsRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [singleResult, compareResult]);

  const handleScan = () => {
    setSubmitted(true);
    if (mode === "single") {
      if (!ingredients.trim()) return;
      analyzeSingle.mutate({ data: { ingredients, skinProfile } });
    } else {
      if (!product1.trim() || !product2.trim()) return;
      analyzeCompare.mutate({ data: { product1, product2, skinProfile } });
    }
  };

  const canSubmit = mode === "single"
    ? !!ingredients.trim()
    : !!product1.trim() && !!product2.trim();

  const isPending = mode === "single" ? analyzeSingle.isPending : analyzeCompare.isPending;
  const isError = mode === "single" ? analyzeSingle.isError : analyzeCompare.isError;
  const error = mode === "single" ? analyzeSingle.error : analyzeCompare.error;

  const singleHighRisk = singleResult?.flags.filter((f) => f.severity === "HIGH_RISK") ?? [];
  const singleCaution = singleResult?.flags.filter((f) => f.severity === "CAUTION") ?? [];

  const compareConflicts = compareResult?.conflicts ?? [];
  const highRiskConflicts = compareConflicts.filter((c) => c.severity === "HIGH_RISK");
  const cautionConflicts = compareConflicts.filter((c) => c.severity === "CAUTION");
  const safeConflicts = compareConflicts.filter((c) => c.severity === "SAFE");

  const handleStartOver = () => {
    setIngredients("");
    setProductName("");
    setProductImage("");
    setProductBarcode("");
    setProduct1("");
    setProduct1Name("");
    setProduct1Image("");
    setProduct2("");
    setProduct2Name("");
    setProduct2Image("");
    setSubmitted(false);
    setSkinProfile(undefined);
    setQuickStartResetKey((k) => k + 1);
    analyzeSingle.reset();
    analyzeCompare.reset();
  };

  return (
    <div className="w-full max-w-4xl mx-auto">

      {/* ── STEP 1: Skin type ── */}
      <StepHeader
        index={1}
        title={t("scanner.selectSkinType")}
        description={t("scanner.stepSkinTypeDesc")}
      >
        <SkinProfileSelector value={skinProfile} onChange={setSkinProfile} />
      </StepHeader>

      {/* ── STEP 2: Select products ── */}
      <StepHeader
        index={2}
        title={t("scanner.selectProducts")}
        description={t("scanner.stepSelectDesc")}
      >

          {/* 1 or 2 products toggle */}
          <div className="flex gap-2 mb-6 p-1 bg-white rounded-2xl border border-border/50 shadow-sm w-fit">
            <button
              type="button"
              onClick={() => { setMode("single"); resetResults(); }}
              data-touch-target
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors duration-150",
                mode === "single"
                  ? "bg-primary text-white shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Zap className="w-3.5 h-3.5" />
              {t("scanner.oneProduct")}
            </button>
            <button
              type="button"
              onClick={() => { setMode("compare"); resetResults(); }}
              data-touch-target
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors duration-150",
                mode === "compare"
                  ? "bg-primary text-white shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <ArrowLeftRight className="w-3.5 h-3.5" />
              {t("scanner.twoProducts")}
            </button>
          </div>

          {/* Sub-options A / B — two parallel ways to pick ingredients.
              Letter badges + "OR" rail (no rail under the last option). */}
          <div className="space-y-5">

            {/* A — Popular product (was B) */}
            <div className="flex gap-3">
              <div className="flex flex-col items-center shrink-0 mt-0.5 gap-1.5">
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold bg-indigo-100 text-indigo-700 border border-indigo-300">
                  A
                </div>
                <span className="text-[9px] font-bold uppercase tracking-[0.14em] text-muted-foreground/70">
                  {t("scanner.or")}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-[14px] text-foreground mb-0.5">{t("scanner.choosePopular")}</h4>
                <p className="text-xs text-muted-foreground mb-3">{t("scanner.choosePopularHint")}</p>
                {mode === "single" ? (
                  <QuickStartDropdown
                    key={quickStartResetKey}
                    onSelect={(ings, name, img) => { setIngredients(ings); setProductName(name); setProductImage(img); setProductBarcode(""); resetResults(); }}
                    disabled={isPending}
                  />
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider mb-1.5 text-primary">{t("scanner.product1")}</p>
                      <QuickStartDropdown
                        key={`p1-${quickStartResetKey}`}
                        onSelect={(ings, name, img) => { setProduct1(ings); setProduct1Name(name); setProduct1Image(img); resetResults(); }}
                        disabled={isPending}
                      />
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider mb-1.5 text-amber-700">{t("scanner.product2")}</p>
                      <QuickStartDropdown
                        key={`p2-${quickStartResetKey}`}
                        onSelect={(ings, name, img) => { setProduct2(ings); setProduct2Name(name); setProduct2Image(img); resetResults(); }}
                        disabled={isPending}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* B — Scan your own (was C) */}
            <div className="flex gap-3">
              <div className="flex flex-col items-center shrink-0 mt-0.5 gap-1.5">
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold bg-amber-100 text-amber-700 border border-amber-300">
                  B
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-[14px] text-foreground mb-0.5">{t("scanner.scanOwn")}</h4>
                <p className="text-xs text-muted-foreground mb-3">{t("scanner.scanOwnHint")}</p>
                {mode === "single" ? (
                  <div>
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <div className="flex-1 min-w-0">
                        <ProductSearch
                          onIngredients={(ings, name) => { setIngredients(ings); setProductName(name || ""); setProductImage(""); setProductBarcode(""); resetResults(); }}
                        />
                      </div>
                      <BarcodeScanButton
                        onResult={(ings, name, code) => { setIngredients(ings); setProductName(name); setProductImage(""); setProductBarcode(code ?? ""); resetResults(); }}
                        disabled={isPending}
                      />
                    </div>
                    {productName && (
                      <div className="flex items-center gap-3 mb-3 p-3 rounded-3xl bg-primary/5 border border-primary/20 shadow-sm animate-fade-up">
                        <ProductImageThumb src={productImage || undefined} size={96} radius={16} />
                        <span className="text-[18px] font-bold leading-tight text-foreground">{productName}</span>
                      </div>
                    )}
                    <ProductTextArea
                      label={t("scanner.ingredientList")}
                      index={1}
                      value={ingredients}
                      onChange={(val) => { setIngredients(val); setProductName(""); setProductImage(""); setProductBarcode(""); resetResults(); }}
                      placeholder={PLACEHOLDER_SINGLE}
                    />
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider mb-1.5 text-primary">{t("scanner.product1")}</p>
                      <div className="flex items-center gap-2 mb-2">
                        <div className="flex-1 min-w-0">
                          <ProductSearch
                            onIngredients={(ings, name) => { setProduct1(ings); setProduct1Name(name || ""); setProduct1Image(""); resetResults(); }}
                          />
                        </div>
                        <BarcodeScanButton
                          onResult={(ings, name) => { setProduct1(ings); setProduct1Name(name); setProduct1Image(""); resetResults(); }}
                          disabled={isPending}
                        />
                      </div>
                      {product1Name && (
                        <div className="flex items-center gap-3 mb-2 p-2.5 rounded-3xl bg-primary/5 border border-primary/20 shadow-sm animate-fade-up">
                          <ProductImageThumb src={product1Image || undefined} size={64} radius={14} />
                          <span className="text-base font-bold leading-tight text-foreground">{product1Name}</span>
                        </div>
                      )}
                      <ProductTextArea
                        label={t("scanner.product1Ingredients")}
                        index={1}
                        value={product1}
                        onChange={(val) => { setProduct1(val); setProduct1Name(""); setProduct1Image(""); resetResults(); }}
                        placeholder={PLACEHOLDER_1}
                      />
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider mb-1.5 text-amber-700">{t("scanner.product2")}</p>
                      <div className="flex items-center gap-2 mb-2">
                        <div className="flex-1 min-w-0">
                          <ProductSearch
                            onIngredients={(ings, name) => { setProduct2(ings); setProduct2Name(name || ""); setProduct2Image(""); resetResults(); }}
                          />
                        </div>
                        <BarcodeScanButton
                          onResult={(ings, name) => { setProduct2(ings); setProduct2Name(name); setProduct2Image(""); resetResults(); }}
                          disabled={isPending}
                        />
                      </div>
                      {product2Name && (
                        <div className="flex items-center gap-3 mb-2 p-2.5 rounded-3xl bg-amber-50 border border-amber-200 shadow-sm animate-fade-up">
                          <ProductImageThumb src={product2Image || undefined} size={64} radius={14} />
                          <span className="text-base font-bold leading-tight text-foreground">{product2Name}</span>
                        </div>
                      )}
                      <ProductTextArea
                        label={t("scanner.product2Ingredients")}
                        index={2}
                        value={product2}
                        onChange={(val) => { setProduct2(val); setProduct2Name(""); setProduct2Image(""); resetResults(); }}
                        placeholder={PLACEHOLDER_2}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

          </div>
      </StepHeader>

      {/* ── STEP 3: Analyze ── */}
      <StepHeader
        index={3}
        title={t("scanner.analyze")}
        description={
          mode === "single"
            ? t("scanner.stepAnalyzeSingleDesc")
            : t("scanner.stepAnalyzeCompareDesc")
        }
        active={canSubmit}
        hasConnector={false}
      >
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <Button
            size="lg"
            onClick={handleScan}
            disabled={!canSubmit || isPending}
            data-touch-target
            className="w-full sm:w-auto min-w-[200px] gap-2 text-base py-3 px-8 rounded-2xl active:animate-tap-bounce"
          >
            {isPending ? (
              <><Loader2 className="w-4 h-4 animate-spin" />{t("scanner.analysing")}</>
            ) : (
              <><FlaskConical className="w-4 h-4" />{mode === "single" ? (ctaLabel?.single ?? t("scanner.ctaSingle")) : (ctaLabel?.compare ?? t("scanner.ctaCompare"))}</>
            )}
          </Button>
          <button
            type="button"
            onClick={handleStartOver}
            data-touch-target
            className="text-sm text-muted-foreground hover:text-foreground border border-border/40 hover:border-border/70 px-5 py-2.5 rounded-2xl transition-colors"
          >
            {t("scanner.startOver")}
          </button>
        </div>
      </StepHeader>

      {/* Error */}
      {isError && (
        <div className="rounded-3xl bg-destructive/5 border border-destructive/20 p-6 text-center mb-8 animate-fade-up shadow-sm">
          <p className="text-sm font-medium text-destructive">
            {(error as Error & { response?: { data?: { error?: string } } })?.response?.data?.error
              ?? t("scanner.errGeneric")}
          </p>
        </div>
      )}

      {/* Single-product results */}
      {singleResult && (
        <div ref={resultsRef} className="space-y-8 scroll-mt-24">
          {/* Results header */}
          <FadeIn>
            <div className="flex items-center gap-4">
              <ProductImageThumb src={productImage || undefined} size={96} radius={12} />
              <div className="min-w-0 flex-1 space-y-1.5">
                <h2 className="font-serif text-[22px] font-bold leading-tight text-foreground">
                  {t("scanner.resultsForFmt")}<br />{productName || t("scanner.scannedProductFallback")}
                </h2>
                {productBarcode && (
                  <ProductRating
                    barcode={productBarcode}
                    productName={productName || undefined}
                  />
                )}
              </div>
            </div>
            {productBarcode && /^\d{6,14}$/.test(productBarcode) && (
              <div className="mt-3">
                <InlineGapFill
                  barcode={productBarcode}
                  productName={productName || undefined}
                />
              </div>
            )}
          </FadeIn>

          {/* Verdict headline */}
          <VerdictCard
            tone={
              singleResult.overallSafe
                ? "safe"
                : singleHighRisk.length > 0
                  ? "high"
                  : "caution"
            }
            icon={
              singleResult.overallSafe ? (
                <ShieldCheck className="w-6 h-6 text-green-600" />
              ) : (
                <AlertTriangle
                  className={cn(
                    "w-6 h-6",
                    singleHighRisk.length > 0 ? "text-red-600" : "text-amber-600",
                  )}
                />
              )
            }
            title={
              singleResult.overallSafe
                ? "No major concerns found"
                : singleResult.verdictTitle
            }
            summary={singleResult.verdictSummary ?? undefined}
          />

          {/* Compact ingredient chip strip (Variant C styling) — every parsed
              ingredient as a small pill, with flagged ones tinted by severity.
              Sits between the verdict and the detailed flag cards so users get
              a quick visual scan of what was found. */}
          {ingredients.trim() && (
            <FadeIn>
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
                    {t("scanner.ingredientAnalysis")}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {(() => {
                      const total = ingredients
                        .split(",")
                        .map((s) => s.trim())
                        .filter(Boolean).length;
                      return total === 1
                        ? t("scanner.ingredientCountOne", { count: total })
                        : t("scanner.ingredientCountManyFmt", { count: total });
                    })()}
                  </p>
                </div>
                <div className="flex flex-wrap gap-1.5 rounded-2xl border border-border/50 bg-white p-3.5">
                  {ingredients
                    .split(",")
                    .map((s) => s.trim())
                    .filter(Boolean)
                    .map((ing, i) => {
                      const norm = ing.toLowerCase();
                      const high = singleHighRisk.find(
                        (f) => f.ingredient.toLowerCase().trim() === norm,
                      );
                      const caution = singleCaution.find(
                        (f) => f.ingredient.toLowerCase().trim() === norm,
                      );
                      const tone = high ? "high" : caution ? "caution" : "neutral";
                      const flagSource = high ?? caution ?? null;
                      return (
                        <button
                          type="button"
                          key={`${ing}-${i}`}
                          onClick={() =>
                            setChipDetail({
                              ingredient: ing,
                              flag: flagSource
                                ? {
                                    severity: flagSource.severity,
                                    explanation: flagSource.explanation,
                                    citation: flagSource.citation,
                                    citationUrl: flagSource.citationUrl,
                                    category: flagSource.category,
                                  }
                                : null,
                            })
                          }
                          aria-label={t("scanner.seeDetailsForFmt", { name: ing })}
                          className={cn(
                            "rounded-md px-2 py-0.5 text-[11px] font-medium leading-snug transition-colors cursor-pointer",
                            "hover:brightness-95 active:brightness-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
                            tone === "high" &&
                              "bg-red-50 text-red-700 ring-1 ring-red-200",
                            tone === "caution" &&
                              "bg-amber-50 text-amber-800 ring-1 ring-amber-200",
                            tone === "neutral" &&
                              "bg-slate-50 text-slate-600 ring-1 ring-slate-200/60",
                          )}
                        >
                          {ing}
                        </button>
                      );
                    })}
                </div>
              </div>
            </FadeIn>
          )}

          {singleHighRisk.length > 0 && (
            <div>
              <FadeIn>
                <h3 className="text-lg font-semibold text-destructive flex items-center gap-2 mb-4">
                  {t("scanner.highRiskIngredients")}
                  <Badge variant="destructive" className="text-[11px] font-sans">{singleHighRisk.length}</Badge>
                </h3>
              </FadeIn>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {singleHighRisk.map((f, i) => (
                  <FlagCard
                    key={f.ingredient}
                    flag={f}
                    delay={i * 0.1}
                    onOpenProfile={() =>
                      setChipDetail({
                        ingredient: f.ingredient,
                        flag: {
                          severity: f.severity,
                          explanation: f.explanation,
                          citation: f.citation,
                          citationUrl: f.citationUrl,
                          category: f.category,
                        },
                      })
                    }
                  />
                ))}
              </div>
            </div>
          )}

          {singleCaution.length > 0 && (
            <div>
              <FadeIn>
                <h3 className="text-lg font-semibold text-amber-700 flex items-center gap-2 mb-4">
                  {t("scanner.useWithCaution")}
                  <Badge variant="warning" className="text-[11px] font-sans">{singleCaution.length}</Badge>
                </h3>
              </FadeIn>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {singleCaution.map((f, i) => (
                  <FlagCard
                    key={f.ingredient}
                    flag={f}
                    delay={i * 0.1}
                    onOpenProfile={() =>
                      setChipDetail({
                        ingredient: f.ingredient,
                        flag: {
                          severity: f.severity,
                          explanation: f.explanation,
                          citation: f.citation,
                          citationUrl: f.citationUrl,
                          category: f.category,
                        },
                      })
                    }
                  />
                ))}
              </div>
            </div>
          )}

          {/* Safer alternatives — only shown when flags exist */}
          {!singleResult.overallSafe && singleResult.flags.length > 0 && (
            <AlternativesSection
              ingredients={ingredients}
              flaggedIngredients={singleResult.flags.map((f) => f.ingredient)}
            />
          )}

          {/* Post-results actions */}
          <FadeIn>
            <div className="flex flex-col gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setMode("compare");
                  setProduct1(ingredients);
                  setProduct1Name(productName || t("scanner.yourProduct"));
                  setProduct1Image(productImage);
                  setIngredients("");
                  setProductName("");
                  setProductImage("");
                  setProductBarcode("");
                  resetResults();
                  setTimeout(() => document.getElementById("scanner")?.scrollIntoView({ behavior: "smooth" }), 100);
                }}
                data-touch-target
                className="w-full h-[52px] flex items-center justify-center gap-2 text-white font-semibold text-sm rounded-xl bg-primary hover:bg-primary/90 transition-colors animate-fade-up"
              >
                {t("scanner.compareAgainst")}
              </button>

              <button
                type="button"
                onClick={() => {
                  const canvas = document.createElement("canvas");
                  const W = 1080, H = 1080;
                  canvas.width = W; canvas.height = H;
                  const ctx = canvas.getContext("2d");
                  if (!ctx) return;
                  ctx.fillStyle = "#F7FAF7"; ctx.fillRect(0, 0, W, H);
                  ctx.fillStyle = "#7BAF7A"; ctx.fillRect(0, 0, W, 10);
                  ctx.fillStyle = "#7BAF7A"; ctx.font = "600 28px Inter, sans-serif"; ctx.textAlign = "left"; ctx.fillText("Chimiq", 80, 90);
                  ctx.fillStyle = "#1A1A1A"; ctx.font = "700 52px Georgia, serif"; ctx.textAlign = "center";
                  const name = productName || t("scanner.scannedProductFallback");
                  ctx.fillText(name.length > 36 ? name.slice(0, 35) + "…" : name, W / 2, 240);
                  const topFlag = singleResult.flags[0];
                  const riskLevel = singleHighRisk.length > 0 ? t("shareCanvas.highRisk") : singleResult.flags.length > 0 ? t("shareCanvas.caution") : t("shareCanvas.safe");
                  const riskColor = singleHighRisk.length > 0 ? "#EF4444" : singleResult.flags.length > 0 ? "#F59E0B" : "#22C55E";
                  ctx.fillStyle = riskColor; ctx.beginPath(); ctx.roundRect?.(W/2 - 90, 290, 180, 50, 25); ctx.fill();
                  ctx.fillStyle = "#fff"; ctx.font = "700 22px Inter, sans-serif"; ctx.textAlign = "center"; ctx.fillText(riskLevel, W / 2, 322);
                  if (topFlag) {
                    ctx.fillStyle = "#374151"; ctx.font = "400 30px Inter, sans-serif"; ctx.textAlign = "center";
                    const words = topFlag.explanation.split(" "); let line = ""; let y = 430;
                    for (const w of words) {
                      const test = line + w + " ";
                      if (ctx.measureText(test).width > 900 && line) { ctx.fillText(line.trim(), W/2, y); line = w + " "; y += 44; } else { line = test; }
                    }
                    if (line.trim()) ctx.fillText(line.trim(), W/2, y);
                  }
                  ctx.fillStyle = "#7BAF7A"; ctx.font = "600 34px Inter, sans-serif"; ctx.textAlign = "center"; ctx.fillText("chimiq.com", W / 2, H - 80);
                  canvas.toBlob((blob) => {
                    if (!blob) return;
                    const file = new File([blob], "chimiq-result.png", { type: "image/png" });
                    if (navigator.canShare?.({ files: [file] })) {
                      navigator.share({ files: [file], title: "My Chimiq result" }).catch(() => {});
                    } else {
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement("a"); a.href = url; a.download = "chimiq-result.png"; a.click();
                      URL.revokeObjectURL(url);
                    }
                  }, "image/png");
                }}
                data-touch-target
                className="w-full h-[52px] flex items-center justify-center gap-2 text-sm font-semibold border-2 rounded-xl bg-white border-primary text-primary hover:bg-primary/5 transition-colors"
              >
                {t("scanner.shareResult")}
              </button>

              <div className="text-center">
                <a
                  href="#earn-premium"
                  onClick={(e) => { e.preventDefault(); document.getElementById("earn-premium")?.scrollIntoView({ behavior: "smooth" }); }}
                  className="text-sm font-medium text-primary hover:underline"
                >
                  {t("scanner.signInSaveRoutine")}
                </a>
              </div>

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => {
                    setIngredients(""); setProductName(""); setProductImage(""); setProductBarcode(""); resetResults(); analyzeSingle.reset();
                    setTimeout(() => document.getElementById("scanner")?.scrollIntoView({ behavior: "smooth" }), 100);
                  }}
                  data-touch-target
                  className="text-sm text-muted-foreground hover:text-foreground border border-border/50 hover:border-border transition-colors px-6 py-2.5 rounded-2xl"
                >
                  {t("scanner.newScan")}
                </button>
              </div>
            </div>
          </FadeIn>

          <FadeIn>
            <div className="text-center">
              <button
                type="button"
                onClick={() => flagOutdated((analyzeSingle.data as { cacheHash?: string })?.cacheHash)}
                className="text-[11px] text-muted-foreground hover:text-muted-foreground transition-colors"
              >
                {t("scanner.flagAsOutdated")}
              </button>
            </div>
          </FadeIn>

          <FadeIn>
            <p className="text-[11px] text-muted-foreground text-center pb-2">
              {t("scanner.footerDisclaimer")}
            </p>
          </FadeIn>
        </div>
      )}

      {/* Compare results */}
      {compareResult && (
        <div ref={mode === "compare" ? resultsRef : undefined} className="space-y-10 scroll-mt-24">
          {/* Product name labels */}
          {(product1Name || product2Name) && (
            <FadeIn>
              <div className="flex flex-col sm:flex-row gap-3">
                {product1Name && (
                  <div className="flex items-center gap-3 flex-1 p-3 rounded-3xl bg-primary/5 border border-primary/20 shadow-sm">
                    <ProductImageThumb src={product1Image || undefined} size={96} radius={12} />
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wide mb-0.5 text-primary">{t("scanner.product1")}</p>
                      <p className="text-[18px] font-extrabold leading-tight tracking-tight text-foreground">{product1Name}</p>
                    </div>
                  </div>
                )}
                {product2Name && (
                  <div className="flex items-center gap-3 flex-1 p-3 rounded-3xl bg-amber-50 border border-amber-200 shadow-sm">
                    <ProductImageThumb src={product2Image || undefined} size={96} radius={12} />
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wide mb-0.5 text-amber-700">{t("scanner.product2")}</p>
                      <p className="text-[18px] font-extrabold leading-tight tracking-tight text-foreground">{product2Name}</p>
                    </div>
                  </div>
                )}
              </div>
            </FadeIn>
          )}

          {/* Verdict headline */}
          <VerdictCard
            tone={
              compareResult.overallSafe && compareConflicts.length === 0
                ? "safe"
                : highRiskConflicts.length > 0
                  ? "high"
                  : "caution"
            }
            icon={
              compareResult.overallSafe && compareConflicts.length === 0 ? (
                <ShieldCheck className="w-6 h-6 text-green-600" />
              ) : (
                <AlertTriangle
                  className={cn(
                    "w-6 h-6",
                    highRiskConflicts.length > 0
                      ? "text-red-600"
                      : "text-amber-600",
                  )}
                />
              )
            }
            title={
              compareResult.overallSafe && compareConflicts.length === 0
                ? t("scanner.compatibleTitle")
                : highRiskConflicts.length > 0
                  ? (highRiskConflicts.length === 1
                      ? t("scanner.highRiskConflictsFoundOne", { count: highRiskConflicts.length })
                      : t("scanner.highRiskConflictsFoundManyFmt", { count: highRiskConflicts.length }))
                  : (cautionConflicts.length === 1
                      ? t("scanner.cautionConflictsFoundOne", { count: cautionConflicts.length })
                      : t("scanner.cautionConflictsFoundManyFmt", { count: cautionConflicts.length }))
            }
            summary={
              compareResult.overallSafe && compareConflicts.length === 0
                ? t("scanner.noConflictsSummary")
                : undefined
            }
          />

          {highRiskConflicts.length > 0 && (
            <div>
              <FadeIn>
                <h3 className="text-lg font-semibold text-destructive flex items-center gap-2 mb-4">
                  {t("scanner.highRiskConflicts")}
                  <Badge variant="destructive" className="text-[11px] font-sans">{highRiskConflicts.length}</Badge>
                </h3>
              </FadeIn>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {highRiskConflicts.map((c, i) => (
                  <DangerCard key={c.pair} pair={c.pair} risk={c.explanation} citation={c.citation} citationUrl={c.citationUrl} severity="HIGH RISK" delay={i * 0.1} />
                ))}
              </div>
            </div>
          )}

          {cautionConflicts.length > 0 && (
            <div>
              <FadeIn>
                <h3 className="text-lg font-semibold text-amber-700 flex items-center gap-2 mb-4">
                  {t("scanner.useWithCaution")}
                  <Badge variant="warning" className="text-[11px] font-sans">{cautionConflicts.length}</Badge>
                </h3>
              </FadeIn>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {cautionConflicts.map((c, i) => (
                  <DangerCard key={c.pair} pair={c.pair} risk={c.explanation} citation={c.citation} citationUrl={c.citationUrl} severity="CAUTION" delay={i * 0.1} />
                ))}
              </div>
            </div>
          )}

          {safeConflicts.length > 0 && (
            <div>
              <FadeIn>
                <h3 className="text-lg font-semibold text-green-700 flex items-center gap-2 mb-4">
                  {t("scanner.commonlySafe")}
                  <Badge className="text-[11px] font-sans bg-green-100 text-green-700 border-green-200 hover:bg-green-100">{safeConflicts.length}</Badge>
                </h3>
              </FadeIn>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {safeConflicts.map((c, i) => <SafeCard key={c.pair} result={c} delay={i * 0.1} />)}
              </div>
            </div>
          )}

          {/* Post-results actions — compare */}
          <FadeIn>
            <div className="flex flex-col gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setMode("single");
                  setProduct1(""); setProduct1Name("");
                  setProduct2(""); setProduct2Name("");
                  resetResults(); analyzeCompare.reset();
                  setTimeout(() => document.getElementById("scanner")?.scrollIntoView({ behavior: "smooth" }), 100);
                }}
                data-touch-target
                className="w-full h-[52px] flex items-center justify-center gap-2 text-white font-semibold text-sm rounded-xl bg-primary hover:bg-primary/90 transition-colors animate-fade-up"
              >
                {t("scanner.scanSinglePrompt")}
              </button>

              <div className="text-center">
                <a
                  href="#earn-premium"
                  onClick={(e) => { e.preventDefault(); document.getElementById("earn-premium")?.scrollIntoView({ behavior: "smooth" }); }}
                  className="text-sm font-medium text-primary hover:underline"
                >
                  {t("scanner.signInScanRoutine")}
                </a>
              </div>

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => {
                    setProduct1(""); setProduct1Name(""); setProduct1Image("");
                    setProduct2(""); setProduct2Name(""); setProduct2Image("");
                    resetResults(); analyzeCompare.reset();
                    setTimeout(() => document.getElementById("scanner")?.scrollIntoView({ behavior: "smooth" }), 100);
                  }}
                  data-touch-target
                  className="text-sm text-muted-foreground hover:text-foreground border border-border/50 hover:border-border transition-colors px-6 py-2.5 rounded-2xl"
                >
                  {t("scanner.newComparison")}
                </button>
              </div>
            </div>
          </FadeIn>

          <FadeIn>
            <div className="text-center">
              <button
                type="button"
                onClick={() => flagOutdated((analyzeCompare.data as { cacheHash?: string })?.cacheHash)}
                className="text-[11px] text-muted-foreground hover:text-muted-foreground transition-colors"
              >
                {t("scanner.flagAsOutdated")}
              </button>
            </div>
          </FadeIn>

          <FadeIn>
            <p className="text-[11px] text-muted-foreground text-center pb-2">
              {t("scanner.footerDisclaimer")}
            </p>
          </FadeIn>
        </div>
      )}

      <IngredientDetailSheet
        open={chipDetail !== null}
        onOpenChange={(next) => {
          if (!next) setChipDetail(null);
        }}
        ingredient={chipDetail?.ingredient ?? null}
        flag={chipDetail?.flag ?? null}
      />
    </div>
  );
}
