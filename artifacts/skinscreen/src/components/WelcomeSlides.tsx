import { useCallback, useRef, useState } from "react";

const WELCOME_SEEN_KEY = "chimiq.welcome_seen";
const SWIPE_THRESHOLD_PX = 50;

const baseUrl = import.meta.env.BASE_URL ?? "/";
export const WELCOME_BG_WHITE = `${baseUrl}images/welcome-bg-white.jpg`;
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
  const [bgSrc, setBgSrc] = useState(WELCOME_BG_WHITE);
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

  const isLastSlide = slideIndex === SLIDES.length - 1;

  if (alreadySeen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col overflow-hidden"
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

      <button
        type="button"
        onClick={finish}
        className="absolute right-4 z-20 text-sm font-medium text-white/90 hover:text-white"
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
            {SLIDES.map((slide) => (
              <section key={slide.title} className="relative flex h-full w-full shrink-0 flex-col">
                <div
                  className="pointer-events-none absolute inset-x-0 top-0 z-[1]"
                  style={{
                    height: "40%",
                    background:
                      "linear-gradient(to bottom, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.2) 55%, transparent 100%)",
                  }}
                  aria-hidden
                />
                <div
                  className="relative z-[2] px-6 text-left"
                  style={{
                    paddingTop: "max(60px, calc(env(safe-area-inset-top, 0px) + 48px))",
                  }}
                >
                  <h2 className="font-serif text-[28px] font-medium leading-snug text-white">
                    {slide.title}
                  </h2>
                  <p className="mt-3 text-[15px] leading-relaxed text-white/80">{slide.subtitle}</p>
                </div>
              </section>
            ))}
          </div>
        </div>
      </div>

      <div
        className="relative z-10 shrink-0 px-6"
        style={{
          paddingBottom: "max(48px, env(safe-area-inset-bottom, 0px))",
        }}
      >
        {isLastSlide && (
          <div className="mx-auto mb-6 w-full max-w-md space-y-4">
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
              className="block w-full text-center text-[13px] text-white/70 underline-offset-2 hover:underline"
            >
              Har du redan ett konto? Logga in
            </button>
          </div>
        )}

        <p
          className="mb-2 text-center text-xs text-white/60"
          style={{ textShadow: "0 1px 3px rgba(0,0,0,0.35)" }}
          aria-live="polite"
        >
          {slideIndex + 1} / {SLIDES.length}
        </p>
        <div
          className="flex justify-center gap-2.5"
          role="tablist"
          aria-label="Välkomststeg"
        >
          {SLIDES.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => goToSlide(i)}
              className="h-3 w-3 rounded-full transition-colors"
              style={{
                backgroundColor:
                  i === slideIndex
                    ? "var(--sage)"
                    : "rgba(255,255,255,0.45)",
                boxShadow: "0 1px 4px rgba(0,0,0,0.35)",
              }}
              aria-label={`Steg ${i + 1}`}
              aria-current={i === slideIndex ? "step" : undefined}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
