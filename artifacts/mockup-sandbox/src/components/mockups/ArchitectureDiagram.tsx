const SAGE = "#7BAF7A";
const SAGE_LIGHT = "#EAF3EA";
const SAGE_BORDER = "#C8DEC8";
const BLUE_LIGHT = "#EAF1FB";
const BLUE_BORDER = "#AECBF2";
const BLUE_HEADER = "#4A7DC0";
const GREY_LIGHT = "#F3F4F6";
const GREY_BORDER = "#CBD5E0";
const GREY_HEADER = "#718096";
const ORANGE_LIGHT = "#FEF3E2";
const ORANGE_BORDER = "#F6C47A";
const ORANGE_HEADER = "#C97C1A";
const YELLOW_BG = "#FFFBEB";
const YELLOW_BORDER = "#F6E05E";

const FONT = "system-ui, -apple-system, sans-serif";

function Header() {
  return (
    <div
      style={{
        height: 56,
        background: "#2D3748",
        borderRadius: 8,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 32,
        flexShrink: 0,
      }}
    >
      <span
        style={{
          color: "#FFFFFF",
          fontSize: 18,
          fontWeight: 700,
          letterSpacing: "0.06em",
          fontFamily: FONT,
          textTransform: "uppercase" as const,
        }}
      >
        APP ARCHITECTURE — chimiq.com / chimiq.app
      </span>
    </div>
  );
}

function ScreenItem({
  label,
  locked,
}: {
  label: string;
  locked?: boolean;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        padding: "5px 10px",
        background: locked ? "rgba(255,255,255,0.55)" : "rgba(255,255,255,0.85)",
        borderRadius: 5,
        marginBottom: 5,
        fontSize: 12,
        fontFamily: FONT,
        color: "#2D3748",
        border: locked ? "1px dashed rgba(0,0,0,0.15)" : "1px solid rgba(0,0,0,0.08)",
      }}
    >
      {locked && (
        <span style={{ fontSize: 11, color: "#E53E3E" }}>🔒</span>
      )}
      <span>{label}</span>
    </div>
  );
}

function PaywallGate() {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        margin: "8px 0",
        padding: "4px 10px",
        background: "#FFF5F5",
        border: "1.5px dashed #E53E3E",
        borderRadius: 5,
      }}
    >
      <span style={{ fontSize: 13 }}>🔒</span>
      <span
        style={{
          fontSize: 11,
          fontWeight: 700,
          color: "#E53E3E",
          letterSpacing: "0.08em",
          textTransform: "uppercase" as const,
          fontFamily: FONT,
        }}
      >
        PAYWALL GATE — Premium Only Below
      </span>
    </div>
  );
}

function DomainBox({
  title,
  subtitle,
  headerColor,
  borderColor,
  bgColor,
  children,
}: {
  title: string;
  subtitle?: string;
  headerColor: string;
  borderColor: string;
  bgColor: string;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        flex: 1,
        border: `2px solid ${borderColor}`,
        borderRadius: 10,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        background: bgColor,
      }}
    >
      <div
        style={{
          background: headerColor,
          padding: "10px 16px",
          display: "flex",
          alignItems: "baseline",
          gap: 8,
        }}
      >
        <span
          style={{
            color: "#FFFFFF",
            fontSize: 16,
            fontWeight: 700,
            fontFamily: FONT,
            letterSpacing: "0.02em",
          }}
        >
          {title}
        </span>
        {subtitle && (
          <span
            style={{
              color: "rgba(255,255,255,0.75)",
              fontSize: 11,
              fontFamily: FONT,
            }}
          >
            {subtitle}
          </span>
        )}
      </div>
      <div style={{ padding: "14px 16px", flex: 1 }}>{children}</div>
    </div>
  );
}

function SectionRow({
  label,
  borderColor,
}: {
  label: string;
  borderColor: string;
}) {
  return (
    <div
      style={{
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: "0.08em",
        textTransform: "uppercase" as const,
        color: borderColor === SAGE_BORDER ? SAGE : BLUE_HEADER,
        fontFamily: FONT,
        marginBottom: 6,
        marginTop: 4,
      }}
    >
      {label}
    </div>
  );
}

function SharedBackendBox() {
  const items = [
    "API Server (Express · TypeScript)",
    "PostgreSQL (users, shelf, waitlist, analysis cache)",
    "Claude AI (Anthropic — ingredient analysis)",
    "Acumbamail (waitlist email confirmations)",
  ];
  return (
    <div
      style={{
        border: `2px solid ${GREY_BORDER}`,
        borderRadius: 10,
        overflow: "hidden",
        background: GREY_LIGHT,
        marginTop: 20,
      }}
    >
      <div
        style={{
          background: GREY_HEADER,
          padding: "8px 16px",
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}
      >
        <span style={{ fontSize: 15 }}>⚙️</span>
        <span
          style={{
            color: "#FFFFFF",
            fontSize: 14,
            fontWeight: 700,
            fontFamily: FONT,
            letterSpacing: "0.03em",
          }}
        >
          Shared Backend
        </span>
      </div>
      <div
        style={{
          padding: "10px 16px",
          display: "flex",
          flexWrap: "wrap" as const,
          gap: 8,
        }}
      >
        {items.map((item, i) => (
          <span
            key={i}
            style={{
              background: "#FFFFFF",
              border: `1px solid ${GREY_BORDER}`,
              borderRadius: 5,
              padding: "4px 12px",
              fontSize: 12,
              fontFamily: FONT,
              color: "#2D3748",
            }}
          >
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}

function DataCacheBox() {
  const items = [
    "Product cache — top 50k from Open Beauty Facts",
    "Analysis cache — ingredient hash → AI response",
    "Curated conflict table",
    "User shelf data",
    "Waitlist",
  ];
  return (
    <div
      style={{
        border: `2px solid ${ORANGE_BORDER}`,
        borderRadius: 10,
        overflow: "hidden",
        background: ORANGE_LIGHT,
        marginTop: 16,
      }}
    >
      <div
        style={{
          background: ORANGE_HEADER,
          padding: "8px 16px",
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}
      >
        <span style={{ fontSize: 15 }}>🗄️</span>
        <span
          style={{
            color: "#FFFFFF",
            fontSize: 14,
            fontWeight: 700,
            fontFamily: FONT,
            letterSpacing: "0.03em",
          }}
        >
          Data / Cache Tier
        </span>
      </div>
      <div
        style={{
          padding: "10px 16px",
          display: "flex",
          flexWrap: "wrap" as const,
          gap: 8,
        }}
      >
        {items.map((item, i) => (
          <span
            key={i}
            style={{
              background: "rgba(255,255,255,0.7)",
              border: `1px solid ${ORANGE_BORDER}`,
              borderRadius: 5,
              padding: "4px 12px",
              fontSize: 12,
              fontFamily: FONT,
              color: "#2D3748",
            }}
          >
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}

function StickyNote() {
  return (
    <div
      style={{
        border: `2px solid ${YELLOW_BORDER}`,
        borderRadius: 8,
        background: YELLOW_BG,
        padding: "14px 18px",
        marginTop: 16,
        display: "flex",
        alignItems: "flex-start",
        gap: 12,
        maxWidth: 520,
        alignSelf: "flex-end",
      }}
    >
      <span style={{ fontSize: 20, flexShrink: 0 }}>📝</span>
      <div>
        <div
          style={{
            fontWeight: 700,
            fontSize: 12,
            color: "#744210",
            fontFamily: FONT,
            marginBottom: 6,
            letterSpacing: "0.04em",
          }}
        >
          STATUS NOTE
        </div>
        <div
          style={{
            fontSize: 12.5,
            color: "#744210",
            fontFamily: FONT,
            lineHeight: 1.6,
          }}
        >
          <strong>80% built.</strong> Missing: real domain auth (chimiq.app) + paywall enforcement + product cache (Open Beauty Facts top-50k)
        </div>
      </div>
    </div>
  );
}

function ArrowDown({ label }: { label?: string }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "6px 0",
        gap: 2,
      }}
    >
      {label && (
        <span
          style={{
            fontSize: 10,
            color: "#718096",
            fontFamily: FONT,
            letterSpacing: "0.05em",
          }}
        >
          {label}
        </span>
      )}
      <svg width="24" height="16" viewBox="0 0 24 16" fill="none">
        <line x1="12" y1="0" x2="12" y2="12" stroke="#CBD5E0" strokeWidth="2" />
        <polyline points="6,8 12,14 18,8" stroke="#CBD5E0" strokeWidth="2" fill="none" />
      </svg>
    </div>
  );
}

export default function ArchitectureDiagram() {
  return (
    <div
      style={{
        width: 1100,
        minHeight: 900,
        padding: "40px 48px 48px",
        backgroundColor: "#F9FAFB",
        fontFamily: FONT,
        boxSizing: "border-box" as const,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Header />

      <div style={{ display: "flex", gap: 24, flex: "0 0 auto" }}>
        <DomainBox
          title="chimiq.com"
          subtitle="Marketing landing page"
          headerColor={SAGE}
          borderColor={SAGE_BORDER}
          bgColor={SAGE_LIGHT}
        >
          <SectionRow label="Pages / Sections" borderColor={SAGE_BORDER} />
          <ScreenItem label="Hero — Scan. Protect. Glow." />
          <ScreenItem label="Problem — 400+ ingredients daily" />
          <ScreenItem label="How it works — Scan → Stack → Screen" />
          <ScreenItem label="Live scanner preview" />
          <ScreenItem label="Waitlist CTA" />
          <div
            style={{
              marginTop: 10,
              padding: "6px 10px",
              background: SAGE,
              borderRadius: 5,
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <span style={{ color: "#FFF", fontSize: 12, fontWeight: 600, fontFamily: FONT }}>
              Get the app →
            </span>
          </div>
        </DomainBox>

        <DomainBox
          title="chimiq.app"
          subtitle="Authenticated product"
          headerColor={BLUE_HEADER}
          borderColor={BLUE_BORDER}
          bgColor={BLUE_LIGHT}
        >
          <SectionRow label="Screens" borderColor={BLUE_BORDER} />
          <ScreenItem label="Auth gate (Login / Sign-up)" />
          <ScreenItem label="Scan — home screen (OCR + text input)" />
          <ScreenItem label="My Shelf — product list" />
          <ScreenItem label="Analysis results — Safe / Caution / Avoid" />
          <PaywallGate />
          <ScreenItem label="AI Chat" locked />
          <ScreenItem label="PDF Report" locked />
          <ScreenItem label="Find a Dermatologist" locked />
          <ScreenItem label="Pricing / Billing" locked />
        </DomainBox>
      </div>

      <ArrowDown label="REST API calls" />

      <SharedBackendBox />

      <ArrowDown label="reads / writes" />

      <DataCacheBox />

      <StickyNote />
    </div>
  );
}
