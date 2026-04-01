export default function Slide08Ask() {
  return (
    <div className="w-screen h-screen overflow-hidden relative bg-[#1A1A1A]">
      <div className="absolute inset-0 bg-gradient-to-tl from-[#7BAF7A]/10 via-transparent to-transparent" />

      <div className="relative z-10 h-full flex flex-col px-[8vw] py-[5.5vh]">
        <p className="font-body text-[1.2vw] font-semibold tracking-[0.32em] uppercase text-[#7BAF7A] mb-[1.2vh]">
          Traction &amp; Ask
        </p>
        <h2 className="font-display text-[3.8vw] font-bold tracking-tight text-white leading-tight mb-[2.8vh]">
          Live product. Early signal. Bigger vision.
        </h2>

        <div className="grid grid-cols-3 gap-[2vw] mb-[2.5vh]">
          <div className="bg-white/8 rounded-2xl px-[2.5vw] py-[2.5vh] border border-white/10">
            <p className="font-display text-[7vw] font-bold tracking-tighter text-white leading-none">
              10
            </p>
            <p className="font-body text-[1.5vw] text-white/60 mt-[0.8vh]">
              waitlist signups
            </p>
            <p className="font-body text-[1.2vw] text-white/35 mt-[0.4vh]">
              zero paid acquisition · first week
            </p>
          </div>
          <div className="bg-white/8 rounded-2xl px-[2.5vw] py-[2.5vh] border border-white/10">
            <p className="font-display text-[2.8vw] font-bold text-white leading-tight mb-[0.8vh]">
              March 31
            </p>
            <p className="font-body text-[1.5vw] text-white/60 mt-[0.4vh]">
              MVP live
            </p>
            <p className="font-body text-[1.2vw] text-white/35 mt-[0.4vh] leading-relaxed">
              Ingredient scanner + combination analysis + My Shelf routine checker
            </p>
          </div>
          <div className="bg-[#7BAF7A]/20 rounded-2xl px-[2.5vw] py-[2.5vh] border border-[#7BAF7A]/30">
            <p className="font-display text-[2.8vw] font-bold text-[#7BAF7A] leading-tight mb-[0.8vh]">
              $50K
            </p>
            <p className="font-body text-[1.5vw] text-white/70 mt-[0.4vh]">
              Replit Buildathon prize
            </p>
            <p className="font-body text-[1.2vw] text-white/40 mt-[0.4vh]">
              Funds Phase 1 — App Store launch, iOS development, growth
            </p>
          </div>
        </div>

        <div className="mb-[2.5vh]">
          <p className="font-body text-[1.2vw] font-semibold tracking-[0.2em] uppercase text-white/40 mb-[1.5vh]">
            Chimiq family roadmap — a Seafari AB product
          </p>
          <div className="grid grid-cols-4 gap-[1.5vw]">
            <div className="bg-[#7BAF7A]/20 rounded-xl px-[2vw] py-[1.8vh] border border-[#7BAF7A]/40">
              <p className="font-body text-[1.1vw] font-semibold uppercase tracking-widest text-[#7BAF7A] mb-[0.6vh]">
                Live
              </p>
              <p className="font-display text-[1.9vw] font-bold text-white">
                SkinScreen
              </p>
              <p className="font-body text-[1.2vw] text-white/45 mt-[0.4vh]">
                Skin ingredient + combination analysis
              </p>
            </div>
            <div className="bg-white/6 rounded-xl px-[2vw] py-[1.8vh] border border-white/10">
              <p className="font-body text-[1.1vw] font-semibold uppercase tracking-widest text-white/35 mb-[0.6vh]">
                Next
              </p>
              <p className="font-display text-[1.9vw] font-bold text-white">
                HairScreen
              </p>
              <p className="font-body text-[1.2vw] text-white/45 mt-[0.4vh]">
                Sulfates, silicones, proteins
              </p>
            </div>
            <div className="bg-white/6 rounded-xl px-[2vw] py-[1.8vh] border border-white/10">
              <p className="font-body text-[1.1vw] font-semibold uppercase tracking-widest text-white/35 mb-[0.6vh]">
                Then
              </p>
              <p className="font-display text-[1.9vw] font-bold text-white">
                MakeupScreen
              </p>
              <p className="font-body text-[1.2vw] text-white/45 mt-[0.4vh]">
                Pigments, EU-banned substances, allergens
              </p>
            </div>
            <div className="bg-white/6 rounded-xl px-[2vw] py-[1.8vh] border border-white/10">
              <p className="font-body text-[1.1vw] font-semibold uppercase tracking-widest text-white/35 mb-[0.6vh]">
                Moonshot
              </p>
              <p className="font-display text-[1.9vw] font-bold text-white">
                Chimiq Scanner
              </p>
              <p className="font-body text-[1.2vw] text-white/45 mt-[0.4vh]">
                NIR spectroscopy + AI reasoning
              </p>
            </div>
          </div>
        </div>

        <div className="mt-auto flex items-end justify-between">
          <div>
            <p className="font-body text-[1.3vw] text-white/50 font-medium mb-[0.5vh]">
              Get in touch
            </p>
            <p className="font-body text-[1.5vw] text-white/80 font-semibold">
              info@seafari.se &nbsp;·&nbsp; +46 70 733 44 50
            </p>
          </div>
          <div className="text-right">
            <p className="font-body text-[1.3vw] text-white/35 tracking-wide">
              chimiq.com · chimiq.app secured &nbsp;|&nbsp; @chim_iq Instagram + TikTok
            </p>
            <p className="font-body text-[1.1vw] text-white/25 mt-[0.4vh]">
              A Chimiq product by Seafari AB
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
