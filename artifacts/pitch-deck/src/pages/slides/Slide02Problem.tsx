export default function Slide02Problem() {
  return (
    <div className="w-screen h-screen overflow-hidden relative bg-bg">
      <div className="absolute left-0 top-0 bottom-0 w-[0.45vw] bg-primary" />

      <div className="h-full flex flex-col px-[8vw] py-[6vh]">
        <p className="font-body text-[1.2vw] font-semibold tracking-[0.32em] uppercase text-primary mb-[1.5vh]">
          The Problem
        </p>
        <h2 className="font-display text-[4.2vw] font-bold tracking-tight text-text leading-tight mb-[3.5vh] max-w-[78vw]">
          Teenagers apply 150–400 ingredients every day.
          <br />
          Nobody checks for conflicts.
        </h2>

        <div className="grid grid-cols-3 gap-[2vw] mb-[2.5vh]">
          <div className="bg-surface rounded-2xl px-[2.5vw] py-[2.5vh] shadow-sm border border-black/5">
            <p className="font-display text-[7.5vw] font-bold tracking-tighter text-text leading-none">
              400
            </p>
            <p className="font-body text-[1.45vw] text-muted mt-[0.8vh] leading-snug">
              ingredients applied daily across 4–7 products
            </p>
          </div>
          <div className="bg-surface rounded-2xl px-[2.5vw] py-[2.5vh] shadow-sm border border-black/5">
            <p className="font-display text-[7.5vw] font-bold tracking-tighter text-text leading-none">
              62%
            </p>
            <p className="font-body text-[1.45vw] text-muted mt-[0.8vh] leading-snug">
              change their routine based on TikTok
            </p>
            <p className="font-body text-[1.1vw] text-muted/60 mt-[0.4vh]">
              J. Clin. Aesthetics, 2023
            </p>
          </div>
          <div className="bg-surface rounded-2xl px-[2.5vw] py-[2.5vh] shadow-sm border border-black/5">
            <p className="font-display text-[7.5vw] font-bold tracking-tighter text-text leading-none">
              100B+
            </p>
            <p className="font-body text-[1.45vw] text-muted mt-[0.8vh] leading-snug">
              views on #skincare TikTok
            </p>
          </div>
        </div>

        <div className="bg-surface rounded-2xl px-[2.8vw] py-[2.5vh] border-l-[0.4vw] border-accent flex gap-[2vw] items-start">
          <div>
            <p className="font-body text-[1.6vw] font-semibold text-text mb-[0.6vh]">
              The result
            </p>
            <p className="font-body text-[1.5vw] text-muted leading-relaxed max-w-[70vw]">
              Dermatologists report a sharp rise in irritant contact dermatitis among teens. "Retinification" — young skin exposed to anti-aging actives designed for 40-year-olds. No app solves the combination problem today.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
