export default function Slide07Team() {
  return (
    <div className="w-screen h-screen overflow-hidden relative bg-bg">
      <div className="absolute left-0 top-0 bottom-0 w-[0.45vw] bg-primary" />

      <div className="h-full flex flex-col px-[8vw] py-[6vh]">
        <div className="flex items-start justify-between mb-[1.5vh]">
          <p className="font-body text-[1.2vw] font-semibold tracking-[0.32em] uppercase text-primary">
            The Team
          </p>
          <p className="font-body text-[1.3vw] text-muted font-medium">
            A Chimiq product by Seafari AB
          </p>
        </div>
        <h2 className="font-display text-[4.2vw] font-bold tracking-tight text-text leading-tight mb-[3.5vh]">
          Chemistry + Design + Strategy
        </h2>

        <div className="grid grid-cols-3 gap-[2vw] mb-[2.5vh]">
          <div className="bg-surface rounded-2xl px-[2.5vw] py-[3vh] shadow-sm border border-black/5 flex flex-col">
            <div className="w-[5vw] h-[5vw] rounded-2xl bg-primary flex items-center justify-center mb-[2vh] shrink-0">
              <span className="font-display text-[2.5vw] font-bold text-white leading-none">E</span>
            </div>
            <p className="font-display text-[2vw] font-bold text-text mb-[0.5vh]">Elin</p>
            <p className="font-body text-[1.4vw] font-semibold text-primary mb-[1.2vh]">Chemistry Lead</p>
            <p className="font-body text-[1.4vw] text-muted leading-relaxed">
              Chemical engineering background. Ingredient database architecture, combination conflict rules, and scientific validation.
            </p>
          </div>

          <div className="bg-surface rounded-2xl px-[2.5vw] py-[3vh] shadow-sm border border-black/5 flex flex-col">
            <div className="w-[5vw] h-[5vw] rounded-2xl bg-[#5B8FA8] flex items-center justify-center mb-[2vh] shrink-0">
              <span className="font-display text-[2.5vw] font-bold text-white leading-none">S</span>
            </div>
            <p className="font-display text-[2vw] font-bold text-text mb-[0.5vh]">Sofie</p>
            <p className="font-body text-[1.4vw] font-semibold text-primary mb-[1.2vh]">UX &amp; Design</p>
            <p className="font-body text-[1.4vw] text-muted leading-relaxed">
              Product designer with direct teen audience insight. Interface testing lead, A/B variant design, and growth content.
            </p>
          </div>

          <div className="bg-surface rounded-2xl px-[2.5vw] py-[3vh] shadow-sm border border-black/5 flex flex-col">
            <div className="w-[5vw] h-[5vw] rounded-2xl bg-[#8A7A6E] flex items-center justify-center mb-[2vh] shrink-0">
              <span className="font-display text-[2.5vw] font-bold text-white leading-none">P</span>
            </div>
            <p className="font-display text-[2vw] font-bold text-text mb-[0.5vh]">Pia L'Obry</p>
            <p className="font-body text-[1.4vw] font-semibold text-primary mb-[1.2vh]">CEO · Seafari AB</p>
            <p className="font-body text-[1.4vw] text-muted leading-relaxed">
              Serial entrepreneur since 1994. Product architecture, business model design, investor relations, and Chimiq platform strategy.
            </p>
          </div>
        </div>

        <div className="bg-surface rounded-2xl px-[2.8vw] py-[2.5vh] border border-black/5 shadow-sm">
          <p className="font-body text-[1.3vw] font-semibold tracking-[0.2em] uppercase text-muted mb-[1.2vh]">
            Technical stack
          </p>
          <p className="font-body text-[1.5vw] text-text font-medium">
            React + Vite &nbsp;·&nbsp; Node.js / Express &nbsp;·&nbsp; PostgreSQL + Drizzle ORM &nbsp;·&nbsp; Claude Sonnet (AI analysis) &nbsp;·&nbsp; Claude Vision (bottle scan) &nbsp;·&nbsp; Replit Auth
          </p>
        </div>
      </div>
    </div>
  );
}
