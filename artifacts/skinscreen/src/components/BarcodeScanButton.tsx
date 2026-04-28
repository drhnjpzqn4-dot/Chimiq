import { useState, useRef, useEffect, useCallback } from "react";
import { Barcode, X, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { ContributeModal } from "@/components/ContributeModal";
import { isNative } from "@/lib/native";

interface BarcodeScanButtonProps {
  onResult: (ingredients: string, productName: string) => void;
  disabled?: boolean;
  /**
   * Optional override for the trigger element. When provided, renders a button
   * that wraps the supplied content with the supplied classes instead of the
   * default compact "Scan barcode" pill. Used by the Variant A lookup home to
   * show the large camera viewfinder card while reusing all underlying scan
   * logic.
   */
  triggerClassName?: string;
  triggerContent?: React.ReactNode;
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

export function BarcodeScanButton({
  onResult,
  disabled,
  triggerClassName,
  triggerContent,
}: BarcodeScanButtonProps) {
  const [state, setState] = useState<ScanState>(
    typeof window !== "undefined" && (isNative() || "BarcodeDetector" in window)
      ? "idle"
      : "unsupported",
  );
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [scannedProduct, setScannedProduct] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [showContribute, setShowContribute] = useState(false);
  const [scannedBarcode, setScannedBarcode] = useState<string | null>(null);
  const [prefillName, setPrefillName] = useState("");
  const [prefillBrand, setPrefillBrand] = useState("");

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const detectorRef = useRef<InstanceType<typeof BarcodeDetector> | null>(null);
  const scannedRef = useRef(false);

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
    setShowContribute(false);
    setScannedBarcode(null);
    setPrefillName("");
    setPrefillBrand("");
  }, [stopCamera]);

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
        } else {
          setScannedBarcode(code);
          setPrefillName(data.productName ?? "");
          setPrefillBrand(data.brand ?? "");
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
    setErrorMsg(null);
    setShowContribute(false);
    scannedRef.current = false;

    // Native fast path: use Capacitor MLKit barcode scanner when running
    // inside the iOS / Android shell. Falls through to the web flow on
    // any failure (plugin missing, permission denied, etc.).
    if (isNative()) {
      setState("requesting");
      setModalOpen(true);
      try {
        const spec = "@capacitor-mlkit/barcode-scanning";
        const mod = (await import(/* @vite-ignore */ spec)) as unknown as {
          BarcodeScanner: {
            requestPermissions?: () => Promise<{ camera?: string }>;
            scan: (opts?: {
              formats?: string[];
            }) => Promise<{ barcodes?: Array<{ rawValue?: string; displayValue?: string }> }>;
          };
        };
        if (mod.BarcodeScanner.requestPermissions) {
          await mod.BarcodeScanner.requestPermissions();
        }
        const result = await mod.BarcodeScanner.scan({
          formats: ["EAN_13", "EAN_8", "UPC_A", "UPC_E", "CODE_128", "CODE_39", "QR_CODE"],
        });
        const code = result.barcodes?.[0]?.rawValue ?? result.barcodes?.[0]?.displayValue;
        if (code) {
          await handleBarcodeFound(code);
        } else {
          setState("idle");
          setModalOpen(false);
        }
        return;
      } catch (err) {
        // Fall through to the web flow if the native plugin is missing or
        // the user cancelled. Surface a useful message if nothing else works.
        if (!("BarcodeDetector" in window)) {
          setState("error");
          setErrorMsg(
            err instanceof Error
              ? err.message
              : "Native scanner unavailable. Please type the ingredients manually.",
          );
          return;
        }
        // else: drop into the web BarcodeDetector branch below.
      }
    }

    if (!("BarcodeDetector" in window)) {
      setState("unsupported");
      return;
    }

    setState("requesting");
    setModalOpen(true);

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
  }, [handleBarcodeFound]);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  if (state === "unsupported") {
    return null;
  }

  const defaultTrigger = (
    <>
      <Barcode className="w-3.5 h-3.5" />
      Scan barcode
    </>
  );

  return (
    <>
      <button
        type="button"
        onClick={startScan}
        disabled={disabled}
        data-touch-target
        className={
          triggerClassName ??
          cn(
            "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-150",
            "border border-primary/30 bg-primary/5 text-primary hover:bg-primary/10 hover:border-primary/50",
            "focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:opacity-50 disabled:cursor-not-allowed",
          )
        }
      >
        {triggerContent ?? defaultTrigger}
      </button>

      {modalOpen && !showContribute && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-sm bg-white rounded-3xl overflow-hidden shadow-2xl">
            <div className="bg-primary px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Barcode className="w-4 h-4 text-white" />
                <p className="text-white font-semibold text-sm">
                  {state === "not_found" ? "Product Not Found" : "Scan Product Barcode"}
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
                    <p className="text-sm text-muted-foreground mt-1">Ingredients loaded ✓</p>
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
                <div className="flex flex-col items-center gap-4 py-6">
                  <p className="text-sm text-center text-muted-foreground">
                    {prefillName
                      ? `"${prefillName}" is missing its ingredient list.`
                      : "This barcode isn't in our database yet."}
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowContribute(true)}
                    className="w-full py-3 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition-colors"
                  >
                    Add ingredients & earn Premium
                  </button>
                  <button
                    type="button"
                    onClick={close}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Skip — I'll paste manually
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showContribute && (
        <ContributeModal
          barcode={scannedBarcode ?? undefined}
          initialProductName={prefillName}
          initialBrand={prefillBrand}
          onSuccess={(ings, name) => {
            setShowContribute(false);
            close();
            onResult(ings, name);
          }}
          onClose={() => {
            setShowContribute(false);
            close();
          }}
        />
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
