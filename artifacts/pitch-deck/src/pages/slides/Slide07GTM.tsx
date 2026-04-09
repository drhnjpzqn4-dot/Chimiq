export default function Slide07GTM() {
  return (
    <div className="w-screen h-screen overflow-hidden relative bg-bg">
      <div className="absolute left-0 top-0 bottom-0 w-[0.45vw] bg-primary" />

      <div className="h-full flex flex-col px-[8vw] py-[4vh]">
        <p className="font-body text-[1.1vw] font-semibold tracking-[0.32em] uppercase text-primary mb-[0.8vh]">
          Go-To-Market
        </p>
        <h2 className="font-display text-[3.4vw] font-bold tracking-tight text-text leading-tight mb-[2vh]">
          We don't find our audience —{" "}
          <span className="text-primary">we are the audience</span>
        </h2>

        <div className="grid grid-cols-[1.15fr_1fr_1fr] gap-[2vw] flex-1 min-h-0 overflow-hidden">

          {/* Column 1 — Unfair advantage */}
          <div className="flex flex-col gap-[1.2vh] min-h-0">
            <p className="font-body text-[1vw] font-semibold tracking-[0.22em] uppercase text-muted">
              The unfair advantage
            </p>

            <div className="bg-primary rounded-2xl px-[2vw] py-[1.8vh] text-white shrink-0">
              <p className="font-display text-[1.55vw] font-bold mb-[0.7vh] leading-tight">
                Built-in marketing team
              </p>
              <p className="font-body text-[1.15vw] leading-relaxed opacity-90">
                Elin (21, chemistry student) and Sofie (19, UX lead) are not
                consultants we hired — they are the product's core team{" "}
                <em>and</em> its primary target group.
              </p>
            </div>

            <div className="bg-surface rounded-2xl px-[2vw] py-[1.5vh] border border-black/5 shadow-sm flex-1 min-h-0">
              <p className="font-body text-[1.15vw] font-bold text-text mb-[1vh]">
                Why this matters
              </p>
              <div className="flex flex-col gap-[1vh]">
                <div className="flex items-start gap-[0.7vw]">
                  <div className="w-[1.6vw] h-[1.6vw] rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-[0.1vh]">
                    <span className="text-primary font-bold text-[0.9vw]">🧪</span>
                  </div>
                  <p className="font-body text-[1.1vw] text-muted leading-snug">
                    <span className="text-text font-semibold">Chemistry credibility.</span>{" "}
                    Elin's degree turns every TikTok into peer-reviewed content, not marketing.
                  </p>
                </div>
                <div className="flex items-start gap-[0.7vw]">
                  <div className="w-[1.6vw] h-[1.6vw] rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-[0.1vh]">
                    <span className="text-primary font-bold text-[0.9vw]">📱</span>
                  </div>
                  <p className="font-body text-[1.1vw] text-muted leading-snug">
                    <span className="text-text font-semibold">Native reach.</span>{" "}
                    Their combined social networks are our first 1,000 users — zero acquisition cost.
                  </p>
                </div>
                <div className="flex items-start gap-[0.7vw]">
                  <div className="w-[1.6vw] h-[1.6vw] rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-[0.1vh]">
                    <span className="text-primary font-bold text-[0.9vw]">🎯</span>
                  </div>
                  <p className="font-body text-[1.1vw] text-muted leading-snug">
                    <span className="text-text font-semibold">Authentic by default.</span>{" "}
                    Gen Z ignores paid influencers. Peers to peers converts 5–10× better.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Column 2 — Channel phases */}
          <div className="flex flex-col gap-[1.2vh] min-h-0">
            <p className="font-body text-[1vw] font-semibold tracking-[0.22em] uppercase text-muted">
              Channel strategy
            </p>

            <div className="bg-surface rounded-2xl px-[1.8vw] py-[1.4vh] border border-black/5 shadow-sm shrink-0">
              <div className="flex items-center gap-[0.7vw] mb-[0.8vh]">
                <div className="bg-primary text-white rounded-lg px-[0.7vw] py-[0.2vh] font-body text-[0.9vw] font-bold tracking-wide whitespace-nowrap">
                  WEEK 1–2
                </div>
                <p className="font-body text-[1.15vw] font-bold text-text">Seed communities</p>
              </div>
              <div className="flex flex-col gap-[0.5vh]">
                <p className="font-body text-[1.05vw] text-muted leading-snug">· TikTok & Reels — "chemistry of your skincare" series</p>
                <p className="font-body text-[1.05vw] text-muted leading-snug">· Reddit: r/SkincareAddiction, r/AsianBeauty, r/tretinoin</p>
                <p className="font-body text-[1.05vw] text-muted leading-snug">· ProductHunt "coming soon" — early-adopter audience</p>
              </div>
            </div>

            <div className="bg-surface rounded-2xl px-[1.8vw] py-[1.4vh] border border-black/5 shadow-sm shrink-0">
              <div className="flex items-center gap-[0.7vw] mb-[0.8vh]">
                <div className="bg-[#5B8FA8] text-white rounded-lg px-[0.7vw] py-[0.2vh] font-body text-[0.9vw] font-bold tracking-wide whitespace-nowrap">
                  WEEK 2–6
                </div>
                <p className="font-body text-[1.15vw] font-bold text-text">Build authority</p>
              </div>
              <div className="flex flex-col gap-[0.5vh]">
                <p className="font-body text-[1.05vw] text-muted leading-snug">· Micro-influencers (5k–50k) — early access for honest mention</p>
                <p className="font-body text-[1.05vw] text-muted leading-snug">· Dermatologists & aestheticians — a tool to recommend to patients</p>
                <p className="font-body text-[1.05vw] text-muted leading-snug">· Facebook: skincare, sun safety, melanoma awareness groups</p>
              </div>
            </div>

            <div className="bg-surface rounded-2xl px-[1.8vw] py-[1.4vh] border border-black/5 shadow-sm shrink-0">
              <div className="flex items-center gap-[0.7vw] mb-[0.8vh]">
                <div className="bg-[#8A7A6E] text-white rounded-lg px-[0.7vw] py-[0.2vh] font-body text-[0.9vw] font-bold tracking-wide whitespace-nowrap">
                  ONGOING
                </div>
                <p className="font-body text-[1.15vw] font-bold text-text">Compound trust</p>
              </div>
              <div className="flex flex-col gap-[0.5vh]">
                <p className="font-body text-[1.05vw] text-muted leading-snug">· Weekly email / Instagram: UV science, SPF myths, skin stats</p>
                <p className="font-body text-[1.05vw] text-muted leading-snug">· No paid ads until organic conversion is proven</p>
              </div>
            </div>

            <div className="bg-primary/10 rounded-2xl px-[1.8vw] py-[1.2vh] shrink-0">
              <p className="font-body text-[1.1vw] text-primary font-semibold leading-snug">
                Consistent niche posting compounds. Virality is a bonus, not the plan.
              </p>
            </div>
          </div>

          {/* Column 3 — Referral flywheel */}
          <div className="flex flex-col gap-[1.2vh] min-h-0">
            <p className="font-body text-[1vw] font-semibold tracking-[0.22em] uppercase text-muted">
              The growth flywheel
            </p>

            <div className="bg-surface rounded-2xl px-[1.8vw] py-[1.6vh] border-2 border-primary shadow-sm shrink-0">
              <p className="font-display text-[1.45vw] font-bold text-text mb-[0.5vh]">
                Referral queue mechanic
              </p>
              <p className="font-body text-[1.1vw] text-muted mb-[1.2vh] leading-snug">
                Every waitlist member gets a personal link. Each friend who signs up moves them up the queue.
              </p>
              <div className="flex items-center justify-between bg-primary/8 rounded-xl px-[1.2vw] py-[0.8vh]">
                <p className="font-body text-[1vw] text-primary font-bold">Expected multiplier</p>
                <p className="font-display text-[2.2vw] font-bold text-primary">2–3×</p>
              </div>
              <p className="font-body text-[1vw] text-muted mt-[0.8vh] leading-snug">
                Virality baked into the product — not the ad budget.
              </p>
            </div>

            <div className="bg-surface rounded-2xl px-[1.8vw] py-[1.5vh] border border-black/5 shadow-sm flex-1 min-h-0">
              <p className="font-body text-[1.15vw] font-bold text-text mb-[1vh]">
                The content flywheel
              </p>
              <div className="flex flex-col gap-[1vh]">
                <div className="flex items-center gap-[0.8vw]">
                  <div className="w-[1.4vw] h-[1.4vw] rounded-full bg-primary flex items-center justify-center text-white font-bold text-[0.8vw] shrink-0">1</div>
                  <p className="font-body text-[1.05vw] text-muted">Elin explains the chemistry → <span className="text-text font-semibold">credibility</span></p>
                </div>
                <div className="flex items-center gap-[0.8vw]">
                  <div className="w-[1.4vw] h-[1.4vw] rounded-full bg-primary flex items-center justify-center text-white font-bold text-[0.8vw] shrink-0">2</div>
                  <p className="font-body text-[1.05vw] text-muted">Sofie shows the app → <span className="text-text font-semibold">conversion</span></p>
                </div>
                <div className="flex items-center gap-[0.8vw]">
                  <div className="w-[1.4vw] h-[1.4vw] rounded-full bg-primary flex items-center justify-center text-white font-bold text-[0.8vw] shrink-0">3</div>
                  <p className="font-body text-[1.05vw] text-muted">Their friends share → <span className="text-text font-semibold">amplification</span></p>
                </div>
                <div className="flex items-center gap-[0.8vw]">
                  <div className="w-[1.4vw] h-[1.4vw] rounded-full bg-primary flex items-center justify-center text-white font-bold text-[0.8vw] shrink-0">4</div>
                  <p className="font-body text-[1.05vw] text-muted">Derms recommend → <span className="text-text font-semibold">trust loop</span></p>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
