import {
  ALL_DIRECTIONS,
  BrandDirectionTile,
} from "./_brandDirections";

const PAGE_BG = "#EDEAE2";
const PAGE_INK = "#15181D";
const PAGE_INK_SOFT = "#5A6068";
const PAGE_BORDER = "#D8D2C5";

const SUMMARY: { title: string; pickWhen: string; risk: string; tone: string }[] = [
  {
    title: "A · Clinical-clean",
    pickWhen:
      "If we want SkinScreen to read as a serious health tool — the kind a derm would link in a TikTok comment.",
    risk:
      "Risk: can drift toward pharmacy-aisle if we under-invest in editorial typography and photography.",
    tone: "Most credible. Lowest emotional charge. Best for press, App Store, and parents.",
  },
  {
    title: "B · Playful-pop",
    pickWhen:
      "If we're chasing the 15–22 TikTok skincare crowd and want share-ability over authority.",
    risk:
      "Risk: ages the brand quickly and can feel off-brand the moment we publish a serious safety alert.",
    tone: "Highest virality. Loudest. Best for paid social, sticker packs, and IRL merch.",
  },
  {
    title: "C · Dark-editorial",
    pickWhen:
      "If we want SkinScreen to feel like an investigation — magazine-grade, opinionated, premium.",
    risk:
      "Risk: dark UI is harder for accessibility and night-time skincare reading; needs strict contrast discipline.",
    tone: "Most premium. Best for our newsletter, longform 'name & shame' content, and a paid tier.",
  },
];

function PageHeader() {
  return (
    <div style={{ marginBottom: 24, maxWidth: 1660 }}>
      <div
        style={{
          fontFamily: '"Inter", system-ui, sans-serif',
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: "0.22em",
          textTransform: "uppercase",
          color: "#7BAF7A",
          marginBottom: 10,
        }}
      >
        SkinScreen · Brand exploration
      </div>
      <div
        style={{
          fontFamily:
            '"Source Serif 4", "Source Serif Pro", "Libre Baskerville", Georgia, serif',
          fontSize: 42,
          fontWeight: 600,
          lineHeight: 1.05,
          letterSpacing: "-0.015em",
          color: PAGE_INK,
          maxWidth: 880,
        }}
      >
        Three brand directions for a 15–35 audience.
      </div>
      <div
        style={{
          fontFamily: '"Inter", system-ui, sans-serif',
          fontSize: 14,
          lineHeight: 1.55,
          color: PAGE_INK_SOFT,
          marginTop: 12,
          maxWidth: 760,
        }}
      >
        Same logo, three personalities. Each tile shows the lockup, palette, type
        pairing, UI components and a sample scanner-result screen — so we can pick a
        direction before the full app redesign begins.
      </div>
    </div>
  );
}

function ComparisonSummary() {
  return (
    <div style={{ marginTop: 36, maxWidth: 1660 }}>
      <div
        style={{
          fontFamily: '"Inter", system-ui, sans-serif',
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: "0.22em",
          textTransform: "uppercase",
          color: PAGE_INK_SOFT,
          marginBottom: 10,
        }}
      >
        When to pick which
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 16,
        }}
      >
        {SUMMARY.map((s) => (
          <div
            key={s.title}
            style={{
              background: "#FFFFFF",
              border: `1px solid ${PAGE_BORDER}`,
              borderRadius: 14,
              padding: 18,
            }}
          >
            <div
              style={{
                fontFamily:
                  '"Source Serif 4", "Source Serif Pro", Georgia, serif',
                fontSize: 18,
                fontWeight: 600,
                color: PAGE_INK,
                marginBottom: 8,
              }}
            >
              {s.title}
            </div>
            <div
              style={{
                fontFamily: '"Inter", system-ui, sans-serif',
                fontSize: 12.5,
                lineHeight: 1.55,
                color: PAGE_INK,
                marginBottom: 10,
              }}
            >
              {s.pickWhen}
            </div>
            <div
              style={{
                fontFamily: '"Inter", system-ui, sans-serif',
                fontSize: 11.5,
                lineHeight: 1.5,
                color: PAGE_INK_SOFT,
                marginBottom: 10,
              }}
            >
              {s.risk}
            </div>
            <div
              style={{
                fontFamily: '"Inter", system-ui, sans-serif',
                fontSize: 11,
                fontStyle: "italic",
                color: PAGE_INK_SOFT,
                borderTop: `1px solid ${PAGE_BORDER}`,
                paddingTop: 8,
              }}
            >
              {s.tone}
            </div>
          </div>
        ))}
      </div>

      <div
        style={{
          marginTop: 18,
          padding: "14px 18px",
          background: "#15181D",
          color: "#EDEAE2",
          borderRadius: 14,
          fontFamily: '"Inter", system-ui, sans-serif',
          fontSize: 12.5,
          lineHeight: 1.6,
          maxWidth: 1660,
        }}
      >
        <strong style={{ color: "#FFFFFF" }}>Recommendation:</strong>{" "}
        Lead with <strong>B · Playful-pop</strong> for the 15–35 app redesign and
        TikTok kit — it's where the audience already lives and our growth needs
        share-ability. Use <strong>A · Clinical-clean</strong> as a secondary
        system for App Store, press, and the safety-report PDF, where credibility
        wins. Hold <strong>C · Dark-editorial</strong> for our future paid /
        editorial tier (newsletter, "named & shamed" longform).
      </div>
    </div>
  );
}

export default function BrandDirections() {
  return (
    <div
      style={{
        background: PAGE_BG,
        minHeight: "100vh",
        padding: "40px 36px 56px",
        fontFamily: '"Inter", system-ui, sans-serif',
      }}
    >
      <PageHeader />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, minmax(540px, 1fr))",
          gap: 20,
          alignItems: "start",
        }}
      >
        {ALL_DIRECTIONS.map((t) => (
          <BrandDirectionTile key={t.id} t={t} />
        ))}
      </div>

      <ComparisonSummary />
    </div>
  );
}
