import React, { useState } from "react";
import { SKIN, PHONE_W, PHONE_H } from "./_shared/tokens";
import { ScreenLabel, PhoneFrame, VariantHeader, DeckColumn } from "./_shared/PhoneFrame";
import { DEMO } from "./_shared/demoData";
import { 
  ScanLine, 
  PackageSearch, 
  Compass, 
  User, 
  Search, 
  Camera, 
  ChevronRight, 
  CheckCircle2, 
  Circle, 
  Star, 
  Check, 
  AlertTriangle, 
  Info, 
  Clock, 
  Plus,
  ArrowLeft,
  X
} from "lucide-react";

// -- Shared UI --

function TopNav({ title, back }: { title?: string; back?: boolean }) {
  return (
    <div style={{ 
      height: 56, 
      display: "flex", 
      alignItems: "center", 
      justifyContent: "space-between", 
      padding: "0 20px",
      borderBottom: `1px solid ${SKIN.border}`,
      background: SKIN.surface,
      flexShrink: 0
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        {back ? (
          <ArrowLeft size={20} color={SKIN.ink} />
        ) : (
          <div style={{ 
            fontFamily: SKIN.fontSans, 
            fontWeight: 700, 
            fontSize: 16, 
            letterSpacing: "-0.02em", 
            color: SKIN.primaryStrong 
          }}>
            ChimIQ
          </div>
        )}
        {title && (
          <div style={{ 
            fontFamily: SKIN.fontSans, 
            fontWeight: 600, 
            fontSize: 15, 
            color: SKIN.ink 
          }}>
            {title}
          </div>
        )}
      </div>
      <div style={{ 
        width: 28, 
        height: 28, 
        borderRadius: "50%", 
        background: SKIN.primarySoft,
        color: SKIN.primaryStrong,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 12,
        fontWeight: 600,
        fontFamily: SKIN.fontSans
      }}>
        C
      </div>
    </div>
  );
}

function BottomNav({ active }: { active: "scan" | "browse" | "discover" | "profile" }) {
  const tabs = [
    { id: "scan", icon: ScanLine, label: "Scan" },
    { id: "browse", icon: PackageSearch, label: "Browse" },
    { id: "discover", icon: Compass, label: "Discover" },
    { id: "profile", icon: User, label: "Profile" },
  ] as const;

  return (
    <div style={{
      height: 84, // Includes safe area
      background: SKIN.surface,
      borderTop: `1px solid ${SKIN.border}`,
      display: "flex",
      alignItems: "flex-start",
      padding: "12px 16px 0",
      flexShrink: 0
    }}>
      {tabs.map((t) => {
        const isActive = t.id === active;
        const color = isActive ? SKIN.primaryStrong : SKIN.inkMute;
        return (
          <div key={t.id} style={{ 
            flex: 1, 
            display: "flex", 
            flexDirection: "column", 
            alignItems: "center", 
            gap: 4 
          }}>
            <t.icon size={24} color={color} strokeWidth={isActive ? 2.5 : 2} />
            <span style={{ 
              fontFamily: SKIN.fontSans, 
              fontSize: 10, 
              fontWeight: isActive ? 600 : 500,
              color: color 
            }}>{t.label}</span>
          </div>
        );
      })}
    </div>
  );
}

// -- Screen 1: Home --
function ScreenHome() {
  return (
    <PhoneFrame>
      <TopNav />
      <div style={{ flex: 1, overflowY: "auto", background: SKIN.bg, padding: 20 }}>
        
        {/* Morphing Search Bar (Morphed into Barcode state for demo) */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ 
            fontFamily: SKIN.fontSans, 
            fontSize: 13, 
            fontWeight: 600, 
            color: SKIN.inkSoft,
            marginBottom: 8,
            textTransform: "uppercase",
            letterSpacing: "0.05em"
          }}>
            Scan Product
          </div>
          
          <div style={{
            background: SKIN.surface,
            borderRadius: 16,
            boxShadow: SKIN.shadowSm,
            overflow: "hidden",
            border: `1px solid ${SKIN.borderStrong}`
          }}>
            {/* The "morphed" active state for barcode */}
            <div style={{
              height: 200,
              background: "#000",
              position: "relative",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}>
              {/* Fake camera viewfinder */}
              <div style={{
                width: 240, height: 120,
                border: "2px solid rgba(255,255,255,0.4)",
                borderRadius: 12,
                position: "relative"
              }}>
                <div style={{
                  position: "absolute", top: "50%", left: 0, right: 0,
                  height: 2, background: SKIN.primary,
                  boxShadow: `0 0 8px ${SKIN.primary}`
                }} />
              </div>
              <div style={{ position: "absolute", top: 12, right: 12 }}>
                <div style={{ background: "rgba(0,0,0,0.5)", borderRadius: 20, padding: 6, color: "#fff" }}>
                  <X size={20} />
                </div>
              </div>
              <div style={{ 
                position: "absolute", bottom: 16, 
                color: "#fff", fontFamily: SKIN.fontSans, fontSize: 13, fontWeight: 500
              }}>
                Align barcode within frame
              </div>
            </div>
            
            {/* The collapsed text input below it */}
            <div style={{ 
              display: "flex", alignItems: "center", padding: "12px 16px",
              borderTop: `1px solid ${SKIN.border}`
            }}>
              <Search size={20} color={SKIN.inkMute} />
              <input 
                placeholder="Or type product name..." 
                disabled
                style={{ 
                  flex: 1, border: "none", outline: "none", background: "transparent",
                  padding: "0 12px", fontFamily: SKIN.fontSans, fontSize: 16,
                  color: SKIN.ink
                }} 
              />
              <Camera size={20} color={SKIN.inkMute} style={{ marginLeft: 8 }} />
            </div>
          </div>
        </div>

        <div style={{ 
          fontFamily: SKIN.fontSans, 
          fontSize: 13, 
          fontWeight: 600, 
          color: SKIN.inkSoft,
          marginBottom: 12,
          textTransform: "uppercase",
          letterSpacing: "0.05em"
        }}>
          Recent Scans
        </div>

        <div style={{
          background: SKIN.surface,
          borderRadius: 16,
          boxShadow: SKIN.shadowSm,
          border: `1px solid ${SKIN.border}`,
          overflow: "hidden"
        }}>
          {DEMO.recent.map((r, i) => (
            <div key={i} style={{
              display: "flex",
              alignItems: "center",
              padding: "16px",
              borderBottom: i < DEMO.recent.length - 1 ? `1px solid ${SKIN.border}` : "none"
            }}>
              <div style={{
                width: 8, height: 8, borderRadius: "50%",
                background: r.verdict === "safe" ? SKIN.success : SKIN.warning,
                marginRight: 16
              }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: SKIN.fontSans, fontSize: 15, fontWeight: 500, color: SKIN.ink, marginBottom: 2 }}>
                  {r.name}
                </div>
                <div style={{ fontFamily: SKIN.fontSans, fontSize: 13, color: SKIN.inkMute }}>
                  {r.when}
                </div>
              </div>
              <ChevronRight size={20} color={SKIN.borderStrong} />
            </div>
          ))}
        </div>
      </div>
      <BottomNav active="scan" />
    </PhoneFrame>
  );
}

// -- Screen 2: Full Match --
function ScreenResultsFull() {
  const product = DEMO.productFull;
  return (
    <PhoneFrame>
      <TopNav back title="Analysis" />
      <div style={{ flex: 1, overflowY: "auto", background: SKIN.bg }}>
        
        {/* Product Header */}
        <div style={{ padding: "24px 20px", background: SKIN.surface, borderBottom: `1px solid ${SKIN.border}` }}>
          <div style={{ display: "flex", gap: 20 }}>
            <div style={{ 
              width: 80, height: 100, 
              background: SKIN.surfaceMuted, 
              borderRadius: 12,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 40,
              border: `1px solid ${SKIN.border}`
            }}>
              {product.image}
            </div>
            <div style={{ flex: 1, paddingTop: 4 }}>
              <div style={{ fontFamily: SKIN.fontSans, fontSize: 13, fontWeight: 600, color: SKIN.inkSoft, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>
                {product.brand}
              </div>
              <div style={{ fontFamily: SKIN.fontSerif, fontSize: 24, fontWeight: 600, color: SKIN.ink, lineHeight: 1.1, marginBottom: 12 }}>
                {product.name}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <Star size={16} fill={SKIN.warning} color={SKIN.warning} />
                <span style={{ fontFamily: SKIN.fontSans, fontSize: 14, fontWeight: 600, color: SKIN.ink }}>{product.rating}</span>
                <span style={{ fontFamily: SKIN.fontSans, fontSize: 14, color: SKIN.inkMute }}>({product.ratingCount})</span>
              </div>
            </div>
          </div>
        </div>

        {/* Verdict */}
        <div style={{ padding: "24px 20px" }}>
          <div style={{
            background: SKIN.successSoft,
            borderRadius: 16,
            padding: 20,
            border: `1px solid ${SKIN.success}40`
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
              <div style={{ width: 32, height: 32, borderRadius: "50%", background: SKIN.success, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Check size={20} strokeWidth={3} />
              </div>
              <div style={{ fontFamily: SKIN.fontSerif, fontSize: 22, fontWeight: 600, color: SKIN.ink }}>
                {product.headline}
              </div>
            </div>
            <div style={{ fontFamily: SKIN.fontSans, fontSize: 15, color: SKIN.inkSoft, lineHeight: 1.5 }}>
              {product.subhead}
            </div>
          </div>

          <div style={{ marginTop: 32 }}>
            <div style={{ fontFamily: SKIN.fontSans, fontSize: 13, fontWeight: 600, color: SKIN.inkSoft, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 16 }}>
              Ingredient Analysis
            </div>
            <div style={{ background: SKIN.surface, borderRadius: 16, border: `1px solid ${SKIN.border}`, padding: 20 }}>
              <div style={{ fontFamily: SKIN.fontSans, fontSize: 14, color: SKIN.inkSoft, lineHeight: 1.6 }}>
                {product.ingredients.map((ing, i) => (
                  <React.Fragment key={i}>
                    {ing}{i < product.ingredients.length - 1 ? ", " : ""}
                  </React.Fragment>
                ))}
              </div>
            </div>
          </div>
        </div>

      </div>
    </PhoneFrame>
  );
}

// -- Screen 3: Partial Match + Gap Fill --
function ScreenResultsPartial() {
  const product = DEMO.productPartial;
  return (
    <PhoneFrame>
      <TopNav back title="Analysis" />
      <div style={{ flex: 1, overflowY: "auto", background: SKIN.bg }}>
        
        {/* Product Header */}
        <div style={{ padding: "24px 20px", background: SKIN.surface, borderBottom: `1px solid ${SKIN.border}` }}>
          <div style={{ display: "flex", gap: 20 }}>
            <div style={{ 
              width: 80, height: 100, 
              background: SKIN.surfaceMuted, 
              borderRadius: 12,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 40,
              border: `1px dashed ${SKIN.borderStrong}` // dashed to hint missing photo
            }}>
              {product.image}
            </div>
            <div style={{ flex: 1, paddingTop: 4 }}>
              <div style={{ fontFamily: SKIN.fontSans, fontSize: 13, fontWeight: 600, color: SKIN.inkSoft, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>
                {product.brand}
              </div>
              <div style={{ fontFamily: SKIN.fontSerif, fontSize: 24, fontWeight: 600, color: SKIN.ink, lineHeight: 1.1, marginBottom: 12 }}>
                {product.name}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, color: SKIN.inkMute }}>
                <Info size={16} />
                <span style={{ fontFamily: SKIN.fontSans, fontSize: 13 }}>Missing user rating</span>
              </div>
            </div>
          </div>
        </div>

        {/* Verdict */}
        <div style={{ padding: "24px 20px" }}>
          <div style={{
            background: SKIN.warningSoft,
            borderRadius: 16,
            padding: 20,
            border: `1px solid ${SKIN.warning}40`,
            marginBottom: 24
          }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 12 }}>
              <div style={{ width: 32, height: 32, borderRadius: "50%", background: SKIN.warning, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <AlertTriangle size={18} strokeWidth={2.5} />
              </div>
              <div style={{ fontFamily: SKIN.fontSerif, fontSize: 20, fontWeight: 600, color: SKIN.ink, lineHeight: 1.2, paddingTop: 4 }}>
                {product.headline}
              </div>
            </div>
            <div style={{ fontFamily: SKIN.fontSans, fontSize: 15, color: SKIN.inkSoft, lineHeight: 1.5 }}>
              {product.subhead}
            </div>
          </div>

          {/* GAP FILL CARD: INLINE CHECKLIST */}
          <div style={{
            background: SKIN.surface,
            borderRadius: 16,
            border: `1px solid ${SKIN.borderStrong}`,
            padding: 20,
            marginBottom: 32,
            boxShadow: SKIN.shadowSm
          }}>
            <div style={{ fontFamily: SKIN.fontSans, fontSize: 15, fontWeight: 600, color: SKIN.ink, marginBottom: 4 }}>
              Help us complete this product.
            </div>
            <div style={{ fontFamily: SKIN.fontSans, fontSize: 14, color: SKIN.inkSoft, marginBottom: 20 }}>
              Two fields missing.
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: 24 }}>
              
              {/* Row 1: Photo */}
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <Circle size={20} color={SKIN.borderStrong} />
                <div style={{ flex: 1, fontFamily: SKIN.fontSans, fontSize: 15, color: SKIN.ink }}>
                  Product front photo
                </div>
                <div style={{ 
                  padding: "6px 12px", borderRadius: 8, 
                  background: SKIN.primarySoft, color: SKIN.primaryStrong,
                  fontFamily: SKIN.fontSans, fontSize: 13, fontWeight: 600,
                  display: "flex", alignItems: "center", gap: 6
                }}>
                  <Camera size={14} /> Add
                </div>
              </div>

              {/* Row 2: Rating */}
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <CheckCircle2 size={20} color={SKIN.primary} />
                <div style={{ flex: 1, fontFamily: SKIN.fontSans, fontSize: 15, color: SKIN.ink }}>
                  Your rating
                </div>
                <div style={{ display: "flex", gap: 4 }}>
                  {[1,2,3,4,5].map(i => (
                    <Star key={i} size={20} fill={i <= 4 ? SKIN.warning : "transparent"} color={i <= 4 ? SKIN.warning : SKIN.borderStrong} />
                  ))}
                </div>
              </div>

            </div>

            <button style={{
              width: "100%",
              height: 48,
              borderRadius: 12,
              background: SKIN.primaryStrong,
              color: "#fff",
              fontFamily: SKIN.fontSans,
              fontSize: 15,
              fontWeight: 600,
              border: "none",
              outline: "none"
            }}>
              Confirm Details
            </button>
          </div>

          <div style={{ fontFamily: SKIN.fontSans, fontSize: 13, fontWeight: 600, color: SKIN.inkSoft, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 16 }}>
            Ingredient Analysis
          </div>
          <div style={{ background: SKIN.surface, borderRadius: 16, border: `1px solid ${SKIN.border}`, padding: 20 }}>
            {product.flags.map((flag, i) => (
              <div key={i} style={{ 
                display: "inline-block", padding: "4px 8px", borderRadius: 6,
                background: SKIN.dangerSoft, color: SKIN.danger,
                fontFamily: SKIN.fontSans, fontSize: 12, fontWeight: 600,
                marginRight: 8, marginBottom: 12
              }}>
                {flag}
              </div>
            ))}
            <div style={{ fontFamily: SKIN.fontSans, fontSize: 14, color: SKIN.inkSoft, lineHeight: 1.6 }}>
              {product.ingredients.join(", ")}
            </div>
          </div>

        </div>
      </div>
    </PhoneFrame>
  );
}

// -- Screen 4: No Match (Contribute Flow) --
function ScreenNoMatch() {
  const missing = DEMO.productMissing;
  return (
    <PhoneFrame>
      <TopNav back title="Not Found" />
      <div style={{ flex: 1, overflowY: "auto", background: SKIN.bg, padding: 20 }}>
        
        <div style={{ textAlign: "center", marginBottom: 32, marginTop: 20 }}>
          <div style={{ 
            width: 64, height: 64, borderRadius: "50%", 
            background: SKIN.surface, border: `1px solid ${SKIN.border}`,
            display: "flex", alignItems: "center", justifyContent: "center",
            margin: "0 auto 16px"
          }}>
            <Search size={28} color={SKIN.inkMute} />
          </div>
          <div style={{ fontFamily: SKIN.fontSerif, fontSize: 24, fontWeight: 600, color: SKIN.ink, marginBottom: 8 }}>
            Product not in database
          </div>
          <div style={{ fontFamily: SKIN.fontSans, fontSize: 15, color: SKIN.inkSoft, lineHeight: 1.5, padding: "0 20px" }}>
            Add it once, and we'll instantly analyze it for you and everyone else.
          </div>
        </div>

        <div style={{
          background: SKIN.surface,
          borderRadius: 16,
          border: `1px solid ${SKIN.border}`,
          padding: "24px 20px",
          boxShadow: SKIN.shadowSm
        }}>
          
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: "block", fontFamily: SKIN.fontSans, fontSize: 13, fontWeight: 600, color: SKIN.ink, marginBottom: 8 }}>Barcode</label>
            <input 
              value={missing.barcode}
              disabled
              style={{
                width: "100%", height: 48, borderRadius: 12,
                border: `1px solid ${SKIN.border}`,
                background: SKIN.surfaceMuted,
                padding: "0 16px",
                fontFamily: SKIN.fontSans, fontSize: 15, color: SKIN.inkSoft,
                outline: "none"
              }}
            />
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={{ display: "block", fontFamily: SKIN.fontSans, fontSize: 13, fontWeight: 600, color: SKIN.ink, marginBottom: 8 }}>Product Name</label>
            <input 
              value={missing.queryName}
              style={{
                width: "100%", height: 48, borderRadius: 12,
                border: `1px solid ${SKIN.borderStrong}`,
                background: SKIN.surface,
                padding: "0 16px",
                fontFamily: SKIN.fontSans, fontSize: 15, color: SKIN.ink,
                outline: "none"
              }}
            />
          </div>

          <div style={{ display: "flex", gap: 12, marginBottom: 32 }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: "block", fontFamily: SKIN.fontSans, fontSize: 13, fontWeight: 600, color: SKIN.ink, marginBottom: 8 }}>Front Photo</label>
              <div style={{ 
                height: 120, borderRadius: 12, border: `1px dashed ${SKIN.borderStrong}`,
                background: SKIN.bg, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8
              }}>
                <div style={{ width: 32, height: 32, borderRadius: "50%", background: SKIN.primarySoft, color: SKIN.primaryStrong, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Plus size={16} />
                </div>
              </div>
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ display: "block", fontFamily: SKIN.fontSans, fontSize: 13, fontWeight: 600, color: SKIN.ink, marginBottom: 8 }}>Ingredients List</label>
              <div style={{ 
                height: 120, borderRadius: 12, border: `1px dashed ${SKIN.borderStrong}`,
                background: SKIN.bg, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8
              }}>
                <div style={{ width: 32, height: 32, borderRadius: "50%", background: SKIN.primarySoft, color: SKIN.primaryStrong, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Plus size={16} />
                </div>
              </div>
            </div>
          </div>

          <button style={{
            width: "100%",
            height: 48,
            borderRadius: 12,
            background: SKIN.primaryStrong,
            color: "#fff",
            fontFamily: SKIN.fontSans,
            fontSize: 15,
            fontWeight: 600,
            border: "none",
            outline: "none"
          }}>
            Analyze Product
          </button>

        </div>

      </div>
    </PhoneFrame>
  );
}

// -- Screen 5: Profile Contributions --
function ScreenContributions() {
  return (
    <PhoneFrame>
      <TopNav title="My Contributions" />
      <div style={{ flex: 1, overflowY: "auto", background: SKIN.bg, padding: 20 }}>
        
        <div style={{
          background: SKIN.surface,
          borderRadius: 16,
          border: `1px solid ${SKIN.border}`,
          padding: 20,
          marginBottom: 32,
          boxShadow: SKIN.shadowSm
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <div style={{ fontFamily: SKIN.fontSans, fontSize: 15, fontWeight: 600, color: SKIN.ink }}>
              Premium Unlock
            </div>
            <div style={{ fontFamily: SKIN.fontSans, fontSize: 14, fontWeight: 600, color: SKIN.primaryStrong }}>
              12 / 30
            </div>
          </div>
          
          <div style={{ height: 8, background: SKIN.surfaceMuted, borderRadius: 4, overflow: "hidden", marginBottom: 12 }}>
            <div style={{ height: "100%", width: "40%", background: SKIN.primaryStrong, borderRadius: 4 }} />
          </div>
          
          <div style={{ fontFamily: SKIN.fontSans, fontSize: 13, color: SKIN.inkSoft, lineHeight: 1.5 }}>
            Contribute 18 more approved products to unlock 1 month of Premium for free.
          </div>
        </div>

        <div style={{ fontFamily: SKIN.fontSans, fontSize: 13, fontWeight: 600, color: SKIN.inkSoft, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 12 }}>
          Submission History
        </div>

        <div style={{
          background: SKIN.surface,
          borderRadius: 16,
          boxShadow: SKIN.shadowSm,
          border: `1px solid ${SKIN.border}`,
          overflow: "hidden"
        }}>
          <div style={{ padding: 16, borderBottom: `1px solid ${SKIN.border}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
              <div style={{ fontFamily: SKIN.fontSans, fontSize: 15, fontWeight: 500, color: SKIN.ink, maxWidth: 200 }}>
                Lumene Nordic-C Glow Boost Essence
              </div>
              <div style={{ 
                padding: "4px 8px", borderRadius: 6, background: SKIN.warningSoft, color: SKIN.warning,
                fontFamily: SKIN.fontSans, fontSize: 11, fontWeight: 600, textTransform: "uppercase"
              }}>
                Pending
              </div>
            </div>
            <div style={{ fontFamily: SKIN.fontSans, fontSize: 13, color: SKIN.inkMute }}>
              Submitted Today
            </div>
          </div>
          <div style={{ padding: 16, borderBottom: `1px solid ${SKIN.border}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
              <div style={{ fontFamily: SKIN.fontSans, fontSize: 15, fontWeight: 500, color: SKIN.ink, maxWidth: 200 }}>
                Ordinary Retinol 1%
              </div>
              <div style={{ 
                padding: "4px 8px", borderRadius: 6, background: SKIN.successSoft, color: SKIN.success,
                fontFamily: SKIN.fontSans, fontSize: 11, fontWeight: 600, textTransform: "uppercase"
              }}>
                Accepted
              </div>
            </div>
            <div style={{ fontFamily: SKIN.fontSans, fontSize: 13, color: SKIN.inkMute }}>
              Submitted Oct 12 • +1 Point
            </div>
          </div>
          <div style={{ padding: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
              <div style={{ fontFamily: SKIN.fontSans, fontSize: 15, fontWeight: 500, color: SKIN.ink, maxWidth: 200 }}>
                Unknown Moisturizer
              </div>
              <div style={{ 
                padding: "4px 8px", borderRadius: 6, background: SKIN.surfaceMuted, color: SKIN.inkSoft,
                fontFamily: SKIN.fontSans, fontSize: 11, fontWeight: 600, textTransform: "uppercase"
              }}>
                Rejected
              </div>
            </div>
            <div style={{ fontFamily: SKIN.fontSans, fontSize: 13, color: SKIN.inkMute }}>
              Submitted Oct 05 • Blurry photo
            </div>
          </div>
        </div>

      </div>
      <BottomNav active="profile" />
    </PhoneFrame>
  );
}

// -- Main Export --
export default function InlineChecklist() {
  return (
    <DeckColumn>
      <VariantHeader 
        letter="A"
        name="Inline Checklist"
        philosophy="Clinical, calm, evidence-led. Generous whitespace, single-column, soft sage on white."
        swatchAccent={SKIN.primaryStrong}
      />
      
      <ScreenLabel index="1" title="Lookup Home" subtitle="Primary entry point with morphing search" />
      <ScreenHome />

      <ScreenLabel index="2" title="Results: Full Match" subtitle="Pristine product card and verdict" />
      <ScreenResultsFull />

      <ScreenLabel index="3" title="Results: Partial Match" subtitle="Inline checklist for missing fields" />
      <ScreenResultsPartial />

      <ScreenLabel index="4" title="Results: No Match" subtitle="Clean, paper-like contribution form" />
      <ScreenNoMatch />

      <ScreenLabel index="5" title="My Contributions" subtitle="Profile sub-screen with progress" />
      <ScreenContributions />
    </DeckColumn>
  );
}
