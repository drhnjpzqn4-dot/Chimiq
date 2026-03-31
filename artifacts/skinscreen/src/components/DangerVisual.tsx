import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import { FadeIn } from "@/components/FadeIn";

const PRODUCT_A = {
  name: "The Ordinary AHA 30% + BHA 2%",
  imageUrl: `${import.meta.env.BASE_URL}images/products/ordinary-aha-bha.png`,
  alt: "The Ordinary AHA 30% + BHA 2% Peeling Solution",
};

const PRODUCT_B = {
  name: "The Ordinary Retinol 0.5%",
  imageUrl: `${import.meta.env.BASE_URL}images/products/ordinary-retinol.png`,
  alt: "The Ordinary Retinol 0.5% in Squalane",
};

function ProductBottle({ name, imageUrl, alt }: { name: string; imageUrl: string; alt: string }) {
  const [imgError, setImgError] = useState(false);

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="w-28 h-40 sm:w-32 sm:h-44 md:w-36 md:h-52 relative overflow-hidden rounded-2xl bg-[#F5F3EF] border border-border/40 shadow-sm flex items-center justify-center">
        {imgError ? (
          <p className="w-full h-full flex items-center justify-center text-muted-foreground/40 text-xs text-center px-3">
            {name}
          </p>
        ) : (
          <img
            src={imageUrl}
            alt={alt}
            className="object-contain w-full h-full p-3"
            loading="lazy"
            onError={() => setImgError(true)}
          />
        )}
      </div>
      <p className="text-xs text-center text-muted-foreground/80 max-w-[120px] leading-snug font-medium">
        {name}
      </p>
    </div>
  );
}

export function DangerVisual() {
  return (
    <FadeIn>
      <div className="mb-12 mx-auto max-w-2xl">
        <div className="rounded-3xl border border-border/60 bg-white shadow-sm overflow-hidden">
          <div className="flex items-center justify-center gap-3 py-2.5 px-4 bg-red-600 text-white">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span className="font-semibold text-sm uppercase tracking-widest">
              Do Not Use Together
            </span>
            <AlertTriangle className="w-4 h-4 shrink-0" />
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-6 sm:gap-10 px-8 py-8">
            <ProductBottle {...PRODUCT_A} />

            <div className="flex flex-col items-center gap-1">
              <span className="text-2xl font-serif text-red-500 font-bold leading-none">+</span>
              <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground/50">vs</span>
            </div>

            <ProductBottle {...PRODUCT_B} />
          </div>

          <div className="border-t border-border/50 px-8 py-5 bg-[#FAFAF8]">
            <p className="text-sm text-center text-muted-foreground leading-relaxed">
              <span className="font-semibold text-foreground">AHA/BHA + Retinol</span> — both are exfoliants. Used together they over-strip the skin barrier, causing redness, peeling, and long-term sensitivity. Use on alternate nights.
            </p>
          </div>
        </div>
      </div>
    </FadeIn>
  );
}
