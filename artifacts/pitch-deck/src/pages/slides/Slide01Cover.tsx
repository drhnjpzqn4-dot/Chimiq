const base = import.meta.env.BASE_URL;

export default function Slide01Cover() {
  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#0d1a0d]">
      <img
        src={`${base}hero.png`}
        crossOrigin="anonymous"
        className="absolute inset-0 w-full h-full object-cover scale-105"
        alt=""
      />

      {/* Match the web hero: dark top-left fading to transparent bottom-right */}
      <div className="absolute inset-0 bg-gradient-to-br from-black/85 via-black/60 to-transparent" />
      {/* Subtle green bottom vignette to echo the leaf tones */}
      <div className="absolute bottom-0 left-0 right-0 h-[28vh] bg-gradient-to-t from-[#0d200d]/55 to-transparent" />

      <div className="relative z-10 h-full flex flex-col justify-between px-[8vw] py-[7vh]">
        <div className="flex items-center justify-between">
          <p className="font-body text-[1.3vw] font-medium tracking-[0.35em] uppercase text-white/50">
            A Chimiq product by Seafari AB
          </p>
          <p className="font-body text-[1.3vw] text-white/40 tracking-wider">
            April 2026
          </p>
        </div>

        <div>
          <div className="flex items-center gap-[1.5vw] mb-[2vh]">
            <div className="h-[0.4vh] w-[4vw] bg-[#7BAF7A]" />
            <p className="font-body text-[1.3vw] font-medium tracking-[0.25em] uppercase text-[#7BAF7A]">
              Buildathon Pitch
            </p>
          </div>
          <h1 className="font-display text-[10vw] font-bold tracking-tighter text-white leading-none mb-[2.5vh]">
            SkinScreen
          </h1>
          <p className="font-body text-[2.1vw] font-light text-white/80 max-w-[55vw] leading-relaxed mb-[2vh]">
            The first AI skincare scanner that detects dangerous ingredient combinations — before they damage your skin.
          </p>
          <p className="font-body text-[1.6vw] text-white/55 max-w-[52vw] leading-relaxed border-l-[0.25vw] border-[#7BAF7A]/60 pl-[1.5vw]">
            Many common skincare ingredients are harmless alone — but when combined with other products in your routine, they can cause serious irritation, chemical burns, or long-term damage.
          </p>
        </div>

        <div className="flex items-end justify-between">
          <p className="font-body text-[1.4vw] text-white/45 tracking-wide">
            chimiq.com · chimiq.app · @chim_iq
          </p>
          <div className="text-right">
            <p className="font-body text-[1.3vw] text-white/40">MVP live · March 31, 2026</p>
          </div>
        </div>
      </div>
    </div>
  );
}
