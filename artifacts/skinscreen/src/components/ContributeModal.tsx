import { useState, useRef, useCallback } from "react";
import { PackagePlus, Camera, Loader2, CheckCircle2, Gift, Star, X, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

interface ContributeModalProps {
  barcode?: string;
  initialProductName?: string;
  initialBrand?: string;
  onSuccess?: (ingredients: string, productName: string) => void;
  onClose: () => void;
}

type Step = "front-photo" | "ingredients" | "submitting" | "success";

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
  const [step, setStep] = useState<Step>("front-photo");
  const [productName, setProductName] = useState(initialProductName);
  const [brand, setBrand] = useState(initialBrand);
  const [barcodeInput, setBarcodeInput] = useState(barcode ?? "");
  const [ingredientsText, setIngredientsText] = useState("");
  const [frontImageBase64, setFrontImageBase64] = useState<string | null>(null);
  const [frontPreviewUrl, setFrontPreviewUrl] = useState<string | null>(null);
  const [ingredientsImageBase64, setIngredientsImageBase64] = useState<string | null>(null);
  const [ingredientsPreviewUrl, setIngredientsPreviewUrl] = useState<string | null>(null);
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
    setError(null);
    try {
      const dataUrl = URL.createObjectURL(file);
      setFrontPreviewUrl(dataUrl);
      setFrontImageBase64(await resizeImageBase64(file));
    } catch {
      setError("Could not read the photo. Please try again.");
    }
    setProcessingFront(false);
  }, []);

  const handleIngredientsPhoto = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    setProcessingIngredients(true);
    setError(null);
    try {
      const dataUrl = URL.createObjectURL(file);
      setIngredientsPreviewUrl(dataUrl);
      setIngredientsImageBase64(await resizeImageBase64(file));
    } catch {
      setError("Could not read the photo. Please try again.");
    }
    setProcessingIngredients(false);
  }, []);

  const handleFrontPhotoNext = useCallback(async () => {
    setError(null);
    if (!frontImageBase64) {
      setError("Please add a clear photo of the front of the product.");
      return;
    }
    if (!productName.trim()) {
      setError("Please enter the product name.");
      return;
    }
    if (!barcodeInput.trim()) {
      setError("Please enter or scan the product barcode.");
      return;
    }
    try {
      const res = await fetch("/api/contribute/start", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          barcode: barcodeInput.trim() || undefined,
          productName: productName.trim() || undefined,
          brand: brand.trim() || undefined,
        }),
      });
      const data = (await res.json()) as {
        submissionId?: string;
        error?: string;
        alreadyInDatabase?: boolean;
      };
      if (!res.ok || !data.submissionId) throw new Error(data.error ?? "Failed to start submission");
      setSubmissionId(data.submissionId);
      setStep("ingredients");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error. Please try again.");
    }
  }, [barcodeInput, productName, brand, frontImageBase64]);

  const handleSubmit = useCallback(async () => {
    if (!submissionId) return;
    const trimmedText = ingredientsText.trim();
    const hasImages = frontImageBase64 || ingredientsImageBase64;
    const hasText = trimmedText.length > 5;
    if (!hasImages && !hasText) {
      setError("Please add at least one photo or paste the ingredient list.");
      return;
    }
    // Reject obvious non-ingredient input whenever the user has typed text — independent
    // of whether they also uploaded an ingredients photo. This catches HTML/script payloads
    // and prose pastes before they ever hit the backend.
    if (hasText) {
      const looksLikeCode = /<[a-z!\/][^>]*>|javascript:|on\w+\s*=|;\s*--|\bdrop\s+table\b|\bselect\s+.+\bfrom\b/i.test(trimmedText);
      const tooShortOrNoCommas =
        trimmedText.length < 15 || (!trimmedText.includes(",") && !trimmedText.includes("\n"));
      const tokens = trimmedText.split(/[,\n;]+/).map((t) => t.trim()).filter(Boolean);
      const tooFewTokens = tokens.length < 3;
      if (looksLikeCode || tooShortOrNoCommas || tooFewTokens) {
        setError(
          "That doesn't look like an ingredient list. Paste the comma-separated INCI list from the product label (e.g. 'Aqua, Glycerin, Niacinamide…').",
        );
        return;
      }
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

  const stepLabel: Record<Step, string> = {
    "front-photo": "Step 1 of 2 — Product photo",
    "ingredients": "Step 2 of 2 — Ingredient list",
    "submitting": "Processing…",
    "success": "Submitted!",
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
        <div className="bg-primary px-5 py-4 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-2.5">
            {step === "ingredients" && (
              <button
                onClick={() => setStep("front-photo")}
                className="text-white/80 hover:text-white transition-colors mr-1"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
            <PackagePlus className="w-4 h-4 text-white" />
            <p className="text-white font-semibold text-sm">{stepLabel[step]}</p>
          </div>
          <button
            onClick={onClose}
            className="text-white/70 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/10"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5">
          {(step === "front-photo" || step === "ingredients") && (
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-amber-50 border border-amber-200 mb-5">
              <Gift className="w-4 h-4 text-amber-600 shrink-0" />
              <p className="text-xs text-amber-700 font-medium leading-snug">
                Contribute 30 new products to earn 1 month of free Premium.
                Each must include name, barcode, front photo & ingredients.
              </p>
            </div>
          )}

          {step === "front-photo" && (
            <div className="space-y-4">
              <div>
                <p className="text-sm font-semibold text-foreground mb-1">
                  Snap the front of the product bottle
                </p>
                <p className="text-xs text-muted-foreground mb-4">
                  {barcode
                    ? `Barcode ${barcode} isn't in our database yet. A photo helps our AI identify the product automatically.`
                    : "A clear photo of the label helps our AI identify the product name and brand."}
                </p>
              </div>

              <input
                ref={frontInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={handleFrontPhoto}
              />

              {frontPreviewUrl ? (
                <div className="space-y-3">
                  <div className="relative rounded-2xl overflow-hidden border border-border/60 bg-muted/10">
                    <img
                      src={frontPreviewUrl}
                      alt="Product front"
                      className="w-full max-h-52 object-contain"
                    />
                    <button
                      onClick={() => frontInputRef.current?.click()}
                      disabled={processingFront}
                      className="absolute bottom-2 right-2 px-3 py-1.5 rounded-lg bg-white/90 text-xs font-medium text-foreground shadow hover:bg-white transition-colors border border-border/40"
                    >
                      Retake
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground text-center flex items-center justify-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                    Photo captured — AI will read the label
                  </p>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => frontInputRef.current?.click()}
                  disabled={processingFront}
                  className="w-full flex flex-col items-center gap-3 py-10 rounded-2xl border-2 border-dashed border-border/50 text-muted-foreground hover:border-primary/40 hover:text-primary hover:bg-primary/5 transition-all"
                >
                  {processingFront ? (
                    <Loader2 className="w-7 h-7 animate-spin" />
                  ) : (
                    <Camera className="w-7 h-7" />
                  )}
                  <span className="text-sm font-medium">
                    {processingFront ? "Processing…" : "Take photo"}
                  </span>
                  <span className="text-xs text-muted-foreground/60">
                    Point camera at the front of the bottle
                  </span>
                </button>
              )}

              <div className="border-t border-border/30 pt-3 space-y-3">
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                  Required details
                </p>
                <input
                  type="text"
                  placeholder="Product name *"
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-border/60 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 transition-colors"
                />
                <input
                  type="text"
                  placeholder="Brand (optional)"
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-border/60 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 transition-colors"
                />
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  placeholder="Barcode (6–14 digits) *"
                  value={barcodeInput}
                  onChange={(e) => setBarcodeInput(e.target.value.replace(/\D/g, ""))}
                  disabled={!!barcode}
                  className="w-full px-3 py-2 rounded-xl border border-border/60 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 transition-colors disabled:bg-[#F5F5F7] disabled:text-muted-foreground"
                />
              </div>

              <div className="rounded-xl bg-[#FAFAF8] border border-border/40 px-3 py-2.5 space-y-1">
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                  Required for milestone credit
                </p>
                {[
                  { label: "Front photo", ok: !!frontImageBase64 },
                  { label: "Product name", ok: !!productName.trim() },
                  { label: "Barcode", ok: !!barcodeInput.trim() },
                  { label: "Ingredient list (next step)", ok: false, neutral: true },
                ].map((item) => (
                  <div key={item.label} className="flex items-center gap-2 text-xs">
                    <CheckCircle2
                      className={cn(
                        "w-3.5 h-3.5 shrink-0",
                        item.ok
                          ? "text-green-500"
                          : item.neutral
                            ? "text-muted-foreground/30"
                            : "text-muted-foreground/40",
                      )}
                    />
                    <span className={item.ok ? "text-foreground" : "text-muted-foreground"}>
                      {item.label}
                    </span>
                  </div>
                ))}
              </div>

              {error && <p className="text-xs text-red-500 text-center">{error}</p>}

              <button
                type="button"
                onClick={handleFrontPhotoNext}
                disabled={
                  processingFront ||
                  !frontImageBase64 ||
                  !productName.trim() ||
                  !barcodeInput.trim()
                }
                className="w-full py-3 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
              <div>
                <p className="text-sm font-semibold text-foreground mb-1">
                  Now add the ingredient list
                </p>
                <p className="text-xs text-muted-foreground mb-4">
                  Take a photo of the back label, or paste the text directly. Our AI will extract the ingredients.
                </p>
              </div>

              <input
                ref={ingredientsInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={handleIngredientsPhoto}
              />

              {ingredientsPreviewUrl ? (
                <div className="space-y-2">
                  <div className="relative rounded-2xl overflow-hidden border border-border/60 bg-muted/10">
                    <img
                      src={ingredientsPreviewUrl}
                      alt="Ingredients label"
                      className="w-full max-h-40 object-contain"
                    />
                    <button
                      onClick={() => ingredientsInputRef.current?.click()}
                      disabled={processingIngredients}
                      className="absolute bottom-2 right-2 px-3 py-1.5 rounded-lg bg-white/90 text-xs font-medium text-foreground shadow hover:bg-white transition-colors border border-border/40"
                    >
                      Retake
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground text-center flex items-center justify-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                    Ingredient photo captured
                  </p>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => ingredientsInputRef.current?.click()}
                  disabled={processingIngredients}
                  className={cn(
                    "w-full flex items-center gap-2.5 px-3 py-3 rounded-xl border-2 border-dashed text-sm transition-all",
                    "border-border/50 text-muted-foreground hover:border-primary/40 hover:text-primary hover:bg-primary/5",
                  )}
                >
                  {processingIngredients ? (
                    <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                  ) : (
                    <Camera className="w-4 h-4 shrink-0" />
                  )}
                  <span>
                    {processingIngredients ? "Processing photo…" : "Snap a photo of the ingredient list"}
                  </span>
                </button>
              )}

              <div className="flex items-center gap-2 text-muted-foreground/40 text-[11px]">
                <div className="flex-1 h-px bg-border/50" />
                or type/paste manually
                <div className="flex-1 h-px bg-border/50" />
              </div>

              <textarea
                placeholder="Paste the full ingredient list from the back of the product…"
                value={ingredientsText}
                onChange={(e) => setIngredientsText(e.target.value)}
                rows={4}
                className="w-full px-3 py-2 rounded-xl border border-border/60 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-colors resize-none"
              />

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
                <p className="text-sm text-muted-foreground mt-1">AI is reviewing the photos and ingredient list</p>
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
                    You've contributed 30 new products — enjoy 1 month of free Premium.
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
