export default function Slide04Market() {
  return (
    <div className="w-screen h-screen overflow-hidden relative bg-[#1A1A1A]">
      <div className="absolute inset-0 bg-gradient-to-br from-[#7BAF7A]/15 via-transparent to-transparent" />

      <div className="relative z-10 h-full flex px-[8vw] py-[6vh] gap-[7vw] items-center">
        <div className="flex flex-col justify-center flex-1">
          <p className="font-body text-[1.2vw] font-semibold tracking-[0.32em] uppercase text-[#7BAF7A] mb-[2.5vh]">
            Market Opportunity
          </p>
          <p className="font-display text-[14vw] font-bold tracking-tighter text-white leading-none">
            $189B
          </p>
          <p className="font-body text-[2.2vw] text-white/70 mt-[2vh] font-light">
            global skincare market in 2025
          </p>
          <p className="font-body text-[1.5vw] text-white/45 mt-[1vh]">
            Growing to $273B by 2030 — CAGR ~7.5%
          </p>
        </div>

        <div className="flex flex-col justify-center w-[38vw] gap-[2.5vh]">
          <div className="bg-white/10 rounded-2xl px-[2.8vw] py-[3vh] border border-white/10">
            <p className="font-body text-[1.85vw] font-semibold text-white mb-[1.2vh]">
              Timing is perfect
            </p>
            <p className="font-body text-[1.5vw] text-white/65 leading-relaxed">
              EU Cosmetics Regulation update 2024–2025 demands clearer labelling. Gen Z is the most health-conscious and the most misled by social media.
            </p>
          </div>
          <div className="bg-white/10 rounded-2xl px-[2.8vw] py-[3vh] border border-white/10">
            <p className="font-body text-[1.85vw] font-semibold text-white mb-[1.2vh]">
              Proven model
            </p>
            <p className="font-body text-[1.5vw] text-white/65 leading-relaxed">
              Yuka: 13M users, profitable freemium — no combination analysis. SkinScreen is Yuka with the one feature that actually protects.
            </p>
          </div>
          <div className="bg-[#7BAF7A]/20 rounded-2xl px-[2.8vw] py-[2vh] border border-[#7BAF7A]/30">
            <p className="font-body text-[1.5vw] text-[#7BAF7A] font-medium">
              Teen skincare segment growing fastest of all — highest social media influence, highest risk exposure, no dedicated solution.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
