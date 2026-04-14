import { useState, useRef, useCallback } from "react";
import { PackagePlus, Camera, Loader2, CheckCircle2, Gift, Star, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface ContributeModalProps {
  barcode?: string;
  initialProductName?: string;
  initialBrand?: string;
  onSuccess?: (ingredients: string, productName: string) => void;
  onClose: () => void;
}

type Step = "info" | "ingredients" | "submitting" | "success";

interface SubmitResult {
  extractedIngredients?: string | null;
  status?: string;
  message?: string;
  premiumUnlocked?: boolean;
  premiumUntil?: string | null;
}

function resizeImageBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        const MAX_EDGE = 1200;
        let { width, height } = img;
        if (width > MAX_EDGE || height > MAX_EDGE) {
          if (width >= height) { height = Math.round((height * MAX_EDGE) / width); width = MAX_EDGE; }
          else { width = Math.round((width * MAX_EDGE) / height); height = MAX_EDGE; }
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        canvas.getContext("2d")!.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", 0.82).split(",")[1]);
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  });
}

export function ContributeModal({
  barcode,
  initialProductName = "",
  initialBrand = "",
  onSuccess,
  onClose,
}: ContributeModalProps) {
  const [step, setStep] = useState<Step>("info");
  const [productName, setProductName] = useState(initialProductName);
  const [brand, setBrand] = useState(initialBrand);
  const [ingredientsText, setIngredientsText] = useState("");
  const [frontImageBase64, setFrontImageBase64] = useState<string | null>(null);
  const [ingredientsImageBase64, setIngredientsImageBase64] = useState<string | null>(null);
  const [processingFront, setProcessingFront] = useState(false);
  const [processingIngredients, setProcessingIngredients] = useState(false);
  const [submissionId, setSubmissionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SubmitResult | null>(null);

  const frontInputRef = useRef<HTMLInputElement>(null);
  const ingredientsInputRef = useRef<HTMLInputElement>(null);

  const handleFrontPhoto = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    setProcessingFront(true);
    try {
      setFrontImageBase64(await resizeImageBase64(file));
    } catch {
      setError("Could not read the front photo. Please try again.");
    }
    setProcessingFront(false);
  }, []);

  const handleIngredientsPhoto = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    setProcessingIngredients(true);
    try {
      setIngredientsImageBase64(await resizeImageBase64(file));
    } catch {
      setError("Could not read the ingredients photo. Please try again.");
    }
    setProcessingIngredients(false);
  }, []);

  const handleNextStep = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch("/api/contribute/start", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          barcode: barcode ?? undefined,
          productName: productName.trim() || undefined,
          brand: brand.trim() || undefined,
        }),
      });
      const data = (await res.json()) as { submissionId?: string; error?: string };
      if (!res.ok || !data.submissionId) throw new Error(data.error ?? "Failed to start submission");
      setSubmissionId(data.submissionId);
      setStep("ingredients");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error. Please try again.");
    }
  }, [barcode, productName, brand]);

  const handleSubmit = useCallback(async () => {
    if (!submissionId) return;
    const hasImages = frontImageBase64 || ingredientsImageBase64;
    const hasText = ingredientsText.trim().length > 5;
    if (!hasImages && !hasText) {
      setError("Please add at least one photo or paste the ingredient list.");
      return;
    }

    setStep("submitting");
    setError(null);

    try {
      const res = await fetch("/api/contribute/photos", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          submissionId,
          frontImageBase64: frontImageBase64 ?? undefined,
          ingredientsImageBase64: ingredientsImageBase64 ?? undefined,
          ingredientsText: ingredientsText.trim() || undefined,
        }),
      });

      const data = (await res.json()) as SubmitResult & { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Submission failed");

      setResult(data);
      setStep("success");

      if (data.extractedIngredients && onSuccess) {
        const name = [brand.trim(), productName.trim()].filter(Boolean).join(" ") || "Scanned product";
        setTimeout(() => {
          onSuccess(data.extractedIngredients!, name);
        }, 2400);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Submission failed. Please try again.");
      setStep("ingredients");
    }
  }, [submissionId, frontImageBase64, ingredientsImageBase64, ingredientsText, onSuccess, brand, productName]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
        <div className="bg-primary px-5 py-4 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-2.5">
            <PackagePlus className="w-4 h-4 text-white" />
            <p className="text-white font-semibold text-sm">
              {step === "info" && "Add Product to Database"}
              {step === "ingredients" && "Add Ingredient List"}
              {step === "submitting" && "Processing…"}
              {step === "success" && "Submitted!"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-white/70 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/10"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5">
          {(step === "info" || step === "ingredients") && (
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-amber-50 border border-amber-200 mb-5">
              <Gift className="w-4 h-4 text-amber-600 shrink-0" />
              <p className="text-xs text-amber-700 font-medium leading-snug">
                Contribute 5 products to earn 30 days of free Premium.
              </p>
            </div>
          )}

          {step === "info" && (
            <div className="space-y-4">
              <div>
                <p className="text-sm font-semibold text-foreground mb-3">
                  {initialProductName
                    ? `"${initialProductName}" needs its ingredient list.`
                    : "Help us build the product database!"}
                </p>
                <p className="text-xs text-muted-foreground mb-4">
                  {barcode
                    ? `Barcode ${barcode} is not in our database yet. Add the product details and we'll make it available for everyone.`
                    : "Share a product's details so other users can benefit from scanning it."}
                </p>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1 block">
                    Product name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Moisturising Lotion"
                    value={productName}
                    onChange={(e) => setProductName(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-border/60 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-colors"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1 block">
                    Brand
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. CeraVe"
                    value={brand}
                    onChange={(e) => setBrand(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-border/60 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-colors"
                  />
                </div>
              </div>

              {error && <p className="text-xs text-red-500 text-center">{error}</p>}

              <button
                type="button"
                onClick={handleNextStep}
                className="w-full py-3 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition-colors"
              >
                Next — add ingredient list
              </button>

              <button
                type="button"
                onClick={onClose}
                className="w-full text-sm text-muted-foreground hover:text-foreground text-center py-1 transition-colors"
              >
                Cancel
              </button>
            </div>
          )}

          {step === "ingredients" && (
            <div className="space-y-4">
              <div className="rounded-xl border border-border/60 overflow-hidden">
                <div className="px-3 py-2.5 bg-muted/30 border-b border-border/40">
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                    Ingredients photo
                  </p>
                </div>
                <div className="p-3 space-y-3">
                  <button
                    type="button"
                    onClick={() => ingredientsInputRef.current?.click()}
                    disabled={processingIngredients}
                    className={cn(
                      "w-full flex items-center gap-2.5 px-3 py-3 rounded-xl border-2 border-dashed text-sm transition-all",
                      ingredientsImageBase64
                        ? "border-primary/60 bg-primary/5 text-primary font-medium"
                        : "border-border/50 text-muted-foreground hover:border-primary/40 hover:text-primary hover:bg-primary/5",
                    )}
                  >
                    {processingIngredients ? (
                      <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                    ) : (
                      <Camera className="w-4 h-4 shrink-0" />
                    )}
                    {ingredientsImageBase64
                      ? "Ingredients photo captured — AI will extract the list"
                      : processingIngredients
                      ? "Processing photo…"
                      : "Snap a photo of the ingredient list"}
                  </button>
                  <input
                    ref={ingredientsInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={handleIngredientsPhoto}
                  />

                  <div className="flex items-center gap-2 text-muted-foreground/40 text-[11px]">
                    <div className="flex-1 h-px bg-border/50" />
                    or type manually
                    <div className="flex-1 h-px bg-border/50" />
                  </div>

                  <textarea
                    placeholder="Paste the full ingredient list from the back of the product…"
                    value={ingredientsText}
                    onChange={(e) => setIngredientsText(e.target.value)}
                    rows={4}
                    className="w-full px-3 py-2 rounded-xl border border-border/60 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-colors resize-none"
                  />
                </div>
              </div>

              <div className="rounded-xl border border-border/60 overflow-hidden">
                <div className="px-3 py-2.5 bg-muted/30 border-b border-border/40">
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                    Product front photo{" "}
                    <span className="font-normal normal-case text-muted-foreground/60">
                      (optional — helps with AI review)
                    </span>
                  </p>
                </div>
                <div className="p-3">
                  <button
                    type="button"
                    onClick={() => frontInputRef.current?.click()}
                    disabled={processingFront}
                    className={cn(
                      "w-full flex items-center gap-2.5 px-3 py-3 rounded-xl border-2 border-dashed text-sm transition-all",
                      frontImageBase64
                        ? "border-primary/60 bg-primary/5 text-primary font-medium"
                        : "border-border/50 text-muted-foreground hover:border-primary/40 hover:text-primary hover:bg-primary/5",
                    )}
                  >
                    {processingFront ? (
                      <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                    ) : (
                      <Camera className="w-4 h-4 shrink-0" />
                    )}
                    {frontImageBase64
                      ? "Front photo captured"
                      : processingFront
                      ? "Processing…"
                      : "Snap a photo of the product front"}
                  </button>
                  <input
                    ref={frontInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={handleFrontPhoto}
                  />
                </div>
              </div>

              {error && <p className="text-xs text-red-500 text-center">{error}</p>}

              <button
                type="button"
                onClick={handleSubmit}
                disabled={(!ingredientsImageBase64 && !ingredientsText.trim())}
                className="w-full py-3 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Submit contribution
              </button>

              <button
                type="button"
                onClick={onClose}
                className="w-full text-sm text-muted-foreground hover:text-foreground text-center py-1 transition-colors"
              >
                Cancel
              </button>
            </div>
          )}

          {step === "submitting" && (
            <div className="flex flex-col items-center gap-5 py-10">
              <Loader2 className="w-10 h-10 text-primary animate-spin" />
              <div className="text-center">
                <p className="font-semibold text-foreground">Processing your contribution…</p>
                <p className="text-sm text-muted-foreground mt-1">AI is reviewing the ingredient list</p>
              </div>
            </div>
          )}

          {step === "success" && result && (
            <div className="flex flex-col items-center gap-5 py-8">
              <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center">
                <CheckCircle2 className="w-9 h-9 text-green-500" />
              </div>
              <div className="text-center">
                <p className="font-semibold text-foreground text-lg">
                  {result.status === "approved" ? "Added to database!" : "Submission received!"}
                </p>
                <p className="text-sm text-muted-foreground mt-1">{result.message}</p>
              </div>

              {result.premiumUnlocked && (
                <div className="w-full px-4 py-4 rounded-xl bg-amber-50 border border-amber-200 text-center">
                  <div className="flex justify-center gap-1 mb-2">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-5 h-5 fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                  <p className="font-bold text-amber-700 text-base">Premium unlocked!</p>
                  <p className="text-xs text-amber-600 mt-1">
                    You've contributed 5 products — enjoy 30 days of free Premium.
                  </p>
                </div>
              )}

              {!result.premiumUnlocked && result.extractedIngredients && (
                <p className="text-xs text-muted-foreground text-center">
                  Ingredients loaded for scanning — closing shortly.
                </p>
              )}

              {!result.extractedIngredients && (
                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition-colors"
                >
                  Done
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
