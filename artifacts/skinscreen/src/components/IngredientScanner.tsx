import { useState, useRef, useEffect, useCallback } from "react";
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
    <div className="flex flex-col gap-2">
      <p style={{ fontSize: 14, fontWeight: 600, color: "#333", marginBottom: 8 }}>Your skin type</p>
      <div className="flex flex-wrap gap-2">
        {SKIN_PROFILES.map((p) => (
          <button
            key={p.value}
            type="button"
            onClick={() => onChange(value === p.value ? undefined : p.value)}
            className={cn(
              "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-150",
              "border focus:outline-none focus:ring-2 focus:ring-primary/40",
              value === p.value
                ? "border-transparent shadow-sm"
                : "bg-white border-border/60 text-muted-foreground hover:border-primary/40 hover:text-foreground",
            )}
            style={value === p.value ? { background: "#7BAF7A", color: "#fff", borderColor: "#7BAF7A" } : {}}
          >
            <span>{p.emoji}</span>
            {p.label}
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

export interface ScannerSeed {
  mode: "single" | "compare";
  product1?: string;
  product1Name?: string;
  product2?: string;
  product2Name?: string;
  ingredients?: string;
  autoRun?: boolean;
}

const QUICK_START_PRODUCTS: { name: string; ingredients: string }[] = [
  {
    name: "CeraVe Moisturising Cream",
    ingredients: "Aqua, Glycerin, Cetearyl Alcohol, Caprylic/Capric Triglyceride, Behentrimonium Methosulfate, Ceteareth-20, Petrolatum, Panthenol, Niacinamide, Sodium Hyaluronate, Ceramide NP, Ceramide AP, Ceramide EOP, Phytosphingosine, Cholesterol, Carbomer, Dimethicone, Methylparaben, Propylparaben, Sodium Lauroyl Lactylate, Disodium EDTA, Xanthan Gum, Tocopherol",
  },
  {
    name: "The Ordinary Retinol 0.5%",
    ingredients: "Squalane, Caprylic/Capric Triglyceride, Retinol 0.5%, Solanum Lycopersicum Fruit Extract, Simmondsia Chinensis Seed Oil, BHT, Tocopherol",
  },
  {
    name: "La Roche-Posay Toleriane Double Repair",
    ingredients: "Water, Niacinamide, Glycerin, Dimethicone, Caprylic/Capric Triglyceride, Ceramide NP, Hydroxyethyl Acrylate/Sodium Acryloyldimethyl Taurate Copolymer, Butylene Glycol, Tocopherol, Carbomer, Sodium Hyaluronate, Caprylyl Glycol, Shea Butter, Xylitol, Disodium EDTA, Phenoxyethanol, Sodium Hydroxide",
  },
  {
    name: "Neutrogena Hydro Boost Water Gel",
    ingredients: "Water, Dimethicone, Glycerin, Trehalose, Sodium Hyaluronate, Phenoxyethanol, Dimethicone/Vinyl Dimethicone Crosspolymer, Carbomer, Sodium Hydroxide, Dimethyl Isosorbide, Isopropyl Isostearate, Cetearyl Olivate, Sorbitan Olivate, PEG-40 Hydrogenated Castor Oil",
  },
  {
    name: "Paula's Choice BHA 2% Exfoliant",
    ingredients: "Water, Methylpropanediol, Butylene Glycol, Salicylic Acid 2%, Camellia Oleifera Leaf Extract, Sodium Hydroxide, Tetrasodium EDTA, Methylisothiazolinone",
  },
  {
    name: "COSRX Snail Mucin 96%",
    ingredients: "Snail Secretion Filtrate 96.3%, Betaine, Glycerin, Sodium Hyaluronate, Allantoin, Panthenol, Ethyl Hexanediol, 1,2-Hexanediol, Phenoxyethanol, Carbomer, Sodium Hydroxide",
  },
  {
    name: "The Inkey List Niacinamide 10%",
    ingredients: "Aqua, Niacinamide 10%, Propanediol, Zinc PCA 1%, Allantoin, Hyaluronic Acid, Panthenol, Caprylyl Glycol, Phenoxyethanol, Sodium Hydroxide, Xanthan Gum",
  },
  {
    name: "Cetaphil Gentle Skin Cleanser",
    ingredients: "Water, Cetyl Alcohol, Propylene Glycol, Sodium Lauryl Sulfate, Stearyl Alcohol, Methylparaben, Propylparaben, Butylparaben",
  },
  {
    name: "Drunk Elephant C-Firma Serum",
    ingredients: "Propanediol, Ascorbic Acid 15%, Glycerin, Sodium Hyaluronate Crosspolymer, Panthenol, Ferulic Acid, Tocopherol, Glutathione, Lactic Acid, Citric Acid, Sodium Citrate, Phenoxyethanol, Sodium Hydroxide",
  },
  {
    name: "Eucerin Q10 Anti-Wrinkle Cream",
    ingredients: "Aqua, Glycerin, Caprylic/Capric Triglyceride, Coenzyme Q10, Urea, L-Carnitine, Panthenol, Creatine, Tocopherol, Lactic Acid, Sodium Lactate, Carbomer, Triethanolamine, Phenoxyethanol, Sodium Hydroxide",
  },
];

function QuickStartDropdown({
  onSelect,
  disabled,
}: {
  onSelect: (ingredients: string, productName: string) => void;
  disabled?: boolean;
}) {
  const [value, setValue] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const name = e.target.value;
    setValue(name);
    if (!name) return;
    const product = QUICK_START_PRODUCTS.find((p) => p.name === name);
    if (product) {
      onSelect(product.ingredients, product.name);
    }
  };

  return (
    <div className="mb-3">
      <p className="text-[14px] text-muted-foreground mb-1.5">Quick start — choose a popular product:</p>
      <select
        value={value}
        onChange={handleChange}
        disabled={disabled}
        className={cn(
          "w-full px-3 py-2 rounded-xl border border-border/60 bg-white text-sm text-foreground",
          "focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50",
          "transition-all duration-150 disabled:opacity-50 appearance-none cursor-pointer",
        )}
        style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%237BAF7A' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E\")", backgroundRepeat: "no-repeat", backgroundPosition: "right 12px center", paddingRight: 36 }}
      >
        <option value="">— Select a product —</option>
        {QUICK_START_PRODUCTS.map((p) => (
          <option key={p.name} value={p.name}>
            {p.name}
          </option>
        ))}
      </select>
    </div>
  );
}

function ScanDivider() {
  return (
    <div className="flex items-center gap-3 my-3">
      <div className="flex-1 border-t border-border/40" />
      <span className="text-[13px] text-muted-foreground/60 whitespace-nowrap shrink-0">
        — or scan your own product —
      </span>
      <div className="flex-1 border-t border-border/40" />
    </div>
  );
}

const NEUTROGENA_BP_INGREDIENTS =
  "Water, Sodium C14-16 Olefin Sulfonate, PEG-80 Sorbitan Laurate, Cocamidopropyl Betaine, Glycerin, Sodium Lauroamphoacetate, Sodium Hydroxide, Hydroxyethylcellulose, Benzoyl Peroxide 10%, Glycol Distearate, Cocamide MEA, Laureth-4, Citric Acid, Tetrasodium EDTA";

const ROC_RETINOL_INGREDIENTS =
  "Water, Dimethicone, Glycerin, Isopropyl Isostearate, Caprylic/Capric Triglyceride, PEG-100 Stearate, Propylene Glycol, Glyceryl Stearate, Cetyl Alcohol, Niacinamide, Retinol, Sodium Hyaluronate, Tocopherol, Phenoxyethanol, Ethylhexylglycerin, Disodium EDTA, Carbomer, Triethanolamine";

const PAULAS_CHOICE_AHA_INGREDIENTS =
  "Water, Glycolic Acid 8%, Butylene Glycol, Sodium Hydroxide, Phenyl Trimethicone, Aloe Barbadensis Leaf Extract, Allantoin, Chamomilla Recutita Flower Extract, Polysorbate 20, Tetrasodium EDTA, Methylparaben";

const CERAVE_SA_INGREDIENTS =
  "Water, Glycerin, Cetearyl Alcohol, Salicylic Acid 2%, Caprylic/Capric Triglyceride, Ceramide NP, Ceramide AP, Ceramide EOP, Niacinamide, Sodium Lauroyl Lactylate, Cholesterol, Phenoxyethanol, Methylparaben, Propylparaben, Ethylparaben, Carbomer, Sodium Hydroxide";

const CERAVE_MOISTURISER_INGREDIENTS =
  "Water, Glycerin, Cetearyl Alcohol, Caprylic/Capric Triglyceride, Dimethicone, Behentrimonium Methosulfate, Hyaluronic Acid, Niacinamide, Ceramide NP, Ceramide AP, Ceramide EOP, Sodium Lauroyl Lactylate, Cholesterol, Phenoxyethanol, Methylparaben, Propylparaben, Ethylparaben, Butylparaben, Carbomer, Sodium Hydroxide, Tocopheryl Acetate";

interface ScannerPreset {
  label: string;
  badge: string;
  badgeColor: "red" | "amber" | "green";
  description: string;
  seed: ScannerSeed;
}

const COMPARE_PRESETS: ScannerPreset[] = [
  {
    label: "Neutrogena BP Wash + RoC Retinol",
    badge: "HIGH RISK",
    badgeColor: "red",
    description: "Benzoyl peroxide destroys retinol on contact",
    seed: {
      mode: "compare",
      product1: NEUTROGENA_BP_INGREDIENTS,
      product1Name: "Neutrogena Rapid Clear BP Wash",
      product2: ROC_RETINOL_INGREDIENTS,
      product2Name: "RoC Retinol Correxion Serum",
      autoRun: true,
    },
  },
  {
    label: "CeraVe SA Cleanser + Paula's Choice AHA",
    badge: "CAUTION",
    badgeColor: "amber",
    description: "Layering Salicylic Acid + Glycolic Acid",
    seed: {
      mode: "compare",
      product1: CERAVE_SA_INGREDIENTS,
      product1Name: "CeraVe SA Smoothing Cleanser",
      product2: PAULAS_CHOICE_AHA_INGREDIENTS,
      product2Name: "Paula's Choice 8% AHA Gel",
      autoRun: true,
    },
  },
];

const SINGLE_PRESET: ScannerPreset = {
  label: "CeraVe Moisturising Cream",
  badge: "Scan ingredients",
  badgeColor: "green",
  description: "Popular moisturiser — what's really in it?",
  seed: {
    mode: "single",
    ingredients: CERAVE_MOISTURISER_INGREDIENTS,
    autoRun: true,
  },
};

export function IngredientScanner({
  ctaLabel,
  seed: externalSeed,
}: {
  ctaLabel?: { single: string; compare: string };
  seed?: ScannerSeed | null;
} = {}) {
  const [mode, setMode] = useState<"single" | "compare">("single");
  const [skinProfile, setSkinProfile] = useState<SkinProfile | undefined>(undefined);
  const [ingredients, setIngredients] = useState("");
  const [productName, setProductName] = useState<string>("");
  const [product1, setProduct1] = useState("");
  const [product1Name, setProduct1Name] = useState<string>("");
  const [product2, setProduct2] = useState("");
  const [product2Name, setProduct2Name] = useState<string>("");
  const [submitted, setSubmitted] = useState(false);
  const resultsRef = useRef<HTMLDivElement>(null);

  const analyzeSingle = useAnalyzeSingle({ mutation: {} });
  const analyzeCompare = useAnalyzeIngredients({ mutation: {} });

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
        setSubmitted(true);
        analyzeCompare.mutate({ data: { product1: s.product1, product2: s.product2 } });
      }
    } else {
      setIngredients(s.ingredients ?? "");
      setProductName("");
      setProduct1("");
      setProduct1Name("");
      setProduct2("");
      setProduct2Name("");
      if (s.autoRun && s.ingredients) {
        setSubmitted(true);
        analyzeSingle.mutate({ data: { ingredients: s.ingredients } });
      }
    }
  }, [analyzeSingle, analyzeCompare]);

  useEffect(() => {
    if (externalSeed) {
      applySeed(externalSeed);
    }
  }, [externalSeed, applySeed]);

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

  const isEmpty = mode === "single"
    ? !ingredients.trim() && !submitted
    : !product1.trim() && !product2.trim() && !submitted;

  const presets = mode === "compare" ? COMPARE_PRESETS : [SINGLE_PRESET];

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

      {/* Example presets — shown when scanner is empty */}
      {isEmpty && (
        <div className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/60 mb-3">
            Try an example
          </p>
          <div className={cn(
            "grid gap-3",
            presets.length > 1 ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1 max-w-sm",
          )}>
            {presets.map((preset) => (
              <button
                key={preset.label}
                type="button"
                onClick={() => applySeed(preset.seed)}
                className="flex flex-col items-start gap-2 p-4 rounded-2xl bg-white border border-border/50 hover:border-primary/40 hover:shadow-sm transition-all duration-150 text-left group"
              >
                <div className="flex items-center justify-between w-full gap-2">
                  <span className="text-sm font-medium text-foreground leading-snug">{preset.label}</span>
                  <span className={cn(
                    "shrink-0 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full",
                    preset.badgeColor === "red" && "bg-red-100 text-red-600",
                    preset.badgeColor === "amber" && "bg-amber-100 text-amber-700",
                    preset.badgeColor === "green" && "bg-primary/10 text-primary",
                  )}>
                    {preset.badge}
                  </span>
                </div>
                <span className="text-xs text-muted-foreground">{preset.description}</span>
                <span className="text-xs font-medium text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                  Load example →
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input area */}
      {mode === "single" ? (
        <div className="mb-6">
          <QuickStartDropdown
            onSelect={(ings, name) => { setIngredients(ings); setProductName(name); resetResults(); }}
            disabled={isPending}
          />
          <ScanDivider />
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <div className="flex-1 min-w-0">
              <ProductSearch
                onIngredients={(ings, name) => { setIngredients(ings); setProductName(name || ""); resetResults(); }}
              />
            </div>
            <BarcodeScanButton
              onResult={(ings, name) => { setIngredients(ings); setProductName(name); resetResults(); }}
              disabled={isPending}
            />
          </div>
          {productName && (
            <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: "#7BAF7A" }}>
              Product: {productName}
            </p>
          )}
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
            <QuickStartDropdown
              onSelect={(ings, name) => { setProduct1(ings); setProduct1Name(name); resetResults(); }}
              disabled={isPending}
            />
            <ScanDivider />
            <ProductSearch
              onIngredients={(ings, name) => { setProduct1(ings); setProduct1Name(name || ""); resetResults(); }}
            />
            {product1Name && (
              <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: "#7BAF7A" }}>
                Product: {product1Name}
              </p>
            )}
            <ProductTextArea
              label="Product 1 Ingredients"
              index={1}
              value={product1}
              onChange={(val) => { setProduct1(val); setProduct1Name(""); resetResults(); }}
              placeholder={PLACEHOLDER_1}
            />
          </div>
          <div>
            <QuickStartDropdown
              onSelect={(ings, name) => { setProduct2(ings); setProduct2Name(name); resetResults(); }}
              disabled={isPending}
            />
            <ScanDivider />
            <ProductSearch
              onIngredients={(ings, name) => { setProduct2(ings); setProduct2Name(name || ""); resetResults(); }}
            />
            {product2Name && (
              <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: "#7BAF7A" }}>
                Product: {product2Name}
              </p>
            )}
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
        <div ref={resultsRef} className="space-y-8 scroll-mt-24">
          {/* Results header */}
          <FadeIn>
            <h2
              style={{
                fontFamily: "'Playfair Display', Georgia, serif",
                fontSize: 22,
                fontWeight: 700,
                color: "#1A1A1A",
              }}
            >
              Results for: {productName || "Your product"}
            </h2>
          </FadeIn>

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

          {/* Post-results actions */}
          <FadeIn>
            <div className="flex flex-col gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setMode("compare");
                  setProduct1(ingredients);
                  setProduct1Name(productName || "Your product");
                  setIngredients("");
                  setProductName("");
                  resetResults();
                  setTimeout(() => document.getElementById("scanner")?.scrollIntoView({ behavior: "smooth" }), 100);
                }}
                className="w-full flex items-center justify-center gap-2 text-white font-semibold text-sm transition-colors"
                style={{ background: "#7BAF7A", borderRadius: 12, height: 52 }}
                onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.background = "#6a9e69")}
                onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.background = "#7BAF7A")}
              >
                Compare against another product →
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
                  ctx.fillStyle = "#7BAF7A"; ctx.font = "600 28px Inter, sans-serif"; ctx.textAlign = "left"; ctx.fillText("ChimIQ · SkinScreen", 80, 90);
                  ctx.fillStyle = "#1A1A1A"; ctx.font = "700 52px Georgia, serif"; ctx.textAlign = "center";
                  const name = productName || "Your product";
                  ctx.fillText(name.length > 36 ? name.slice(0, 35) + "…" : name, W / 2, 240);
                  const topFlag = singleResult.flags[0];
                  const riskLevel = singleHighRisk.length > 0 ? "HIGH RISK" : singleResult.flags.length > 0 ? "CAUTION" : "SAFE";
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
                    const file = new File([blob], "skinscreen-result.png", { type: "image/png" });
                    if (navigator.canShare?.({ files: [file] })) {
                      navigator.share({ files: [file], title: "My SkinScreen result" }).catch(() => {});
                    } else {
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement("a"); a.href = url; a.download = "skinscreen-result.png"; a.click();
                      URL.revokeObjectURL(url);
                    }
                  }, "image/png");
                }}
                className="w-full flex items-center justify-center gap-2 text-sm font-semibold border transition-colors"
                style={{ background: "#fff", borderColor: "#7BAF7A", color: "#7BAF7A", borderRadius: 12, height: 52 }}
              >
                Share your result
              </button>

              <div className="text-center">
                <a
                  href="#waitlist"
                  onClick={(e) => { e.preventDefault(); document.getElementById("waitlist")?.scrollIntoView({ behavior: "smooth" }); }}
                  className="text-sm hover:underline"
                  style={{ color: "#7BAF7A" }}
                >
                  Join the waitlist — check your full routine
                </a>
              </div>

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => {
                    setIngredients(""); setProductName(""); resetResults(); analyzeSingle.reset();
                    setTimeout(() => document.getElementById("scanner")?.scrollIntoView({ behavior: "smooth" }), 100);
                  }}
                  className="text-sm text-muted-foreground hover:text-foreground border border-border/50 hover:border-border transition-colors px-6 py-2 rounded-xl"
                >
                  New scan
                </button>
              </div>
            </div>
          </FadeIn>

          <FadeIn>
            <p className="text-[11px] text-muted-foreground/50 text-center pb-2">
              Powered by dermatology research · Results are for informational purposes only · Always consult a board-certified dermatologist for personal advice
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
                className="w-full flex items-center justify-center gap-2 text-white font-semibold text-sm transition-colors"
                style={{ background: "#7BAF7A", borderRadius: 12, height: 52 }}
                onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.background = "#6a9e69")}
                onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.background = "#7BAF7A")}
              >
                Scan a single product →
              </button>

              <div className="text-center">
                <a
                  href="#waitlist"
                  onClick={(e) => { e.preventDefault(); document.getElementById("waitlist")?.scrollIntoView({ behavior: "smooth" }); }}
                  className="text-sm hover:underline"
                  style={{ color: "#7BAF7A" }}
                >
                  Join the waitlist — scan your full routine
                </a>
              </div>

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => {
                    setProduct1(""); setProduct1Name("");
                    setProduct2(""); setProduct2Name("");
                    resetResults(); analyzeCompare.reset();
                    setTimeout(() => document.getElementById("scanner")?.scrollIntoView({ behavior: "smooth" }), 100);
                  }}
                  className="text-sm text-muted-foreground hover:text-foreground border border-border/50 hover:border-border transition-colors px-6 py-2 rounded-xl"
                >
                  New comparison
                </button>
              </div>
            </div>
          </FadeIn>

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
