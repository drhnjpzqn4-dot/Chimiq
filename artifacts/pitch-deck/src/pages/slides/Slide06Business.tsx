export default function Slide06Business() {
  return (
    <div className="w-screen h-screen overflow-hidden relative bg-bg">
      <div className="absolute left-0 top-0 bottom-0 w-[0.45vw] bg-primary" />

      <div className="h-full flex flex-col px-[8vw] py-[6vh]">
        <p className="font-body text-[1.2vw] font-semibold tracking-[0.32em] uppercase text-primary mb-[1.5vh]">
          Business Model
        </p>
        <h2 className="font-display text-[4.2vw] font-bold tracking-tight text-text leading-tight mb-[3.5vh]">
          Freemium across two audiences
        </h2>

        <div className="grid grid-cols-2 gap-[2.5vw] flex-1">
          <div className="flex flex-col gap-[1.8vh]">
            <p className="font-body text-[1.3vw] font-semibold tracking-[0.2em] uppercase text-muted mb-[0.5vh]">
              Revenue tiers
            </p>

            <div className="bg-surface rounded-2xl px-[2.5vw] py-[2.5vh] border border-black/5 shadow-sm">
              <p className="font-display text-[2.5vw] font-bold text-text mb-[0.6vh]">Free</p>
              <p className="font-body text-[1.6vw] font-semibold text-muted mb-[0.6vh]">Ingredient scanning</p>
              <p className="font-body text-[1.4vw] text-muted/80 leading-snug">
                Scan single products. Understand every ingredient. Free forever — drives adoption.
              </p>
            </div>

            <div className="bg-surface rounded-2xl px-[2.5vw] py-[2.5vh] border-2 border-primary shadow-sm">
              <p className="font-display text-[2.5vw] font-bold text-primary mb-[0.6vh]">49–79 kr/mo</p>
              <p className="font-body text-[1.6vw] font-semibold text-text mb-[0.6vh]">Combination analysis</p>
              <p className="font-body text-[1.4vw] text-muted/80 leading-snug">
                Full routine analysis. Personalised recommendations. Safer alternative suggestions.
              </p>
            </div>

            <div className="bg-surface rounded-2xl px-[2.5vw] py-[2.5vh] border border-black/5 shadow-sm">
              <p className="font-display text-[2.5vw] font-bold text-text mb-[0.6vh]">B2B licence</p>
              <p className="font-body text-[1.6vw] font-semibold text-muted mb-[0.6vh]">Clinics, pharmacies, schools</p>
              <p className="font-body text-[1.4vw] text-muted/80 leading-snug">
                White-label available. Affiliate track: "SkinScreen-approved" brand credibility.
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-[1.8vh]">
            <p className="font-body text-[1.3vw] font-semibold tracking-[0.2em] uppercase text-muted mb-[0.5vh]">
              A/B audience targeting
            </p>

            <div className="bg-surface rounded-2xl px-[2.5vw] py-[3vh] border border-black/5 shadow-sm flex-1 flex flex-col justify-center">
              <div className="mb-[3vh]">
                <div className="flex items-center gap-[1vw] mb-[1.5vh]">
                  <div className="w-[0.8vw] h-[0.8vw] rounded-full bg-primary shrink-0" />
                  <p className="font-body text-[1.8vw] font-bold text-text">Variant A — Teen skin</p>
                </div>
                <p className="font-body text-[1.4vw] text-muted leading-relaxed pl-[1.8vw]">
                  TikTok-native messaging. Acne, barrier protection, product safety. Language: direct, empowering, zero jargon.
                </p>
              </div>

              <div className="w-full h-[1px] bg-black/8 mb-[3vh]" />

              <div>
                <div className="flex items-center gap-[1vw] mb-[1.5vh]">
                  <div className="w-[0.8vw] h-[0.8vw] rounded-full bg-[#C94538] shrink-0" />
                  <p className="font-body text-[1.8vw] font-bold text-text">Variant B — Mature skin</p>
                </div>
                <p className="font-body text-[1.4vw] text-muted leading-relaxed pl-[1.8vw]">
                  Anti-aging actives, retinol protocols, menopause-related skin changes. Language: clinical, trustworthy, evidence-based.
                </p>
              </div>
            </div>

            <div className="bg-primary/10 rounded-2xl px-[2.5vw] py-[1.8vh]">
              <p className="font-body text-[1.4vw] text-primary font-semibold">
                Same engine. Two distinct front-ends. Double the addressable market.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
