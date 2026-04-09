export default function Slide07GTM() {
  return (
    <div className="w-screen h-screen overflow-hidden relative bg-bg">
      <div className="absolute left-0 top-0 bottom-0 w-[0.45vw] bg-primary" />

      <div className="h-full flex flex-col px-[8vw] py-[5.5vh]">
        <p className="font-body text-[1.2vw] font-semibold tracking-[0.32em] uppercase text-primary mb-[1vh]">
          Go-To-Market
        </p>
        <h2 className="font-display text-[3.8vw] font-bold tracking-tight text-text leading-tight mb-[3vh]">
          We don't find our audience —{" "}
          <span className="text-primary">we are the audience</span>
        </h2>

        <div className="grid grid-cols-[1.15fr_1fr_1fr] gap-[2vw] flex-1 min-h-0">

          {/* Column 1 — Unfair advantage */}
          <div className="flex flex-col gap-[1.6vh]">
            <p className="font-body text-[1.1vw] font-semibold tracking-[0.22em] uppercase text-muted">
              The unfair advantage
            </p>

            <div className="bg-primary rounded-2xl px-[2vw] py-[2.2vh] text-white">
              <p className="font-display text-[1.7vw] font-bold mb-[1vh] leading-tight">
                Built-in marketing team
              </p>
              <p className="font-body text-[1.25vw] leading-relaxed opacity-90">
                Elin (21, chemistry student) and Sofie (19, UX lead) are not
                consultants we hired — they are the product's core team{" "}
                <em>and</em> its primary target group.
              </p>
            </div>

            <div className="bg-surface rounded-2xl px-[2vw] py-[2vh] border border-black/5 shadow-sm flex-1">
              <p className="font-body text-[1.25vw] font-bold text-text mb-[1.2vh]">
                Why this matters
              </p>
              <div className="flex flex-col gap-[1.2vh]">
                <div className="flex items-start gap-[0.8vw]">
                  <div className="w-[1.8vw] h-[1.8vw] rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-[0.1vh]">
                    <span className="text-primary font-bold text-[1vw]">🧪</span>
                  </div>
                  <p className="font-body text-[1.2vw] text-muted leading-snug">
                    <span className="text-text font-semibold">Chemistry credibility.</span>{" "}
                    Elin's degree turns every TikTok into peer-reviewed content, not marketing.
                  </p>
                </div>
                <div className="flex items-start gap-[0.8vw]">
                  <div className="w-[1.8vw] h-[1.8vw] rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-[0.1vh]">
                    <span className="text-primary font-bold text-[1vw]">📱</span>
                  </div>
                  <p className="font-body text-[1.2vw] text-muted leading-snug">
                    <span className="text-text font-semibold">Native reach.</span>{" "}
                    Their combined social networks are our first 1,000 users — zero acquisition cost.
                  </p>
                </div>
                <div className="flex items-start gap-[0.8vw]">
                  <div className="w-[1.8vw] h-[1.8vw] rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-[0.1vh]">
                    <span className="text-primary font-bold text-[1vw]">🎯</span>
                  </div>
                  <p className="font-body text-[1.2vw] text-muted leading-snug">
                    <span className="text-text font-semibold">Authentic by default.</span>{" "}
                    Gen Z ignores paid influencers. Peers recommending to peers converts 5–10× better.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Column 2 — Channel phases */}
          <div className="flex flex-col gap-[1.6vh]">
            <p className="font-body text-[1.1vw] font-semibold tracking-[0.22em] uppercase text-muted">
              Channel strategy
            </p>

            <div className="bg-surface rounded-2xl px-[2vw] py-[1.8vh] border border-black/5 shadow-sm">
              <div className="flex items-center gap-[0.7vw] mb-[1vh]">
                <div className="bg-primary text-white rounded-lg px-[0.8vw] py-[0.3vh] font-body text-[1vw] font-bold tracking-wide">
                  WEEK 1–2
                </div>
                <p className="font-body text-[1.25vw] font-bold text-text">Seed communities</p>
              </div>
              <div className="flex flex-col gap-[0.7vh]">
                <p className="font-body text-[1.15vw] text-muted leading-snug">
                  · TikTok & Reels — "chemistry of your skincare routine" series
                </p>
                <p className="font-body text-[1.15vw] text-muted leading-snug">
                  · Reddit: r/SkincareAddiction, r/AsianBeauty, r/tretinoin — genuine problem posts, not pitches
                </p>
                <p className="font-body text-[1.15vw] text-muted leading-snug">
                  · ProductHunt "coming soon" — built-in early-adopter audience
                </p>
              </div>
            </div>

            <div className="bg-surface rounded-2xl px-[2vw] py-[1.8vh] border border-black/5 shadow-sm">
              <div className="flex items-center gap-[0.7vw] mb-[1vh]">
                <div className="bg-[#5B8FA8] text-white rounded-lg px-[0.8vw] py-[0.3vh] font-body text-[1vw] font-bold tracking-wide">
                  WEEK 2–6
                </div>
                <p className="font-body text-[1.25vw] font-bold text-text">Build authority</p>
              </div>
              <div className="flex flex-col gap-[0.7vh]">
                <p className="font-body text-[1.15vw] text-muted leading-snug">
                  · Micro-influencers (5k–50k) reviewing SPF & actives — early access in exchange for honest mention
                </p>
                <p className="font-body text-[1.15vw] text-muted leading-snug">
                  · Dermatologists & aestheticians on Instagram — a tool they can recommend to patients
                </p>
                <p className="font-body text-[1.15vw] text-muted leading-snug">
                  · Facebook groups: skincare, sun safety, melanoma awareness
                </p>
              </div>
            </div>

            <div className="bg-surface rounded-2xl px-[2vw] py-[1.8vh] border border-black/5 shadow-sm flex-1">
              <div className="flex items-center gap-[0.7vw] mb-[1vh]">
                <div className="bg-[#8A7A6E] text-white rounded-lg px-[0.8vw] py-[0.3vh] font-body text-[1vw] font-bold tracking-wide">
                  ONGOING
                </div>
                <p className="font-body text-[1.25vw] font-bold text-text">Compound trust</p>
              </div>
              <div className="flex flex-col gap-[0.7vh]">
                <p className="font-body text-[1.15vw] text-muted leading-snug">
                  · Weekly email / Instagram: UV science, SPF myths, skin cancer stats — positions us as the expert source
                </p>
                <p className="font-body text-[1.15vw] text-muted leading-snug">
                  · No paid ads until organic conversion is proven — discipline protects CAC
                </p>
              </div>
            </div>
          </div>

          {/* Column 3 — Referral flywheel */}
          <div className="flex flex-col gap-[1.6vh]">
            <p className="font-body text-[1.1vw] font-semibold tracking-[0.22em] uppercase text-muted">
              The growth flywheel
            </p>

            <div className="bg-surface rounded-2xl px-[2vw] py-[2vh] border-2 border-primary shadow-sm">
              <p className="font-display text-[1.6vw] font-bold text-text mb-[0.6vh]">
                Referral queue mechanic
              </p>
              <p className="font-body text-[1.2vw] text-muted mb-[1.5vh] leading-snug">
                Every waitlist member gets a personal referral link. Each friend who signs up moves them up the queue.
              </p>
              <div className="flex items-center justify-between bg-primary/8 rounded-xl px-[1.2vw] py-[1vh]">
                <p className="font-body text-[1.1vw] text-primary font-bold">Expected multiplier</p>
                <p className="font-display text-[2.4vw] font-bold text-primary">2–3×</p>
              </div>
              <p className="font-body text-[1.1vw] text-muted mt-[1vh] leading-snug">
                Virality baked into the product — not the ad budget.
              </p>
            </div>

            <div className="bg-surface rounded-2xl px-[2vw] py-[2vh] border border-black/5 shadow-sm flex-1">
              <p className="font-body text-[1.25vw] font-bold text-text mb-[1.2vh]">
                The content flywheel
              </p>
              <div className="flex flex-col gap-[1.1vh]">
                <div className="flex items-center gap-[0.8vw]">
                  <div className="w-[1.5vw] h-[1.5vw] rounded-full bg-primary flex items-center justify-center text-white font-bold text-[0.85vw] shrink-0">1</div>
                  <p className="font-body text-[1.15vw] text-muted">Elin explains the chemistry → <span className="text-text font-medium">credibility</span></p>
                </div>
                <div className="flex items-center gap-[0.8vw]">
                  <div className="w-[1.5vw] h-[1.5vw] rounded-full bg-primary flex items-center justify-center text-white font-bold text-[0.85vw] shrink-0">2</div>
                  <p className="font-body text-[1.15vw] text-muted">Sofie shows the app → <span className="text-text font-medium">conversion</span></p>
                </div>
                <div className="flex items-center gap-[0.8vw]">
                  <div className="w-[1.5vw] h-[1.5vw] rounded-full bg-primary flex items-center justify-center text-white font-bold text-[0.85vw] shrink-0">3</div>
                  <p className="font-body text-[1.15vw] text-muted">Their friends share → <span className="text-text font-medium">amplification</span></p>
                </div>
                <div className="flex items-center gap-[0.8vw]">
                  <div className="w-[1.5vw] h-[1.5vw] rounded-full bg-primary flex items-center justify-center text-white font-bold text-[0.85vw] shrink-0">4</div>
                  <p className="font-body text-[1.15vw] text-muted">Derms recommend → <span className="text-text font-medium">trust loop</span></p>
                </div>
              </div>
            </div>

            <div className="bg-primary/10 rounded-2xl px-[2vw] py-[1.6vh]">
              <p className="font-body text-[1.2vw] text-primary font-semibold leading-snug">
                Zero paid media until organic conversion rate is proven. Community compounds. Consistency beats virality.
              </p>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
