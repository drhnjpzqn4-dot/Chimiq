const SAGE = "#7BAF7A";
const SAGE_LIGHT = "#EAF3EA";
const BORDER = "#C8DEC8";

function SectionLabel({ label }: { label: string }) {
  return (
    <div
      style={{
        backgroundColor: SAGE_LIGHT,
        borderBottom: `1.5px solid ${BORDER}`,
        padding: "4px 10px",
      }}
    >
      <span
        style={{
          color: SAGE,
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: "0.1em",
          textTransform: "uppercase" as const,
          fontFamily: "system-ui, sans-serif",
        }}
      >
        {label}
      </span>
    </div>
  );
}

function BulletList({ items }: { items: string[] }) {
  return (
    <ul style={{ margin: 0, paddingLeft: 14 }}>
      {items.map((item, i) => (
        <li key={i} style={{ marginBottom: 3 }}>
          {item}
        </li>
      ))}
    </ul>
  );
}

const cellBase: React.CSSProperties = {
  border: `1.5px solid ${BORDER}`,
  backgroundColor: "#FFFFFF",
  display: "flex",
  flexDirection: "column",
  overflow: "hidden",
  fontFamily: "system-ui, sans-serif",
  fontSize: 11.5,
  color: "#2D3748",
  lineHeight: 1.55,
};

const contentPad: React.CSSProperties = {
  padding: "8px 10px",
  flex: 1,
};

export default function LeanCanvas() {
  return (
    <div
      style={{
        width: 1300,
        height: 750,
        backgroundColor: "#F7FAF7",
        fontFamily: "system-ui, sans-serif",
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div
        style={{
          height: 48,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: SAGE,
          borderRadius: "6px 6px 0 0",
          flexShrink: 0,
        }}
      >
        <span
          style={{
            color: "#FFFFFF",
            fontSize: 20,
            fontWeight: 700,
            letterSpacing: "0.04em",
          }}
        >
          SkinScreen — Lean Canvas
        </span>
      </div>

      <div
        style={{
          flex: 1,
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1.44fr 1fr 1fr",
          gridTemplateRows: "1fr 1fr",
          border: `1.5px solid ${BORDER}`,
          borderTop: "none",
          borderRadius: "0 0 6px 6px",
          overflow: "hidden",
          gap: 0,
        }}
      >
        <div style={{ ...cellBase, gridColumn: 1, gridRow: 1, borderTop: "none", borderLeft: "none" }}>
          <SectionLabel label="Problem" />
          <div style={contentPad}>
            <BulletList
              items={[
                "No app checks how products interact with each other",
                "Average user applies 400+ ingredients daily — unknowingly",
                "Influencer culture drives over-buying that worsens skin",
              ]}
            />
          </div>
        </div>

        <div style={{ ...cellBase, gridColumn: 2, gridRow: 1, borderTop: "none" }}>
          <SectionLabel label="Solution" />
          <div style={contentPad}>
            <BulletList
              items={[
                "Scan ingredient lists (photo or text)",
                "Build a virtual shelf of all your products",
                "Get cross-product safety ratings: Safe / Caution / Avoid",
                "Research citations for every flagged conflict",
              ]}
            />
          </div>
        </div>

        <div
          style={{
            ...cellBase,
            gridColumn: 3,
            gridRow: "1 / 3",
            borderTop: "none",
          }}
        >
          <SectionLabel label="Unique Value Proposition" />
          <div
            style={{
              ...contentPad,
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              alignItems: "center",
              textAlign: "center",
              gap: 10,
            }}
          >
            <div
              style={{
                fontSize: 15,
                fontWeight: 700,
                color: SAGE,
                lineHeight: 1.3,
              }}
            >
              "Your dermatologist in your pocket."
            </div>
            <div style={{ fontSize: 12 }}>
              Not sponsored. Not selling you more.
              <br />
              Protecting what you already have.
            </div>
            <div
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: "#4A5568",
                letterSpacing: "0.08em",
                marginTop: 4,
              }}
            >
              Scan → Stack → Screen
            </div>
            <div
              style={{
                marginTop: 20,
                paddingTop: 16,
                borderTop: `1px dashed ${BORDER}`,
                width: "100%",
              }}
            >
              <div
                style={{
                  color: SAGE,
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase" as const,
                  marginBottom: 6,
                }}
              >
                Revenue Streams
              </div>
              <div style={{ fontSize: 11.5, color: "#2D3748", lineHeight: 1.6 }}>
                <div style={{ marginBottom: 4 }}>Freemium: free basic scan, paid full routine analysis</div>
                <div style={{ marginBottom: 4 }}>B2B API: access for brands &amp; retailers</div>
                <div>Affiliate: safe product recommendations</div>
              </div>
            </div>
          </div>
        </div>

        <div style={{ ...cellBase, gridColumn: 4, gridRow: 1, borderTop: "none" }}>
          <SectionLabel label="Unfair Advantage" />
          <div style={contentPad}>
            <BulletList
              items={[
                "First mover in cross-product conflict detection",
                "Research-citation system = defensible trust",
                "Open ingredient databases as data foundation",
                "Community-driven product conflict reports",
              ]}
            />
          </div>
        </div>

        <div
          style={{
            ...cellBase,
            gridColumn: 5,
            gridRow: "1 / 3",
            borderTop: "none",
            borderRight: "none",
          }}
        >
          <SectionLabel label="Customer Segments" />
          <div style={contentPad}>
            <BulletList
              items={[
                "Skincare enthusiasts (18–40, female-skewing)",
                "Sensitive/acne-prone skin sufferers",
                "Parents of teens starting skincare routines",
                "Dermatology-adjacent consumers",
              ]}
            />
          </div>
        </div>

        <div style={{ ...cellBase, gridColumn: 1, gridRow: 2, borderLeft: "none", borderBottom: "none" }}>
          <SectionLabel label="Cost Structure" />
          <div style={contentPad}>
            <BulletList
              items={[
                "App development & maintenance",
                "Ingredient database (EU CosIng, EWG)",
                "Cloud infrastructure",
                "Content & community marketing",
              ]}
            />
          </div>
        </div>

        <div style={{ ...cellBase, gridColumn: 2, gridRow: 2, borderBottom: "none" }}>
          <SectionLabel label="Key Metrics" />
          <div style={contentPad}>
            <BulletList
              items={[
                "Waitlist → beta signups",
                "Products scanned per user",
                "Conflicts flagged per session",
                "Free → premium conversion rate",
              ]}
            />
          </div>
        </div>

        <div style={{ ...cellBase, gridColumn: 4, gridRow: 2, borderBottom: "none" }}>
          <SectionLabel label="Channels" />
          <div style={contentPad}>
            <BulletList
              items={[
                "TikTok/Instagram skincare community",
                "App Store (iOS first)",
                "SEO: ingredient safety content",
                "Dermatologist referral partnerships",
              ]}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
