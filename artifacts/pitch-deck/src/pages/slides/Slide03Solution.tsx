const base = import.meta.env.BASE_URL;

export default function Slide03Solution() {
  return (
    <div className="w-screen h-screen overflow-hidden relative bg-bg">
      <div className="absolute left-0 top-0 bottom-0 w-[0.45vw] bg-primary" />

      <div className="h-full flex px-[8vw] py-[6vh] gap-[4vw]">
        <div className="flex flex-col w-[44vw]">
          <p className="font-body text-[1.2vw] font-semibold tracking-[0.32em] uppercase text-primary mb-[1.5vh]">
            The Solution
          </p>
          <h2 className="font-display text-[4vw] font-bold tracking-tight text-text leading-tight mb-[3vh]">
            Scan. Analyse. Protect.
          </h2>

          <div className="flex flex-col gap-[1.8vh] mb-[2.5vh]">
            <div className="bg-surface rounded-xl px-[2vw] py-[2vh] shadow-sm border border-black/5 flex gap-[1.8vw] items-start">
              <p className="font-display text-[2.8vw] font-bold text-primary/25 leading-none shrink-0 mt-[0.3vh]">
                01
              </p>
              <div>
                <p className="font-body text-[1.6vw] font-semibold text-text mb-[0.5vh]">Scan</p>
                <p className="font-body text-[1.35vw] text-muted leading-snug">
                  Photograph any ingredient list. AI reads it instantly — every substance explained in plain language.
                </p>
              </div>
            </div>

            <div className="bg-surface rounded-xl px-[2vw] py-[2vh] shadow-sm border border-black/5 flex gap-[1.8vw] items-start">
              <p className="font-display text-[2.8vw] font-bold text-primary/25 leading-none shrink-0 mt-[0.3vh]">
                02
              </p>
              <div>
                <p className="font-body text-[1.6vw] font-semibold text-text mb-[0.5vh]">Analyse</p>
                <p className="font-body text-[1.35vw] text-muted leading-snug">
                  Load your full routine. SkinScreen checks every product pair for dangerous interactions — retinol + AHA, benzoyl peroxide, and more.
                </p>
              </div>
            </div>

            <div className="bg-surface rounded-xl px-[2vw] py-[2vh] shadow-sm border border-black/5 flex gap-[1.8vw] items-start">
              <p className="font-display text-[2.8vw] font-bold text-primary/25 leading-none shrink-0 mt-[0.3vh]">
                03
              </p>
              <div>
                <p className="font-body text-[1.6vw] font-semibold text-text mb-[0.5vh]">Protect</p>
                <p className="font-body text-[1.35vw] text-muted leading-snug">
                  Green / amber / red risk ratings. EU CosIng and EWG as sources. Safer alternatives suggested automatically.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-text rounded-xl px-[2vw] py-[2vh]">
            <p className="font-body text-[1.4vw] font-medium text-white leading-snug">
              No competitor handles combination analysis. That is our moat.
            </p>
          </div>
        </div>

        <div className="flex-1 flex items-stretch py-[1vh]">
          <div className="w-full rounded-2xl overflow-hidden shadow-2xl border border-black/8">
            <img
              src={`${base}app-landing.jpg`}
              crossOrigin="anonymous"
              className="w-full h-full object-cover object-top"
              alt="SkinScreen app"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
