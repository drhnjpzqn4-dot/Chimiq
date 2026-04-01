export default function Slide03Solution() {
  return (
    <div className="w-screen h-screen overflow-hidden relative bg-bg">
      <div className="absolute left-0 top-0 bottom-0 w-[0.45vw] bg-primary" />

      <div className="h-full flex flex-col px-[8vw] py-[6vh]">
        <p className="font-body text-[1.2vw] font-semibold tracking-[0.32em] uppercase text-primary mb-[1.5vh]">
          The Solution
        </p>
        <h2 className="font-display text-[4.2vw] font-bold tracking-tight text-text leading-tight mb-[3.5vh]">
          Scan. Analyse. Protect.
        </h2>

        <div className="grid grid-cols-3 gap-[2vw] mb-[2.5vh]">
          <div className="bg-surface rounded-2xl px-[2.5vw] py-[3vh] shadow-sm border border-black/5">
            <p className="font-display text-[4vw] font-bold text-primary/30 leading-none mb-[1.5vh]">
              01
            </p>
            <p className="font-body text-[1.9vw] font-semibold text-text mb-[1.2vh]">
              Scan
            </p>
            <p className="font-body text-[1.5vw] text-muted leading-relaxed">
              Photograph any ingredient list. Claude Vision reads it in seconds. Every substance explained in plain language.
            </p>
          </div>
          <div className="bg-surface rounded-2xl px-[2.5vw] py-[3vh] shadow-sm border border-black/5">
            <p className="font-display text-[4vw] font-bold text-primary/30 leading-none mb-[1.5vh]">
              02
            </p>
            <p className="font-body text-[1.9vw] font-semibold text-text mb-[1.2vh]">
              Analyse
            </p>
            <p className="font-body text-[1.5vw] text-muted leading-relaxed">
              Load your full routine. SkinScreen checks every product pair — retinol + AHA, benzoyl peroxide + vitamin C, and more.
            </p>
          </div>
          <div className="bg-surface rounded-2xl px-[2.5vw] py-[3vh] shadow-sm border border-black/5">
            <p className="font-display text-[4vw] font-bold text-primary/30 leading-none mb-[1.5vh]">
              03
            </p>
            <p className="font-body text-[1.9vw] font-semibold text-text mb-[1.2vh]">
              Protect
            </p>
            <p className="font-body text-[1.5vw] text-muted leading-relaxed">
              Green / amber / red risk rating per ingredient. EU CosIng and EWG as sources. Safer alternatives suggested automatically.
            </p>
          </div>
        </div>

        <div className="bg-text rounded-2xl px-[3vw] py-[2.5vh]">
          <p className="font-body text-[1.65vw] font-medium text-white leading-relaxed">
            Unique moat — No competitor (INCI Beauty, Think Dirty, Yuka, CosDNA) handles combination analysis. That is our defensible advantage.
          </p>
        </div>
      </div>
    </div>
  );
}
