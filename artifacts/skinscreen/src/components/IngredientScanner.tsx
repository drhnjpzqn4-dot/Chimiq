import { useState, useRef } from "react";
import { useAnalyzeIngredients, useScanLabel } from "@workspace/api-client-react";
import { DangerCard } from "@/components/DangerCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FadeIn } from "@/components/FadeIn";
import { Loader2, FlaskConical, ShieldCheck, Info, ExternalLink, Camera } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ConflictResult } from "@workspace/api-client-react";

const PLACEHOLDER_1 = `Aqua, Glycerin, Niacinamide, Retinol, Dimethicone, Cetearyl Alcohol, Phenoxyethanol, Sodium Hyaluronate, Butylene Glycol, Carbomer`;

const PLACEHOLDER_2 = `Aqua, Ascorbic Acid (Vitamin C 20%), Glycolic Acid, Propylene Glycol, Tocopherol, Ferulic Acid, Sodium Hydroxide, Panthenol`;

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
            <ExternalLink className="w-3 h-3 mt-0.5 shrink-0 group-hover:text-primary transition-colors" />
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
    reader.onerror = () => {
      setScanError("Couldn't read the image file. Please try a different photo.");
    };
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const img = new Image();
      img.onerror = () => {
        setScanError("Couldn't decode the image. Please try a clearer photo or a different format.");
      };
      img.onload = () => {
        const MAX_EDGE = 1500;
        let { width, height } = img;
        if (width > MAX_EDGE || height > MAX_EDGE) {
          if (width >= height) {
            height = Math.round((height * MAX_EDGE) / width);
            width = MAX_EDGE;
          } else {
            width = Math.round((width * MAX_EDGE) / height);
            height = MAX_EDGE;
          }
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          setScanError("Image processing failed. Please try again or enter ingredients manually.");
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        const compressedDataUrl = canvas.toDataURL("image/jpeg", 0.85);
        const base64 = compressedDataUrl.split(",")[1];
        scanLabel.mutate({ data: { imageBase64: base64, mimeType: "image/jpeg" } });
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);

    e.target.value = "";
  };

  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-semibold text-foreground tracking-wide uppercase flex items-center gap-2">
        <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center font-bold">
          {index}
        </span>
        {label}
      </label>
      <div className="relative">
        <textarea
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
          }}
          placeholder={placeholder}
          rows={7}
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
          {scanLabel.isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Camera className="w-4 h-4" />
          )}
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
        {scanError ? (
          <p className="text-[11px] text-destructive leading-snug flex-1">{scanError}</p>
        ) : (
          <span />
        )}
        <p className="text-[11px] text-muted-foreground/60 shrink-0">{value.length}/3000</p>
      </div>
    </div>
  );
}

export function IngredientScanner() {
  const [product1, setProduct1] = useState("");
  const [product2, setProduct2] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const analyze = useAnalyzeIngredients({
    mutation: {},
  });

  const handleScan = () => {
    if (!product1.trim() || !product2.trim()) return;
    setSubmitted(true);
    analyze.mutate({ data: { product1, product2 } });
  };

  const hasResult = submitted && analyze.isSuccess && analyze.data;
  const conflicts = hasResult ? analyze.data.conflicts : [];
  const highRiskConflicts = conflicts.filter((c) => c.severity === "HIGH_RISK");
  const cautionConflicts = conflicts.filter((c) => c.severity === "CAUTION");
  const safeConflicts = conflicts.filter((c) => c.severity === "SAFE");
  const overallSafe = hasResult && analyze.data.overallSafe;

  return (
    <div className="w-full max-w-4xl mx-auto">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <ProductTextArea
          label="Product 1 Ingredients"
          index={1}
          value={product1}
          onChange={(val) => {
            setProduct1(val);
            setSubmitted(false);
          }}
          placeholder={PLACEHOLDER_1}
        />
        <ProductTextArea
          label="Product 2 Ingredients"
          index={2}
          value={product2}
          onChange={(val) => {
            setProduct2(val);
            setSubmitted(false);
          }}
          placeholder={PLACEHOLDER_2}
        />
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-10">
        <p className="text-xs text-muted-foreground/60 flex items-center gap-1.5">
          <Info className="w-3.5 h-3.5 shrink-0" />
          Paste or scan the ingredient list from the product label.
        </p>
        <Button
          size="lg"
          onClick={handleScan}
          disabled={!product1.trim() || !product2.trim() || analyze.isPending}
          className="w-full sm:w-auto min-w-[200px] gap-2"
        >
          {analyze.isPending ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Checking…
            </>
          ) : (
            <>
              <FlaskConical className="w-4 h-4" />
              Check Compatibility
            </>
          )}
        </Button>
      </div>

      {analyze.isError && (
        <FadeIn>
          <div className="rounded-2xl bg-destructive/5 border border-destructive/20 p-6 text-center mb-8">
            <p className="text-sm font-medium text-destructive">
              {(analyze.error as Error & { response?: { data?: { error?: string } } })?.response
                ?.data?.error ?? "Something went wrong. Please try again."}
            </p>
          </div>
        </FadeIn>
      )}

      {hasResult && (
        <div className="space-y-10">
          {overallSafe && conflicts.length === 0 && (
            <FadeIn>
              <div className="rounded-3xl bg-green-50 border border-green-200 p-8 text-center">
                <ShieldCheck className="w-12 h-12 text-green-500 mx-auto mb-4" />
                <h3 className="text-2xl font-serif font-semibold text-green-800 mb-2">All Clear</h3>
                <p className="text-green-700 text-sm max-w-md mx-auto">
                  No clinically-documented conflicts were found between these two products. They
                  appear safe to use together.
                </p>
              </div>
            </FadeIn>
          )}

          {highRiskConflicts.length > 0 && (
            <div>
              <FadeIn>
                <h3 className="text-lg font-semibold text-destructive flex items-center gap-2 mb-4">
                  High-Risk Conflicts
                  <Badge variant="destructive" className="text-[11px] font-sans">
                    {highRiskConflicts.length}
                  </Badge>
                </h3>
              </FadeIn>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {highRiskConflicts.map((c, i) => (
                  <DangerCard
                    key={c.pair}
                    pair={c.pair}
                    risk={c.explanation}
                    citation={c.citation}
                    citationUrl={c.citationUrl}
                    severity="HIGH RISK"
                    delay={i * 0.1}
                  />
                ))}
              </div>
            </div>
          )}

          {cautionConflicts.length > 0 && (
            <div>
              <FadeIn>
                <h3 className="text-lg font-semibold text-amber-700 flex items-center gap-2 mb-4">
                  Use With Caution
                  <Badge variant="warning" className="text-[11px] font-sans">
                    {cautionConflicts.length}
                  </Badge>
                </h3>
              </FadeIn>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {cautionConflicts.map((c, i) => (
                  <DangerCard
                    key={c.pair}
                    pair={c.pair}
                    risk={c.explanation}
                    citation={c.citation}
                    citationUrl={c.citationUrl}
                    severity="CAUTION"
                    delay={i * 0.1}
                  />
                ))}
              </div>
            </div>
          )}

          {safeConflicts.length > 0 && (
            <div>
              <FadeIn>
                <h3 className="text-lg font-semibold text-green-700 flex items-center gap-2 mb-4">
                  Commonly Questioned — Safe Together
                  <Badge className="text-[11px] font-sans bg-green-100 text-green-700 border-green-200 hover:bg-green-100">
                    {safeConflicts.length}
                  </Badge>
                </h3>
              </FadeIn>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {safeConflicts.map((c, i) => (
                  <SafeCard key={c.pair} result={c} delay={i * 0.1} />
                ))}
              </div>
            </div>
          )}

          <FadeIn>
            <p className="text-[11px] text-muted-foreground/50 text-center pb-2">
              Powered by dermatology research · Results are for informational purposes only · Always
              consult a board-certified dermatologist for personal advice
            </p>
          </FadeIn>
        </div>
      )}
    </div>
  );
}
