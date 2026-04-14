import { useState, useRef, useEffect, useCallback } from "react";
import { Barcode, X, Loader2, AlertCircle, CheckCircle2, PackagePlus, Camera, Gift } from "lucide-react";
import { cn } from "@/lib/utils";

interface BarcodeScanButtonProps {
  onResult: (ingredients: string, productName: string) => void;
  disabled?: boolean;
}

type ScanState =
  | "idle"
  | "requesting"
  | "scanning"
  | "loading"
  | "success"
  | "error"
  | "not_found"
  | "unsupported";

declare const BarcodeDetector: {
  new (options?: { formats?: string[] }): {
    detect(source: HTMLVideoElement): Promise<Array<{ rawValue: string }>>;
  };
  getSupportedFormats(): Promise<string[]>;
};

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
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", 0.82).split(",")[1]);
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  });
}

export function BarcodeScanButton({ onResult, disabled }: BarcodeScanButtonProps) {
  const [state, setState] = useState<ScanState>(
    typeof window !== "undefined" && "BarcodeDetector" in window ? "idle" : "unsupported",
  );
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [scannedProduct, setScannedProduct] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [contributionNote, setContributionNote] = useState<string | null>(null);

  const [scannedBarcode, setScannedBarcode] = useState<string | null>(null);
  const [submitName, setSubmitName] = useState("");
  const [submitBrand, setSubmitBrand] = useState("");
  const [submitIngredients, setSubmitIngredients] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [frontImageBase64, setFrontImageBase64] = useState<string | null>(null);
  const [ingredientsImageBase64, setIngredientsImageBase64] = useState<string | null>(null);
  const [processingFront, setProcessingFront] = useState(false);
  const [processingIngredients, setProcessingIngredients] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const detectorRef = useRef<InstanceType<typeof BarcodeDetector> | null>(null);
  const scannedRef = useRef(false);
  const frontInputRef = useRef<HTMLInputElement>(null);
  const ingredientsInputRef = useRef<HTMLInputElement>(null);

  const resetSubmitForm = useCallback(() => {
    setScannedBarcode(null);
    setSubmitName("");
    setSubmitBrand("");
    setSubmitIngredients("");
    setIsSubmitting(false);
    setSubmitError(null);
    setFrontImageBase64(null);
    setIngredientsImageBase64(null);
    setProcessingFront(false);
    setProcessingIngredients(false);
    setContributionNote(null);
  }, []);

  const stopCamera = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    scannedRef.current = false;
  }, []);

  const close = useCallback(() => {
    stopCamera();
    setModalOpen(false);
    setState("idle");
    setErrorMsg(null);
    resetSubmitForm();
  }, [stopCamera, resetSubmitForm]);

  const handleFrontPhoto = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    setProcessingFront(true);
    try {
      const b64 = await resizeImageBase64(file);
      setFrontImageBase64(b64);
    } catch {
      setSubmitError("Could not read front photo.");
    }
    setProcessingFront(false);
  }, []);

  const handleIngredientsPhoto = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    setProcessingIngredients(true);
    try {
      const b64 = await resizeImageBase64(file);
      setIngredientsImageBase64(b64);
    } catch {
      setSubmitError("Could not read ingredients photo.");
    }
    setProcessingIngredients(false);
  }, []);

  const handleSubmit = useCallback(async () => {
    const hasManual = submitIngredients.trim().length > 0;
    const hasImages = frontImageBase64 || ingredientsImageBase64;
    if (!hasManual && !hasImages) return;

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const res = await fetch("/api/contribute", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          barcode: scannedBarcode ?? undefined,
          productName: submitName.trim() || undefined,
          brand: submitBrand.trim() || undefined,
          ingredientsText: submitIngredients.trim() || undefined,
          frontImageBase64: frontImageBase64 ?? undefined,
          ingredientsImageBase64: ingredientsImageBase64 ?? undefined,
        }),
      });

      const data = (await res.json()) as {
        extractedIngredients?: string | null;
        status?: string;
        message?: string;
        error?: string;
      };

      if (!res.ok) throw new Error(data.error ?? "Submit failed");

      const extractedIngs = data.extractedIngredients;
      const name = [submitBrand.trim(), submitName.trim()].filter(Boolean).join(" ") || "Scanned product";

      setScannedProduct(name);
      setContributionNote(data.message ?? "Thank you for contributing!");
      setState("success");

      if (extractedIngs) {
        setTimeout(() => {
          onResult(extractedIngs, name);
          setModalOpen(false);
          setState("idle");
          setScannedProduct(null);
          resetSubmitForm();
        }, 2200);
      } else {
        setTimeout(() => {
          setModalOpen(false);
          setState("idle");
          setScannedProduct(null);
          resetSubmitForm();
        }, 2800);
      }
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Couldn't save right now. Please try again.");
      setIsSubmitting(false);
    }
  }, [
    scannedBarcode,
    submitName,
    submitBrand,
    submitIngredients,
    frontImageBase64,
    ingredientsImageBase64,
    onResult,
    resetSubmitForm,
  ]);

  const handleBarcodeFound = useCallback(
    async (code: string) => {
      if (scannedRef.current) return;
      scannedRef.current = true;

      stopCamera();
      setState("loading");

      try {
        const res = await fetch(`/api/barcode/${encodeURIComponent(code)}`, {
          credentials: "include",
        });
        const data = (await res.json()) as {
          found: boolean;
          productName?: string;
          brand?: string;
          ingredients?: string;
          reason?: string;
        };

        if (data.found && data.ingredients) {
          const name = [data.brand, data.productName].filter(Boolean).join(" ") || "Scanned product";
          setScannedProduct(name);
          setState("success");
          setTimeout(() => {
            onResult(data.ingredients!, name);
            setModalOpen(false);
            setState("idle");
            setScannedProduct(null);
          }, 1200);
        } else if (data.reason === "no_ingredients") {
          setScannedBarcode(code);
          setSubmitName(data.productName ?? "");
          setSubmitBrand(data.brand ?? "");
          setState("not_found");
        } else {
          setScannedBarcode(code);
          setState("not_found");
        }
      } catch {
        setErrorMsg("Lookup failed. Check your connection and try again.");
        setState("error");
      }
    },
    [stopCamera, onResult],
  );

  const startScan = useCallback(async () => {
    if (!("BarcodeDetector" in window)) {
      setState("unsupported");
      return;
    }

    setState("requesting");
    setModalOpen(true);
    setErrorMsg(null);
    resetSubmitForm();
    scannedRef.current = false;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      detectorRef.current = new BarcodeDetector({
        formats: ["ean_13", "ean_8", "upc_a", "upc_e", "code_128", "code_39", "qr_code"],
      });

      setState("scanning");

      const tick = async () => {
        if (!videoRef.current || scannedRef.current) return;
        try {
          const barcodes = await detectorRef.current!.detect(videoRef.current);
          if (barcodes.length > 0 && barcodes[0].rawValue) {
            await handleBarcodeFound(barcodes[0].rawValue);
            return;
          }
        } catch {
        }
        animFrameRef.current = requestAnimationFrame(tick);
      };

      animFrameRef.current = requestAnimationFrame(tick);
    } catch (err) {
      setState("error");
      setErrorMsg(
        err instanceof Error && err.name === "NotAllowedError"
          ? "Camera permission denied. Allow camera access and try again."
          : "Could not access camera.",
      );
    }
  }, [handleBarcodeFound, resetSubmitForm]);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  if (state === "unsupported") {
    return null;
  }

  const canSubmit = (submitIngredients.trim().length > 5 || ingredientsImageBase64 !== null) && !isSubmitting;

  return (
    <>
      <button
        type="button"
        onClick={startScan}
        disabled={disabled}
        className={cn(
          "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-150",
          "border border-primary/30 bg-primary/5 text-primary hover:bg-primary/10 hover:border-primary/50",
          "focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:opacity-50 disabled:cursor-not-allowed",
        )}
      >
        <Barcode className="w-3.5 h-3.5" />
        Scan barcode
      </button>

      {modalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-sm bg-white rounded-3xl overflow-hidden shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="bg-primary px-5 py-4 flex items-center justify-between sticky top-0 z-10">
              <div className="flex items-center gap-2.5">
                <Barcode className="w-4 h-4 text-white" />
                <p className="text-white font-semibold text-sm">
                  {state === "not_found" ? "Add Product to Database" : "Scan Product Barcode"}
                </p>
              </div>
              <button
                onClick={close}
                className="text-white/70 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/10"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5">
              {(state === "requesting" || state === "scanning") && (
                <>
                  <div className="relative rounded-2xl overflow-hidden bg-black aspect-[4/3] mb-4">
                    <video
                      ref={videoRef}
                      className="w-full h-full object-cover"
                      autoPlay
                      muted
                      playsInline
                    />
                    {state === "scanning" && (
                      <>
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                          <div className="w-48 h-32 border-2 border-primary rounded-xl" />
                        </div>
                        <div
                          className="absolute left-[calc(50%-96px)] w-48 h-0.5 bg-primary/70 animate-[scan_2s_ease-in-out_infinite]"
                          style={{ top: "calc(50% - 64px)" }}
                        />
                      </>
                    )}
                    {state === "requesting" && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                        <Loader2 className="w-8 h-8 text-white animate-spin" />
                      </div>
                    )}
                  </div>
                  <p className="text-sm text-center text-muted-foreground">
                    Point your camera at a product barcode (EAN-13, UPC-A, etc.)
                  </p>
                </>
              )}

              {state === "loading" && (
                <div className="flex flex-col items-center gap-4 py-8">
                  <Loader2 className="w-10 h-10 text-primary animate-spin" />
                  <p className="text-sm text-muted-foreground">Looking up product ingredients…</p>
                </div>
              )}

              {state === "success" && (
                <div className="flex flex-col items-center gap-4 py-8">
                  <div className="w-14 h-14 rounded-full bg-green-50 flex items-center justify-center">
                    <CheckCircle2 className="w-8 h-8 text-green-500" />
                  </div>
                  <div className="text-center">
                    <p className="font-semibold text-foreground">{scannedProduct}</p>
                    {contributionNote ? (
                      <p className="text-sm text-muted-foreground mt-1">{contributionNote}</p>
                    ) : (
                      <p className="text-sm text-muted-foreground mt-1">Ingredients loaded ✓</p>
                    )}
                  </div>
                </div>
              )}

              {state === "error" && (
                <div className="flex flex-col items-center gap-4 py-6">
                  <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center">
                    <AlertCircle className="w-8 h-8 text-red-400" />
                  </div>
                  <p className="text-sm text-center text-muted-foreground">{errorMsg}</p>
                  <button
                    onClick={close}
                    className="text-sm font-medium text-primary hover:underline"
                  >
                    Enter manually
                  </button>
                </div>
              )}

              {state === "not_found" && (
                <div className="flex flex-col gap-4">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                      <PackagePlus className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm text-foreground leading-snug">
                        {submitName ? "Ingredient list missing" : "New product — help us add it!"}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                        {submitName
                          ? `We found "${submitName}" but the ingredient list isn't recorded yet.`
                          : "This barcode isn't in our database yet. Add it to help other users."}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-amber-50 border border-amber-200">
                    <Gift className="w-4 h-4 text-amber-600 shrink-0" />
                    <p className="text-xs text-amber-700 font-medium leading-snug">
                      Earn free Premium — contribute 5 products to unlock your subscription.
                    </p>
                  </div>

                  <div className="space-y-2.5">
                    <input
                      type="text"
                      placeholder="Product name (optional)"
                      value={submitName}
                      onChange={(e) => setSubmitName(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-border/60 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-colors"
                    />
                    <input
                      type="text"
                      placeholder="Brand (optional)"
                      value={submitBrand}
                      onChange={(e) => setSubmitBrand(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-border/60 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-colors"
                    />
                  </div>

                  <div className="rounded-xl border border-border/60 overflow-hidden">
                    <div className="px-3 py-2.5 bg-muted/30 border-b border-border/40">
                      <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                        Ingredient list
                      </p>
                    </div>

                    <div className="p-3 space-y-3">
                      <button
                        type="button"
                        onClick={() => ingredientsInputRef.current?.click()}
                        disabled={processingIngredients}
                        className={cn(
                          "w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl border-2 border-dashed text-sm transition-all",
                          ingredientsImageBase64
                            ? "border-primary/60 bg-primary/5 text-primary"
                            : "border-border/50 text-muted-foreground hover:border-primary/40 hover:text-primary hover:bg-primary/5",
                        )}
                      >
                        {processingIngredients ? (
                          <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                        ) : (
                          <Camera className="w-4 h-4 shrink-0" />
                        )}
                        {ingredientsImageBase64
                          ? "Ingredients photo captured ✓"
                          : processingIngredients
                          ? "Processing photo…"
                          : "Snap photo of ingredient list"}
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
                        value={submitIngredients}
                        onChange={(e) => setSubmitIngredients(e.target.value)}
                        rows={3}
                        className="w-full px-3 py-2 rounded-xl border border-border/60 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-colors resize-none"
                      />
                    </div>
                  </div>

                  <div className="rounded-xl border border-border/60 overflow-hidden">
                    <div className="px-3 py-2.5 bg-muted/30 border-b border-border/40">
                      <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                        Product front photo <span className="font-normal normal-case text-muted-foreground/60">(optional — helps with AI review)</span>
                      </p>
                    </div>
                    <div className="p-3">
                      <button
                        type="button"
                        onClick={() => frontInputRef.current?.click()}
                        disabled={processingFront}
                        className={cn(
                          "w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl border-2 border-dashed text-sm transition-all",
                          frontImageBase64
                            ? "border-primary/60 bg-primary/5 text-primary"
                            : "border-border/50 text-muted-foreground hover:border-primary/40 hover:text-primary hover:bg-primary/5",
                        )}
                      >
                        {processingFront ? (
                          <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                        ) : (
                          <Camera className="w-4 h-4 shrink-0" />
                        )}
                        {frontImageBase64
                          ? "Front photo captured ✓"
                          : processingFront
                          ? "Processing photo…"
                          : "Snap photo of product front"}
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

                  {submitError && (
                    <p className="text-xs text-red-500 text-center">{submitError}</p>
                  )}

                  <div className="flex flex-col gap-2">
                    <button
                      type="button"
                      onClick={handleSubmit}
                      disabled={!canSubmit}
                      className="w-full py-3 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {isSubmitting ? (
                        <span className="flex items-center justify-center gap-2">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Processing & saving…
                        </span>
                      ) : (
                        "Contribute & analyse"
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={close}
                      className="text-sm text-muted-foreground hover:text-foreground text-center py-1 transition-colors"
                    >
                      Skip — I'll paste manually
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes scan {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(128px); }
        }
      `}</style>
    </>
  );
}
