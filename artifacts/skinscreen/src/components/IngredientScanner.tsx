import { useState, useRef, useEffect } from "react";
import {
  useAnalyzeIngredients,
  useAnalyzeSingle,
  useScanLabel,
  useProductLookup,
  useSuggestAlternatives,
} from "@workspace/api-client-react";
import type { IngredientFlag, SkinProfile, AlternativeSuggestion } from "@workspace/api-client-react";
import { DangerCard } from "@/components/DangerCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FadeIn } from "@/components/FadeIn";
import {
  Loader2,
  FlaskConical,
  ShieldCheck,
  AlertTriangle,
  Info,
  ExternalLink,
  Camera,
  Search,
  ArrowLeftRight,
  Zap,
  X,
  ChevronDown,
  ChevronUp,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ConflictResult } from "@workspace/api-client-react";

const PLACEHOLDER_SINGLE = `Aqua, Glycerin, Niacinamide, Retinol, Dimethicone, Cetearyl Alcohol, DMDM Hydantoin, Sodium Hyaluronate, Butylene Glycol, Fragrance, Carbomer`;
const PLACEHOLDER_1 = `Aqua, Glycerin, Niacinamide, Retinol, Dimethicone, Cetearyl Alcohol, Phenoxyethanol, Sodium Hyaluronate, Butylene Glycol, Carbomer`;
const PLACEHOLDER_2 = `Aqua, Ascorbic Acid (Vitamin C 20%), Glycolic Acid, Propylene Glycol, Tocopherol, Ferulic Acid, Sodium Hydroxide, Panthenol`;

const SKIN_PROFILES: { value: SkinProfile; label: string; emoji: string }[] = [
  { value: "sensitive", label: "Sensitive", emoji: "🌸" },
  { value: "young", label: "Young skin", emoji: "✨" },
  { value: "mature", label: "Mature skin", emoji: "🍃" },
  { value: "pregnant", label: "Pregnant", emoji: "🤱" },
];

const FLAG_CATEGORY_LABELS: Record<string, string> = {
  ENDOCRINE_DISRUPTOR: "Endocrine disruptor",
  FORMALDEHYDE_RELEASER: "Formaldehyde releaser",
  FRAGRANCE: "Fragrance",
  HARSH_PRESERVATIVE: "Harsh preservative",
  PHOTOSENSITISER: "Photosensitiser",
  KNOWN_ALLERGEN: "Known allergen",
  NANOPARTICLE: "Nanoparticle",
  CAUTION: "Caution",
};

function SkinProfileSelector({
  value,
  onChange,
}: {
  value: SkinProfile | undefined;
  onChange: (v: SkinProfile | undefined) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <span className="text-xs text-muted-foreground self-center mr-1">Skin profile:</span>
      {SKIN_PROFILES.map((p) => (
        <button
          key={p.value}
          type="button"
          onClick={() => onChange(value === p.value ? undefined : p.value)}
          className={cn(
            "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-150",
            "border focus:outline-none focus:ring-2 focus:ring-primary/40",
            value === p.value
              ? "bg-primary text-white border-primary shadow-sm"
              : "bg-white border-border/60 text-muted-foreground hover:border-primary/40 hover:text-foreground",
          )}
        >
          <span>{p.emoji}</span>
          {p.label}
        </button>
      ))}
    </div>
  );
}

interface ProductSearchProps {
  onIngredients: (ingredients: string, productName: string) => void;
  disabled?: boolean;
}

function ProductSearch({ onIngredients, disabled }: ProductSearchProps) {
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

  const { data, isFetching } = useProductLookup(debouncedQ);

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
            Auto-filled from: {autoFilled}
          </p>
          <button
            type="button"
            onClick={clear}
            className="shrink-0 text-[11px] text-muted-foreground/60 hover:text-foreground transition-colors"
          >
            Clear
          </button>
        </div>
      ) : (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/50 pointer-events-none" />
          <input
            type="text"
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            placeholder="Search product name to auto-fill ingredients..."
            disabled={disabled}
            className={cn(
              "w-full pl-8 pr-8 py-2 text-xs rounded-xl border border-border/50 bg-white/70",
              "placeholder:text-muted-foreground/40 text-foreground",
              "focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50",
              "transition-all duration-150 disabled:opacity-50",
            )}
          />
          {isFetching && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/50 animate-spin" />
          )}
          {inputVal && !isFetching && (
            <button
              type="button"
              onClick={clear}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/40 hover:text-muted-foreground transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          {!isFetching && debouncedQ.length >= 3 && data && !data.found && (
            <p className="mt-1.5 text-[10px] text-muted-foreground/50 px-1">
              Not found — paste the ingredient list manually below
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
            "Couldn't read the label. Try a clearer photo of the ingredients panel, or type manually.",
        );
      },
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setScanError(null);
    const reader = new FileReader();
    reader.onerror = () => setScanError("Couldn't read the image file. Please try a different photo.");
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const img = new Image();
      img.onerror = () => setScanError("Couldn't decode the image. Please try a clearer photo or different format.");
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
        if (!ctx) { setScanError("Image processing failed. Please enter ingredients manually."); return; }
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
            "w-full resize-none rounded-2xl border border-border/60 bg-white px-4 py-3 pr-12",
            "text-sm text-foreground placeholder:text-muted-foreground/50 leading-relaxed",
            "focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/60",
            "transition-all duration-200 shadow-sm",
          )}
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={scanLabel.isPending}
          title="Scan label photo"
          className={cn(
            "absolute top-3 right-3 w-8 h-8 flex items-center justify-center rounded-xl",
            "bg-primary/8 text-primary/70 hover:bg-primary/15 hover:text-primary",
            "transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed",
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
          className="text-[11px] text-primary/60 hover:text-primary transition-colors flex items-center gap-1 disabled:opacity-50"
        >
          <Camera className="w-3 h-3" />
          Snap a photo of the label
        </button>
        <div className="flex items-center gap-2 shrink-0">
          {scanError && <p className="text-[11px] text-destructive leading-snug">{scanError}</p>}
          <p className="text-[11px] text-muted-foreground/60">{value.length}/3000</p>
        </div>
      </div>
    </div>
  );
}

function FlagCard({ flag, delay }: { flag: IngredientFlag; delay?: number }) {
  const isHighRisk = flag.severity === "HIGH_RISK";
  return (
    <FadeIn delay={delay} fullWidth>
      <div className={cn(
        "flex flex-col justify-between h-full p-5 sm:p-6 rounded-3xl border shadow-sm",
        isHighRisk
          ? "bg-red-50/60 border-red-200"
          : "bg-amber-50/40 border-amber-200/70",
      )}>
        <div>
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="min-w-0">
              <h3 className="text-base sm:text-lg font-serif font-semibold text-foreground leading-tight">
                {flag.ingredient}
              </h3>
              <span className={cn(
                "inline-block mt-1 text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full",
                isHighRisk ? "bg-red-100 text-red-600" : "bg-amber-100 text-amber-700",
              )}>
                {FLAG_CATEGORY_LABELS[flag.category] ?? flag.category}
              </span>
            </div>
            <Badge
              variant={isHighRisk ? "destructive" : "warning"}
              className="shrink-0 text-[10px] font-sans tracking-wide uppercase"
            >
              {isHighRisk ? "HIGH RISK" : "CAUTION"}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed mb-4">{flag.explanation}</p>
        </div>
        <div className="pt-3 border-t border-border/40 mt-auto">
          <a
            href={flag.citationUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-muted-foreground/60 flex items-start gap-2 hover:text-primary transition-colors group"
          >
            <ExternalLink className="w-3 h-3 mt-0.5 shrink-0" />
            <span className="italic leading-snug">
              <span className="font-semibold not-italic text-muted-foreground/80">Source: </span>
              {flag.citation}
            </span>
          </a>
        </div>
      </div>
    </FadeIn>
  );
}

function SafeCard({ result, delay }: { result: ConflictResult; delay?: number }) {
  return (
    <FadeIn delay={delay} fullWidth>
      <div className="flex flex-col justify-between h-full p-6 sm:p-8 bg-white rounded-3xl border border-green-200 shadow-sm">
        <div>
          <div className="flex items-start justify-between gap-4 mb-4">
            <h3 className="text-xl sm:text-2xl font-serif font-semibold text-foreground leading-tight">
              {result.pair}
            </h3>
            <Badge className="shrink-0 bg-green-100 text-green-700 border-green-200 hover:bg-green-100 font-sans tracking-wide uppercase text-[10px]">
              <ShieldCheck className="w-3 h-3 mr-1" />
              SAFE
            </Badge>
          </div>
          <p className="text-muted-foreground leading-relaxed mb-6">{result.explanation}</p>
        </div>
        <div className="pt-4 border-t border-border/50 mt-auto">
          <a
            href={result.citationUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-muted-foreground/70 flex items-start gap-2 hover:text-primary transition-colors group"
          >
            <ExternalLink className="w-3 h-3 mt-0.5 shrink-0" />
            <span className="italic leading-snug">
              <span className="font-semibold not-italic text-muted-foreground/90">Source: </span>
              {result.citation}
            </span>
          </a>
        </div>
      </div>
    </FadeIn>
  );
}

function AlternativeCard({ alt, delay }: { alt: AlternativeSuggestion; delay?: number }) {
  return (
    <FadeIn delay={delay} fullWidth>
      <div className="flex flex-col h-full p-5 rounded-3xl border border-primary/20 bg-primary/[0.03] shadow-sm">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-primary/60 mb-0.5">{alt.brand}</p>
            <h4 className="text-base font-serif font-semibold text-foreground leading-tight">{alt.name}</h4>
          </div>
          <span className="shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-semibold uppercase tracking-wide whitespace-nowrap">
            <ShieldCheck className="w-3 h-3" />
            Safer pick
          </span>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed mb-3 flex-1">{alt.whySafer}</p>
        <div className="pt-2.5 border-t border-border/40">
          <p className="text-[11px] text-primary/70 font-medium">{alt.keyImprovement}</p>
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
              What to use instead
              {inferredType && <span className="font-normal text-muted-foreground ml-1">· {inferredType}</span>}
            </span>
            {isLoading && <Loader2 className="w-3.5 h-3.5 text-primary/60 animate-spin" />}
          </div>
          {open ? (
            <ChevronUp className="w-4 h-4 text-muted-foreground/60 shrink-0" />
          ) : (
            <ChevronDown className="w-4 h-4 text-muted-foreground/60 shrink-0" />
          )}
        </button>

        {open && (
          <div className="px-6 py-5">
            {isLoading && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="h-40 rounded-2xl bg-muted/40 animate-pulse"
                    style={{ animationDelay: `${i * 0.15}s` }}
                  />
                ))}
              </div>
            )}

            {isError && (
              <p className="text-sm text-muted-foreground/60 text-center py-4">
                Could not load suggestions right now.
              </p>
            )}

            {!isLoading && !isError && alternatives.length === 0 && (
              <p className="text-sm text-muted-foreground/60 text-center py-4">
                No suggestions available.
              </p>
            )}

            {!isLoading && alternatives.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {alternatives.map((alt, i) => (
                  <AlternativeCard key={`${alt.brand}-${alt.name}`} alt={alt} delay={i * 0.1} />
                ))}
              </div>
            )}

            <p className="text-[10px] text-muted-foreground/40 text-center mt-4">
              Suggestions are for informational purposes only · No affiliate links · SkinScreen has no brand partnerships
            </p>
          </div>
        )}
      </div>
    </FadeIn>
  );
}

export function IngredientScanner({ ctaLabel }: { ctaLabel?: { single: string; compare: string } } = {}) {
  const [mode, setMode] = useState<"single" | "compare">("single");
  const [skinProfile, setSkinProfile] = useState<SkinProfile | undefined>(undefined);
  const [ingredients, setIngredients] = useState("");
  const [productName, setProductName] = useState<string>("");
  const [product1, setProduct1] = useState("");
  const [product1Name, setProduct1Name] = useState<string>("");
  const [product2, setProduct2] = useState("");
  const [product2Name, setProduct2Name] = useState<string>("");
  const [submitted, setSubmitted] = useState(false);

  const analyzeSingle = useAnalyzeSingle({ mutation: {} });
  const analyzeCompare = useAnalyzeIngredients({ mutation: {} });

  const resetResults = () => setSubmitted(false);

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

  const singleResult = submitted && analyzeSingle.isSuccess && analyzeSingle.data ? analyzeSingle.data : null;
  const compareResult = submitted && analyzeCompare.isSuccess && analyzeCompare.data ? analyzeCompare.data : null;

  const singleHighRisk = singleResult?.flags.filter((f) => f.severity === "HIGH_RISK") ?? [];
  const singleCaution = singleResult?.flags.filter((f) => f.severity === "CAUTION") ?? [];

  const compareConflicts = compareResult?.conflicts ?? [];
  const highRiskConflicts = compareConflicts.filter((c) => c.severity === "HIGH_RISK");
  const cautionConflicts = compareConflicts.filter((c) => c.severity === "CAUTION");
  const safeConflicts = compareConflicts.filter((c) => c.severity === "SAFE");

  return (
    <div className="w-full max-w-4xl mx-auto">
      {/* Skin profile */}
      <div className="mb-6">
        <SkinProfileSelector value={skinProfile} onChange={setSkinProfile} />
      </div>

      {/* Mode toggle */}
      <div className="flex gap-2 mb-6 p-1 bg-white rounded-2xl border border-border/50 shadow-sm w-fit">
        <button
          type="button"
          onClick={() => { setMode("single"); resetResults(); }}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-150",
            mode === "single"
              ? "bg-primary text-white shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          <Zap className="w-3.5 h-3.5" />
          Analyze one product
        </button>
        <button
          type="button"
          onClick={() => { setMode("compare"); resetResults(); }}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-150",
            mode === "compare"
              ? "bg-primary text-white shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          <ArrowLeftRight className="w-3.5 h-3.5" />
          Compare two products
        </button>
      </div>

      {/* Input area */}
      {mode === "single" ? (
        <div className="mb-6">
          <ProductSearch
            onIngredients={(ings, name) => { setIngredients(ings); setProductName(name || ""); resetResults(); }}
          />
          <ProductTextArea
            label="Ingredient List"
            index={1}
            value={ingredients}
            onChange={(val) => { setIngredients(val); setProductName(""); resetResults(); }}
            placeholder={PLACEHOLDER_SINGLE}
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div>
            <ProductSearch
              onIngredients={(ings, name) => { setProduct1(ings); setProduct1Name(name || ""); resetResults(); }}
            />
            <ProductTextArea
              label="Product 1 Ingredients"
              index={1}
              value={product1}
              onChange={(val) => { setProduct1(val); setProduct1Name(""); resetResults(); }}
              placeholder={PLACEHOLDER_1}
            />
          </div>
          <div>
            <ProductSearch
              onIngredients={(ings, name) => { setProduct2(ings); setProduct2Name(name || ""); resetResults(); }}
            />
            <ProductTextArea
              label="Product 2 Ingredients"
              index={2}
              value={product2}
              onChange={(val) => { setProduct2(val); setProduct2Name(""); resetResults(); }}
              placeholder={PLACEHOLDER_2}
            />
          </div>
        </div>
      )}

      {/* Scan button */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-10">
        <p className="text-xs text-muted-foreground/60 flex items-center gap-1.5">
          <Info className="w-3.5 h-3.5 shrink-0" />
          {mode === "single"
            ? "Paste the full ingredient list from the product label."
            : "Paste the ingredient lists from both product labels."}
        </p>
        <Button
          size="lg"
          onClick={handleScan}
          disabled={!canSubmit || isPending}
          className="w-full sm:w-auto min-w-[200px] gap-2"
        >
          {isPending ? (
            <><Loader2 className="w-4 h-4 animate-spin" />Analysing…</>
          ) : (
            <><FlaskConical className="w-4 h-4" />{mode === "single" ? (ctaLabel?.single ?? "Scan Ingredients") : (ctaLabel?.compare ?? "Check Compatibility")}</>
          )}
        </Button>
      </div>

      {/* Error */}
      {isError && (
        <FadeIn>
          <div className="rounded-2xl bg-destructive/5 border border-destructive/20 p-6 text-center mb-8">
            <p className="text-sm font-medium text-destructive">
              {(error as Error & { response?: { data?: { error?: string } } })?.response?.data?.error
                ?? "Something went wrong. Please try again."}
            </p>
          </div>
        </FadeIn>
      )}

      {/* Single-product results */}
      {singleResult && (
        <div className="space-y-8">
          {/* Product name label */}
          {productName && (
            <FadeIn>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <ShieldCheck className="w-4 h-4 text-primary shrink-0" />
                <span>Results for: <span className="font-semibold text-foreground">{productName}</span></span>
              </div>
            </FadeIn>
          )}

          {/* Verdict headline */}
          <FadeIn>
            <div className={cn(
              "rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center gap-4",
              singleResult.overallSafe
                ? "bg-green-50 border border-green-200"
                : singleHighRisk.length > 0
                  ? "bg-red-50/60 border border-red-200"
                  : "bg-amber-50/40 border border-amber-200/70",
            )}>
              <div className={cn(
                "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0",
                singleResult.overallSafe ? "bg-green-100" : singleHighRisk.length > 0 ? "bg-red-100" : "bg-amber-100",
              )}>
                {singleResult.overallSafe
                  ? <ShieldCheck className="w-6 h-6 text-green-600" />
                  : <AlertTriangle className={cn("w-6 h-6", singleHighRisk.length > 0 ? "text-red-600" : "text-amber-600")} />
                }
              </div>
              <div>
                <h3 className={cn(
                  "text-xl sm:text-2xl font-serif font-semibold leading-tight",
                  singleResult.overallSafe ? "text-green-800" : singleHighRisk.length > 0 ? "text-red-800" : "text-amber-800",
                )}>
                  {singleResult.overallSafe ? "No major concerns found" : singleResult.verdictTitle}
                </h3>
                {singleResult.verdictSummary && (
                  <p className={cn(
                    "text-sm mt-1 leading-relaxed",
                    singleResult.overallSafe ? "text-green-700" : singleHighRisk.length > 0 ? "text-red-700" : "text-amber-700",
                  )}>
                    {singleResult.verdictSummary}
                  </p>
                )}
              </div>
            </div>
          </FadeIn>

          {singleHighRisk.length > 0 && (
            <div>
              <FadeIn>
                <h3 className="text-lg font-semibold text-destructive flex items-center gap-2 mb-4">
                  High-Risk Ingredients
                  <Badge variant="destructive" className="text-[11px] font-sans">{singleHighRisk.length}</Badge>
                </h3>
              </FadeIn>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {singleHighRisk.map((f, i) => <FlagCard key={f.ingredient} flag={f} delay={i * 0.1} />)}
              </div>
            </div>
          )}

          {singleCaution.length > 0 && (
            <div>
              <FadeIn>
                <h3 className="text-lg font-semibold text-amber-700 flex items-center gap-2 mb-4">
                  Use With Caution
                  <Badge variant="warning" className="text-[11px] font-sans">{singleCaution.length}</Badge>
                </h3>
              </FadeIn>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {singleCaution.map((f, i) => <FlagCard key={f.ingredient} flag={f} delay={i * 0.1} />)}
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

          <FadeIn>
            <p className="text-[11px] text-muted-foreground/50 text-center pb-2">
              Powered by dermatology research · Results are for informational purposes only · Always consult a board-certified dermatologist for personal advice
            </p>
          </FadeIn>
        </div>
      )}

      {/* Compare results */}
      {compareResult && (
        <div className="space-y-10">
          {/* Product name labels */}
          {(product1Name || product2Name) && (
            <FadeIn>
              <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                {product1Name && (
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-primary shrink-0" />
                    <span>Product 1: <span className="font-semibold text-foreground">{product1Name}</span></span>
                  </div>
                )}
                {product2Name && (
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                    <span>Product 2: <span className="font-semibold text-foreground">{product2Name}</span></span>
                  </div>
                )}
              </div>
            </FadeIn>
          )}

          {/* Verdict headline */}
          <FadeIn>
            <div className={cn(
              "rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center gap-4",
              compareResult.overallSafe && compareConflicts.length === 0
                ? "bg-green-50 border border-green-200"
                : highRiskConflicts.length > 0
                  ? "bg-red-50/60 border border-red-200"
                  : "bg-amber-50/40 border border-amber-200/70",
            )}>
              <div className={cn(
                "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0",
                compareResult.overallSafe && compareConflicts.length === 0 ? "bg-green-100" : highRiskConflicts.length > 0 ? "bg-red-100" : "bg-amber-100",
              )}>
                {compareResult.overallSafe && compareConflicts.length === 0
                  ? <ShieldCheck className="w-6 h-6 text-green-600" />
                  : <AlertTriangle className={cn("w-6 h-6", highRiskConflicts.length > 0 ? "text-red-600" : "text-amber-600")} />
                }
              </div>
              <div>
                <h3 className={cn(
                  "text-xl sm:text-2xl font-serif font-semibold leading-tight",
                  compareResult.overallSafe && compareConflicts.length === 0 ? "text-green-800" : highRiskConflicts.length > 0 ? "text-red-800" : "text-amber-800",
                )}>
                  {compareResult.overallSafe && compareConflicts.length === 0
                    ? "These products are compatible"
                    : highRiskConflicts.length > 0
                      ? `${highRiskConflicts.length} high-risk conflict${highRiskConflicts.length > 1 ? "s" : ""} found`
                      : `${cautionConflicts.length} caution-level conflict${cautionConflicts.length > 1 ? "s" : ""} found`
                  }
                </h3>
                {compareResult.overallSafe && compareConflicts.length === 0 && (
                  <p className="text-sm text-green-700 mt-1">No clinically-documented conflicts found between these two products.</p>
                )}
              </div>
            </div>
          </FadeIn>

          {highRiskConflicts.length > 0 && (
            <div>
              <FadeIn>
                <h3 className="text-lg font-semibold text-destructive flex items-center gap-2 mb-4">
                  High-Risk Conflicts
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
                  Use With Caution
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
                  Commonly Questioned — Safe Together
                  <Badge className="text-[11px] font-sans bg-green-100 text-green-700 border-green-200 hover:bg-green-100">{safeConflicts.length}</Badge>
                </h3>
              </FadeIn>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {safeConflicts.map((c, i) => <SafeCard key={c.pair} result={c} delay={i * 0.1} />)}
              </div>
            </div>
          )}

          <FadeIn>
            <p className="text-[11px] text-muted-foreground/50 text-center pb-2">
              Powered by dermatology research · Results are for informational purposes only · Always consult a board-certified dermatologist for personal advice
            </p>
          </FadeIn>
        </div>
      )}
    </div>
  );
}
