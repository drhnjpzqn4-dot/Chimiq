import React from "react";
import {
  ScanLine,
  PackageSearch,
  Compass,
  User,
  Search,
  Camera,
  Image as ImageIcon,
  Plus,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  Upload,
  ChevronRight,
  Star,
  Check,
  Clock,
  XCircle,
  Menu,
} from "lucide-react";
import { SKIN } from "./_shared/tokens";
import {
  PhoneFrame,
  ScreenLabel,
  VariantHeader,
  DeckColumn,
} from "./_shared/PhoneFrame";
import { DEMO } from "./_shared/demoData";

// --- Shared Primitives ---

function TopChrome({ title, showAvatar = true }: { title?: string; showAvatar?: boolean }) {
  return (
    <div
      style={{
        padding: "16px 20px 12px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        borderBottom: `1px solid ${SKIN.border}`,
        background: SKIN.surface,
        flexShrink: 0,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ fontFamily: SKIN.fontSans, fontWeight: 800, fontSize: 14, color: SKIN.ink }}>
          ChimIQ
        </div>
        {title && (
          <>
            <div style={{ width: 1, height: 12, background: SKIN.border }} />
            <div style={{ fontSize: 14, fontWeight: 500, color: SKIN.inkMute }}>
              {title}
            </div>
          </>
        )}
      </div>
      {showAvatar && (
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: "50%",
            background: SKIN.primarySoft,
            color: SKIN.primaryStrong,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 11,
            fontWeight: 700,
          }}
        >
          A
        </div>
      )}
    </div>
  );
}

function BottomTabs({ active = "scan" }: { active?: string }) {
  const tabs = [
    { id: "scan", icon: ScanLine, label: "Scan" },
    { id: "browse", icon: PackageSearch, label: "Browse" },
    { id: "discover", icon: Compass, label: "Discover" },
    { id: "profile", icon: User, label: "Profile" },
  ];

  return (
    <div
      style={{
        height: 64,
        paddingBottom: 8,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-around",
        background: SKIN.surface,
        borderTop: `1px solid ${SKIN.border}`,
        flexShrink: 0,
      }}
    >
      {tabs.map((t) => {
        const isActive = active === t.id;
        const Icon = t.icon;
        return (
          <div
            key={t.id}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 4,
              color: isActive ? SKIN.ink : SKIN.inkMute,
            }}
          >
            <Icon size={22} strokeWidth={isActive ? 2.5 : 2} />
            <span style={{ fontSize: 10, fontWeight: isActive ? 600 : 500 }}>
              {t.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// --- Screens ---

function Screen1Home() {
  return (
    <PhoneFrame bg={SKIN.bg}>
      <TopChrome title="History" />
      <div style={{ flex: 1, overflowY: "auto", position: "relative" }}>
        <div style={{ padding: "16px 20px" }}>
          {/* Sticky Search */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "10px 14px",
              background: SKIN.surface,
              border: `1px solid ${SKIN.border}`,
              borderRadius: 8,
              color: SKIN.inkMute,
              fontSize: 14,
              marginBottom: 20,
              boxShadow: SKIN.shadowSm,
            }}
          >
            <Search size={18} />
            <span style={{ flex: 1 }}>Search ingredients or products...</span>
          </div>

          <div style={{ fontSize: 12, fontWeight: 600, color: SKIN.inkMute, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 12 }}>
            Recent Scans
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
            {DEMO.recent.map((r, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  padding: "14px 16px",
                  background: SKIN.surface,
                  borderRadius: i === 0 ? "8px 8px 0 0" : i === DEMO.recent.length - 1 ? "0 0 8px 8px" : 0,
                  border: `1px solid ${SKIN.border}`,
                  borderBottom: i === DEMO.recent.length - 1 ? `1px solid ${SKIN.border}` : "none",
                  gap: 12,
                }}
              >
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 6,
                    background: r.verdict === "safe" ? SKIN.successSoft : SKIN.warningSoft,
                    color: r.verdict === "safe" ? SKIN.success : SKIN.warning,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {r.verdict === "safe" ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
                </div>
                <div style={{ flex: 1, overflow: "hidden" }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: SKIN.ink, whiteSpace: "nowrap", textOverflow: "ellipsis", overflow: "hidden" }}>
                    {r.name}
                  </div>
                  <div style={{ fontSize: 12, color: SKIN.inkMute }}>
                    {r.when}
                  </div>
                </div>
                <ChevronRight size={16} color={SKIN.inkMute} />
              </div>
            ))}
          </div>
        </div>

        {/* Expanded FAB */}
        <div style={{ position: "absolute", bottom: 20, right: 20, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: SKIN.ink, background: SKIN.surface, padding: "6px 10px", borderRadius: 6, boxShadow: SKIN.shadowSm }}>Text search</span>
            <div style={{ width: 44, height: 44, borderRadius: "50%", background: SKIN.surface, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: SKIN.shadowMd, border: `1px solid ${SKIN.border}` }}>
              <Search size={20} color={SKIN.ink} />
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: SKIN.ink, background: SKIN.surface, padding: "6px 10px", borderRadius: 6, boxShadow: SKIN.shadowSm }}>Ingredient photo</span>
            <div style={{ width: 44, height: 44, borderRadius: "50%", background: SKIN.surface, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: SKIN.shadowMd, border: `1px solid ${SKIN.border}` }}>
              <ImageIcon size={20} color={SKIN.ink} />
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: SKIN.ink, background: SKIN.surface, padding: "6px 10px", borderRadius: 6, boxShadow: SKIN.shadowSm }}>Scan barcode</span>
            <div style={{ width: 56, height: 56, borderRadius: "50%", background: SKIN.primaryStrong, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: SKIN.shadowLg }}>
              <Camera size={24} color="#fff" />
            </div>
          </div>
        </div>
      </div>
      <BottomTabs active="scan" />
    </PhoneFrame>
  );
}

function Screen2FullMatch() {
  const p = DEMO.productFull;
  return (
    <PhoneFrame bg={SKIN.bg}>
      <TopChrome title="Analysis" />
      <div style={{ flex: 1, overflowY: "auto", padding: "20px 20px 40px" }}>
        <div style={{ display: "flex", gap: 16, marginBottom: 24 }}>
          <div style={{ width: 80, height: 100, background: SKIN.surface, border: `1px solid ${SKIN.border}`, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 40 }}>
            {p.image}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, color: SKIN.inkMute, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>
              {p.brand}
            </div>
            <div style={{ fontFamily: SKIN.fontSerif, fontSize: 20, fontWeight: 700, color: SKIN.ink, lineHeight: 1.1, marginBottom: 8 }}>
              {p.name}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: SKIN.inkSoft }}>
              <div style={{ display: "flex", color: SKIN.warning }}>
                <Star size={12} fill="currentColor" />
              </div>
              <span style={{ fontWeight: 600 }}>{p.rating}</span>
              <span>({p.ratingCount})</span>
            </div>
          </div>
        </div>

        <div style={{ background: SKIN.successSoft, padding: "16px", borderRadius: 8, border: `1px solid ${SKIN.success}40`, marginBottom: 24 }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
            <CheckCircle2 size={20} color={SKIN.success} style={{ marginTop: 2 }} />
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: SKIN.ink, marginBottom: 4 }}>
                {p.headline}
              </div>
              <div style={{ fontSize: 13, color: SKIN.inkSoft, lineHeight: 1.4 }}>
                {p.subhead}
              </div>
            </div>
          </div>
        </div>

        <div style={{ fontSize: 12, fontWeight: 700, color: SKIN.ink, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 12 }}>
          Ingredients ({p.ingredients.length})
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {p.ingredients.map((ing, i) => (
            <span key={i} style={{ fontSize: 12, padding: "4px 8px", background: SKIN.surface, border: `1px solid ${SKIN.border}`, borderRadius: 4, color: SKIN.ink }}>
              {ing}
            </span>
          ))}
        </div>
      </div>
      <BottomTabs active="scan" />
    </PhoneFrame>
  );
}

function Screen3GapFill() {
  const p = DEMO.productPartial;
  return (
    <PhoneFrame bg={SKIN.bg}>
      <TopChrome title="Analysis" />
      <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column" }}>
        <div style={{ padding: "20px 20px 40px" }}>
          <div style={{ display: "flex", gap: 16, marginBottom: 24 }}>
            <div style={{ width: 80, height: 100, background: SKIN.surface, border: `1px dashed ${SKIN.borderStrong}`, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 40, color: SKIN.inkMute }}>
              {p.image}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, color: SKIN.inkMute, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>
                {p.brand}
              </div>
              <div style={{ fontFamily: SKIN.fontSerif, fontSize: 20, fontWeight: 700, color: SKIN.ink, lineHeight: 1.1, marginBottom: 8 }}>
                {p.name}
              </div>
            </div>
          </div>

          <div style={{ background: SKIN.warningSoft, padding: "16px", borderRadius: 8, border: `1px solid ${SKIN.warning}40`, marginBottom: 24 }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
              <AlertTriangle size={20} color={SKIN.warning} style={{ marginTop: 2 }} />
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: SKIN.ink, marginBottom: 4 }}>
                  {p.headline}
                </div>
                <div style={{ fontSize: 13, color: SKIN.inkSoft, lineHeight: 1.4 }}>
                  {p.subhead}
                </div>
              </div>
            </div>
          </div>

          <div style={{ fontSize: 12, fontWeight: 700, color: SKIN.ink, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 12 }}>
            Ingredients ({p.ingredients.length})
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {p.ingredients.map((ing, i) => (
              <span key={i} style={{ fontSize: 12, padding: "4px 8px", background: SKIN.surface, border: `1px solid ${SKIN.border}`, borderRadius: 4, color: SKIN.ink }}>
                {ing}
              </span>
            ))}
          </div>
        </div>

        {/* Expanded Gap Fill inline above tabs */}
        <div style={{ marginTop: "auto", background: SKIN.surface, borderTop: `1px solid ${SKIN.border}`, padding: "16px 20px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: SKIN.ink }}>
              Help complete this product
            </div>
            <div style={{ fontSize: 12, color: SKIN.inkMute }}>Photo, rating · 30 sec</div>
          </div>
          
          <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
            <div style={{ width: 64, height: 64, borderRadius: 6, border: `1px dashed ${SKIN.borderStrong}`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4, color: SKIN.inkMute, background: SKIN.bg }}>
              <Camera size={18} />
              <span style={{ fontSize: 10, fontWeight: 500 }}>Front</span>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: SKIN.ink, marginBottom: 8 }}>Your rating</div>
              <div style={{ display: "flex", gap: 4 }}>
                {["Hate", "Meh", "OK", "Love", "Grail"].map((lbl, i) => (
                  <div key={lbl} style={{ flex: 1, height: 36, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 600, background: i === 2 ? SKIN.primaryStrong : SKIN.bg, color: i === 2 ? "#fff" : SKIN.inkSoft, borderRadius: 4, border: i === 2 ? "none" : `1px solid ${SKIN.border}` }}>
                    {lbl}
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          <button style={{ width: "100%", padding: "12px", background: SKIN.ink, color: "#fff", border: "none", borderRadius: 6, fontSize: 14, fontWeight: 600 }}>
            Submit details
          </button>
        </div>
      </div>
      <BottomTabs active="scan" />
    </PhoneFrame>
  );
}

function Screen4NoMatch() {
  const p = DEMO.productMissing;
  return (
    <PhoneFrame bg={SKIN.bg}>
      <TopChrome title="Not found" />
      <div style={{ flex: 1, overflowY: "auto", padding: "20px" }}>
        
        <div style={{ background: SKIN.surface, border: `1px solid ${SKIN.border}`, borderRadius: 8, padding: "24px 20px", textAlign: "center", marginBottom: 24, boxShadow: SKIN.shadowSm }}>
          <div style={{ width: 48, height: 48, background: SKIN.bg, borderRadius: 24, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
            <AlertCircle size={24} color={SKIN.inkMute} />
          </div>
          <div style={{ fontSize: 16, fontWeight: 700, color: SKIN.ink, marginBottom: 8 }}>
            Not in our database yet
          </div>
          <div style={{ fontSize: 13, color: SKIN.inkSoft, lineHeight: 1.5, marginBottom: 20 }}>
            You scanned <span style={{ fontWeight: 600, color: SKIN.ink }}>{p.barcode}</span>. Add it to help others and unlock premium.
          </div>
          <button style={{ background: SKIN.ink, color: "#fff", border: "none", borderRadius: 6, padding: "12px 24px", fontSize: 14, fontWeight: 600, width: "100%" }}>
            Add this product
          </button>
        </div>

        {/* Inline form */}
        <div style={{ opacity: 0.5, pointerEvents: "none" }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: SKIN.ink, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 12 }}>
            Product details
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <input type="text" value={p.barcode} readOnly style={{ width: "100%", padding: "12px", background: SKIN.surface, border: `1px solid ${SKIN.border}`, borderRadius: 6, fontSize: 14, color: SKIN.ink }} />
            <input type="text" placeholder="Brand name" style={{ width: "100%", padding: "12px", background: SKIN.surface, border: `1px solid ${SKIN.border}`, borderRadius: 6, fontSize: 14 }} />
            <input type="text" placeholder="Product name" style={{ width: "100%", padding: "12px", background: SKIN.surface, border: `1px solid ${SKIN.border}`, borderRadius: 6, fontSize: 14 }} />
            
            <div style={{ display: "flex", gap: 12, marginTop: 4 }}>
              <div style={{ flex: 1, height: 80, border: `1px dashed ${SKIN.borderStrong}`, borderRadius: 6, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6, color: SKIN.inkMute, background: SKIN.surface }}>
                <Camera size={20} />
                <span style={{ fontSize: 11, fontWeight: 500 }}>Front photo</span>
              </div>
              <div style={{ flex: 1, height: 80, border: `1px dashed ${SKIN.borderStrong}`, borderRadius: 6, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6, color: SKIN.inkMute, background: SKIN.surface }}>
                <Camera size={20} />
                <span style={{ fontSize: 11, fontWeight: 500 }}>Ingredients</span>
              </div>
            </div>
          </div>
        </div>

      </div>
      <BottomTabs active="scan" />
    </PhoneFrame>
  );
}

function Screen5Profile() {
  return (
    <PhoneFrame bg={SKIN.bg}>
      <TopChrome title="Profile" showAvatar={false} />
      <div style={{ flex: 1, overflowY: "auto" }}>
        <div style={{ padding: "24px 20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 32 }}>
            <div style={{ width: 64, height: 64, borderRadius: "50%", background: SKIN.primaryStrong, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, fontWeight: 700 }}>
              A
            </div>
            <div>
              <div style={{ fontSize: 20, fontWeight: 700, color: SKIN.ink, fontFamily: SKIN.fontSerif }}>Anna</div>
              <div style={{ fontSize: 14, color: SKIN.inkSoft }}>Joined 2024</div>
            </div>
          </div>

          <div style={{ background: SKIN.surface, border: `1px solid ${SKIN.border}`, borderRadius: 8, padding: "16px", marginBottom: 24, boxShadow: SKIN.shadowSm }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: SKIN.ink, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 12 }}>
              Premium Milestone
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 12 }}>
              <span style={{ fontSize: 28, fontWeight: 800, color: SKIN.ink, lineHeight: 1 }}>12</span>
              <span style={{ fontSize: 14, color: SKIN.inkSoft, fontWeight: 500 }}>/ 30 approved</span>
            </div>
            <div style={{ height: 6, background: SKIN.bg, borderRadius: 3, overflow: "hidden", marginBottom: 12 }}>
              <div style={{ height: "100%", width: "40%", background: SKIN.primaryStrong }} />
            </div>
            <div style={{ fontSize: 13, color: SKIN.inkMute, lineHeight: 1.4 }}>
              Submit 18 more products to unlock 1 month of SkinScreen Premium free.
            </div>
          </div>

          <div style={{ fontSize: 12, fontWeight: 700, color: SKIN.ink, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 12 }}>
            My Contributions
          </div>
          
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {[
              { n: "Lumene Glow Boost", status: "review", date: "Today" },
              { n: "COSRX BHA Power Liquid", status: "accepted", date: "Oct 12" },
              { n: "Byoma Creamy Jelly", status: "accepted", date: "Oct 10" },
              { n: "Unknown barcode", status: "rejected", date: "Oct 5" },
            ].map((c, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px", background: SKIN.surface, border: `1px solid ${SKIN.border}`, borderRadius: 8 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: SKIN.ink, marginBottom: 4 }}>{c.n}</div>
                  <div style={{ fontSize: 12, color: SKIN.inkMute }}>{c.date}</div>
                </div>
                {c.status === "review" && (
                  <div style={{ fontSize: 11, fontWeight: 600, padding: "4px 8px", background: SKIN.warningSoft, color: SKIN.warning, borderRadius: 4 }}>Pending</div>
                )}
                {c.status === "accepted" && (
                  <div style={{ fontSize: 11, fontWeight: 600, padding: "4px 8px", background: SKIN.successSoft, color: SKIN.success, borderRadius: 4 }}>Accepted</div>
                )}
                {c.status === "rejected" && (
                  <div style={{ fontSize: 11, fontWeight: 600, padding: "4px 8px", background: SKIN.dangerSoft, color: SKIN.danger, borderRadius: 4 }}>Rejected</div>
                )}
              </div>
            ))}
          </div>

        </div>
      </div>
      <BottomTabs active="profile" />
    </PhoneFrame>
  );
}

export default function QuietUtility() {
  return (
    <DeckColumn>
      <VariantHeader
        letter="C"
        name="Quiet Utility"
        philosophy="Dense, content-first, power-user. Confident typography, tight spacing, high information density without feeling cramped."
        swatchAccent={SKIN.inkSoft}
      />
      
      <ScreenLabel index="1" title="Lookup Home" subtitle="Dense recent scans + FAB menu" />
      <Screen1Home />

      <ScreenLabel index="2" title="Results" subtitle="Full match, high contrast headers" />
      <Screen2FullMatch />

      <ScreenLabel index="3" title="Gap Fill" subtitle="Expanded inline strip + 5-state slider" />
      <Screen3GapFill />

      <ScreenLabel index="4" title="No Match" subtitle="Inline form below warning" />
      <Screen4NoMatch />

      <ScreenLabel index="5" title="Contributions" subtitle="Milestone tracker + status list" />
      <Screen5Profile />
      
    </DeckColumn>
  );
}