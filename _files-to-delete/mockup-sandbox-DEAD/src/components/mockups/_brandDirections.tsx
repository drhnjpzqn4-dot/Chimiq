import type { CSSProperties, ReactNode } from "react";

const LOGO_SRC = `${import.meta.env.BASE_URL}images/logo-chimiq-long.png`;

export interface BrandTokens {
  id: "A" | "B" | "C";
  name: string;
  positioning: string;
  voice: string;
  voiceWords: string[];
  palette: { name: string; hex: string; text?: string }[];
  fontHeading: string;
  fontHeadingStack: string;
  fontBody: string;
  fontBodyStack: string;
  bg: string;
  surface: string;
  ink: string;
  inkSoft: string;
  accent: string;
  accentInk: string;
  warn: string;
  danger: string;
  ok: string;
  border: string;
  radius: number;
  motion: string;
  imagery: string;
  logoBg: string;
  logoFilter?: string;
}

export const DIRECTION_A: BrandTokens = {
  id: "A",
  name: "Clinical-clean",
  positioning:
    "The dermatologist in your phone — calm, accurate, and quietly stylish.",
  voice:
    "Calm expert. Direct, factual, a little dry. No emoji. Sentences like a doctor's notes.",
  voiceWords: ["Plain-spoken", "Receipts > vibes", "Doctor-cool", "Zero hype"],
  palette: [
    { name: "Paper", hex: "#F4F2EC" },
    { name: "Ink", hex: "#0E1116", text: "#F4F2EC" },
    { name: "Sage", hex: "#7BAF7A", text: "#0E1116" },
    { name: "Coral", hex: "#FF6B5E", text: "#0E1116" },
    { name: "Mist", hex: "#DDE5DC", text: "#0E1116" },
  ],
  fontHeading: "Source Serif 4",
  fontHeadingStack:
    '"Source Serif 4", "Source Serif Pro", "Libre Baskerville", Georgia, serif',
  fontBody: "Inter",
  fontBodyStack: '"Inter", system-ui, -apple-system, sans-serif',
  bg: "#F4F2EC",
  surface: "#FFFFFF",
  ink: "#0E1116",
  inkSoft: "#5C6168",
  accent: "#7BAF7A",
  accentInk: "#0E1116",
  warn: "#E0A800",
  danger: "#D2392A",
  ok: "#2E8B57",
  border: "#E2DDD2",
  radius: 14,
  motion: "Slow fades · 250ms ease-out · no bounce",
  imagery: "Editorial macro: water droplets on glass, lab pipettes, raw skin texture",
  logoBg: "#FFFFFF",
};

export const DIRECTION_B: BrandTokens = {
  id: "B",
  name: "Playful-pop",
  positioning:
    "Skincare without the chemistry homework — for the group chat that screenshots ingredient lists.",
  voice:
    "Best friend who happens to read studies. Warm, snappy, low-key funny. Slang is fine, never cringe.",
  voiceWords: ["Bestie energy", "Snappy", "Low-key science nerd", "Honest"],
  palette: [
    { name: "Cream", hex: "#FFF4E8" },
    { name: "Ink", hex: "#1F1233", text: "#FFF4E8" },
    { name: "Lilac", hex: "#B6A8FF", text: "#1F1233" },
    { name: "Peach", hex: "#FF9E7A", text: "#1F1233" },
    { name: "Lime", hex: "#C9F26B", text: "#1F1233" },
  ],
  fontHeading: "Space Grotesk",
  fontHeadingStack: '"Space Grotesk", "DM Sans", system-ui, sans-serif',
  fontBody: "DM Sans",
  fontBodyStack: '"DM Sans", "Inter", system-ui, sans-serif',
  bg: "#FFF4E8",
  surface: "#FFFFFF",
  ink: "#1F1233",
  inkSoft: "#5A4D74",
  accent: "#B6A8FF",
  accentInk: "#1F1233",
  warn: "#FF9E7A",
  danger: "#E0426B",
  ok: "#48C97A",
  border: "#1F1233",
  radius: 22,
  motion: "Springy pops · 320ms cubic-bezier · gentle bounce",
  imagery: "Sticker-style cutouts, hand-drawn squiggles, bright product flat-lays",
  logoBg: "#FFF4E8",
};

export const DIRECTION_C: BrandTokens = {
  id: "C",
  name: "Dark-editorial",
  positioning:
    "Your skin's after-hours archive — investigative, beautiful, unafraid to name names.",
  voice:
    "Music magazine meets watchdog. Confident, cinematic, slightly opinionated. Never preachy.",
  voiceWords: ["Cinematic", "Opinionated", "Sharp", "After-hours"],
  palette: [
    { name: "Carbon", hex: "#0B0B0E" },
    { name: "Bone", hex: "#EEE8DA", text: "#0B0B0E" },
    { name: "Ember", hex: "#FF5A36", text: "#0B0B0E" },
    { name: "Lichen", hex: "#A8C97A", text: "#0B0B0E" },
    { name: "Smoke", hex: "#1F2024", text: "#EEE8DA" },
  ],
  fontHeading: "Playfair Display",
  fontHeadingStack: '"Playfair Display", "Source Serif 4", Georgia, serif',
  fontBody: "Plus Jakarta Sans",
  fontBodyStack: '"Plus Jakarta Sans", "Inter", system-ui, sans-serif',
  bg: "#0B0B0E",
  surface: "#15161B",
  ink: "#EEE8DA",
  inkSoft: "#9A9A9F",
  accent: "#FF5A36",
  accentInk: "#0B0B0E",
  warn: "#F0B429",
  danger: "#FF5A36",
  ok: "#A8C97A",
  border: "#2A2B30",
  radius: 4,
  motion: "Cinematic dissolves · 400ms ease · cross-fades",
  imagery: "Black-and-white portraiture, neon-lit lab shots, grainy 35mm",
  logoBg: "#FFFFFF",
  logoFilter: "none",
};

export const ALL_DIRECTIONS: BrandTokens[] = [DIRECTION_A, DIRECTION_B, DIRECTION_C];

/* ---------------- Sub-components ---------------- */

function Section({
  t,
  title,
  children,
}: {
  t: BrandTokens;
  title: string;
  children: ReactNode;
}) {
  return (
    <div style={{ marginBottom: 22 }}>
      <div
        style={{
          fontFamily: t.fontBodyStack,
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          color: t.inkSoft,
          marginBottom: 10,
        }}
      >
        {title}
      </div>
      {children}
    </div>
  );
}

function LogoLockup({ t }: { t: BrandTokens }) {
  return (
    <div
      style={{
        background: t.logoBg,
        border: `1px solid ${t.border}`,
        borderRadius: t.radius,
        padding: "22px 18px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: 96,
      }}
    >
      <img
        src={LOGO_SRC}
        alt="SkinScreen"
        style={{
          height: 44,
          width: "auto",
          display: "block",
          filter: t.logoFilter,
        }}
      />
    </div>
  );
}

function Palette({ t }: { t: BrandTokens }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(5, 1fr)",
        gap: 8,
      }}
    >
      {t.palette.map((c) => (
        <div key={c.hex}>
          <div
            style={{
              background: c.hex,
              borderRadius: Math.max(6, t.radius - 6),
              height: 70,
              border: `1px solid ${t.border}`,
              display: "flex",
              alignItems: "flex-end",
              padding: 8,
              color: c.text ?? "#FFFFFF",
              fontFamily: t.fontBodyStack,
              fontSize: 9,
              fontWeight: 600,
              letterSpacing: "0.04em",
            }}
          >
            {c.name}
          </div>
          <div
            style={{
              fontFamily: t.fontBodyStack,
              fontSize: 9,
              color: t.inkSoft,
              marginTop: 4,
              letterSpacing: "0.03em",
            }}
          >
            {c.hex}
          </div>
        </div>
      ))}
    </div>
  );
}

function TypeSpecimen({ t }: { t: BrandTokens }) {
  return (
    <div
      style={{
        background: t.surface,
        border: `1px solid ${t.border}`,
        borderRadius: t.radius,
        padding: 16,
      }}
    >
      <div
        style={{
          fontFamily: t.fontHeadingStack,
          fontSize: 30,
          fontWeight: 600,
          lineHeight: 1.05,
          color: t.ink,
          letterSpacing: t.id === "C" ? "-0.02em" : "-0.01em",
        }}
      >
        Read your skin.
      </div>
      <div
        style={{
          fontFamily: t.fontBodyStack,
          fontSize: 12,
          lineHeight: 1.55,
          color: t.inkSoft,
          marginTop: 8,
        }}
      >
        Scan any product. We flag the bad stuff in plain English and tell you what to use instead.
      </div>
      <div
        style={{
          display: "flex",
          gap: 14,
          marginTop: 12,
          fontFamily: t.fontBodyStack,
          fontSize: 10,
          color: t.inkSoft,
          letterSpacing: "0.05em",
          textTransform: "uppercase",
        }}
      >
        <span>{t.fontHeading} · Display</span>
        <span style={{ opacity: 0.5 }}>+</span>
        <span>{t.fontBody} · Text</span>
      </div>
    </div>
  );
}

function Buttons({ t }: { t: BrandTokens }) {
  const baseBtn: CSSProperties = {
    fontFamily: t.fontBodyStack,
    fontSize: 12,
    fontWeight: 600,
    padding: "10px 16px",
    borderRadius: t.radius,
    border: "none",
    cursor: "pointer",
    letterSpacing: t.id === "B" ? "0" : "0.01em",
  };
  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      <button style={{ ...baseBtn, background: t.accent, color: t.accentInk }}>
        Scan a product
      </button>
      <button
        style={{
          ...baseBtn,
          background: "transparent",
          color: t.ink,
          border: `1.5px solid ${t.id === "B" ? t.ink : t.border}`,
        }}
      >
        See my shelf
      </button>
      <button
        style={{
          ...baseBtn,
          background: t.id === "C" ? t.surface : "transparent",
          color: t.inkSoft,
          padding: "10px 12px",
        }}
      >
        Skip →
      </button>
    </div>
  );
}

function CardSamples({ t }: { t: BrandTokens }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
      <div
        style={{
          background: t.surface,
          border: `1px solid ${t.border}`,
          borderRadius: t.radius,
          padding: 12,
          boxShadow: t.id === "A" ? "0 1px 2px rgba(0,0,0,0.04)" : "none",
        }}
      >
        <div
          style={{
            fontFamily: t.fontBodyStack,
            fontSize: 9,
            fontWeight: 700,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: t.ok,
          }}
        >
          Safe
        </div>
        <div
          style={{
            fontFamily: t.fontHeadingStack,
            fontSize: 16,
            color: t.ink,
            marginTop: 4,
            lineHeight: 1.15,
          }}
        >
          Niacinamide
        </div>
        <div
          style={{
            fontFamily: t.fontBodyStack,
            fontSize: 11,
            color: t.inkSoft,
            marginTop: 4,
            lineHeight: 1.45,
          }}
        >
          Calms redness, evens tone. Plays nice with everything.
        </div>
      </div>
      <div
        style={{
          background: t.id === "C" ? "#241318" : "#FFF1EE",
          border: `1px solid ${t.id === "C" ? t.danger : "#F2C9C2"}`,
          borderRadius: t.radius,
          padding: 12,
        }}
      >
        <div
          style={{
            fontFamily: t.fontBodyStack,
            fontSize: 9,
            fontWeight: 700,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: t.danger,
          }}
        >
          High risk
        </div>
        <div
          style={{
            fontFamily: t.fontHeadingStack,
            fontSize: 16,
            color: t.id === "C" ? t.ink : "#5A1A14",
            marginTop: 4,
            lineHeight: 1.15,
          }}
        >
          DMDM Hydantoin
        </div>
        <div
          style={{
            fontFamily: t.fontBodyStack,
            fontSize: 11,
            color: t.id === "C" ? t.inkSoft : "#7A2A22",
            marginTop: 4,
            lineHeight: 1.45,
          }}
        >
          Releases formaldehyde over time. Linked to contact allergy.
        </div>
      </div>
    </div>
  );
}

/* ---------- Sample app screen: scanner result ---------- */

function PhoneFrame({ t, children }: { t: BrandTokens; children: ReactNode }) {
  return (
    <div
      style={{
        width: 268,
        height: 540,
        borderRadius: 36,
        background: t.id === "C" ? "#000" : "#1F1F22",
        padding: 8,
        boxShadow: "0 14px 30px rgba(0,0,0,0.18)",
        margin: "0 auto",
      }}
    >
      <div
        style={{
          width: "100%",
          height: "100%",
          borderRadius: 30,
          background: t.bg,
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {children}
      </div>
    </div>
  );
}

function ScannerScreen({ t }: { t: BrandTokens }) {
  const flagged: { name: string; tag: string; severity: "high" | "caution"; note: string }[] = [
    {
      name: "DMDM Hydantoin",
      tag: "Formaldehyde releaser",
      severity: "high",
      note: "Slow-release formaldehyde. Skip if sensitive.",
    },
    {
      name: "Fragrance",
      tag: "Allergen",
      severity: "caution",
      note: "Common irritant — fine for some, rough for others.",
    },
  ];
  const positiveScore = 72;

  return (
    <PhoneFrame t={t}>
      {/* status bar */}
      <div
        style={{
          padding: "10px 16px 0",
          display: "flex",
          justifyContent: "space-between",
          fontFamily: t.fontBodyStack,
          fontSize: 9,
          color: t.inkSoft,
          fontWeight: 600,
        }}
      >
        <span>9:41</span>
        <span>●●●●</span>
      </div>

      {/* header */}
      <div style={{ padding: "12px 16px 0" }}>
        <div
          style={{
            fontFamily: t.fontBodyStack,
            fontSize: 10,
            color: t.inkSoft,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            fontWeight: 700,
          }}
        >
          Scan result
        </div>
        <div
          style={{
            fontFamily: t.fontHeadingStack,
            fontSize: 20,
            color: t.ink,
            marginTop: 4,
            lineHeight: 1.15,
            letterSpacing: t.id === "C" ? "-0.01em" : "0",
          }}
        >
          The Ordinary
          <br />
          Retinol 0.5%
        </div>
      </div>

      {/* score chip */}
      <div style={{ padding: "12px 16px 0" }}>
        <div
          style={{
            background: t.surface,
            border: `1px solid ${t.border}`,
            borderRadius: t.radius,
            padding: 12,
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          <div
            style={{
              width: 46,
              height: 46,
              borderRadius: t.id === "B" ? 16 : 999,
              background: t.warn,
              color: t.id === "C" ? "#0B0B0E" : t.ink,
              fontFamily: t.fontHeadingStack,
              fontSize: 18,
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            {positiveScore}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontFamily: t.fontBodyStack,
                fontSize: 11,
                fontWeight: 700,
                color: t.ink,
              }}
            >
              Use with caution
            </div>
            <div
              style={{
                fontFamily: t.fontBodyStack,
                fontSize: 10,
                color: t.inkSoft,
                marginTop: 2,
                lineHeight: 1.4,
              }}
            >
              2 flags · 14 ingredients clear
            </div>
          </div>
        </div>
      </div>

      {/* ingredient flags */}
      <div
        style={{
          padding: "10px 16px",
          display: "flex",
          flexDirection: "column",
          gap: 8,
          flex: 1,
          overflow: "hidden",
        }}
      >
        {flagged.map((f) => (
          <div
            key={f.name}
            style={{
              background:
                f.severity === "high"
                  ? t.id === "C"
                    ? "#241318"
                    : "#FFF1EE"
                  : t.id === "C"
                  ? "#1E1A12"
                  : "#FFF7E1",
              border: `1px solid ${f.severity === "high" ? t.danger : t.warn}`,
              borderRadius: Math.max(10, t.radius - 4),
              padding: 10,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 8,
              }}
            >
              <div
                style={{
                  fontFamily: t.fontHeadingStack,
                  fontSize: 13,
                  color: t.ink,
                  fontWeight: 600,
                }}
              >
                {f.name}
              </div>
              <div
                style={{
                  fontFamily: t.fontBodyStack,
                  fontSize: 8,
                  fontWeight: 700,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color:
                    f.severity === "high" ? t.danger : t.id === "C" ? t.warn : "#8A6A00",
                  background:
                    f.severity === "high"
                      ? t.id === "C"
                        ? "rgba(255,90,54,0.12)"
                        : "#FBD9D2"
                      : t.id === "C"
                      ? "rgba(240,180,41,0.12)"
                      : "#F8E6A8",
                  padding: "3px 6px",
                  borderRadius: 999,
                }}
              >
                {f.severity === "high" ? "High" : "Caution"}
              </div>
            </div>
            <div
              style={{
                fontFamily: t.fontBodyStack,
                fontSize: 10,
                color: t.inkSoft,
                marginTop: 4,
                lineHeight: 1.4,
              }}
            >
              {f.tag} · {f.note}
            </div>
          </div>
        ))}
      </div>

      {/* CTA */}
      <div style={{ padding: "0 16px 16px" }}>
        <button
          style={{
            width: "100%",
            background: t.accent,
            color: t.accentInk,
            border: "none",
            borderRadius: t.radius,
            padding: "12px 0",
            fontFamily: t.fontBodyStack,
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: "0.02em",
            cursor: "pointer",
          }}
        >
          Show me a safer pick
        </button>
      </div>
    </PhoneFrame>
  );
}

/* ---------- Public direction tile ---------- */

export function BrandDirectionTile({ t }: { t: BrandTokens }) {
  return (
    <div
      style={{
        width: 540,
        background: t.bg,
        color: t.ink,
        fontFamily: t.fontBodyStack,
        padding: 26,
        boxSizing: "border-box",
        border: `1px solid ${t.border}`,
        borderRadius: 0,
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          gap: 12,
          marginBottom: 6,
        }}
      >
        <div
          style={{
            fontFamily: t.fontBodyStack,
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: "0.22em",
            textTransform: "uppercase",
            color: t.accent === t.bg ? t.ink : t.accent,
          }}
        >
          Direction {t.id}
        </div>
        <div
          style={{
            fontFamily: t.fontBodyStack,
            fontSize: 9,
            color: t.inkSoft,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
          }}
        >
          for 15–35
        </div>
      </div>
      <div
        style={{
          fontFamily: t.fontHeadingStack,
          fontSize: 34,
          fontWeight: 600,
          lineHeight: 1.05,
          letterSpacing: "-0.01em",
          color: t.ink,
          marginBottom: 10,
        }}
      >
        {t.name}
      </div>
      <div
        style={{
          fontFamily: t.fontBodyStack,
          fontSize: 13,
          lineHeight: 1.5,
          color: t.inkSoft,
          marginBottom: 22,
          fontStyle: t.id === "C" ? "italic" : "normal",
        }}
      >
        “{t.positioning}”
      </div>

      <Section t={t} title="Logo lockup">
        <LogoLockup t={t} />
      </Section>

      <Section t={t} title="Palette">
        <Palette t={t} />
      </Section>

      <Section t={t} title="Type pairing">
        <TypeSpecimen t={t} />
      </Section>

      <Section t={t} title="Buttons">
        <Buttons t={t} />
      </Section>

      <Section t={t} title="Cards">
        <CardSamples t={t} />
      </Section>

      <Section t={t} title="Sample screen · scanner result">
        <ScannerScreen t={t} />
      </Section>

      <Section t={t} title="Voice & tone">
        <div
          style={{
            background: t.surface,
            border: `1px solid ${t.border}`,
            borderRadius: t.radius,
            padding: 14,
          }}
        >
          <div
            style={{
              fontFamily: t.fontBodyStack,
              fontSize: 12,
              lineHeight: 1.55,
              color: t.ink,
              marginBottom: 10,
            }}
          >
            {t.voice}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {t.voiceWords.map((w) => (
              <span
                key={w}
                style={{
                  fontFamily: t.fontBodyStack,
                  fontSize: 10,
                  fontWeight: 600,
                  color: t.accentInk,
                  background: t.accent,
                  padding: "3px 9px",
                  borderRadius: 999,
                  letterSpacing: "0.02em",
                }}
              >
                {w}
              </span>
            ))}
          </div>
        </div>
      </Section>

      <Section t={t} title="Motion · imagery">
        <div
          style={{
            fontFamily: t.fontBodyStack,
            fontSize: 11,
            lineHeight: 1.55,
            color: t.inkSoft,
          }}
        >
          <div>
            <strong style={{ color: t.ink }}>Motion: </strong>
            {t.motion}
          </div>
          <div style={{ marginTop: 4 }}>
            <strong style={{ color: t.ink }}>Imagery: </strong>
            {t.imagery}
          </div>
        </div>
      </Section>
    </div>
  );
}
