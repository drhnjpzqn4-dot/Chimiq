import { type ReactNode } from "react";
import { SKIN, PHONE_W, PHONE_H } from "./tokens";

export function ScreenLabel({
  index,
  title,
  subtitle,
}: {
  index: string;
  title: string;
  subtitle: string;
}) {
  return (
    <div style={{ width: PHONE_W, marginBottom: 14, marginTop: 32 }}>
      <div
        style={{
          fontFamily: SKIN.fontSans,
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: "0.16em",
          textTransform: "uppercase",
          color: SKIN.primaryStrong,
          marginBottom: 6,
        }}
      >
        Screen {index}
      </div>
      <div
        style={{
          fontFamily: SKIN.fontSerif,
          fontSize: 22,
          fontWeight: 600,
          letterSpacing: "-0.01em",
          color: SKIN.ink,
          lineHeight: 1.2,
        }}
      >
        {title}
      </div>
      <div
        style={{
          fontFamily: SKIN.fontSans,
          fontSize: 12,
          color: SKIN.inkSoft,
          marginTop: 4,
          lineHeight: 1.45,
        }}
      >
        {subtitle}
      </div>
    </div>
  );
}

export function StatusBar() {
  return (
    <div
      style={{
        height: 44,
        padding: "0 22px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        fontFamily: SKIN.fontSans,
        fontSize: 14,
        fontWeight: 600,
        color: SKIN.ink,
      }}
    >
      <span>9:41</span>
      <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
        <span style={{ fontSize: 11 }}>●●●●</span>
        <svg width="16" height="11" viewBox="0 0 16 11" fill="none">
          <path d="M1 9.5 4 6.5 7 9 15 1.5" stroke={SKIN.ink} strokeWidth="1.5" strokeLinecap="round" />
        </svg>
        <span
          style={{
            display: "inline-block",
            width: 22,
            height: 11,
            border: `1px solid ${SKIN.ink}`,
            borderRadius: 3,
            position: "relative",
          }}
        >
          <span
            style={{
              position: "absolute",
              inset: 1,
              background: SKIN.ink,
              borderRadius: 1,
            }}
          />
        </span>
      </div>
    </div>
  );
}

export function PhoneFrame({
  children,
  bg = SKIN.bg,
}: {
  children: ReactNode;
  bg?: string;
}) {
  return (
    <div
      style={{
        width: PHONE_W,
        height: PHONE_H,
        background: bg,
        borderRadius: 44,
        boxShadow: SKIN.shadowLg,
        overflow: "hidden",
        position: "relative",
        border: `8px solid #111114`,
        outline: `1px solid rgba(0,0,0,0.08)`,
      }}
    >
      <div
        style={{
          width: "100%",
          height: "100%",
          background: bg,
          display: "flex",
          flexDirection: "column",
          fontFamily: SKIN.fontSans,
          color: SKIN.ink,
          overflow: "hidden",
        }}
      >
        <StatusBar />
        <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
          {children}
        </div>
      </div>
    </div>
  );
}

export function VariantHeader({
  letter,
  name,
  philosophy,
  swatchAccent,
}: {
  letter: "A" | "B" | "C";
  name: string;
  philosophy: string;
  swatchAccent: string;
}) {
  return (
    <div
      style={{
        width: PHONE_W,
        marginBottom: 8,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 12,
            background: swatchAccent,
            color: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: SKIN.fontSerif,
            fontSize: 22,
            fontWeight: 700,
            boxShadow: SKIN.shadowSm,
          }}
        >
          {letter}
        </div>
        <div
          style={{
            fontFamily: SKIN.fontSerif,
            fontSize: 24,
            fontWeight: 600,
            letterSpacing: "-0.01em",
            color: SKIN.ink,
            lineHeight: 1.1,
          }}
        >
          {name}
        </div>
      </div>
      <div
        style={{
          fontFamily: SKIN.fontSans,
          fontSize: 12,
          color: SKIN.inkSoft,
          lineHeight: 1.5,
        }}
      >
        {philosophy}
      </div>
    </div>
  );
}

export function DeckColumn({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        width: PHONE_W,
        background: "#EFEDE7",
        padding: "28px 0 60px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        minHeight: "100vh",
      }}
    >
      <div style={{ width: PHONE_W, padding: "0 8px" }}>{children}</div>
    </div>
  );
}
