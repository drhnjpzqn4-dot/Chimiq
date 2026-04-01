export default function Slide08Ask() {
  return (
    <div className="w-screen h-screen overflow-hidden relative bg-[#1A1A1A]">
      <div className="absolute inset-0 bg-gradient-to-tl from-[#7BAF7A]/10 via-transparent to-transparent" />

      <div className="relative z-10 h-full flex flex-col px-[8vw] py-[6vh]">
        <p className="font-body text-[1.2vw] font-semibold tracking-[0.32em] uppercase text-[#7BAF7A] mb-[1.5vh]">
          Traction &amp; Ask
        </p>
        <h2 className="font-display text-[4vw] font-bold tracking-tight text-white leading-tight mb-[3.5vh]">
          Live product. Early signal. Bigger vision.
        </h2>

        <div className="grid grid-cols-3 gap-[2vw] mb-[3vh]">
          <div className="bg-white/8 rounded-2xl px-[2.5vw] py-[3vh] border border-white/10">
            <p className="font-display text-[7.5vw] font-bold tracking-tighter text-white leading-none">
              10
            </p>
            <p className="font-body text-[1.5vw] text-white/60 mt-[1vh]">
              waitlist signups
            </p>
            <p className="font-body text-[1.2vw] text-white/35 mt-[0.5vh]">
              zero paid acquisition · first week
            </p>
          </div>
          <div className="bg-white/8 rounded-2xl px-[2.5vw] py-[3vh] border border-white/10">
            <p className="font-display text-[2.8vw] font-bold text-white leading-tight mb-[1vh]">
              March 31
            </p>
            <p className="font-body text-[1.5vw] text-white/60 mt-[0.5vh]">
              MVP live
            </p>
            <p className="font-body text-[1.3vw] text-white/35 mt-[0.5vh] leading-relaxed">
              Ingredient scanner + combination analysis + My Shelf routine checker
            </p>
          </div>
          <div className="bg-[#7BAF7A]/20 rounded-2xl px-[2.5vw] py-[3vh] border border-[#7BAF7A]/30">
            <p className="font-display text-[2.8vw] font-bold text-[#7BAF7A] leading-tight mb-[1vh]">
              $50K
            </p>
            <p className="font-body text-[1.5vw] text-white/70 mt-[0.5vh]">
              Replit Buildathon prize
            </p>
            <p className="font-body text-[1.3vw] text-white/40 mt-[0.5vh]">
              Funds Phase 1 — App Store launch, iOS development, growth
            </p>
          </div>
        </div>

        <div>
          <p className="font-body text-[1.2vw] font-semibold tracking-[0.2em] uppercase text-white/40 mb-[2vh]">
            Chimiq family roadmap
          </p>
          <div className="grid grid-cols-4 gap-[1.5vw]">
            <div className="bg-[#7BAF7A]/20 rounded-xl px-[2vw] py-[2vh] border border-[#7BAF7A]/40">
              <p className="font-body text-[1.1vw] font-semibold uppercase tracking-widest text-[#7BAF7A] mb-[0.8vh]">
                Live
              </p>
              <p className="font-display text-[2vw] font-bold text-white">
                SkinScreen
              </p>
              <p className="font-body text-[1.2vw] text-white/45 mt-[0.5vh]">
                Skin ingredient + combination analysis
              </p>
            </div>
            <div className="bg-white/6 rounded-xl px-[2vw] py-[2vh] border border-white/10">
              <p className="font-body text-[1.1vw] font-semibold uppercase tracking-widest text-white/35 mb-[0.8vh]">
                Next
              </p>
              <p className="font-display text-[2vw] font-bold text-white">
                HairScreen
              </p>
              <p className="font-body text-[1.2vw] text-white/45 mt-[0.5vh]">
                Sulfates, silicones, proteins
              </p>
            </div>
            <div className="bg-white/6 rounded-xl px-[2vw] py-[2vh] border border-white/10">
              <p className="font-body text-[1.1vw] font-semibold uppercase tracking-widest text-white/35 mb-[0.8vh]">
                Then
              </p>
              <p className="font-display text-[2vw] font-bold text-white">
                MakeupScreen
              </p>
              <p className="font-body text-[1.2vw] text-white/45 mt-[0.5vh]">
                Pigments, EU-banned substances, allergens
              </p>
            </div>
            <div className="bg-white/6 rounded-xl px-[2vw] py-[2vh] border border-white/10">
              <p className="font-body text-[1.1vw] font-semibold uppercase tracking-widest text-white/35 mb-[0.8vh]">
                Moonshot
              </p>
              <p className="font-display text-[2vw] font-bold text-white">
                Chimiq Scanner
              </p>
              <p className="font-body text-[1.2vw] text-white/45 mt-[0.5vh]">
                NIR spectroscopy + AI reasoning
              </p>
            </div>
          </div>
        </div>

        <div className="mt-auto pt-[2vh]">
          <p className="font-body text-[1.3vw] text-white/35 tracking-wide">
            chimiq.com · chimiq.app secured &nbsp;|&nbsp; @chim_iq Instagram + TikTok
          </p>
        </div>
      </div>
    </div>
  );
}
