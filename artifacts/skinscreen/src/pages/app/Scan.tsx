import { useState } from "react";
import { ScanLine, Camera, Sparkles, ChevronRight } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { IngredientScanner } from "@/components/IngredientScanner";
import { ContributeModal } from "@/components/ContributeModal";

export default function ScanScreen() {
  const [showContribute, setShowContribute] = useState(false);
  const [scanning, setScanning] = useState(false);

  return (
    <AppShell
      title="Scan a product"
      subtitle="Snap a label, paste ingredients, or compare two products."
    >
      {/* Hero scan card */}
      <section className="mb-6 animate-pop-in">
        <div className="relative overflow-hidden rounded-3xl border border-primary/15 bg-gradient-to-br from-primary/[0.07] via-white to-rose-50/40 p-5 shadow-sm">
          <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-primary/15 blur-3xl" aria-hidden />
          <div className="relative flex items-start gap-4">
            <button
              type="button"
              onClick={() => {
                setScanning(true);
                setTimeout(() => {
                  setScanning(false);
                  document
                    .getElementById("scanner-input")
                    ?.scrollIntoView({ behavior: "smooth", block: "start" });
                }, 280);
              }}
              data-touch-target
              className="group relative flex h-20 w-20 shrink-0 items-center justify-center rounded-3xl bg-primary text-white shadow-lg shadow-primary/25 transition-transform active:scale-95"
              aria-label="Start scanning"
            >
              <span className="absolute inset-0 rounded-3xl bg-primary animate-ring-pulse" aria-hidden />
              <Camera className={`relative h-8 w-8 ${scanning ? "animate-tap-bounce" : ""}`} />
            </button>
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-widest text-primary">Tap to scan</p>
              <p className="mt-0.5 font-serif text-xl font-semibold leading-tight text-foreground">
                Quick scan a label
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Get safety flags + safer alternatives in seconds.
              </p>
            </div>
          </div>

          <div className="relative mt-5 grid grid-cols-3 gap-2">
            {[
              { label: "Single product", icon: ScanLine },
              { label: "Compare 2", icon: Sparkles },
              { label: "Contribute", icon: ChevronRight, onClick: () => setShowContribute(true) },
            ].map((q) => (
              <button
                key={q.label}
                type="button"
                onClick={
                  q.onClick ??
                  (() =>
                    document
                      .getElementById("scanner-input")
                      ?.scrollIntoView({ behavior: "smooth", block: "start" }))
                }
                className="flex flex-col items-center justify-center gap-1 rounded-2xl border border-border/50 bg-white/80 px-2 py-3 text-[11px] font-medium text-foreground transition-all hover:border-primary/40 hover:bg-white"
              >
                <q.icon className="h-4 w-4 text-primary" />
                {q.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section id="scanner-input" className="rounded-3xl border border-border/40 bg-white p-4 sm:p-6 shadow-sm">
        <IngredientScanner />
      </section>

      {showContribute && (
        <ContributeModal onClose={() => setShowContribute(false)} />
      )}
    </AppShell>
  );
}
