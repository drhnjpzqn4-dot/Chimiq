import { useRef, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const spiralSteps = [
  {
    emoji: "💧",
    label: "Serum",
    step: "Step 1",
    text: "Influencer recommends a serum",
    sub: "You buy it.",
  },
  {
    emoji: "🧴",
    label: "Moisturizer",
    step: "Step 2",
    text: "Skin dries out",
    sub: "Buy a moisturizer.",
  },
  {
    emoji: "✨",
    label: "Booster",
    step: "Step 3",
    text: "Moisturizer won't penetrate",
    sub: "Buy a booster.",
  },
  {
    emoji: "🌿",
    label: "Calming Cream",
    step: "Step 4",
    text: "Booster + serum = breakout",
    sub: "Buy a calming cream.",
  },
  {
    emoji: "🫙",
    label: "More products…",
    step: "Step 5",
    text: "40 jars on the shelf.",
    sub: "Skin worse than before.",
    isFinal: true,
  },
];

function ProductJar({ emoji, label, index, visible }: { emoji: string; label: string; index: number; visible: boolean }) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key={index}
          initial={{ opacity: 0, y: -40, scale: 0.7, rotate: Math.random() * 10 - 5 }}
          animate={{ opacity: 1, y: 0, scale: 1, rotate: (index % 2 === 0 ? 1 : -1) * (index * 2) }}
          transition={{ type: "spring", stiffness: 300, damping: 22, delay: 0.1 }}
          className="flex flex-col items-center gap-1"
          style={{ zIndex: spiralSteps.length - index }}
        >
          <div className="w-12 h-14 sm:w-14 sm:h-16 rounded-2xl bg-white border border-border/60 shadow-md flex items-center justify-center text-2xl sm:text-3xl select-none">
            {emoji}
          </div>
          <span className="text-[10px] text-muted-foreground font-medium text-center leading-tight max-w-[52px]">{label}</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function SpiralSection() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeStep, setActiveStep] = useState(-1);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setActiveStep(0);
          observer.disconnect();
        }
      },
      { threshold: 0.2 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (activeStep < 0 || activeStep >= spiralSteps.length - 1) return;
    const timer = setTimeout(() => setActiveStep((s) => s + 1), 900);
    return () => clearTimeout(timer);
  }, [activeStep]);

  return (
    <div ref={containerRef} className="flex flex-col lg:flex-row gap-12 lg:gap-16 items-start">
      {/* Steps list */}
      <div className="flex-1 space-y-6">
        {spiralSteps.map((step, idx) => {
          const isVisible = activeStep >= idx;
          const isActive = activeStep === idx;
          return (
            <motion.div
              key={idx}
              initial={{ opacity: 0, x: -20 }}
              animate={isVisible ? { opacity: 1, x: 0 } : { opacity: 0, x: -20 }}
              transition={{ duration: 0.4 }}
              className={`relative pl-8 border-l-2 transition-colors duration-300 ${
                step.isFinal ? "border-destructive/40" : isActive ? "border-primary" : "border-primary/20"
              }`}
            >
              <div
                className={`absolute w-3 h-3 rounded-full -left-[7px] top-1.5 transition-colors duration-300 ${
                  step.isFinal ? "bg-destructive/60" : isVisible ? "bg-primary" : "bg-muted"
                }`}
              />
              <p className="text-xs font-medium text-primary-strong uppercase tracking-wider mb-0.5">{step.step}</p>
              <p className={`text-base sm:text-lg font-medium ${step.isFinal ? "text-destructive font-serif text-xl" : "text-foreground"}`}>
                {step.text}
              </p>
              <p className="text-sm text-muted-foreground">{step.sub}</p>
            </motion.div>
          );
        })}

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={activeStep >= spiralSteps.length - 1 ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
          transition={{ delay: 0.5, duration: 0.5 }}
          className="pt-4"
        >
          <p className="text-2xl font-serif text-primary-strong italic mb-8">Chimiq breaks the cycle.</p>

          {/* Outcome mini-cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { emoji: "🧴", title: "Fewer products", desc: "A healthy skin barrier needs 3 products, not 12." },
              { emoji: "💸", title: "Less spending", desc: "Stop buying fixes for problems your products caused." },
              { emoji: "🌿", title: "Cleaner routine", desc: "Know exactly what you're putting on your skin and why." },
            ].map((card, i) => (
              <motion.div
                key={card.title}
                initial={{ opacity: 0, y: 12 }}
                animate={activeStep >= spiralSteps.length - 1 ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 }}
                transition={{ delay: 0.8 + i * 0.15, duration: 0.4 }}
                className="flex flex-col gap-2 p-4 rounded-2xl bg-white border border-primary/15 shadow-sm"
              >
                <span className="text-2xl">{card.emoji}</span>
                <p className="text-sm font-semibold text-foreground leading-snug">{card.title}</p>
                <p className="text-xs text-muted-foreground leading-relaxed">{card.desc}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Product pile visualization */}
      <div className="flex-shrink-0 w-full lg:w-72">
        <div className="sticky top-24">
          <p className="text-xs text-muted-foreground text-center mb-4 uppercase tracking-wider font-medium">Your shelf is growing...</p>
          <div className="min-h-[200px] bg-white rounded-3xl border border-border/60 p-6 shadow-sm flex flex-wrap gap-3 items-end justify-center">
            {spiralSteps.map((step, idx) => (
              <ProductJar
                key={idx}
                emoji={step.emoji}
                label={step.label}
                index={idx}
                visible={activeStep >= idx}
              />
            ))}
            {activeStep < 0 && (
              <p className="text-muted-foreground/40 text-sm text-center w-full py-4">Products will appear here…</p>
            )}
          </div>
          {activeStep >= spiralSteps.length - 1 && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center text-xs text-destructive/70 mt-3 font-medium"
            >
              5 products. How many conflict?
            </motion.p>
          )}
        </div>
      </div>
    </div>
  );
}
