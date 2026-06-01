import "./_tokens.css";
import {
  ScanLine,
  ListChecks,
  AlertTriangle,
  ShieldCheck,
  Download,
  Mail,
  ExternalLink,
  Check,
  Info,
} from "lucide-react";

const PRIMARY_STRONG = "#356E36";
const DANGER = "#EF4444";
const INK = "#1A1A1F";
const INK_SOFT = "#2B2F2B";

function SectionHeading({
  id,
  eyebrow,
  title,
  intro,
}: {
  id: string;
  eyebrow: string;
  title: string;
  intro: string;
}) {
  return (
    <header style={{ marginBottom: 32 }}>
      <p
        style={{
          fontSize: 14,
          fontWeight: 700,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          color: PRIMARY_STRONG,
          margin: 0,
          marginBottom: 12,
        }}
      >
        {eyebrow}
      </p>
      <h2
        id={id}
        style={{
          fontFamily: "'Playfair Display', Georgia, serif",
          fontWeight: 700,
          fontSize: 40,
          lineHeight: 1.2,
          color: INK,
          margin: 0,
          marginBottom: 16,
          fontStyle: "normal",
        }}
      >
        {title}
      </h2>
      <p
        style={{
          fontSize: 18,
          lineHeight: 1.7,
          fontWeight: 400,
          color: INK_SOFT,
          maxWidth: 720,
          margin: 0,
        }}
      >
        {intro}
      </p>
    </header>
  );
}

function PrimaryButton({
  children,
  href = "#download",
  ariaLabel,
}: {
  children: React.ReactNode;
  href?: string;
  ariaLabel?: string;
}) {
  return (
    <a
      href={href}
      aria-label={ariaLabel}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
        minHeight: 56,
        padding: "0 28px",
        background: PRIMARY_STRONG,
        color: "#FFFFFF",
        border: `2px solid ${PRIMARY_STRONG}`,
        borderRadius: 10,
        fontSize: 17,
        fontWeight: 700,
        textDecoration: "underline",
        textDecorationThickness: 2,
        textUnderlineOffset: 4,
      }}
    >
      {children}
    </a>
  );
}

function SecondaryButton({
  children,
  href,
  ariaLabel,
}: {
  children: React.ReactNode;
  href: string;
  ariaLabel?: string;
}) {
  return (
    <a
      href={href}
      aria-label={ariaLabel}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
        minHeight: 56,
        padding: "0 24px",
        background: "#FFFFFF",
        color: PRIMARY_STRONG,
        border: `2px solid ${PRIMARY_STRONG}`,
        borderRadius: 10,
        fontSize: 17,
        fontWeight: 700,
        textDecoration: "underline",
        textDecorationThickness: 2,
        textUnderlineOffset: 4,
      }}
    >
      {children}
    </a>
  );
}

const dangerCombos = [
  {
    pair: "Retinol + Benzoyl Peroxide",
    risk:
      "Benzoyl peroxide breaks down retinol. You lose the benefit of both products and risk extra irritation.",
    citation:
      "Nighswonger, B.D. et al. (1993). Retinoid interactions with benzoyl peroxide. J Pharm Sci. PMID: 8450449",
  },
  {
    pair: "Retinol + Glycolic Acid",
    risk:
      "Strong exfoliation plus retinol can damage your skin barrier. Expect redness, peeling, and stinging.",
    citation:
      "Kligman, A.M. (1988). The compatibility of combinations of glycolic acid and tretinoin. J Dermatol Treat.",
  },
  {
    pair: "Retinol + AHA / BHA",
    risk:
      "Layering acids with retinol over-strips the skin. This is the classic cause of a damaged barrier.",
    citation:
      "Kornhauser, A. et al. (2010). Applications of hydroxy acids. Clin Cosmet Investig Dermatol.",
  },
  {
    pair: "Niacinamide + Vitamin C",
    risk:
      "In some formulas these two cancel each other out. Use them at different times of day to be safe.",
    citation:
      "Wohlrab, J. & Kreft, D. (2014). Niacinamide — mechanisms of action. Skin Pharmacol Physiol.",
    caution: true,
  },
  {
    pair: "Hydroquinone + AHAs",
    risk:
      "Acids drive hydroquinone deeper. This raises the risk of irritation and uneven pigmentation.",
    citation:
      "Parvez, S. et al. (2006). Naturally occurring tyrosinase inhibitors. Phytother Res.",
  },
];

const watchedIngredients = [
  { name: "Retinol", conflict: true },
  { name: "Glycolic Acid", conflict: true },
  { name: "Benzoyl Peroxide", conflict: true },
  { name: "AHA / BHA", conflict: true },
  { name: "Vitamin C", conflict: false },
  { name: "Niacinamide", conflict: false },
];

const tocItems = [
  { id: "what-is-chimiq", label: "1. What Chimiq is" },
  { id: "how-it-works", label: "2. How it works (3 steps)" },
  { id: "danger-zone", label: "3. Dangerous ingredient pairs" },
  { id: "scanner", label: "4. Try the scanner" },
  { id: "disaster-mix", label: "5. The classic disaster routine" },
  { id: "stats", label: "6. Who uses Chimiq" },
  { id: "shelf", label: "7. Save your routine (My Shelf)" },
  { id: "pricing", label: "8. Pricing: Free and Premium" },
  { id: "earn-premium", label: "9. Earn Premium for free" },
  { id: "download", label: "10. Download the app" },
  { id: "footer", label: "11. Contact and legal" },
];

export default function Accessibility() {
  return (
    <div className="chimiq-root">
      <a
        href="#main"
        className="skip-link"
        style={{
          position: "absolute",
          left: 12,
          top: 12,
          padding: "12px 20px",
          background: PRIMARY_STRONG,
          color: "#FFFFFF",
          fontWeight: 700,
          fontSize: 16,
          borderRadius: 8,
          textDecoration: "underline",
          zIndex: 100,
          transform: "translateY(-200%)",
          transition: "transform 0.15s",
        }}
        onFocus={(e) => {
          e.currentTarget.style.transform = "translateY(0)";
        }}
        onBlur={(e) => {
          e.currentTarget.style.transform = "translateY(-200%)";
        }}
      >
        Skip to main content
      </a>

      {/* TOP NAV */}
      <nav
        aria-label="Primary"
        style={{
          background: "#FFFFFF",
          borderBottom: `2px solid ${INK}`,
        }}
      >
        <div
          style={{
            maxWidth: 1280,
            margin: "0 auto",
            padding: "16px 24px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
          }}
        >
          <a
            href="#what-is-chimiq"
            aria-label="Chimiq home"
            style={{ display: "inline-flex", alignItems: "center" }}
          >
            <img
              src="/images/logo-chimiq-long.png"
              alt="Chimiq"
              style={{ height: 36, width: "auto" }}
            />
          </a>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <label
              htmlFor="lang-select"
              style={{
                fontSize: 16,
                fontWeight: 600,
                color: INK,
              }}
            >
              Language:
            </label>
            <select
              id="lang-select"
              defaultValue="en"
              style={{
                minHeight: 48,
                padding: "0 12px",
                fontSize: 16,
                fontWeight: 600,
                border: `2px solid ${INK}`,
                borderRadius: 8,
                background: "#FFFFFF",
                color: INK,
              }}
            >
              <option value="en">English</option>
              <option value="sv">Svenska</option>
            </select>
            <a
              href="#"
              aria-label="Sign in to your Chimiq account"
              style={{
                display: "inline-flex",
                alignItems: "center",
                minHeight: 48,
                padding: "0 20px",
                background: PRIMARY_STRONG,
                color: "#FFFFFF",
                border: `2px solid ${PRIMARY_STRONG}`,
                borderRadius: 8,
                fontSize: 16,
                fontWeight: 700,
                textDecoration: "underline",
                textDecorationThickness: 2,
                textUnderlineOffset: 4,
              }}
            >
              Sign in
            </a>
          </div>
        </div>
      </nav>

      <main id="main">
        {/* HERO */}
        <section
          id="what-is-chimiq"
          aria-labelledby="hero-heading"
          style={{
            position: "relative",
            background: "#0d200d",
            overflow: "hidden",
          }}
        >
          <img
            src="/images/hero-dark.png"
            alt=""
            aria-hidden="true"
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
              opacity: 0.55,
            }}
          />
          {/* Extra dark overlay so white passes WCAG AAA (>=7:1) */}
          <div
            aria-hidden="true"
            style={{
              position: "absolute",
              inset: 0,
              background: "rgba(0,0,0,0.72)",
            }}
          />
          <div
            style={{
              position: "relative",
              maxWidth: 1280,
              margin: "0 auto",
              padding: "80px 24px 96px",
              color: "#FFFFFF",
            }}
          >
            <p
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 10,
                padding: "10px 18px",
                background: "#FFFFFF",
                color: PRIMARY_STRONG,
                border: "2px solid #FFFFFF",
                borderRadius: 999,
                fontSize: 14,
                fontWeight: 700,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                margin: 0,
                marginBottom: 24,
              }}
            >
              <ShieldCheck size={16} aria-hidden="true" />
              Avoid dangerous combos
            </p>

            <h1
              id="hero-heading"
              style={{
                fontFamily: "'Playfair Display', Georgia, serif",
                fontWeight: 700,
                fontSize: 56,
                lineHeight: 1.15,
                letterSpacing: "-0.01em",
                color: "#FFFFFF",
                fontStyle: "normal",
                maxWidth: 980,
                margin: 0,
                marginBottom: 24,
              }}
            >
              Chimiq checks if your skincare products work safely together.
            </h1>

            <p
              style={{
                fontSize: 20,
                lineHeight: 1.7,
                fontWeight: 400,
                color: "#FFFFFF",
                maxWidth: 760,
                margin: 0,
                marginBottom: 16,
              }}
            >
              Scan an ingredient list, or paste it. We compare every ingredient
              and warn you about combinations that can damage your skin —
              before you put them on your face.
            </p>
            <p
              style={{
                fontSize: 18,
                lineHeight: 1.7,
                fontWeight: 400,
                color: "#FFFFFF",
                maxWidth: 760,
                margin: 0,
                marginBottom: 32,
              }}
            >
              Free to start. Works on the web today. Mobile app on the way.
            </p>

            {/* Static, labelled list of watched ingredients (replaces floating pills) */}
            <section
              aria-labelledby="watched-heading"
              style={{
                background: "rgba(255,255,255,0.08)",
                border: "2px solid #FFFFFF",
                borderRadius: 12,
                padding: 20,
                marginBottom: 32,
                maxWidth: 760,
              }}
            >
              <h2
                id="watched-heading"
                style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: 16,
                  fontWeight: 700,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: "#FFFFFF",
                  margin: 0,
                  marginBottom: 12,
                }}
              >
                Ingredients we watch for
              </h2>
              <ul
                style={{
                  listStyle: "none",
                  padding: 0,
                  margin: 0,
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 8,
                }}
              >
                {watchedIngredients.map((ing) => (
                  <li
                    key={ing.name}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "10px 14px",
                      background: "#FFFFFF",
                      color: INK,
                      border: ing.conflict
                        ? `2px solid ${DANGER}`
                        : `2px solid ${INK}`,
                      borderRadius: 8,
                      fontSize: 16,
                      fontWeight: 600,
                    }}
                  >
                    {ing.conflict && (
                      <AlertTriangle
                        size={16}
                        color={DANGER}
                        aria-hidden="true"
                      />
                    )}
                    <span>{ing.name}</span>
                    {ing.conflict && (
                      <span
                        style={{
                          fontSize: 12,
                          fontWeight: 700,
                          color: "#FFFFFF",
                          background: DANGER,
                          padding: "2px 8px",
                          borderRadius: 4,
                          letterSpacing: "0.04em",
                        }}
                      >
                        CONFLICT
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </section>

            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 16,
                marginBottom: 16,
              }}
            >
              <a
                href="#download"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 12,
                  minHeight: 64,
                  padding: "0 32px",
                  background: "#FFFFFF",
                  color: PRIMARY_STRONG,
                  border: "3px solid #FFFFFF",
                  borderRadius: 10,
                  fontSize: 18,
                  fontWeight: 700,
                  textDecoration: "underline",
                  textDecorationThickness: 2,
                  textUnderlineOffset: 4,
                }}
              >
                <Download size={22} aria-hidden="true" />
                Download the app
              </a>
              <a
                href="#how-it-works"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 10,
                  minHeight: 64,
                  padding: "0 28px",
                  background: "transparent",
                  color: "#FFFFFF",
                  border: "3px solid #FFFFFF",
                  borderRadius: 10,
                  fontSize: 18,
                  fontWeight: 700,
                  textDecoration: "underline",
                  textDecorationThickness: 2,
                  textUnderlineOffset: 4,
                }}
              >
                See how it works
              </a>
            </div>
            <p
              style={{
                fontSize: 16,
                color: "#FFFFFF",
                lineHeight: 1.6,
                margin: 0,
              }}
            >
              Free 7-day trial of Premium. Then 49 SEK per month. Cancel any
              time.
            </p>
          </div>
        </section>

        {/* TABLE OF CONTENTS */}
        <section
          aria-labelledby="toc-heading"
          style={{
            background: "#F7FAF7",
            borderBottom: `1px solid ${INK}`,
          }}
        >
          <div
            style={{
              maxWidth: 1280,
              margin: "0 auto",
              padding: "48px 24px",
            }}
          >
            <h2
              id="toc-heading"
              style={{
                fontFamily: "'Playfair Display', Georgia, serif",
                fontWeight: 700,
                fontSize: 28,
                color: INK,
                margin: 0,
                marginBottom: 12,
                fontStyle: "normal",
              }}
            >
              On this page
            </h2>
            <p
              style={{
                fontSize: 17,
                lineHeight: 1.7,
                color: INK_SOFT,
                margin: 0,
                marginBottom: 24,
                maxWidth: 720,
              }}
            >
              Use these links to jump to any section. The page is long — pick
              what you need.
            </p>
            <nav aria-label="Table of contents">
              <ol
                style={{
                  listStyle: "none",
                  padding: 0,
                  margin: 0,
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                  gap: 8,
                }}
              >
                {tocItems.map((item) => (
                  <li key={item.id}>
                    <a
                      href={`#${item.id}`}
                      style={{
                        display: "block",
                        padding: "14px 16px",
                        background: "#FFFFFF",
                        color: PRIMARY_STRONG,
                        border: `2px solid ${PRIMARY_STRONG}`,
                        borderRadius: 8,
                        fontSize: 16,
                        fontWeight: 600,
                        textDecoration: "underline",
                        textDecorationThickness: 2,
                        textUnderlineOffset: 4,
                      }}
                    >
                      {item.label}
                    </a>
                  </li>
                ))}
              </ol>
            </nav>
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section
          id="how-it-works"
          aria-labelledby="how-heading"
          style={{ background: "#FFFFFF" }}
        >
          <div
            style={{ maxWidth: 1280, margin: "0 auto", padding: "80px 24px" }}
          >
            <SectionHeading
              id="how-heading"
              eyebrow="Section 2"
              title="How it works in 3 steps"
              intro="No complicated setup. You give us a product, and we tell you if it is safe to combine with the rest of your routine."
            />
            <ol
              style={{
                listStyle: "none",
                padding: 0,
                margin: 0,
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: 24,
              }}
            >
              {[
                {
                  icon: ScanLine,
                  step: "Step 1",
                  title: "Scan or paste",
                  body: "Take a photo of the ingredient label. Or paste the list. Both work the same way.",
                },
                {
                  icon: ListChecks,
                  step: "Step 2",
                  title: "Build your routine",
                  body: "Add the products you use in the morning and at night. Save them on your shelf.",
                },
                {
                  icon: AlertTriangle,
                  step: "Step 3",
                  title: "See the risks",
                  body: "We check every pair of ingredients. You get a clear warning if something is not safe.",
                },
              ].map((s) => {
                const Icon = s.icon;
                return (
                  <li
                    key={s.step}
                    style={{
                      background: "#FFFFFF",
                      border: `2px solid ${INK}`,
                      borderRadius: 12,
                      padding: 28,
                    }}
                  >
                    <div
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        width: 48,
                        height: 48,
                        background: PRIMARY_STRONG,
                        color: "#FFFFFF",
                        borderRadius: 8,
                        marginBottom: 16,
                      }}
                    >
                      <Icon size={24} aria-hidden="true" />
                    </div>
                    <p
                      style={{
                        fontSize: 14,
                        fontWeight: 700,
                        letterSpacing: "0.12em",
                        textTransform: "uppercase",
                        color: PRIMARY_STRONG,
                        margin: 0,
                        marginBottom: 8,
                      }}
                    >
                      {s.step}
                    </p>
                    <h3
                      style={{
                        fontFamily: "'Playfair Display', Georgia, serif",
                        fontWeight: 700,
                        fontSize: 24,
                        color: INK,
                        margin: 0,
                        marginBottom: 12,
                        fontStyle: "normal",
                      }}
                    >
                      {s.title}
                    </h3>
                    <p
                      style={{
                        fontSize: 17,
                        lineHeight: 1.7,
                        color: INK_SOFT,
                        margin: 0,
                      }}
                    >
                      {s.body}
                    </p>
                  </li>
                );
              })}
            </ol>
          </div>
        </section>

        {/* DOWNLOAD CTA — pushed up high (right after the explainer) */}
        <section
          id="download"
          aria-labelledby="download-heading"
          style={{ background: PRIMARY_STRONG }}
        >
          <div
            style={{
              maxWidth: 1280,
              margin: "0 auto",
              padding: "72px 24px",
              color: "#FFFFFF",
            }}
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "auto 1fr",
                gap: 32,
                alignItems: "center",
              }}
            >
              <img
                src="/images/app-icon.png"
                alt=""
                aria-hidden="true"
                style={{
                  width: 128,
                  height: 128,
                  borderRadius: 24,
                  border: "3px solid #FFFFFF",
                }}
              />
              <div>
                <p
                  style={{
                    fontSize: 14,
                    fontWeight: 700,
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    color: "#FFFFFF",
                    margin: 0,
                    marginBottom: 12,
                  }}
                >
                  Section 10 — Download the app
                </p>
                <h2
                  id="download-heading"
                  style={{
                    fontFamily: "'Playfair Display', Georgia, serif",
                    fontWeight: 700,
                    fontSize: 40,
                    lineHeight: 1.2,
                    color: "#FFFFFF",
                    margin: 0,
                    marginBottom: 16,
                    fontStyle: "normal",
                  }}
                >
                  Get Chimiq on your phone
                </h2>
                <p
                  style={{
                    fontSize: 18,
                    lineHeight: 1.7,
                    color: "#FFFFFF",
                    margin: 0,
                    maxWidth: 640,
                  }}
                >
                  The mobile app is launching soon. The web app works in your
                  browser today.
                </p>
              </div>
            </div>

            <div style={{ marginTop: 40 }}>
              <h3
                style={{
                  fontFamily: "'Playfair Display', Georgia, serif",
                  fontWeight: 700,
                  fontSize: 22,
                  color: "#FFFFFF",
                  margin: 0,
                  marginBottom: 16,
                  fontStyle: "normal",
                }}
              >
                The web app works today — here is the link
              </h3>
              <a
                href="#"
                aria-label="Open the Chimiq web app"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 12,
                  minHeight: 64,
                  padding: "0 32px",
                  background: "#FFFFFF",
                  color: PRIMARY_STRONG,
                  border: "3px solid #FFFFFF",
                  borderRadius: 10,
                  fontSize: 18,
                  fontWeight: 700,
                  textDecoration: "underline",
                  textDecorationThickness: 2,
                  textUnderlineOffset: 4,
                }}
              >
                Open the web app
                <ExternalLink size={20} aria-hidden="true" />
              </a>
            </div>

            <div
              style={{
                marginTop: 40,
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 24,
              }}
            >
              <div
                style={{
                  background: "#FFFFFF",
                  color: INK,
                  border: "3px solid #FFFFFF",
                  borderRadius: 12,
                  padding: 24,
                }}
              >
                <p
                  style={{
                    fontSize: 14,
                    fontWeight: 700,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    color: PRIMARY_STRONG,
                    margin: 0,
                    marginBottom: 8,
                  }}
                >
                  iOS — App Store
                </p>
                <p
                  style={{
                    fontSize: 22,
                    fontWeight: 700,
                    color: INK,
                    margin: 0,
                    marginBottom: 8,
                  }}
                >
                  Chimiq for iPhone
                </p>
                <p
                  style={{
                    fontSize: 16,
                    fontWeight: 700,
                    color: DANGER,
                    margin: 0,
                  }}
                >
                  Coming soon
                </p>
              </div>
              <div
                style={{
                  background: "#FFFFFF",
                  color: INK,
                  border: "3px solid #FFFFFF",
                  borderRadius: 12,
                  padding: 24,
                }}
              >
                <p
                  style={{
                    fontSize: 14,
                    fontWeight: 700,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    color: PRIMARY_STRONG,
                    margin: 0,
                    marginBottom: 8,
                  }}
                >
                  Android — Google Play
                </p>
                <p
                  style={{
                    fontSize: 22,
                    fontWeight: 700,
                    color: INK,
                    margin: 0,
                    marginBottom: 8,
                  }}
                >
                  Chimiq for Android
                </p>
                <p
                  style={{
                    fontSize: 16,
                    fontWeight: 700,
                    color: DANGER,
                    margin: 0,
                  }}
                >
                  Coming soon
                </p>
              </div>
            </div>

            <form
              onSubmit={(e) => e.preventDefault()}
              style={{
                marginTop: 40,
                background: "#FFFFFF",
                color: INK,
                borderRadius: 12,
                padding: 28,
                border: "3px solid #FFFFFF",
              }}
            >
              <h3
                style={{
                  fontFamily: "'Playfair Display', Georgia, serif",
                  fontWeight: 700,
                  fontSize: 24,
                  color: INK,
                  margin: 0,
                  marginBottom: 12,
                  fontStyle: "normal",
                }}
              >
                Get notified by email when the app is live
              </h3>
              <label
                htmlFor="notify-email"
                style={{
                  display: "block",
                  fontSize: 16,
                  fontWeight: 700,
                  color: INK,
                  marginBottom: 8,
                }}
              >
                Your email address
              </label>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                <input
                  id="notify-email"
                  type="email"
                  required
                  placeholder="you@example.com"
                  style={{
                    flex: "1 1 280px",
                    minHeight: 56,
                    padding: "0 16px",
                    fontSize: 17,
                    color: INK,
                    background: "#FFFFFF",
                    border: `2px solid ${INK}`,
                    borderRadius: 8,
                  }}
                />
                <button
                  type="submit"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 10,
                    minHeight: 56,
                    padding: "0 24px",
                    background: PRIMARY_STRONG,
                    color: "#FFFFFF",
                    border: `2px solid ${PRIMARY_STRONG}`,
                    borderRadius: 8,
                    fontSize: 17,
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  <Mail size={20} aria-hidden="true" />
                  Notify me
                </button>
              </div>
              <p
                style={{
                  marginTop: 12,
                  fontSize: 15,
                  lineHeight: 1.6,
                  color: INK_SOFT,
                }}
              >
                We will only email you when the app is ready. No marketing.
              </p>
            </form>
          </div>
        </section>

        {/* DANGER ZONE */}
        <section
          id="danger-zone"
          aria-labelledby="danger-heading"
          style={{ background: "#FAFAF8" }}
        >
          <div
            style={{ maxWidth: 1280, margin: "0 auto", padding: "80px 24px" }}
          >
            <SectionHeading
              id="danger-heading"
              eyebrow="Section 3"
              title="Dangerous ingredient pairs"
              intro="These are the most common combinations that hurt skin. Each one is backed by a published study."
            />
            <ul
              style={{
                listStyle: "none",
                padding: 0,
                margin: 0,
                display: "grid",
                gridTemplateColumns: "repeat(2, 1fr)",
                gap: 20,
              }}
            >
              {dangerCombos.map((c) => (
                <li
                  key={c.pair}
                  style={{
                    background: "#FFFFFF",
                    border: `2px solid ${c.caution ? "#B45309" : DANGER}`,
                    borderRadius: 12,
                    padding: 24,
                  }}
                >
                  <p
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "6px 12px",
                      background: c.caution ? "#FEF3C7" : "#FEE2E2",
                      color: c.caution ? "#7C2D12" : "#7F1D1D",
                      border: `2px solid ${c.caution ? "#B45309" : DANGER}`,
                      borderRadius: 6,
                      fontSize: 13,
                      fontWeight: 700,
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      margin: 0,
                      marginBottom: 12,
                    }}
                  >
                    <AlertTriangle size={16} aria-hidden="true" />
                    {c.caution ? "Caution" : "Danger"}
                  </p>
                  <h3
                    style={{
                      fontFamily: "'Playfair Display', Georgia, serif",
                      fontWeight: 700,
                      fontSize: 22,
                      color: INK,
                      margin: 0,
                      marginBottom: 12,
                      fontStyle: "normal",
                    }}
                  >
                    <span style={{ color: c.caution ? "#7C2D12" : "#7F1D1D" }}>
                      {c.caution ? "CAUTION:" : "DANGER:"}
                    </span>{" "}
                    {c.pair}
                  </h3>
                  <p
                    style={{
                      fontSize: 17,
                      lineHeight: 1.7,
                      color: INK_SOFT,
                      margin: 0,
                      marginBottom: 12,
                    }}
                  >
                    {c.risk}
                  </p>
                  <p
                    style={{
                      fontSize: 14,
                      lineHeight: 1.6,
                      color: INK_SOFT,
                      margin: 0,
                      borderTop: `1px solid ${INK}`,
                      paddingTop: 12,
                    }}
                  >
                    <strong>Source:</strong> {c.citation}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* SCANNER */}
        <section
          id="scanner"
          aria-labelledby="scanner-heading"
          style={{ background: "#FFFFFF" }}
        >
          <div
            style={{ maxWidth: 1280, margin: "0 auto", padding: "80px 24px" }}
          >
            <SectionHeading
              id="scanner-heading"
              eyebrow="Section 4"
              title="Try the scanner"
              intro="Paste an ingredient list below. We will check every pair and tell you if anything is risky."
            />
            <div
              style={{
                background: "#F7FAF7",
                border: `2px solid ${INK}`,
                borderRadius: 12,
                padding: 28,
                maxWidth: 880,
              }}
            >
              <label
                htmlFor="scanner-input"
                style={{
                  display: "block",
                  fontSize: 16,
                  fontWeight: 700,
                  color: INK,
                  marginBottom: 8,
                }}
              >
                Ingredient list (paste from a product label)
              </label>
              <textarea
                id="scanner-input"
                rows={5}
                defaultValue="Aqua, Glycerin, Retinol, Niacinamide, Salicylic Acid, Tocopherol..."
                style={{
                  width: "100%",
                  padding: 16,
                  fontSize: 17,
                  lineHeight: 1.6,
                  color: INK,
                  background: "#FFFFFF",
                  border: `2px solid ${INK}`,
                  borderRadius: 8,
                  fontFamily: "'Inter', sans-serif",
                }}
              />
              <p
                style={{
                  fontSize: 15,
                  color: INK_SOFT,
                  marginTop: 8,
                  marginBottom: 20,
                  lineHeight: 1.6,
                }}
              >
                Separate ingredients with commas. The order does not matter.
              </p>
              <button
                type="button"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 10,
                  minHeight: 56,
                  padding: "0 28px",
                  background: PRIMARY_STRONG,
                  color: "#FFFFFF",
                  border: `2px solid ${PRIMARY_STRONG}`,
                  borderRadius: 8,
                  fontSize: 17,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                <ScanLine size={20} aria-hidden="true" />
                Analyse my list
              </button>

              <div
                style={{
                  marginTop: 28,
                  background: "#FFFFFF",
                  border: `2px solid ${DANGER}`,
                  borderRadius: 8,
                  padding: 20,
                }}
              >
                <p
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                    color: "#7F1D1D",
                    fontSize: 16,
                    fontWeight: 700,
                    margin: 0,
                    marginBottom: 8,
                  }}
                >
                  <AlertTriangle size={18} aria-hidden="true" />
                  DANGER: 1 risky pair found
                </p>
                <p
                  style={{
                    fontSize: 17,
                    lineHeight: 1.7,
                    color: INK,
                    margin: 0,
                  }}
                >
                  Retinol and Salicylic Acid in the same product can over-strip
                  your skin. Use them at different times of day.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* DISASTER MIX */}
        <section
          id="disaster-mix"
          aria-labelledby="disaster-heading"
          style={{ background: "#FAFAF8" }}
        >
          <div
            style={{ maxWidth: 1280, margin: "0 auto", padding: "80px 24px" }}
          >
            <SectionHeading
              id="disaster-heading"
              eyebrow="Section 5"
              title="The classic disaster routine"
              intro="A real example. Many people use these three products from The Ordinary together. They should not."
            />
            <ul
              style={{
                listStyle: "none",
                padding: 0,
                margin: 0,
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: 20,
                marginBottom: 24,
              }}
            >
              {[
                { name: "Retinol 1% in Squalane", role: "Active: Retinol" },
                { name: "Salicylic Acid 2%", role: "Active: BHA" },
                { name: "AHA 30% + BHA 2% Peel", role: "Active: AHA + BHA" },
              ].map((p) => (
                <li
                  key={p.name}
                  style={{
                    background: "#FFFFFF",
                    border: `2px solid ${INK}`,
                    borderRadius: 12,
                    padding: 24,
                  }}
                >
                  <p
                    style={{
                      fontSize: 14,
                      fontWeight: 700,
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      color: PRIMARY_STRONG,
                      margin: 0,
                      marginBottom: 8,
                    }}
                  >
                    The Ordinary
                  </p>
                  <h3
                    style={{
                      fontFamily: "'Playfair Display', Georgia, serif",
                      fontWeight: 700,
                      fontSize: 22,
                      color: INK,
                      margin: 0,
                      marginBottom: 8,
                      fontStyle: "normal",
                    }}
                  >
                    {p.name}
                  </h3>
                  <p
                    style={{
                      fontSize: 16,
                      color: INK_SOFT,
                      margin: 0,
                    }}
                  >
                    {p.role}
                  </p>
                </li>
              ))}
            </ul>
            <div
              style={{
                background: "#FFFFFF",
                border: `2px solid ${DANGER}`,
                borderRadius: 12,
                padding: 24,
              }}
            >
              <p
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  color: "#7F1D1D",
                  fontSize: 16,
                  fontWeight: 700,
                  margin: 0,
                  marginBottom: 8,
                }}
              >
                <AlertTriangle size={18} aria-hidden="true" />
                DANGER: 3 conflicts in this routine
              </p>
              <p
                style={{
                  fontSize: 17,
                  lineHeight: 1.7,
                  color: INK,
                  margin: 0,
                }}
              >
                Layering retinol with both an AHA and a BHA in one routine
                breaks down your skin barrier. You will see redness, peeling,
                and stinging within a few days.
              </p>
            </div>
          </div>
        </section>

        {/* STATS */}
        <section
          id="stats"
          aria-labelledby="stats-heading"
          style={{ background: "#FFFFFF" }}
        >
          <div
            style={{ maxWidth: 1280, margin: "0 auto", padding: "80px 24px" }}
          >
            <SectionHeading
              id="stats-heading"
              eyebrow="Section 6"
              title="Who uses Chimiq"
              intro="A short snapshot of how the community uses the app."
            />
            <dl
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(2, 1fr)",
                gap: 20,
                margin: 0,
              }}
            >
              {[
                { value: "12,400", label: "Routine analyses run so far" },
                { value: "3,800", label: "Products scanned and saved" },
              ].map((s) => (
                <div
                  key={s.label}
                  style={{
                    border: `2px solid ${INK}`,
                    borderRadius: 12,
                    padding: 28,
                    background: "#F7FAF7",
                  }}
                >
                  <dt
                    style={{
                      fontSize: 17,
                      fontWeight: 600,
                      color: INK_SOFT,
                      marginBottom: 8,
                    }}
                  >
                    {s.label}
                  </dt>
                  <dd
                    style={{
                      fontFamily: "'Playfair Display', Georgia, serif",
                      fontSize: 48,
                      fontWeight: 700,
                      color: PRIMARY_STRONG,
                      margin: 0,
                    }}
                  >
                    {s.value}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        {/* MY SHELF */}
        <section
          id="shelf"
          aria-labelledby="shelf-heading"
          style={{ background: "#FAFAF8" }}
        >
          <div
            style={{ maxWidth: 1280, margin: "0 auto", padding: "80px 24px" }}
          >
            <SectionHeading
              id="shelf-heading"
              eyebrow="Section 7"
              title="Save your routine on My Shelf"
              intro="Keep all your products in one place. Get a reminder when something in your routine becomes risky."
            />
            <div
              style={{
                background: "#FFFFFF",
                border: `2px solid ${INK}`,
                borderRadius: 12,
                padding: 28,
                maxWidth: 720,
              }}
            >
              <h3
                style={{
                  fontFamily: "'Playfair Display', Georgia, serif",
                  fontWeight: 700,
                  fontSize: 22,
                  color: INK,
                  margin: 0,
                  marginBottom: 16,
                  fontStyle: "normal",
                }}
              >
                My morning routine
              </h3>
              <ul
                style={{
                  listStyle: "none",
                  padding: 0,
                  margin: 0,
                  display: "flex",
                  flexDirection: "column",
                  gap: 12,
                }}
              >
                {[
                  { name: "Gentle cleanser", status: "safe" },
                  { name: "Vitamin C serum", status: "safe" },
                  { name: "SPF 50 sunscreen", status: "safe" },
                ].map((p) => (
                  <li
                    key={p.name}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      padding: "12px 16px",
                      border: `2px solid ${INK}`,
                      borderRadius: 8,
                      background: "#F7FAF7",
                    }}
                  >
                    <Check
                      size={20}
                      color={PRIMARY_STRONG}
                      aria-hidden="true"
                    />
                    <span
                      style={{ fontSize: 17, fontWeight: 600, color: INK }}
                    >
                      {p.name}
                    </span>
                    <span
                      style={{
                        marginLeft: "auto",
                        fontSize: 14,
                        fontWeight: 700,
                        color: PRIMARY_STRONG,
                        textTransform: "uppercase",
                        letterSpacing: "0.08em",
                      }}
                    >
                      Safe
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* PRICING — comparison table */}
        <section
          id="pricing"
          aria-labelledby="pricing-heading"
          style={{ background: "#FFFFFF" }}
        >
          <div
            style={{ maxWidth: 1280, margin: "0 auto", padding: "80px 24px" }}
          >
            <SectionHeading
              id="pricing-heading"
              eyebrow="Section 8"
              title="Pricing: Free and Premium"
              intro="Start free. Upgrade when you want more. Premium has a 7-day free trial."
            />
            <div style={{ overflowX: "auto" }}>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  fontSize: 17,
                  border: `2px solid ${INK}`,
                  background: "#FFFFFF",
                }}
              >
                <caption
                  style={{
                    captionSide: "top",
                    textAlign: "left",
                    padding: "0 0 12px",
                    fontSize: 16,
                    fontWeight: 600,
                    color: INK_SOFT,
                  }}
                >
                  Compare Free and Premium plans
                </caption>
                <thead>
                  <tr style={{ background: "#F7FAF7" }}>
                    <th
                      scope="col"
                      style={{
                        textAlign: "left",
                        padding: 16,
                        borderBottom: `2px solid ${INK}`,
                        fontSize: 17,
                        fontWeight: 700,
                        color: INK,
                      }}
                    >
                      Feature
                    </th>
                    <th
                      scope="col"
                      style={{
                        textAlign: "left",
                        padding: 16,
                        borderBottom: `2px solid ${INK}`,
                        borderLeft: `2px solid ${INK}`,
                        fontSize: 17,
                        fontWeight: 700,
                        color: INK,
                      }}
                    >
                      Free
                    </th>
                    <th
                      scope="col"
                      style={{
                        textAlign: "left",
                        padding: 16,
                        borderBottom: `2px solid ${INK}`,
                        borderLeft: `2px solid ${INK}`,
                        fontSize: 17,
                        fontWeight: 700,
                        color: PRIMARY_STRONG,
                      }}
                    >
                      Premium — 49 SEK / month
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    {
                      f: "Scans per day",
                      free: "3 scans per day",
                      pro: "Unlimited scans",
                    },
                    {
                      f: "Conflict warnings",
                      free: "Yes",
                      pro: "Yes, with detailed reasons",
                    },
                    {
                      f: "Save your routine (My Shelf)",
                      free: "Up to 5 products",
                      pro: "Unlimited products",
                    },
                    {
                      f: "Citations and study links",
                      free: "No",
                      pro: "Yes",
                    },
                    {
                      f: "Free trial",
                      free: "—",
                      pro: "7 days free, then 49 SEK / month",
                    },
                  ].map((row) => (
                    <tr key={row.f}>
                      <th
                        scope="row"
                        style={{
                          textAlign: "left",
                          padding: 16,
                          borderBottom: `1px solid ${INK}`,
                          fontWeight: 700,
                          color: INK,
                          background: "#FAFAF8",
                        }}
                      >
                        {row.f}
                      </th>
                      <td
                        style={{
                          padding: 16,
                          borderBottom: `1px solid ${INK}`,
                          borderLeft: `2px solid ${INK}`,
                          color: INK_SOFT,
                          fontSize: 17,
                          lineHeight: 1.6,
                        }}
                      >
                        {row.free}
                      </td>
                      <td
                        style={{
                          padding: 16,
                          borderBottom: `1px solid ${INK}`,
                          borderLeft: `2px solid ${INK}`,
                          color: INK,
                          fontSize: 17,
                          fontWeight: 600,
                          lineHeight: 1.6,
                        }}
                      >
                        {row.pro}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ marginTop: 24, display: "flex", gap: 16, flexWrap: "wrap" }}>
              <PrimaryButton href="#download">Start 7-day free trial</PrimaryButton>
              <SecondaryButton href="#download">Use the free plan</SecondaryButton>
            </div>
          </div>
        </section>

        {/* EARN PREMIUM */}
        <section
          id="earn-premium"
          aria-labelledby="earn-heading"
          style={{ background: "#FAFAF8" }}
        >
          <div
            style={{ maxWidth: 1280, margin: "0 auto", padding: "80px 24px" }}
          >
            <SectionHeading
              id="earn-heading"
              eyebrow="Section 9"
              title="Earn Premium for free"
              intro="Help the community by adding missing products and reviews. You earn Premium time as a thank you."
            />
            <ol
              style={{
                listStyle: "none",
                padding: 0,
                margin: 0,
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: 20,
              }}
            >
              {[
                {
                  step: "1",
                  title: "Add a missing product",
                  body: "Snap a photo of the label and the front of the box. We add it to the database.",
                },
                {
                  step: "2",
                  title: "Write a short review",
                  body: "Share if it worked for you. One sentence is enough.",
                },
                {
                  step: "3",
                  title: "Unlock Premium days",
                  body: "Each contribution adds 1 day of Premium to your account.",
                },
              ].map((s) => (
                <li
                  key={s.step}
                  style={{
                    background: "#FFFFFF",
                    border: `2px solid ${INK}`,
                    borderRadius: 12,
                    padding: 24,
                  }}
                >
                  <p
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: 40,
                      height: 40,
                      background: PRIMARY_STRONG,
                      color: "#FFFFFF",
                      borderRadius: 8,
                      fontWeight: 700,
                      fontSize: 18,
                      margin: 0,
                      marginBottom: 16,
                    }}
                  >
                    {s.step}
                  </p>
                  <h3
                    style={{
                      fontFamily: "'Playfair Display', Georgia, serif",
                      fontWeight: 700,
                      fontSize: 20,
                      color: INK,
                      margin: 0,
                      marginBottom: 8,
                      fontStyle: "normal",
                    }}
                  >
                    {s.title}
                  </h3>
                  <p
                    style={{
                      fontSize: 17,
                      lineHeight: 1.7,
                      color: INK_SOFT,
                      margin: 0,
                    }}
                  >
                    {s.body}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer
        id="footer"
        aria-labelledby="footer-heading"
        style={{
          background: "#FFFFFF",
          borderTop: `2px solid ${INK}`,
        }}
      >
        <div
          style={{ maxWidth: 1280, margin: "0 auto", padding: "64px 24px" }}
        >
          <h2
            id="footer-heading"
            style={{
              fontFamily: "'Playfair Display', Georgia, serif",
              fontWeight: 700,
              fontSize: 32,
              color: INK,
              margin: 0,
              marginBottom: 24,
              fontStyle: "normal",
            }}
          >
            Contact and legal
          </h2>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 40,
            }}
          >
            <form
              onSubmit={(e) => e.preventDefault()}
              aria-labelledby="contact-heading"
            >
              <h3
                id="contact-heading"
                style={{
                  fontFamily: "'Playfair Display', Georgia, serif",
                  fontWeight: 700,
                  fontSize: 22,
                  color: INK,
                  margin: 0,
                  marginBottom: 16,
                  fontStyle: "normal",
                }}
              >
                Get in touch
              </h3>

              <div style={{ marginBottom: 16 }}>
                <label
                  htmlFor="contact-name"
                  style={{
                    display: "block",
                    fontSize: 16,
                    fontWeight: 700,
                    color: INK,
                    marginBottom: 6,
                  }}
                >
                  Your name
                </label>
                <input
                  id="contact-name"
                  type="text"
                  required
                  style={{
                    width: "100%",
                    minHeight: 48,
                    padding: "0 14px",
                    fontSize: 16,
                    border: `2px solid ${INK}`,
                    borderRadius: 8,
                    color: INK,
                    background: "#FFFFFF",
                  }}
                />
              </div>

              <div style={{ marginBottom: 16 }}>
                <label
                  htmlFor="contact-email"
                  style={{
                    display: "block",
                    fontSize: 16,
                    fontWeight: 700,
                    color: INK,
                    marginBottom: 6,
                  }}
                >
                  Your email address
                </label>
                <input
                  id="contact-email"
                  type="email"
                  required
                  style={{
                    width: "100%",
                    minHeight: 48,
                    padding: "0 14px",
                    fontSize: 16,
                    border: `2px solid ${INK}`,
                    borderRadius: 8,
                    color: INK,
                    background: "#FFFFFF",
                  }}
                />
              </div>

              <div style={{ marginBottom: 20 }}>
                <label
                  htmlFor="contact-message"
                  style={{
                    display: "block",
                    fontSize: 16,
                    fontWeight: 700,
                    color: INK,
                    marginBottom: 6,
                  }}
                >
                  Your message
                </label>
                <textarea
                  id="contact-message"
                  rows={5}
                  required
                  style={{
                    width: "100%",
                    padding: 14,
                    fontSize: 16,
                    border: `2px solid ${INK}`,
                    borderRadius: 8,
                    color: INK,
                    background: "#FFFFFF",
                    fontFamily: "'Inter', sans-serif",
                  }}
                />
              </div>

              <button
                type="submit"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 10,
                  minHeight: 56,
                  padding: "0 28px",
                  background: PRIMARY_STRONG,
                  color: "#FFFFFF",
                  border: `2px solid ${PRIMARY_STRONG}`,
                  borderRadius: 8,
                  fontSize: 17,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                Send message
              </button>
            </form>

            <nav aria-label="Footer links">
              <h3
                style={{
                  fontFamily: "'Playfair Display', Georgia, serif",
                  fontWeight: 700,
                  fontSize: 22,
                  color: INK,
                  margin: 0,
                  marginBottom: 16,
                  fontStyle: "normal",
                }}
              >
                Links and legal
              </h3>
              <ul
                style={{
                  listStyle: "none",
                  padding: 0,
                  margin: 0,
                  display: "flex",
                  flexDirection: "column",
                  gap: 12,
                }}
              >
                {[
                  { label: "Privacy policy", href: "#privacy" },
                  { label: "Terms of service", href: "#terms" },
                  { label: "Medical disclaimer", href: "#disclaimer" },
                  { label: "Email: pia@chimiq.com", href: "mailto:pia@chimiq.com" },
                ].map((l) => (
                  <li key={l.label}>
                    <a
                      href={l.href}
                      style={{
                        display: "inline-block",
                        padding: "8px 0",
                        fontSize: 17,
                        fontWeight: 600,
                        color: PRIMARY_STRONG,
                        textDecoration: "underline",
                        textDecorationThickness: 2,
                        textUnderlineOffset: 4,
                      }}
                    >
                      {l.label}
                    </a>
                  </li>
                ))}
              </ul>
              <p
                style={{
                  marginTop: 24,
                  fontSize: 15,
                  lineHeight: 1.6,
                  color: INK_SOFT,
                }}
              >
                <Info
                  size={16}
                  aria-hidden="true"
                  style={{ verticalAlign: "text-bottom", marginRight: 6 }}
                />
                Chimiq gives general information. It is not medical advice. If
                your skin is in pain, see a doctor.
              </p>
              <p
                style={{
                  marginTop: 16,
                  fontSize: 15,
                  color: INK_SOFT,
                }}
              >
                © {new Date().getFullYear()} Chimiq. All rights reserved.
              </p>
            </nav>
          </div>
        </div>
      </footer>
    </div>
  );
}
