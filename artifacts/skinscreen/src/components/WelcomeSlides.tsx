import { useCallback, useRef, useState } from "react";

const WELCOME_SEEN_KEY = "chimiq.welcome_seen";
const SWIPE_THRESHOLD_PX = 50;

const baseUrl = import.meta.env.BASE_URL ?? "/";
const BG_WHITE = `${baseUrl}images/welcome-bg-white.jpg`;
const BG_MARBLE = `${baseUrl}images/welcome-bg-marble.jpg`;

const SLIDES = [
  {
    title: "Vet du vad som finns i dina hudvårdsprodukter?",
    subtitle:
      "Chimiq hjälper dig förstå varje ingrediens — innan du använder dem.",
  },
  {
    title: "Scanna. Analysera. Förstå.",
    subtitle:
      "Rikta kameran mot streckkoden — AI:n analyserar ingredienserna direkt och visar vad som är säkert eller bör undvikas.",
  },
  {
    title: "Gratis att börja",
    subtitle:
      "Upp till 12 skanningar per dag utan kostnad. Spara produkter, bygg din rutin och uppgradera när du är redo.",
    isLast: true,
  },
] as const;

export interface WelcomeSlidesProps {
  onDone: () => void;
}

function markWelcomeSeen(): void {
  try {
    localStorage.setItem(WELCOME_SEEN_KEY, "true");
  } catch {
    /* private mode / quota */
  }
}

function hasWelcomeBeenSeen(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(WELCOME_SEEN_KEY) === "true";
  } catch {
    return false;
  }
}

export default function WelcomeSlides({ onDone }: WelcomeSlidesProps) {
  const [alreadySeen] = useState(() => hasWelcomeBeenSeen());
  const [slideIndex, setSlideIndex] = useState(0);
  const [bgSrc, setBgSrc] = useState(BG_WHITE);
  const dragStartX = useRef<number | null>(null);
  const isDragging = useRef(false);

  const finish = useCallback(() => {
    markWelcomeSeen();
    onDone();
  }, [onDone]);

  const goToSlide = useCallback((index: number) => {
    setSlideIndex((prev) => {
      const next = Math.max(0, Math.min(SLIDES.length - 1, index));
      return next === prev ? prev : next;
    });
  }, []);

  const handleSwipeEnd = useCallback(
    (clientX: number) => {
      if (dragStartX.current === null) return;
      const delta = clientX - dragStartX.current;
      dragStartX.current = null;
      isDragging.current = false;
      if (delta < -SWIPE_THRESHOLD_PX) goToSlide(slideIndex + 1);
      else if (delta > SWIPE_THRESHOLD_PX) goToSlide(slideIndex - 1);
    },
    [goToSlide, slideIndex],
  );

  const onPointerDown = (clientX: number) => {
    dragStartX.current = clientX;
    isDragging.current = true;
  };

  const onBgError = () => {
    setBgSrc((prev) => (prev === BG_MARBLE ? prev : BG_MARBLE));
  };

  if (alreadySeen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col overflow-hidden"
      style={{
        paddingTop: "env(safe-area-inset-top, 0px)",
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
      }}
      aria-modal
      role="dialog"
      aria-label="Välkommen till Chimiq"
    >
      <img
        src={bgSrc}
        alt=""
        aria-hidden
        className="pointer-events-none absolute inset-0 h-full w-full object-cover"
        onError={onBgError}
      />
      <div
        className="pointer-events-none absolute inset-0 bg-black/[0.06]"
        aria-hidden
      />

      <button
        type="button"
        onClick={finish}
        className="absolute right-4 top-4 z-10 text-sm font-medium text-[var(--sage-deep)]/80 hover:text-[var(--sage-deep)]"
        style={{ top: "max(1rem, env(safe-area-inset-top, 0px))" }}
      >
        Hoppa över
      </button>

      <div
        className="relative flex min-h-0 flex-1 flex-col touch-pan-y"
        onTouchStart={(e) => onPointerDown(e.touches[0].clientX)}
        onTouchEnd={(e) => handleSwipeEnd(e.changedTouches[0].clientX)}
        onMouseDown={(e) => {
          if (e.button !== 0) return;
          onPointerDown(e.clientX);
        }}
        onMouseUp={(e) => {
          if (!isDragging.current) return;
          handleSwipeEnd(e.clientX);
        }}
        onMouseLeave={(e) => {
          if (!isDragging.current || dragStartX.current === null) return;
          handleSwipeEnd(e.clientX);
        }}
      >
        <div className="flex min-h-0 flex-1 overflow-hidden">
          <div
            className="flex h-full w-full transition-transform duration-300 ease-out"
            style={{ transform: `translateX(-${slideIndex * 100}%)` }}
          >
            {SLIDES.map((slide, i) => (
              <section
                key={slide.title}
                className="flex h-full w-full shrink-0 flex-col justify-end px-6 pb-4"
              >
                <div className="mx-auto w-full max-w-md pb-6 pt-16 text-center">
                  <h2 className="font-serif text-2xl font-medium leading-snug text-[var(--sage-deep)] sm:text-3xl">
                    {slide.title}
                  </h2>
                  <p className="mt-4 text-base leading-relaxed text-foreground/80">
                    {slide.subtitle}
                  </p>

                  {"isLast" in slide && slide.isLast && (
                    <div className="mt-8 space-y-4">
                      <button
                        type="button"
                        onClick={finish}
                        className="w-full rounded-2xl bg-white px-4 py-3.5 text-base font-semibold text-[var(--sage-deep)] shadow-md transition-transform active:scale-[0.98]"
                      >
                        Skapa konto gratis
                      </button>
                      <button
                        type="button"
                        onClick={finish}
                        className="text-sm text-[var(--sage-deep)]/90 underline-offset-2 hover:underline"
                      >
                        Har du redan ett konto? Logga in
                      </button>
                    </div>
                  )}
                </div>
              </section>
            ))}
          </div>
        </div>
      </div>

      <div
        className="flex shrink-0 justify-center gap-2 pb-8"
        style={{ paddingBottom: "max(2rem, env(safe-area-inset-bottom, 0px))" }}
        role="tablist"
        aria-label="Välkomststeg"
      >
        {SLIDES.map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => goToSlide(i)}
            className="h-2 w-2 rounded-full transition-colors"
            style={{
              backgroundColor:
                i === slideIndex ? "var(--sage)" : "color-mix(in srgb, var(--sage) 25%, transparent)",
            }}
            aria-label={`Steg ${i + 1}`}
            aria-current={i === slideIndex ? "step" : undefined}
          />
        ))}
      </div>
    </div>
  );
}
