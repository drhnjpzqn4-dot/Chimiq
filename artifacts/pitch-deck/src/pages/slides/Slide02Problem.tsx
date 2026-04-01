export default function Slide02Problem() {
  return (
    <div className="w-screen h-screen overflow-hidden relative bg-bg">
      <div className="absolute left-0 top-0 bottom-0 w-[0.45vw] bg-primary" />

      <div className="h-full flex flex-col px-[8vw] py-[5vh]">
        <p className="font-body text-[1.2vw] font-semibold tracking-[0.32em] uppercase text-primary mb-[1.2vh]">
          The Problem
        </p>
        <h2 className="font-display text-[3.8vw] font-bold tracking-tight text-text leading-tight mb-[2.5vh]">
          Teenagers apply 150–400 ingredients every day.
          Nobody checks for conflicts.
        </h2>

        <div className="flex gap-[2vw] mb-[2.5vh]">
          <div className="bg-surface rounded-xl px-[2vw] py-[1.4vh] shadow-sm border border-black/5 flex items-baseline gap-[0.8vw]">
            <p className="font-display text-[3.5vw] font-bold tracking-tighter text-text leading-none">400</p>
            <p className="font-body text-[1.3vw] text-muted">ingredients applied daily</p>
          </div>
          <div className="bg-surface rounded-xl px-[2vw] py-[1.4vh] shadow-sm border border-black/5 flex items-baseline gap-[0.8vw]">
            <p className="font-display text-[3.5vw] font-bold tracking-tighter text-text leading-none">62%</p>
            <p className="font-body text-[1.3vw] text-muted">change routine from TikTok</p>
          </div>
          <div className="bg-surface rounded-xl px-[2vw] py-[1.4vh] shadow-sm border border-black/5 flex items-baseline gap-[0.8vw]">
            <p className="font-display text-[3.5vw] font-bold tracking-tighter text-text leading-none">100B+</p>
            <p className="font-body text-[1.3vw] text-muted">#skincare TikTok views</p>
          </div>
        </div>

        <p className="font-body text-[1.2vw] font-semibold tracking-[0.2em] uppercase text-[#C94538] mb-[1.8vh]">
          Real combinations — sold together every day
        </p>

        <div className="grid grid-cols-3 gap-[2vw] flex-1">
          <div className="bg-surface rounded-2xl overflow-hidden shadow-sm border border-red-100 flex flex-col">
            <div className="bg-[#C94538] px-[2vw] py-[1.2vh] flex items-center justify-between">
              <p className="font-body text-[1.1vw] font-bold tracking-[0.2em] uppercase text-white">
                HIGH RISK
              </p>
              <div className="w-[1vw] h-[1vw] rounded-full bg-white/30" />
            </div>
            <div className="px-[2vw] py-[2vh] flex flex-col flex-1">
              <p className="font-display text-[1.9vw] font-bold text-text leading-tight mb-[1.5vh]">
                Retinol + Benzoyl Peroxide
              </p>
              <p className="font-body text-[1.35vw] text-muted leading-relaxed flex-1">
                Benzoyl peroxide oxidises retinol before it can reach your skin cells — rendering it completely inactive. Two products, zero results, maximum dryness.
              </p>
              <p className="font-body text-[1.1vw] text-muted/55 mt-[1.5vh] leading-snug border-t border-black/5 pt-[1vh]">
                Nighswonger et al. (1993). J Pharm Sci. PMID: 8450449
              </p>
            </div>
          </div>

          <div className="bg-surface rounded-2xl overflow-hidden shadow-sm border border-red-100 flex flex-col">
            <div className="bg-[#C94538] px-[2vw] py-[1.2vh] flex items-center justify-between">
              <p className="font-body text-[1.1vw] font-bold tracking-[0.2em] uppercase text-white">
                HIGH RISK
              </p>
              <div className="w-[1vw] h-[1vw] rounded-full bg-white/30" />
            </div>
            <div className="px-[2vw] py-[2vh] flex flex-col flex-1">
              <p className="font-display text-[1.9vw] font-bold text-text leading-tight mb-[1.5vh]">
                Retinol + AHA/BHA
              </p>
              <p className="font-body text-[1.35vw] text-muted leading-relaxed flex-1">
                Both accelerate skin cell turnover. Combined in an evening routine, they strip the protective lipid layer — causing redness, peeling, and raw, damaged skin.
              </p>
              <p className="font-body text-[1.1vw] text-muted/55 mt-[1.5vh] leading-snug border-t border-black/5 pt-[1vh]">
                Kligman, A.M. (1988). J Dermatol Treat. doi:10.3109/09546639409086912
              </p>
            </div>
          </div>

          <div className="bg-surface rounded-2xl overflow-hidden shadow-sm border border-red-100 flex flex-col">
            <div className="bg-[#C94538] px-[2vw] py-[1.2vh] flex items-center justify-between">
              <p className="font-body text-[1.1vw] font-bold tracking-[0.2em] uppercase text-white">
                HIGH RISK
              </p>
              <div className="w-[1vw] h-[1vw] rounded-full bg-white/30" />
            </div>
            <div className="px-[2vw] py-[2vh] flex flex-col flex-1">
              <p className="font-display text-[1.9vw] font-bold text-text leading-tight mb-[1.5vh]">
                AHAs + No Sunscreen
              </p>
              <p className="font-body text-[1.35vw] text-muted leading-relaxed flex-1">
                Glycolic and lactic acids increase UV sensitivity by up to 50%. Using them without SPF dramatically raises the risk of hyperpigmentation and long-term sun damage.
              </p>
              <p className="font-body text-[1.1vw] text-muted/55 mt-[1.5vh] leading-snug border-t border-black/5 pt-[1vh]">
                Kornhauser et al. (2010). Clin Cosmet Investig Dermatol. doi:10.2147/CCID.S9042
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
