import "./_tokens.css";
import {
  ShieldCheck,
  ScanLine,
  FlaskConical,
  AlertTriangle,
  Skull,
  XCircle,
  CheckCircle2,
  ArrowDown,
  Apple,
  Smartphone,
  Globe,
  Mail,
  ArrowRight,
  Bell,
  ShoppingBag,
  FileText,
} from "lucide-react";

const SAGE = "#7BAF7A";
const SAGE_STRONG = "#356E36";
const DANGER = "#EF4444";

const dangerCombos = [
  {
    pair: "Retinol + Benzoyl Peroxide",
    risk:
      "Benzoyl peroxide oxidises retinol, neutralising both actives and causing significant irritation when layered.",
    citation:
      "Nighswonger, B.D. et al. (1993). Retinoid interactions with benzoyl peroxide. J Pharm Sci.",
    severity: "HIGH RISK" as const,
  },
  {
    pair: "Retinol + AHA/BHA",
    risk:
      "Combining exfoliating acids with retinol disrupts the skin barrier, leading to redness, peeling and long-term sensitivity.",
    citation:
      "Kligman, A.M. (1988). The compatibility of combinations of glycolic acid and tretinoin.",
    severity: "HIGH RISK" as const,
  },
  {
    pair: "AHAs + No Sunscreen",
    risk:
      "AHAs thin the stratum corneum and dramatically increase UV sensitivity. Without SPF, you accelerate photo-damage.",
    citation:
      "Kornhauser, A. et al. (2010). Applications of hydroxy acids. Clin Cosmet Investig Dermatol.",
    severity: "HIGH RISK" as const,
  },
  {
    pair: "Vitamin C + Niacinamide",
    risk:
      "At high concentrations these can reduce each other's efficacy and trigger flushing in sensitive skin. Layer with care.",
    citation:
      "Wohlrab, J. & Kreft, D. (2014). Niacinamide — mechanisms of action. Skin Pharmacol Physiol.",
    severity: "CAUTION" as const,
  },
  {
    pair: "Hydroquinone + AHAs",
    risk:
      "Stacked together they cause aggressive irritation, post-inflammatory hyperpigmentation, and barrier breakdown.",
    citation:
      "Parvez, S. et al. (2006). Naturally occurring tyrosinase inhibitors. Phytother Res.",
    severity: "HIGH RISK" as const,
  },
];

function Kicker({ n, label }: { n: string; label: string }) {
  return (
    <div
      className="inline-flex items-center gap-3 mb-6"
      style={{
        fontFamily: "Inter, sans-serif",
        fontSize: 12,
        fontWeight: 700,
        letterSpacing: "0.18em",
        textTransform: "uppercase",
        color: SAGE_STRONG,
      }}
    >
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: 36,
          height: 36,
          borderRadius: 999,
          border: `1.5px solid ${SAGE_STRONG}`,
          fontSize: 13,
          fontWeight: 700,
        }}
      >
        {n}
      </span>
      <span>{label}</span>
    </div>
  );
}

export default function Hierarchy() {
  return (
    <div className="chimiq-root">
      <div style={{ background: "#FFFFFF", color: "#1A1A1F", minHeight: "100%" }}>
        {/* TOP NAV */}
        <nav
          style={{
            position: "sticky",
            top: 0,
            zIndex: 50,
            background: "rgba(255,255,255,0.92)",
            backdropFilter: "blur(10px)",
            borderBottom: "1px solid #E8F0E8",
          }}
        >
          <div
            className="mx-auto"
            style={{
              maxWidth: 1280,
              padding: "0 32px",
              height: 72,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <a href="#hero" style={{ display: "flex", alignItems: "center" }}>
              <img
                src="/images/logo-chimiq-long.png"
                alt="Chimiq"
                style={{ height: 34, width: "auto", objectFit: "contain" }}
              />
            </a>
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <button
                data-touch
                style={{
                  fontFamily: "Inter",
                  fontSize: 14,
                  fontWeight: 500,
                  color: "#1A1A1F",
                  background: "transparent",
                  border: "1px solid #E8F0E8",
                  borderRadius: 999,
                  padding: "8px 14px",
                  cursor: "pointer",
                }}
              >
                <Globe size={14} style={{ display: "inline", marginRight: 6, verticalAlign: "-2px" }} />
                EN
              </button>
              <button
                data-touch
                style={{
                  fontFamily: "Inter",
                  fontSize: 14,
                  fontWeight: 600,
                  color: "#FFFFFF",
                  background: SAGE_STRONG,
                  border: "none",
                  borderRadius: 999,
                  padding: "10px 22px",
                  cursor: "pointer",
                }}
              >
                Sign in
              </button>
            </div>
          </div>
        </nav>

        {/* HERO — editorial, single CTA */}
        <section
          id="hero"
          style={{
            position: "relative",
            minHeight: 760,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            overflow: "hidden",
            padding: "120px 32px 140px",
          }}
        >
          <img
            src="/images/hero-dark.png"
            alt=""
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
            }}
          />
          <div
            style={{
              position: "absolute",
              inset: 0,
              background:
                "linear-gradient(180deg, rgba(0,0,0,0.78) 0%, rgba(13,32,13,0.78) 100%)",
            }}
          />

          <div
            style={{
              position: "relative",
              zIndex: 2,
              maxWidth: 1080,
              width: "100%",
              textAlign: "center",
            }}
          >
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "8px 18px",
                borderRadius: 999,
                background: "rgba(255,255,255,0.08)",
                border: "1px solid rgba(255,255,255,0.18)",
                color: "rgba(255,255,255,0.78)",
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                marginBottom: 40,
              }}
            >
              <ShieldCheck size={12} color={SAGE} />
              Avoid dangerous combos
            </span>

            <h1
              style={{
                fontFamily: "'Playfair Display', Georgia, serif",
                fontSize: "clamp(48px, 7vw, 88px)",
                fontWeight: 600,
                lineHeight: 1.04,
                letterSpacing: "-0.02em",
                color: "#FFFFFF",
                margin: 0,
                marginBottom: 32,
              }}
            >
              Chimiq is the first app that catches{" "}
              <span style={{ fontStyle: "italic", color: "rgba(255,255,255,0.6)" }}>
                dangerous skincare ingredient combinations
              </span>{" "}
              — before they damage your skin.
            </h1>

            <p
              style={{
                fontFamily: "Inter, sans-serif",
                fontSize: 20,
                fontWeight: 300,
                color: "rgba(255,255,255,0.78)",
                lineHeight: 1.55,
                maxWidth: 720,
                margin: "0 auto 48px",
              }}
            >
              Scan or paste any product. Build your routine. Chimiq cross-checks every
              ingredient against peer-reviewed research and tells you what's safe to mix.
            </p>

            <div
              style={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                flexDirection: "column",
                gap: 18,
              }}
            >
              <a
                data-touch
                href="#what-it-is"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 10,
                  background: SAGE_STRONG,
                  color: "#FFFFFF",
                  padding: "20px 44px",
                  borderRadius: 999,
                  fontFamily: "Inter, sans-serif",
                  fontSize: 18,
                  fontWeight: 700,
                  letterSpacing: "-0.01em",
                  textDecoration: "none",
                  boxShadow: "0 0 60px rgba(53,110,53,0.55)",
                }}
              >
                Start free — check your routine
                <ArrowRight size={18} />
              </a>
              <a
                href="#download"
                style={{
                  fontFamily: "Inter, sans-serif",
                  fontSize: 13,
                  color: "rgba(255,255,255,0.6)",
                  textDecoration: "underline",
                  textUnderlineOffset: 4,
                }}
              >
                Or download the app ↓
              </a>
            </div>
          </div>

          {/* Scroll cue */}
          <div
            style={{
              position: "absolute",
              bottom: 36,
              left: "50%",
              transform: "translateX(-50%)",
              zIndex: 2,
              color: "rgba(255,255,255,0.4)",
              fontFamily: "Inter, sans-serif",
              fontSize: 11,
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 8,
            }}
          >
            Read on
            <ArrowDown size={14} />
          </div>
        </section>

        {/* 01 — CHIMIQ IN 30 SECONDS */}
        <section
          id="what-it-is"
          style={{
            background: "#FFFFFF",
            padding: "140px 32px",
          }}
        >
          <div className="mx-auto" style={{ maxWidth: 1080 }}>
            <Kicker n="01" label="What it is" />
            <h2
              style={{
                fontFamily: "'Playfair Display', Georgia, serif",
                fontSize: "clamp(34px, 4.5vw, 56px)",
                fontWeight: 600,
                lineHeight: 1.1,
                letterSpacing: "-0.015em",
                margin: "0 0 24px",
                maxWidth: 880,
              }}
            >
              Chimiq in 30 seconds.
            </h2>
            <p
              style={{
                fontFamily: "Inter, sans-serif",
                fontSize: 19,
                lineHeight: 1.65,
                color: "#4B5563",
                maxWidth: 720,
                marginBottom: 72,
              }}
            >
              Skincare actives can fight, neutralise or burn each other when layered. Chimiq
              is the safety layer between you and your bathroom shelf.
            </p>

            <ol
              style={{
                listStyle: "none",
                padding: 0,
                margin: 0,
                display: "grid",
                gridTemplateColumns: "1fr",
                gap: 32,
              }}
            >
              {[
                {
                  n: "1",
                  title: "Scan or paste any product label.",
                  body: "Snap the back of the bottle, or paste an INCI list. Chimiq parses the ingredients in seconds.",
                },
                {
                  n: "2",
                  title: "Add it to your routine.",
                  body: "Build your morning and evening shelves so Chimiq knows what actually touches your face — not just what you bought.",
                },
                {
                  n: "3",
                  title: "See every conflict, with citations.",
                  body: "Chimiq cross-checks every pair against published dermatology research and shows you the risks in plain English.",
                },
              ].map((step) => (
                <li
                  key={step.n}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "120px 1fr",
                    gap: 32,
                    padding: "32px 0",
                    borderTop: "1px solid #E8F0E8",
                  }}
                >
                  <div
                    style={{
                      fontFamily: "'Playfair Display', Georgia, serif",
                      fontSize: 64,
                      fontWeight: 500,
                      color: SAGE,
                      lineHeight: 1,
                      fontStyle: "italic",
                    }}
                  >
                    {step.n}
                  </div>
                  <div>
                    <h3
                      style={{
                        fontFamily: "'Playfair Display', Georgia, serif",
                        fontSize: 30,
                        fontWeight: 600,
                        margin: "0 0 12px",
                        letterSpacing: "-0.01em",
                      }}
                    >
                      {step.title}
                    </h3>
                    <p
                      style={{
                        fontFamily: "Inter, sans-serif",
                        fontSize: 17,
                        lineHeight: 1.65,
                        color: "#4B5563",
                        margin: 0,
                        maxWidth: 600,
                      }}
                    >
                      {step.body}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* 02 — WHAT WE CATCH (pills moved out of hero) */}
        <section style={{ background: "#F7FAF7", padding: "140px 32px" }}>
          <div className="mx-auto" style={{ maxWidth: 1080 }}>
            <Kicker n="02" label="What we catch" />
            <h2
              style={{
                fontFamily: "'Playfair Display', Georgia, serif",
                fontSize: "clamp(34px, 4.5vw, 56px)",
                fontWeight: 600,
                lineHeight: 1.1,
                letterSpacing: "-0.015em",
                margin: "0 0 24px",
                maxWidth: 880,
              }}
            >
              The ingredients people layer{" "}
              <span style={{ fontStyle: "italic", color: "#6B7280" }}>
                without realising they're at war.
              </span>
            </h2>
            <p
              style={{
                fontFamily: "Inter, sans-serif",
                fontSize: 19,
                lineHeight: 1.65,
                color: "#4B5563",
                maxWidth: 720,
                marginBottom: 56,
              }}
            >
              These six are the most common offenders in routines we scan. Three of them
              shouldn't share a shelf — let alone a face — without supervision.
            </p>

            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 14,
              }}
            >
              {[
                { name: "Retinol", conflict: true },
                { name: "Benzoyl Peroxide", conflict: true },
                { name: "Glycolic Acid", conflict: true },
                { name: "Niacinamide", conflict: false },
                { name: "Vitamin C", conflict: false },
                { name: "AHA / BHA", conflict: false },
              ].map((ing) => (
                <span
                  key={ing.name}
                  style={{
                    position: "relative",
                    display: "inline-flex",
                    alignItems: "center",
                    padding: "14px 22px",
                    borderRadius: 999,
                    background: "#FFFFFF",
                    border: "1px solid #DCE9DC",
                    fontFamily: "Inter, sans-serif",
                    fontSize: 16,
                    fontWeight: 500,
                    color: "#1A1A1F",
                  }}
                >
                  {ing.name}
                  {ing.conflict && (
                    <span
                      style={{
                        position: "absolute",
                        top: -10,
                        right: -8,
                        background: DANGER,
                        color: "#FFFFFF",
                        fontSize: 10,
                        fontWeight: 800,
                        letterSpacing: "0.05em",
                        padding: "3px 8px",
                        borderRadius: 999,
                        whiteSpace: "nowrap",
                      }}
                    >
                      ⚠ CONFLICT
                    </span>
                  )}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* 03 — THE PROBLEM (Danger combos) */}
        <section
          id="danger"
          style={{ background: "#FAFAF8", padding: "140px 32px" }}
        >
          <div className="mx-auto" style={{ maxWidth: 1080 }}>
            <Kicker n="03" label="The problem" />
            <h2
              style={{
                fontFamily: "'Playfair Display', Georgia, serif",
                fontSize: "clamp(34px, 4.5vw, 56px)",
                fontWeight: 600,
                lineHeight: 1.1,
                letterSpacing: "-0.015em",
                margin: "0 0 24px",
                maxWidth: 880,
              }}
            >
              What you don't know{" "}
              <span style={{ fontStyle: "italic", color: "#6B7280" }}>
                can hurt your skin.
              </span>
            </h2>
            <p
              style={{
                fontFamily: "Inter, sans-serif",
                fontSize: 19,
                lineHeight: 1.65,
                color: "#4B5563",
                maxWidth: 720,
                marginBottom: 64,
              }}
            >
              Five of the most common — and most damaging — pairings we see in real
              routines. Every claim is backed by a primary source.
            </p>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr",
                gap: 20,
              }}
            >
              {dangerCombos.map((c) => (
                <article
                  key={c.pair}
                  style={{
                    background: "#FFFFFF",
                    border: "1px solid #F1E2E2",
                    borderRadius: 24,
                    padding: 36,
                    display: "grid",
                    gridTemplateColumns: "200px 1fr",
                    gap: 36,
                    alignItems: "start",
                  }}
                >
                  <div>
                    <span
                      style={{
                        display: "inline-block",
                        background:
                          c.severity === "HIGH RISK" ? DANGER : "#F59E0B",
                        color: "#FFFFFF",
                        fontSize: 10,
                        fontWeight: 800,
                        letterSpacing: "0.1em",
                        padding: "5px 10px",
                        borderRadius: 6,
                        marginBottom: 14,
                      }}
                    >
                      {c.severity}
                    </span>
                    <h3
                      style={{
                        fontFamily: "'Playfair Display', Georgia, serif",
                        fontSize: 26,
                        fontWeight: 600,
                        margin: 0,
                        lineHeight: 1.1,
                        letterSpacing: "-0.01em",
                        color: "#7F1D1D",
                      }}
                    >
                      {c.pair}
                    </h3>
                  </div>
                  <div>
                    <p
                      style={{
                        fontFamily: "Inter, sans-serif",
                        fontSize: 17,
                        lineHeight: 1.65,
                        color: "#374151",
                        margin: "0 0 18px",
                      }}
                    >
                      {c.risk}
                    </p>
                    <p
                      style={{
                        fontFamily: "Inter, sans-serif",
                        fontSize: 13,
                        color: "#6B7280",
                        margin: 0,
                        fontStyle: "italic",
                      }}
                    >
                      {c.citation}
                    </p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* 04 — HOW IT WORKS */}
        <section style={{ background: "#FFFFFF", padding: "140px 32px" }}>
          <div className="mx-auto" style={{ maxWidth: 1080 }}>
            <Kicker n="04" label="How it works" />
            <h2
              style={{
                fontFamily: "'Playfair Display', Georgia, serif",
                fontSize: "clamp(34px, 4.5vw, 56px)",
                fontWeight: 600,
                lineHeight: 1.1,
                letterSpacing: "-0.015em",
                margin: "0 0 24px",
                maxWidth: 880,
              }}
            >
              Three steps. Seconds. No guesswork.
            </h2>
            <p
              style={{
                fontFamily: "Inter, sans-serif",
                fontSize: 19,
                lineHeight: 1.65,
                color: "#4B5563",
                maxWidth: 720,
                marginBottom: 72,
              }}
            >
              The same workflow whether you're checking a single product or your full
              shelf.
            </p>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: 32,
              }}
            >
              {[
                {
                  title: "Scan or paste",
                  body: "Snap the back of any bottle or paste an INCI list. Chimiq parses every ingredient instantly.",
                },
                {
                  title: "Build your routine",
                  body: "Save what you actually use. Chimiq learns your shelf and watches for new conflicts as you add more.",
                },
                {
                  title: "See the risks",
                  body: "Get a clear, ranked list of conflicts with the science explained — not just a green or red dot.",
                },
              ].map((step, i) => (
                <div
                  key={step.title}
                  style={{
                    background: "#F7FAF7",
                    borderRadius: 20,
                    padding: 36,
                  }}
                >
                  <div
                    style={{
                      fontFamily: "'Playfair Display', Georgia, serif",
                      fontSize: 14,
                      letterSpacing: "0.2em",
                      color: SAGE_STRONG,
                      fontWeight: 700,
                      marginBottom: 24,
                    }}
                  >
                    STEP 0{i + 1}
                  </div>
                  <h3
                    style={{
                      fontFamily: "'Playfair Display', Georgia, serif",
                      fontSize: 26,
                      fontWeight: 600,
                      margin: "0 0 14px",
                      letterSpacing: "-0.01em",
                    }}
                  >
                    {step.title}
                  </h3>
                  <p
                    style={{
                      fontFamily: "Inter, sans-serif",
                      fontSize: 16,
                      lineHeight: 1.6,
                      color: "#4B5563",
                      margin: 0,
                    }}
                  >
                    {step.body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 05 — SEE IT WORK (scanner stub + disaster mix) */}
        <section
          id="see-it"
          style={{ background: "#F5F5F7", padding: "140px 32px" }}
        >
          <div className="mx-auto" style={{ maxWidth: 1080 }}>
            <Kicker n="05" label="See it work" />
            <h2
              style={{
                fontFamily: "'Playfair Display', Georgia, serif",
                fontSize: "clamp(34px, 4.5vw, 56px)",
                fontWeight: 600,
                lineHeight: 1.1,
                letterSpacing: "-0.015em",
                margin: "0 0 24px",
                maxWidth: 880,
              }}
            >
              Try the scanner.
            </h2>
            <p
              style={{
                fontFamily: "Inter, sans-serif",
                fontSize: 19,
                lineHeight: 1.65,
                color: "#4B5563",
                maxWidth: 720,
                marginBottom: 56,
              }}
            >
              Paste any ingredient list — or use the classic "disaster routine" example
              below — and see exactly what Chimiq sees.
            </p>

            {/* Scanner card stub */}
            <div
              style={{
                background: "#F7FAF7",
                border: "1px solid #DCE9DC",
                borderRadius: 24,
                padding: 40,
                marginBottom: 80,
                boxShadow: "0 4px 32px rgba(0,0,0,0.05)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  marginBottom: 20,
                }}
              >
                <ScanLine size={20} color={SAGE_STRONG} />
                <span
                  style={{
                    fontFamily: "Inter, sans-serif",
                    fontSize: 13,
                    fontWeight: 600,
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    color: SAGE_STRONG,
                  }}
                >
                  Ingredient Scanner
                </span>
              </div>
              <textarea
                disabled
                rows={4}
                defaultValue="Aqua, Niacinamide, Retinol, Glycolic Acid, Salicylic Acid, Benzoyl Peroxide, Tocopherol, Phenoxyethanol…"
                style={{
                  width: "100%",
                  borderRadius: 14,
                  border: "1px solid #DCE9DC",
                  background: "#FFFFFF",
                  padding: 18,
                  fontFamily: "Inter, sans-serif",
                  fontSize: 15,
                  color: "#374151",
                  lineHeight: 1.55,
                  resize: "none",
                  outline: "none",
                }}
              />
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginTop: 20,
                  flexWrap: "wrap",
                  gap: 16,
                }}
              >
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <span
                    style={{
                      background: "#FEE2E2",
                      color: "#991B1B",
                      borderRadius: 8,
                      padding: "6px 12px",
                      fontFamily: "Inter, sans-serif",
                      fontSize: 12,
                      fontWeight: 700,
                    }}
                  >
                    2 high-risk conflicts
                  </span>
                  <span
                    style={{
                      background: "#FEF3C7",
                      color: "#92400E",
                      borderRadius: 8,
                      padding: "6px 12px",
                      fontFamily: "Inter, sans-serif",
                      fontSize: 12,
                      fontWeight: 700,
                    }}
                  >
                    1 caution
                  </span>
                </div>
                <button
                  data-touch
                  style={{
                    background: SAGE_STRONG,
                    color: "#FFFFFF",
                    border: "none",
                    borderRadius: 999,
                    padding: "14px 28px",
                    fontFamily: "Inter, sans-serif",
                    fontSize: 15,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  Analyse ingredients
                </button>
              </div>
            </div>

            {/* Disaster mix */}
            <div
              style={{
                background: "#FFFFFF",
                border: "1px solid #FECACA",
                borderRadius: 24,
                padding: 40,
              }}
            >
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  background: "#FEE2E2",
                  color: "#B91C1C",
                  borderRadius: 999,
                  padding: "6px 14px",
                  fontFamily: "Inter, sans-serif",
                  fontSize: 12,
                  fontWeight: 700,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  marginBottom: 24,
                }}
              >
                <Skull size={14} /> Real-world example
              </div>
              <h3
                style={{
                  fontFamily: "'Playfair Display', Georgia, serif",
                  fontSize: 36,
                  fontWeight: 600,
                  margin: "0 0 16px",
                  lineHeight: 1.15,
                  letterSpacing: "-0.01em",
                }}
              >
                The disaster routine{" "}
                <span style={{ fontStyle: "italic", color: DANGER }}>
                  thousands of people use.
                </span>
              </h3>
              <p
                style={{
                  fontFamily: "Inter, sans-serif",
                  fontSize: 17,
                  lineHeight: 1.65,
                  color: "#4B5563",
                  margin: "0 0 36px",
                  maxWidth: 720,
                }}
              >
                Three popular The Ordinary products that should never share a routine.
                Chimiq flags this combo on the first scan.
              </p>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3, 1fr)",
                  gap: 20,
                  marginBottom: 32,
                }}
              >
                {[
                  { name: "Retinol 1% in Squalane", role: "PM serum" },
                  { name: "Salicylic Acid 2%", role: "AM/PM" },
                  { name: "AHA 30% + BHA 2%", role: "PM exfoliant" },
                ].map((p) => (
                  <div
                    key={p.name}
                    style={{
                      background: "#FAFAF8",
                      border: "1px solid #FECACA",
                      borderRadius: 16,
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        height: 140,
                        background: "#F3F4F6",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        position: "relative",
                      }}
                    >
                      <FlaskConical size={48} color="#9CA3AF" />
                      <span
                        style={{
                          position: "absolute",
                          top: 10,
                          right: 10,
                          background: DANGER,
                          color: "#FFFFFF",
                          fontSize: 9,
                          fontWeight: 800,
                          letterSpacing: "0.06em",
                          textTransform: "uppercase",
                          padding: "4px 10px",
                          borderRadius: 999,
                        }}
                      >
                        {p.role}
                      </span>
                    </div>
                    <div style={{ padding: 16 }}>
                      <p
                        style={{
                          fontFamily: "Inter, sans-serif",
                          fontSize: 10,
                          fontWeight: 700,
                          letterSpacing: "0.12em",
                          textTransform: "uppercase",
                          color: "#6B7280",
                          margin: "0 0 4px",
                        }}
                      >
                        The Ordinary
                      </p>
                      <p
                        style={{
                          fontFamily: "'Playfair Display', Georgia, serif",
                          fontSize: 16,
                          fontWeight: 600,
                          margin: 0,
                          lineHeight: 1.25,
                        }}
                      >
                        {p.name}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <div
                style={{
                  background: "#FEF2F2",
                  border: "1px solid #FECACA",
                  borderRadius: 16,
                  padding: 20,
                  display: "flex",
                  gap: 14,
                  alignItems: "flex-start",
                }}
              >
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 10,
                    background: DANGER,
                    color: "#FFFFFF",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <XCircle size={18} />
                </div>
                <div>
                  <p
                    style={{
                      fontFamily: "Inter, sans-serif",
                      fontSize: 15,
                      fontWeight: 700,
                      color: "#991B1B",
                      margin: "0 0 4px",
                    }}
                  >
                    Barrier destruction guaranteed.
                  </p>
                  <p
                    style={{
                      fontFamily: "Inter, sans-serif",
                      fontSize: 14,
                      color: "#B91C1C",
                      margin: 0,
                      lineHeight: 1.55,
                    }}
                  >
                    Stacking retinol with two exfoliating acids strips the stratum corneum,
                    triggering peeling, redness and long-term sensitivity.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 06 — SOCIAL PROOF */}
        <section style={{ background: "#FFFFFF", padding: "140px 32px" }}>
          <div className="mx-auto" style={{ maxWidth: 1080 }}>
            <Kicker n="06" label="Trusted by" />
            <h2
              style={{
                fontFamily: "'Playfair Display', Georgia, serif",
                fontSize: "clamp(34px, 4.5vw, 56px)",
                fontWeight: 600,
                lineHeight: 1.1,
                letterSpacing: "-0.015em",
                margin: "0 0 56px",
                maxWidth: 880,
              }}
            >
              Real numbers from real shelves.
            </h2>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: 0,
                borderTop: "1px solid #E8F0E8",
                borderBottom: "1px solid #E8F0E8",
              }}
            >
              {[
                { stat: "184,200+", label: "Routines analysed" },
                { stat: "62,000+", label: "Products in our database" },
                { stat: "1,400+", label: "Conflict pairs catalogued" },
              ].map((s, i) => (
                <div
                  key={s.label}
                  style={{
                    padding: "56px 32px",
                    borderLeft: i === 0 ? "none" : "1px solid #E8F0E8",
                  }}
                >
                  <div
                    style={{
                      fontFamily: "'Playfair Display', Georgia, serif",
                      fontSize: 56,
                      fontWeight: 600,
                      color: SAGE_STRONG,
                      lineHeight: 1,
                      marginBottom: 16,
                      letterSpacing: "-0.02em",
                    }}
                  >
                    {s.stat}
                  </div>
                  <div
                    style={{
                      fontFamily: "Inter, sans-serif",
                      fontSize: 14,
                      fontWeight: 600,
                      letterSpacing: "0.1em",
                      textTransform: "uppercase",
                      color: "#6B7280",
                    }}
                  >
                    {s.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 07 — MY SHELF */}
        <section style={{ background: "#F7FAF7", padding: "140px 32px" }}>
          <div className="mx-auto" style={{ maxWidth: 1080 }}>
            <Kicker n="07" label="Your shelf" />
            <h2
              style={{
                fontFamily: "'Playfair Display', Georgia, serif",
                fontSize: "clamp(34px, 4.5vw, 56px)",
                fontWeight: 600,
                lineHeight: 1.1,
                letterSpacing: "-0.015em",
                margin: "0 0 24px",
                maxWidth: 880,
              }}
            >
              Save your routine.{" "}
              <span style={{ fontStyle: "italic", color: "#6B7280" }}>
                Get gentle reminders.
              </span>
            </h2>
            <p
              style={{
                fontFamily: "Inter, sans-serif",
                fontSize: 19,
                lineHeight: 1.65,
                color: "#4B5563",
                maxWidth: 720,
                marginBottom: 56,
              }}
            >
              Your private shelf — separated by AM and PM, watched for new conflicts every
              time you add a product.
            </p>

            <div
              style={{
                background: "#FFFFFF",
                borderRadius: 24,
                border: "1px solid #E8F0E8",
                padding: 40,
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 40,
              }}
            >
              <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                {[
                  { Icon: ShoppingBag, text: "Save your morning + evening shelves" },
                  { Icon: Bell, text: "Reminders when products expire" },
                  { Icon: FileText, text: "PDF safety report for your dermatologist" },
                  { Icon: CheckCircle2, text: "Conflict alerts as you add new items" },
                ].map(({ Icon, text }) => (
                  <li
                    key={text}
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 14,
                      padding: "16px 0",
                      borderBottom: "1px solid #F3F4F6",
                      fontFamily: "Inter, sans-serif",
                      fontSize: 16,
                      lineHeight: 1.5,
                      color: "#1A1A1F",
                    }}
                  >
                    <span
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 10,
                        background: "#F0F7F0",
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      <Icon size={16} color={SAGE_STRONG} />
                    </span>
                    {text}
                  </li>
                ))}
              </ul>

              {/* shelf preview stub */}
              <div
                style={{
                  background: "#FAFAF8",
                  borderRadius: 16,
                  border: "1px solid #E8F0E8",
                  padding: 24,
                }}
              >
                <p
                  style={{
                    fontFamily: "Inter, sans-serif",
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: "0.14em",
                    textTransform: "uppercase",
                    color: SAGE_STRONG,
                    margin: "0 0 16px",
                  }}
                >
                  PM Shelf · 4 items
                </p>
                {["CeraVe Hydrating Cleanser", "The Ordinary Retinol 1%", "La Roche-Posay Toleriane", "CeraVe PM Lotion"].map(
                  (p, i) => (
                    <div
                      key={p}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        padding: "12px 0",
                        borderTop: i === 0 ? "none" : "1px solid #E8F0E8",
                      }}
                    >
                      <span
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: 8,
                          background: "#FFFFFF",
                          border: "1px solid #E8F0E8",
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                        }}
                      >
                        <FlaskConical size={14} color="#9CA3AF" />
                      </span>
                      <span
                        style={{
                          fontFamily: "Inter, sans-serif",
                          fontSize: 14,
                          color: "#1A1A1F",
                          flex: 1,
                        }}
                      >
                        {p}
                      </span>
                      <CheckCircle2 size={16} color={SAGE} />
                    </div>
                  ),
                )}
              </div>
            </div>
          </div>
        </section>

        {/* 08 — PRICING */}
        <section style={{ background: "#FFFFFF", padding: "140px 32px" }}>
          <div className="mx-auto" style={{ maxWidth: 1080 }}>
            <Kicker n="08" label="Plan options" />
            <h2
              style={{
                fontFamily: "'Playfair Display', Georgia, serif",
                fontSize: "clamp(34px, 4.5vw, 56px)",
                fontWeight: 600,
                lineHeight: 1.1,
                letterSpacing: "-0.015em",
                margin: "0 0 56px",
                maxWidth: 880,
              }}
            >
              Free forever.{" "}
              <span style={{ fontStyle: "italic", color: "#6B7280" }}>
                Premium when you need more.
              </span>
            </h2>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 24,
              }}
            >
              {[
                {
                  name: "Free",
                  price: "0",
                  desc: "Everything you need to start checking your routine.",
                  features: [
                    "Unlimited single-product scans",
                    "Save up to 10 products on your shelf",
                    "All danger-pair alerts",
                  ],
                  cta: "Start free",
                  highlight: false,
                },
                {
                  name: "Premium",
                  price: "49 SEK / mo",
                  desc: "For full routines — with a 7-day free trial.",
                  features: [
                    "Unlimited shelf",
                    "Full routine cross-check",
                    "AI Chat with Chimiq",
                    "PDF Safety Report",
                  ],
                  cta: "Start 7-day free trial",
                  highlight: true,
                },
              ].map((p) => (
                <div
                  key={p.name}
                  style={{
                    background: p.highlight ? SAGE_STRONG : "#F7FAF7",
                    color: p.highlight ? "#FFFFFF" : "#1A1A1F",
                    borderRadius: 24,
                    padding: 40,
                    border: p.highlight ? "none" : "1px solid #E8F0E8",
                  }}
                >
                  <p
                    style={{
                      fontFamily: "Inter, sans-serif",
                      fontSize: 12,
                      fontWeight: 700,
                      letterSpacing: "0.16em",
                      textTransform: "uppercase",
                      color: p.highlight ? "rgba(255,255,255,0.7)" : SAGE_STRONG,
                      margin: "0 0 20px",
                    }}
                  >
                    {p.name}
                  </p>
                  <p
                    style={{
                      fontFamily: "'Playfair Display', Georgia, serif",
                      fontSize: 48,
                      fontWeight: 600,
                      letterSpacing: "-0.02em",
                      margin: "0 0 12px",
                      lineHeight: 1,
                    }}
                  >
                    {p.price}
                  </p>
                  <p
                    style={{
                      fontFamily: "Inter, sans-serif",
                      fontSize: 16,
                      lineHeight: 1.55,
                      color: p.highlight ? "rgba(255,255,255,0.78)" : "#4B5563",
                      margin: "0 0 28px",
                    }}
                  >
                    {p.desc}
                  </p>
                  <ul style={{ listStyle: "none", padding: 0, margin: "0 0 32px" }}>
                    {p.features.map((f) => (
                      <li
                        key={f}
                        style={{
                          display: "flex",
                          alignItems: "flex-start",
                          gap: 10,
                          padding: "8px 0",
                          fontFamily: "Inter, sans-serif",
                          fontSize: 15,
                          lineHeight: 1.5,
                        }}
                      >
                        <CheckCircle2
                          size={18}
                          color={p.highlight ? "#FFFFFF" : SAGE_STRONG}
                          style={{ flexShrink: 0, marginTop: 2 }}
                        />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <button
                    data-touch
                    style={{
                      width: "100%",
                      background: p.highlight ? "#FFFFFF" : SAGE_STRONG,
                      color: p.highlight ? SAGE_STRONG : "#FFFFFF",
                      border: "none",
                      borderRadius: 999,
                      padding: "16px 24px",
                      fontFamily: "Inter, sans-serif",
                      fontSize: 16,
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    {p.cta}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 09 — EARN PREMIUM */}
        <section style={{ background: "#FAFAF8", padding: "140px 32px" }}>
          <div className="mx-auto" style={{ maxWidth: 1080 }}>
            <Kicker n="09" label="Earn it free" />
            <h2
              style={{
                fontFamily: "'Playfair Display', Georgia, serif",
                fontSize: "clamp(34px, 4.5vw, 56px)",
                fontWeight: 600,
                lineHeight: 1.1,
                letterSpacing: "-0.015em",
                margin: "0 0 24px",
                maxWidth: 880,
              }}
            >
              Build the database.{" "}
              <span style={{ fontStyle: "italic", color: "#6B7280" }}>
                Earn free Premium.
              </span>
            </h2>
            <p
              style={{
                fontFamily: "Inter, sans-serif",
                fontSize: 19,
                lineHeight: 1.65,
                color: "#4B5563",
                maxWidth: 720,
                margin: 0,
              }}
            >
              Contribute reviews and ingredient data on missing products. Every 10
              contributions unlocks a free month of Premium. Help the community, save your
              shelf.
            </p>
          </div>
        </section>

        {/* 10 — DOWNLOAD APP — promoted hero-scale */}
        <section
          id="download"
          style={{
            background: SAGE_STRONG,
            color: "#FFFFFF",
            padding: "180px 32px",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div
            className="mx-auto"
            style={{
              maxWidth: 1080,
              display: "grid",
              gridTemplateColumns: "1.4fr 1fr",
              gap: 64,
              alignItems: "center",
              position: "relative",
              zIndex: 2,
            }}
          >
            <div>
              <Kicker n="10" label="Download the app" />
              <h2
                style={{
                  fontFamily: "'Playfair Display', Georgia, serif",
                  fontSize: "clamp(48px, 6vw, 80px)",
                  fontWeight: 600,
                  lineHeight: 1.02,
                  letterSpacing: "-0.02em",
                  color: "#FFFFFF",
                  margin: "0 0 28px",
                }}
              >
                Get Chimiq{" "}
                <span style={{ fontStyle: "italic", color: "rgba(255,255,255,0.65)" }}>
                  on your phone.
                </span>
              </h2>
              <p
                style={{
                  fontFamily: "Inter, sans-serif",
                  fontSize: 20,
                  lineHeight: 1.6,
                  color: "rgba(255,255,255,0.8)",
                  margin: "0 0 44px",
                  maxWidth: 540,
                }}
              >
                Scan a bottle the second you pick it up at the pharmacy. Available on iOS
                and Android — and as a web app today.
              </p>

              <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 28 }}>
                <a
                  data-touch
                  href="#"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 14,
                    background: "#FFFFFF",
                    color: SAGE_STRONG,
                    padding: "20px 28px",
                    borderRadius: 16,
                    textDecoration: "none",
                    minWidth: 220,
                  }}
                >
                  <Apple size={32} />
                  <div>
                    <div
                      style={{
                        fontFamily: "Inter, sans-serif",
                        fontSize: 11,
                        fontWeight: 500,
                        letterSpacing: "0.05em",
                        textTransform: "uppercase",
                        opacity: 0.7,
                      }}
                    >
                      Coming soon to
                    </div>
                    <div
                      style={{
                        fontFamily: "Inter, sans-serif",
                        fontSize: 18,
                        fontWeight: 700,
                        letterSpacing: "-0.01em",
                      }}
                    >
                      App Store
                    </div>
                  </div>
                </a>
                <a
                  data-touch
                  href="#"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 14,
                    background: "#FFFFFF",
                    color: SAGE_STRONG,
                    padding: "20px 28px",
                    borderRadius: 16,
                    textDecoration: "none",
                    minWidth: 220,
                  }}
                >
                  <Smartphone size={32} />
                  <div>
                    <div
                      style={{
                        fontFamily: "Inter, sans-serif",
                        fontSize: 11,
                        fontWeight: 500,
                        letterSpacing: "0.05em",
                        textTransform: "uppercase",
                        opacity: 0.7,
                      }}
                    >
                      Coming soon to
                    </div>
                    <div
                      style={{
                        fontFamily: "Inter, sans-serif",
                        fontSize: 18,
                        fontWeight: 700,
                        letterSpacing: "-0.01em",
                      }}
                    >
                      Google Play
                    </div>
                  </div>
                </a>
              </div>

              <a
                href="#"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  fontFamily: "Inter, sans-serif",
                  fontSize: 15,
                  fontWeight: 500,
                  color: "#FFFFFF",
                  textDecoration: "underline",
                  textUnderlineOffset: 4,
                }}
              >
                Use the web app now <ArrowRight size={14} />
              </a>

              <div
                style={{
                  marginTop: 40,
                  paddingTop: 32,
                  borderTop: "1px solid rgba(255,255,255,0.18)",
                  maxWidth: 480,
                }}
              >
                <p
                  style={{
                    fontFamily: "Inter, sans-serif",
                    fontSize: 13,
                    color: "rgba(255,255,255,0.65)",
                    margin: "0 0 12px",
                  }}
                >
                  Email me when it's live
                </p>
                <form style={{ display: "flex", gap: 8 }}>
                  <input
                    type="email"
                    placeholder="you@example.com"
                    style={{
                      flex: 1,
                      borderRadius: 999,
                      border: "1px solid rgba(255,255,255,0.3)",
                      background: "rgba(255,255,255,0.08)",
                      padding: "14px 20px",
                      fontFamily: "Inter, sans-serif",
                      fontSize: 14,
                      color: "#FFFFFF",
                      outline: "none",
                    }}
                  />
                  <button
                    data-touch
                    type="submit"
                    style={{
                      background: "#FFFFFF",
                      color: SAGE_STRONG,
                      border: "none",
                      borderRadius: 999,
                      padding: "14px 22px",
                      fontFamily: "Inter, sans-serif",
                      fontSize: 14,
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    Notify me
                  </button>
                </form>
              </div>
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <div
                style={{
                  background: "rgba(255,255,255,0.08)",
                  borderRadius: 48,
                  padding: 56,
                  border: "1px solid rgba(255,255,255,0.18)",
                }}
              >
                <img
                  src="/images/app-icon.png"
                  alt="Chimiq app icon"
                  style={{
                    width: 220,
                    height: 220,
                    borderRadius: 48,
                    objectFit: "cover",
                    boxShadow: "0 20px 60px rgba(0,0,0,0.4)",
                  }}
                />
              </div>
            </div>
          </div>
        </section>

        {/* FOOTER */}
        <footer
          style={{
            background: "#0F1F0F",
            color: "rgba(255,255,255,0.78)",
            padding: "80px 32px 56px",
          }}
        >
          <div
            className="mx-auto"
            style={{
              maxWidth: 1080,
              display: "grid",
              gridTemplateColumns: "1.4fr 1fr 1fr",
              gap: 56,
              marginBottom: 56,
            }}
          >
            <div>
              <h3
                style={{
                  fontFamily: "'Playfair Display', Georgia, serif",
                  fontSize: 22,
                  fontWeight: 600,
                  color: "#FFFFFF",
                  margin: "0 0 18px",
                }}
              >
                Get in touch
              </h3>
              <form style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <input
                  type="text"
                  placeholder="Your name"
                  style={{
                    background: "rgba(255,255,255,0.06)",
                    border: "1px solid rgba(255,255,255,0.15)",
                    borderRadius: 12,
                    padding: "12px 16px",
                    color: "#FFFFFF",
                    fontFamily: "Inter, sans-serif",
                    fontSize: 14,
                    outline: "none",
                  }}
                />
                <input
                  type="email"
                  placeholder="Your email"
                  style={{
                    background: "rgba(255,255,255,0.06)",
                    border: "1px solid rgba(255,255,255,0.15)",
                    borderRadius: 12,
                    padding: "12px 16px",
                    color: "#FFFFFF",
                    fontFamily: "Inter, sans-serif",
                    fontSize: 14,
                    outline: "none",
                  }}
                />
                <textarea
                  placeholder="What's on your mind?"
                  rows={3}
                  style={{
                    background: "rgba(255,255,255,0.06)",
                    border: "1px solid rgba(255,255,255,0.15)",
                    borderRadius: 12,
                    padding: "12px 16px",
                    color: "#FFFFFF",
                    fontFamily: "Inter, sans-serif",
                    fontSize: 14,
                    outline: "none",
                    resize: "none",
                  }}
                />
                <button
                  data-touch
                  type="submit"
                  style={{
                    background: SAGE,
                    color: "#0F1F0F",
                    border: "none",
                    borderRadius: 12,
                    padding: "12px 20px",
                    fontFamily: "Inter, sans-serif",
                    fontSize: 14,
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  Send
                </button>
              </form>
            </div>

            <div>
              <h4
                style={{
                  fontFamily: "Inter, sans-serif",
                  fontSize: 12,
                  fontWeight: 700,
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                  color: "#FFFFFF",
                  margin: "0 0 18px",
                }}
              >
                Product
              </h4>
              <ul style={{ listStyle: "none", padding: 0, margin: 0, lineHeight: 2.2, fontSize: 14 }}>
                <li><a href="#what-it-is" style={{ color: "inherit", textDecoration: "none" }}>How it works</a></li>
                <li><a href="#see-it" style={{ color: "inherit", textDecoration: "none" }}>Try the scanner</a></li>
                <li><a href="#download" style={{ color: "inherit", textDecoration: "none" }}>Download the app</a></li>
              </ul>
            </div>

            <div>
              <h4
                style={{
                  fontFamily: "Inter, sans-serif",
                  fontSize: 12,
                  fontWeight: 700,
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                  color: "#FFFFFF",
                  margin: "0 0 18px",
                }}
              >
                Legal
              </h4>
              <ul style={{ listStyle: "none", padding: 0, margin: 0, lineHeight: 2.2, fontSize: 14 }}>
                <li><a href="#" style={{ color: "inherit", textDecoration: "none" }}>Privacy Policy</a></li>
                <li><a href="#" style={{ color: "inherit", textDecoration: "none" }}>Terms of Service</a></li>
                <li><a href="#" style={{ color: "inherit", textDecoration: "none" }}>Medical Disclaimer</a></li>
              </ul>
            </div>
          </div>
          <div
            className="mx-auto"
            style={{
              maxWidth: 1080,
              borderTop: "1px solid rgba(255,255,255,0.12)",
              paddingTop: 28,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              fontSize: 12,
              color: "rgba(255,255,255,0.5)",
              fontFamily: "Inter, sans-serif",
            }}
          >
            <span>© Chimiq. Beautiful skin starts with safe chemistry.</span>
            <a
              href="mailto:pia@chimiq.com"
              style={{ color: "inherit", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 6 }}
            >
              <Mail size={14} /> pia@chimiq.com
            </a>
          </div>
        </footer>

        {/* STICKY DOWNLOAD BAR */}
        <div
          style={{
            position: "fixed",
            bottom: 16,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 60,
            background: SAGE_STRONG,
            color: "#FFFFFF",
            padding: "10px 14px 10px 22px",
            borderRadius: 999,
            display: "flex",
            alignItems: "center",
            gap: 16,
            boxShadow: "0 12px 40px rgba(0,0,0,0.25)",
            border: "1px solid rgba(255,255,255,0.2)",
            maxWidth: "calc(100% - 32px)",
          }}
        >
          <img
            src="/images/app-icon.png"
            alt=""
            style={{ width: 32, height: 32, borderRadius: 8 }}
          />
          <span
            style={{
              fontFamily: "Inter, sans-serif",
              fontSize: 14,
              fontWeight: 600,
              whiteSpace: "nowrap",
            }}
          >
            Download the Chimiq app
          </span>
          <a
            data-touch
            href="#download"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              background: "#FFFFFF",
              color: SAGE_STRONG,
              padding: "8px 16px",
              borderRadius: 999,
              fontFamily: "Inter, sans-serif",
              fontSize: 13,
              fontWeight: 700,
              textDecoration: "none",
            }}
          >
            <Apple size={14} /> iOS
          </a>
          <a
            data-touch
            href="#download"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              background: "#FFFFFF",
              color: SAGE_STRONG,
              padding: "8px 16px",
              borderRadius: 999,
              fontFamily: "Inter, sans-serif",
              fontSize: 13,
              fontWeight: 700,
              textDecoration: "none",
            }}
          >
            <Smartphone size={14} /> Android
          </a>
        </div>
      </div>
    </div>
  );
}
