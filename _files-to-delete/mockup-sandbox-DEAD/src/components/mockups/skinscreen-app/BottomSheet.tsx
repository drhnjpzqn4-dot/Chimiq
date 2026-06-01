import React from "react";
import {
  ScanLine,
  PackageSearch,
  Compass,
  User,
  Camera,
  Search,
  ClipboardPaste,
  CheckCircle2,
  AlertTriangle,
  ChevronRight,
  ThumbsUp,
  ThumbsDown,
  Camera as CameraIcon,
  X,
  Clock,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { SKIN } from "./_shared/tokens";
import {
  PhoneFrame,
  DeckColumn,
  VariantHeader,
  ScreenLabel,
} from "./_shared/PhoneFrame";
import { DEMO } from "./_shared/demoData";

function TopNav({ title, subtitle }: { title?: string; subtitle?: string }) {
  return (
    <div
      style={{
        padding: "16px 20px",
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "space-between",
        background: "rgba(250, 250, 248, 0.8)",
        backdropFilter: "blur(12px)",
        borderBottom: `1px solid ${SKIN.border}`,
        position: "sticky",
        top: 0,
        zIndex: 10,
      }}
    >
      <div>
        <div
          style={{
            fontFamily: SKIN.fontSerif,
            fontWeight: 700,
            fontSize: 20,
            color: SKIN.ink,
            letterSpacing: "-0.02em",
          }}
        >
          ChimIQ
        </div>
        {(title || subtitle) && (
          <div style={{ marginTop: 8 }}>
            {title && (
              <div
                style={{
                  fontFamily: SKIN.fontSerif,
                  fontSize: 22,
                  fontWeight: 600,
                  color: SKIN.ink,
                }}
              >
                {title}
              </div>
            )}
            {subtitle && (
              <div
                style={{
                  fontFamily: SKIN.fontSans,
                  fontSize: 13,
                  color: SKIN.inkSoft,
                  marginTop: 2,
                }}
              >
                {subtitle}
              </div>
            )}
          </div>
        )}
      </div>
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: 16,
          background: SKIN.roseSoft,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: SKIN.rose,
          fontWeight: 700,
          fontSize: 12,
        }}
      >
        U
      </div>
    </div>
  );
}

function BottomTabBar({ active = "scan" }: { active?: string }) {
  const tabs = [
    { id: "scan", icon: ScanLine, label: "Scan" },
    { id: "browse", icon: PackageSearch, label: "Browse" },
    { id: "discover", icon: Compass, label: "Discover" },
    { id: "profile", icon: User, label: "Profile" },
  ];

  return (
    <div
      style={{
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        height: 84,
        background: "rgba(255, 255, 255, 0.9)",
        backdropFilter: "blur(20px)",
        borderTop: `1px solid ${SKIN.border}`,
        display: "flex",
        paddingBottom: 20, // Safe area
        zIndex: 20,
      }}
    >
      {tabs.map((tab) => {
        const isActive = tab.id === active;
        return (
          <div
            key={tab.id}
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              color: isActive ? SKIN.primaryStrong : SKIN.inkMute,
              gap: 4,
            }}
          >
            <div
              style={{
                background: isActive ? SKIN.primarySoft : "transparent",
                padding: "6px 16px",
                borderRadius: 16,
                transition: "background 0.2s",
              }}
            >
              <tab.icon size={22} strokeWidth={isActive ? 2.5 : 2} />
            </div>
            <span
              style={{
                fontSize: 11,
                fontWeight: isActive ? 600 : 500,
              }}
            >
              {tab.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export default function BottomSheetVariant() {
  return (
    <DeckColumn>
      <VariantHeader
        letter="B"
        name="Bottom-Sheet Celebration"
        philosophy="Warmer, social, playful. The camera is foregrounded, contributions happen via contextual bottom sheets that celebrate collective effort."
        swatchAccent={SKIN.rose}
      />

      {/* Screen 1: LOOKUP HOME */}
      <ScreenLabel index="1" title="Lookup Home" subtitle="Foregrounded camera viewfinder with soft overlay tabs for search/paste." />
      <PhoneFrame bg="#000">
        <div style={{ position: "relative", height: "100%", display: "flex", flexDirection: "column" }}>
          {/* Mock Camera View */}
          <div style={{ flex: 1, background: "#1a1a1a", position: "relative" }}>
             {/* Reticle */}
             <div style={{
               position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)",
               width: 240, height: 160, border: "2px solid rgba(255,255,255,0.4)", borderRadius: 16
             }}>
                <div style={{ position: "absolute", top: -2, left: -2, width: 24, height: 24, borderTop: "4px solid #fff", borderLeft: "4px solid #fff", borderTopLeftRadius: 16 }} />
                <div style={{ position: "absolute", top: -2, right: -2, width: 24, height: 24, borderTop: "4px solid #fff", borderRight: "4px solid #fff", borderTopRightRadius: 16 }} />
                <div style={{ position: "absolute", bottom: -2, left: -2, width: 24, height: 24, borderBottom: "4px solid #fff", borderLeft: "4px solid #fff", borderBottomLeftRadius: 16 }} />
                <div style={{ position: "absolute", bottom: -2, right: -2, width: 24, height: 24, borderBottom: "4px solid #fff", borderRight: "4px solid #fff", borderBottomRightRadius: 16 }} />
             </div>
             
             <div style={{ position: "absolute", top: 16, left: 20, right: 20, display: "flex", justifyContent: "space-between" }}>
               <div style={{ color: "#fff", fontFamily: SKIN.fontSerif, fontSize: 20, fontWeight: 700 }}>ChimIQ</div>
               <div style={{ width: 32, height: 32, borderRadius: 16, background: "rgba(255,255,255,0.2)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700 }}>U</div>
             </div>
             
             <div style={{ position: "absolute", bottom: 24, left: 0, right: 0, textAlign: "center", color: "#fff", opacity: 0.8, fontSize: 14 }}>
               Point at a barcode or ingredient list
             </div>
          </div>
          
          {/* Bottom Panel */}
          <div style={{ background: SKIN.bg, padding: "24px 20px 100px", borderTopLeftRadius: 24, borderTopRightRadius: 24, marginTop: -20, position: "relative" }}>
             <div style={{ width: 40, height: 4, background: SKIN.borderStrong, borderRadius: 2, margin: "0 auto 24px" }} />
             
             <div style={{ display: "flex", gap: 12, marginBottom: 24 }}>
                <div style={{ flex: 1, background: SKIN.surface, padding: "16px", borderRadius: 16, boxShadow: SKIN.shadowSm, display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 20, background: SKIN.primarySoft, color: SKIN.primaryStrong, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Search size={20} />
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>Search Name</span>
                </div>
                <div style={{ flex: 1, background: SKIN.surface, padding: "16px", borderRadius: 16, boxShadow: SKIN.shadowSm, display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 20, background: SKIN.roseSoft, color: SKIN.rose, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <ClipboardPaste size={20} />
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>Paste Text</span>
                </div>
             </div>
             
             <div style={{ fontSize: 16, fontWeight: 700, fontFamily: SKIN.fontSerif, marginBottom: 16 }}>Recent Scans</div>
             <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
               {DEMO.recent.slice(0,2).map((item, i) => (
                 <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: SKIN.surface, padding: 12, borderRadius: 12, border: `1px solid ${SKIN.border}` }}>
                   <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                     <div style={{ width: 8, height: 8, borderRadius: 4, background: item.verdict === "safe" ? SKIN.success : SKIN.warning }} />
                     <div style={{ fontSize: 14, fontWeight: 500, maxWidth: 200, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.name}</div>
                   </div>
                   <div style={{ fontSize: 12, color: SKIN.inkMute }}>{item.when}</div>
                 </div>
               ))}
             </div>
          </div>
          <BottomTabBar />
        </div>
      </PhoneFrame>

      {/* Screen 2: RESULTS - Full Match */}
      <ScreenLabel index="2" title="Results — Full Match" subtitle="Clean product card, safe verdict." />
      <PhoneFrame>
        <div style={{ overflowY: "auto", height: "100%", paddingBottom: 100 }}>
          <TopNav />
          <div style={{ padding: 20 }}>
            <div style={{ display: "flex", gap: 16, background: SKIN.surface, padding: 16, borderRadius: 20, boxShadow: SKIN.shadowSm, marginBottom: 24 }}>
              <div style={{ width: 72, height: 84, borderRadius: 12, background: SKIN.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32 }}>
                {DEMO.productFull.image}
              </div>
              <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
                <div style={{ fontSize: 13, color: SKIN.inkMute, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>
                  {DEMO.productFull.brand}
                </div>
                <div style={{ fontFamily: SKIN.fontSerif, fontSize: 18, fontWeight: 700, lineHeight: 1.2, marginBottom: 8 }}>
                  {DEMO.productFull.name}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 13, color: SKIN.inkSoft }}>
                  <StarIcon /> <span style={{ fontWeight: 600, color: SKIN.ink }}>{DEMO.productFull.rating}</span> ({DEMO.productFull.ratingCount})
                </div>
              </div>
            </div>

            <div style={{ background: SKIN.successSoft, borderRadius: 20, padding: 20, marginBottom: 24, border: `1px solid rgba(63, 164, 90, 0.2)` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
                <CheckCircle2 color={SKIN.success} size={28} />
                <div style={{ fontFamily: SKIN.fontSerif, fontSize: 20, fontWeight: 700, color: SKIN.success }}>{DEMO.productFull.headline}</div>
              </div>
              <div style={{ fontSize: 14, color: SKIN.inkSoft, lineHeight: 1.5, paddingLeft: 40 }}>
                {DEMO.productFull.subhead}
              </div>
            </div>
            
            <div style={{ fontSize: 18, fontWeight: 700, fontFamily: SKIN.fontSerif, marginBottom: 16 }}>Ingredients (14)</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
               {DEMO.productFull.ingredients.map(ing => (
                 <span key={ing} style={{ background: SKIN.surface, border: `1px solid ${SKIN.border}`, padding: "6px 12px", borderRadius: 16, fontSize: 13 }}>
                   {ing}
                 </span>
               ))}
            </div>
          </div>
        </div>
        <BottomTabBar />
      </PhoneFrame>

      {/* Screen 3: RESULTS - Partial Match + Gap-Fill */}
      <ScreenLabel index="3" title="Results — Partial + Gap-Fill" subtitle="Warning verdict, plus a bottom sheet overlay for missing info." />
      <PhoneFrame>
        <div style={{ position: "relative", height: "100%", overflow: "hidden" }}>
          <div style={{ overflowY: "auto", height: "100%", paddingBottom: 100 }}>
            <TopNav />
            <div style={{ padding: 20 }}>
              <div style={{ display: "flex", gap: 16, background: SKIN.surface, padding: 16, borderRadius: 20, boxShadow: SKIN.shadowSm, marginBottom: 24 }}>
                <div style={{ width: 72, height: 84, borderRadius: 12, background: SKIN.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32 }}>
                  {DEMO.productPartial.image}
                </div>
                <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
                  <div style={{ fontSize: 13, color: SKIN.inkMute, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>
                    {DEMO.productPartial.brand}
                  </div>
                  <div style={{ fontFamily: SKIN.fontSerif, fontSize: 18, fontWeight: 700, lineHeight: 1.2, marginBottom: 8 }}>
                    {DEMO.productPartial.name}
                  </div>
                </div>
              </div>

              <div style={{ background: SKIN.warningSoft, borderRadius: 20, padding: 20, marginBottom: 24, border: `1px solid rgba(232, 156, 45, 0.2)` }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
                  <AlertTriangle color={SKIN.warning} size={28} />
                  <div style={{ fontFamily: SKIN.fontSerif, fontSize: 20, fontWeight: 700, color: "#B37110" }}>{DEMO.productPartial.headline}</div>
                </div>
                <div style={{ fontSize: 14, color: "#9A610D", lineHeight: 1.5, paddingLeft: 40 }}>
                  {DEMO.productPartial.subhead}
                </div>
              </div>
              
              <div style={{ fontSize: 18, fontWeight: 700, fontFamily: SKIN.fontSerif, marginBottom: 16 }}>Ingredients (5)</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                 {DEMO.productPartial.ingredients.map(ing => (
                   <span key={ing} style={{ background: SKIN.surface, border: `1px solid ${SKIN.border}`, padding: "6px 12px", borderRadius: 16, fontSize: 13 }}>
                     {ing}
                   </span>
                 ))}
              </div>
            </div>
          </div>
          
          {/* Scrim */}
          <div style={{ position: "absolute", inset: 0, background: "rgba(26, 26, 31, 0.4)", zIndex: 30 }} />
          
          {/* Bottom Sheet */}
          <div style={{ 
            position: "absolute", bottom: 0, left: 0, right: 0, 
            background: SKIN.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28, 
            padding: "24px 24px 40px", zIndex: 40,
            boxShadow: "0 -8px 32px rgba(0,0,0,0.1)"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <div style={{ fontFamily: SKIN.fontSerif, fontSize: 22, fontWeight: 700 }}>We're 80% there</div>
              <div style={{ width: 32, height: 32, borderRadius: 16, background: SKIN.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
                 <X size={18} color={SKIN.inkSoft} />
              </div>
            </div>
            
            <p style={{ fontSize: 14, color: SKIN.inkSoft, marginBottom: 24, lineHeight: 1.5 }}>
              You're helping 4,200 others avoid this conflict. Can you add a quick photo and your take?
            </p>
            
            <div style={{ display: "flex", gap: 12, marginBottom: 24 }}>
               <div style={{ width: 80, height: 80, borderRadius: 16, border: `2px dashed ${SKIN.borderStrong}`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: SKIN.inkMute, gap: 4, background: SKIN.bg }}>
                 <CameraIcon size={24} />
                 <span style={{ fontSize: 10, fontWeight: 600 }}>Front</span>
               </div>
               <div style={{ flex: 1, background: SKIN.bg, borderRadius: 16, border: `1px solid ${SKIN.border}`, padding: 16, display: "flex", flexDirection: "column", justifyContent: "center" }}>
                 <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>Did it work for you?</div>
                 <div style={{ display: "flex", gap: 12 }}>
                   <div style={{ width: 44, height: 44, borderRadius: 22, border: `1px solid ${SKIN.borderStrong}`, display: "flex", alignItems: "center", justifyContent: "center", color: SKIN.inkSoft }}>
                     <ThumbsDown size={20} />
                   </div>
                   <div style={{ width: 44, height: 44, borderRadius: 22, border: `1px solid ${SKIN.borderStrong}`, display: "flex", alignItems: "center", justifyContent: "center", color: SKIN.inkSoft }}>
                     <ThumbsUp size={20} />
                   </div>
                 </div>
               </div>
            </div>
            
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
               <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: SKIN.primaryStrong, fontWeight: 600 }}>
                 <div style={{ width: 24, height: 24, borderRadius: 12, background: SKIN.primarySoft, display: "flex", alignItems: "center", justifyContent: "center" }}>
                   12
                 </div>
                 / 30 to Premium
               </div>
               
               <button style={{ background: SKIN.primaryStrong, color: "#fff", border: "none", padding: "14px 24px", borderRadius: 24, fontSize: 14, fontWeight: 600, display: "flex", alignItems: "center", gap: 8, whiteSpace: "nowrap" }}>
                 Confirm — this is correct
               </button>
            </div>
          </div>
        </div>
      </PhoneFrame>

      {/* Screen 4: RESULTS - No Match + Full Contribution */}
      <ScreenLabel index="4" title="Results — No Match" subtitle="Full height bottom sheet for full contribution." />
      <PhoneFrame>
         <div style={{ position: "relative", height: "100%", overflow: "hidden", background: "rgba(0,0,0,0.8)" }}>
           {/* Mock background of the scanner */}
           
           <div style={{ 
            position: "absolute", bottom: 0, left: 0, right: 0, top: 60,
            background: SKIN.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28, 
            padding: "24px 20px", zIndex: 40,
            display: "flex", flexDirection: "column"
          }}>
            <div style={{ width: 40, height: 4, background: SKIN.borderStrong, borderRadius: 2, margin: "0 auto 24px" }} />
            
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: 20, background: SKIN.roseSoft, color: SKIN.rose, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Compass size={20} />
                </div>
                <div style={{ fontFamily: SKIN.fontSerif, fontSize: 22, fontWeight: 700 }}>New discovery!</div>
              </div>
              <button aria-label="Dismiss" style={{ width: 32, height: 32, borderRadius: 16, background: SKIN.bg, border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                <X size={18} color={SKIN.inkSoft} />
              </button>
            </div>
            <p style={{ fontSize: 14, color: SKIN.inkSoft, marginBottom: 16, lineHeight: 1.5 }}>
              We don't have this one yet. Be the first to add it and help the community.
            </p>
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: SKIN.primaryStrong, fontWeight: 600, marginBottom: 20 }}>
              <div style={{ width: 22, height: 22, borderRadius: 11, background: SKIN.primarySoft, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11 }}>
                +5
              </div>
              earns 5 of 30 toward your free Premium month
            </div>
            
            <div style={{ flex: 1, overflowY: "auto" }}>
              <div style={{ background: SKIN.bg, border: `1px solid ${SKIN.border}`, borderRadius: 16, padding: 16, marginBottom: 16 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: SKIN.inkMute, marginBottom: 4 }}>SCANNED BARCODE</div>
                <div style={{ fontSize: 16, fontFamily: "monospace" }}>{DEMO.productMissing.barcode}</div>
              </div>
              
              <div style={{ background: SKIN.bg, border: `1px solid ${SKIN.border}`, borderRadius: 16, padding: 16, marginBottom: 12 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: SKIN.inkMute, marginBottom: 8 }}>PRODUCT NAME</div>
                <input type="text" defaultValue={DEMO.productMissing.queryName} style={{ width: "100%", background: "transparent", border: "none", fontSize: 16, outline: "none", color: SKIN.ink, fontWeight: 500 }} />
              </div>

              <div style={{ background: SKIN.bg, border: `1px solid ${SKIN.border}`, borderRadius: 16, padding: 16, marginBottom: 12 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: SKIN.inkMute, marginBottom: 8 }}>BRAND</div>
                <input type="text" placeholder="Lumene" style={{ width: "100%", background: "transparent", border: "none", fontSize: 16, outline: "none", color: SKIN.ink, fontWeight: 500 }} />
              </div>

              <div style={{ background: SKIN.bg, border: `1px solid ${SKIN.border}`, borderRadius: 16, padding: 16, marginBottom: 16 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: SKIN.inkMute, marginBottom: 10 }}>YOUR RATING</div>
                <div style={{ display: "flex", gap: 12 }}>
                  <div style={{ width: 44, height: 44, borderRadius: 22, border: `1px solid ${SKIN.borderStrong}`, display: "flex", alignItems: "center", justifyContent: "center", color: SKIN.inkSoft }}>
                    <ThumbsDown size={18} />
                  </div>
                  <div style={{ width: 44, height: 44, borderRadius: 22, border: `1px solid ${SKIN.borderStrong}`, display: "flex", alignItems: "center", justifyContent: "center", color: SKIN.inkSoft }}>
                    <ThumbsUp size={18} />
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", gap: 12, marginBottom: 24 }}>
                 <div style={{ flex: 1, height: 100, borderRadius: 16, border: `2px dashed ${SKIN.borderStrong}`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: SKIN.inkMute, gap: 8, background: SKIN.bg }}>
                   <CameraIcon size={24} />
                   <span style={{ fontSize: 12, fontWeight: 600 }}>Front Photo</span>
                 </div>
                 <div style={{ flex: 1, height: 100, borderRadius: 16, border: `2px dashed ${SKIN.borderStrong}`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: SKIN.inkMute, gap: 8, background: SKIN.bg }}>
                   <CameraIcon size={24} />
                   <span style={{ fontSize: 12, fontWeight: 600 }}>Ingredients</span>
                 </div>
              </div>
            </div>
            
            <div style={{ paddingTop: 16 }}>
               <button style={{ width: "100%", background: SKIN.primaryStrong, color: "#fff", border: "none", padding: "16px", borderRadius: 24, fontSize: 16, fontWeight: 600 }}>
                 Confirm — this is correct
               </button>
            </div>
          </div>
         </div>
      </PhoneFrame>

      {/* Screen 5: MY CONTRIBUTIONS */}
      <ScreenLabel index="5" title="My Contributions" subtitle="Profile sub-screen celebrating accepted data." />
      <PhoneFrame>
        <div style={{ height: "100%", display: "flex", flexDirection: "column", background: SKIN.bg }}>
           <TopNav title="Contributions" />
           <div style={{ padding: "24px 20px", flex: 1, overflowY: "auto", paddingBottom: 100 }}>
             
             <div style={{ background: SKIN.surface, borderRadius: 24, padding: 24, boxShadow: SKIN.shadowSm, marginBottom: 24, textAlign: "center" }}>
                <div style={{ width: 64, height: 64, borderRadius: 32, background: SKIN.roseSoft, color: SKIN.rose, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
                  <StarIcon size={32} />
                </div>
                <div style={{ fontSize: 24, fontWeight: 700, fontFamily: SKIN.fontSerif, marginBottom: 8 }}>12 / 30</div>
                <div style={{ fontSize: 14, color: SKIN.inkSoft, lineHeight: 1.5 }}>
                  Contributions toward your next<br/>free Premium month.
                </div>
                <div style={{ height: 8, background: SKIN.bg, borderRadius: 4, marginTop: 16, overflow: "hidden" }}>
                  <div style={{ width: "40%", height: "100%", background: SKIN.primaryStrong, borderRadius: 4 }} />
                </div>
             </div>
             
             <div style={{ fontSize: 18, fontWeight: 700, fontFamily: SKIN.fontSerif, marginBottom: 16 }}>Recent Activity</div>
             
             <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{ background: SKIN.surface, padding: 16, borderRadius: 16, border: `1px solid ${SKIN.border}` }}>
                   <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                     <div style={{ fontSize: 14, fontWeight: 600 }}>Lumene Nordic-C Essence</div>
                     <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 600, color: SKIN.inkMute, background: SKIN.bg, padding: "2px 8px", borderRadius: 12 }}>
                       <Clock size={12} /> PENDING
                     </div>
                   </div>
                   <div style={{ fontSize: 13, color: SKIN.inkSoft }}>Added full product details</div>
                </div>
                
                <div style={{ background: SKIN.surface, padding: 16, borderRadius: 16, border: `1px solid ${SKIN.border}` }}>
                   <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                     <div style={{ fontSize: 14, fontWeight: 600 }}>COSRX Snail Mucin</div>
                     <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 600, color: SKIN.success, background: SKIN.successSoft, padding: "2px 8px", borderRadius: 12 }}>
                       <CheckCircle size={12} /> ACCEPTED
                     </div>
                   </div>
                   <div style={{ fontSize: 13, color: SKIN.inkSoft }}>Added missing ingredients</div>
                </div>
                
                <div style={{ background: SKIN.surface, padding: 16, borderRadius: 16, border: `1px solid ${SKIN.border}` }}>
                   <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                     <div style={{ fontSize: 14, fontWeight: 600 }}>Unknown Brand</div>
                     <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 600, color: SKIN.danger, background: SKIN.dangerSoft, padding: "2px 8px", borderRadius: 12 }}>
                       <XCircle size={12} /> REJECTED
                     </div>
                   </div>
                   <div style={{ fontSize: 13, color: SKIN.inkSoft }}>Photo blurry</div>
                </div>
             </div>
           </div>
           <BottomTabBar active="profile" />
        </div>
      </PhoneFrame>

    </DeckColumn>
  );
}

function StarIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
    </svg>
  );
}
