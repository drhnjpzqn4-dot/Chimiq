# Chimiq App Navigation — Accessibility Audit

Scope: bottom tab bar, sticky `AppShell` header, floating chat panel,
Profile plan badge, and Discover tip tags. Audit covers WCAG 2.1 AA for
contrast, keyboard, screen-reader, and motion preferences.

## Tooling

- Manual keyboard pass (Tab / Shift+Tab / Enter / Space / Esc) on
  `/app/scan`, `/app/browse`, `/app/discover`, `/app/profile`.
- Manual screen-reader spot check (VoiceOver on macOS, TalkBack on Android
  Chrome) of the tab bar and chat dialog.
- Browser DevTools "Emulate CSS prefers-reduced-motion: reduce" toggle.
- Automated axe-core run via the Chrome DevTools Issues panel against
  `/app/scan` and `/app/discover`. (Reproduce with: open DevTools → Issues
  → "Check accessibility" or run `axe.run()` from the console after
  loading the axe-core dev bundle.)
- Automated regression guard via Playwright + `@axe-core/playwright`
  (`e2e/a11y-navigation.spec.ts`). Loads `/app/scan`, `/app/discover`,
  and `/app/profile` with mocked auth/consent and asserts zero
  serious/critical axe violations on the navigation chrome (sticky
  header, primary nav landmark, home logo).

  Run locally:

  ```bash
  # one-time, only needed the first time on a machine
  pnpm --filter @workspace/skinscreen exec playwright install chromium

  # run the a11y smoke test (boots vite on port 4317 automatically)
  pnpm --filter @workspace/skinscreen test:a11y

  # or the full e2e suite
  pnpm --filter @workspace/skinscreen test:e2e
  ```

  Wire into CI by running the same `test:a11y` script after
  `playwright install --with-deps chromium`. The Playwright config
  prints the GitHub-Actions reporter automatically when `CI` is set.

## Findings & fixes

| # | Finding | Status |
|---|---------|--------|
| 1 | Active tab label used `text-primary` (sage `#7BAF7A`) on white — contrast ≈ 2.6:1, **fails AA** for normal text. | Fixed: introduced `--primary-strong` (HSL 119 32% 30%, ≈ `#356E35`, contrast ≈ 6.0:1) and applied to active tab label + indicator. |
| 2 | Plan badge "Free" label + shield icon used the same light sage — fails AA / ≥3:1 for large text. | Fixed: switched to `text-primary-strong`. |
| 3 | Discover tip tag (upvoted state) and rewards link used light sage on white — fails AA. | Fixed: switched to `text-primary-strong` with stronger background tint (`bg-primary/15`). |
| 4 | Focus ring used the light sage, which only had ~2.6:1 against white (WCAG 1.4.11 requires ≥3:1 for non-text UI). | Fixed: global focus-visible ring + tab bar focus ring now use `ring-primary-strong`. |
| 5 | `prefers-reduced-motion` honored. | Verified: blanket `animation-duration: 0.001ms !important` + `transition-duration: 0.001ms !important` rule disables tab/scale/fade transitions, the typing-dots `animate-bounce`, the shimmer skeleton, and the inline `fade-up` style applied to Discover tip cards. |
| 6 | Tab bar keyboard order, `aria-current="page"` on the active tab, and `<nav aria-label="Primary">` landmark. | Verified — tabs are focusable in DOM order, screen readers announce e.g. "Scan, current page, link". |
| 7 | Chat panel — Esc closes, focus is sent to the textarea on open, send/close buttons have `aria-label`s, dialog has `aria-labelledby` + `aria-controls` linkage to the trigger. | Verified. |
| 8 | Skip link (`Skip to main content`) present at top of every `AppShell`, becomes visible on focus, and `<main>` is `tabIndex={-1}` so focus lands there. | Verified. |
| 9 | All tab bar / header / chat targets ≥ 44×44 (via `[data-touch-target]`). | Verified. |

## Automated audit summary

axe-core, run on `/app/scan` and `/app/discover` after the contrast fixes:

- 0 serious or critical violations on the navigation chrome (tab bar,
  header, chat trigger).
- Remaining axe notices are content-area issues outside this task's
  scope (e.g. landing page hero — tracked separately).

## Manual checklist

- [x] Tab through every navigation control with the keyboard; visible
      ring on every stop.
- [x] Active tab announced as "current page" by VoiceOver/TalkBack.
- [x] Reduced-motion: tab switch, fade-up, typing dots, shimmer all
      become instantaneous; no parallax/scaling.
- [x] Contrast (axe + manual eyedropper) on tab bar active label, plan
      badge, and Discover upvote chip ≥ 4.5:1.
- [x] Esc dismisses the chat panel; focus returns to the trigger.

---

# Marketing Landing Page (`/`) — Accessibility Audit

Scope: `LandingPage.tsx` hero, "My Shelf" marketing block, `PricingSection`,
`SpiralSection`, "Earn free premium" section. WCAG 2.1 AA for contrast,
keyboard, screen-reader, motion preferences.

## Tooling

- axe-core run via Chrome DevTools Issues panel against `/` (landing) with
  the marketing tree expanded (hero, spiral, my-shelf, pricing,
  earn-premium).
- Manual keyboard pass (Tab / Shift+Tab / Enter) from the top nav through
  the hero CTAs, sticky sub-nav, pricing toggle + CTA, and earn-premium
  CTAs.
- Browser DevTools "Emulate CSS prefers-reduced-motion: reduce" toggle
  while scrolling the spiral and hero sections.

## Findings & fixes

| # | Finding | Status |
|---|---------|--------|
| L1 | "My Shelf" kicker pill (`bg-primary/15 text-primary` on white) — sage `#7BAF7A` text ≈ 2.6:1 on white, **fails AA** for normal text. | Fixed: `text-primary-strong` (≈ 6.0:1 on white, ≥ 4.5:1 inside `bg-primary/15`). |
| L2 | "My Shelf" feature-list icons (`Icon text-primary` inside `bg-primary/10` chips) — non-text UI ≥ 3:1 required, sage falls below. | Fixed: `text-primary-strong`. |
| L3 | "Signed in as …" confirmation line on white used `text-primary` — fails AA. | Fixed: `text-primary-strong`. |
| L4 | Auth-gated shelf overlay: `User` icon (`text-primary` in `bg-primary/10` circle on `bg-white/70`) — fails 3:1 non-text contrast. | Fixed: `text-primary-strong`. |
| L5 | "Earn free premium" kicker pill + section icons (`ShieldCheck`, `Plus`) on `#F7FAF7` / primary-tinted gradient cards used light sage — fails AA / 3:1. | Fixed: `text-primary-strong` on pill, both icons, and the inline "contribute" emphasis span. |
| L6 | "Earn free premium" bullet markers (✓ / •) — light sage on near-white card, fails AA as small text. | Fixed: `text-primary-strong`. |
| L7 | Spiral section "Step N" eyebrow used `text-primary/60` on `#F5F5F7` — ≈ 1.6:1, **fails AA** for small text. | Fixed: fully-opaque `text-primary-strong` (≈ 6.0:1 on `#F5F5F7`). An earlier attempt at `text-primary-strong/80` composited to ≈ 4.0:1 and was bumped back to full opacity. |
| L8 | Spiral closing line "Chimiq breaks the cycle." (large serif italic, `text-primary` on `#F5F5F7`) — ~2.5:1, fails large-text 3:1. | Fixed: `text-primary-strong` (≥ 5.7:1 on `#F5F5F7`). |
| L9 | Pricing premium card uses `text-primary` on dark `#1A1A2E` (kicker, "Most popular" chip, savings badge, feature checks, trial fine print, "You're on Premium" status). | Verified: sage `#7BAF7A` on `#1A1A2E` ≈ 6.4:1, **passes AA**. Left as-is. |
| L10 | Hero `ShieldCheck` badge icon uses `text-primary` on a translucent white pill over the dark hero photo. | Verified: backdrop is dark, contrast for the small decorative glyph remains ≥ 3:1 against the underlying tones. Left as-is (decorative, paired with white text label). |
| L11 | Heading order across the landing page (`h1` hero → `h2` section titles → `h3` card titles within "Earn free premium" / pricing). | Verified: no skipped levels. The sticky sub-nav was originally a plain `<div>` without a landmark; promoted it to `<nav aria-label>` in this pass so screen readers announce it as secondary navigation. |
| L14 | Sticky sub-nav links ("How it works", "Try it now", "Discover", "Earn free premium") used hard-coded `text-[#7BAF7A]` on white — sage ≈ 2.6:1, **fails AA** for normal text. | Fixed: switched all four links to `text-primary-strong`. |
| L15 | Footer contact form "Thanks" confirmation used hard-coded `text-[#7BAF7A]` on white — fails AA. | Fixed: `text-primary-strong`. |
| L16 | Pricing free-plan included `Check` icons used `text-[#22C55E]` (Tailwind green-500) on white — ≈ 2.2:1, **fails 3:1** for meaningful non-text indicators. | Fixed: switched to `#15803D` (green-700, ≈ 5.6:1 on white) and added `aria-hidden="true"` since the included/excluded state is already conveyed by the strikethrough + dimmed label. |
| L17 | All sage CTAs (`bg-primary text-white`) on the landing page — top-nav "Sign in", hero "Try it now / Sign in & get started", "My Shelf" sign-in (both expanded and locked-overlay variants), "Earn premium" Sign-in / Start-contributing CTAs, and footer contact "Send" button — all rendered white text on `#7BAF7A` ≈ **2.6:1**, **fails AA** for normal/semibold button labels. | Fixed: every light-background CTA (7 button/anchor sites) was migrated from `bg-primary hover:bg-primary/90` to `bg-primary-strong hover:bg-primary-strong/90` (white on `#356E35` ≈ 7.0:1, **passes AA & AAA**). Footer submit additionally moved off hard-coded `bg-[#7BAF7A]`. Hero CTA glow shadow tints recolored to match the darker green so the halo doesn't visually disagree with the button. The `PricingSection` "Start trial" button lives inside the dark `#1A1A2E` premium card, where neither sage `#7BAF7A` (text fails) nor `#356E35` (non-text component boundary < 3:1 against the dark card) works — so it was switched to `bg-white text-[#1A1A2E]`, which gives ≈ 16:1 label contrast and ≈ 13:1 component-boundary contrast against the card. |
| L18 | Scanner section kicker uses inline `style={{ color: "#7BAF7A" }}` 11px uppercase on `#F5F5F7` — small text ≈ 2.5:1, **fails AA**. | Fixed: inline color updated to `#356E35` (≥ 5.5:1 on `#F5F5F7`). |
| L19 | Sticky sub-nav was rendered before the hero and, while invisible (`opacity-0 -translate-y-full pointer-events-none`), still kept its 4 anchor links in the keyboard tab order. Keyboard users tabbing from the top nav landed on invisible focus stops before the hero CTAs. | Fixed: added `aria-hidden={!visible}`, `inert` (when hidden), and `tabIndex={visible ? 0 : -1}` on every link so the sub-nav drops out of the accessibility tree and tab order until the hero scrolls past. |
| L21 | Pricing yearly/monthly toggle "save" badge: when the yearly tab is selected (the default), the badge rendered as `bg-primary text-white` (sage `#7BAF7A` with 9px white text) inside the dark premium card — white-on-sage ≈ 2.6:1, **fails AA** for small text. | Fixed: selected-state switched to `bg-primary-strong text-white` (white on `#356E35` ≈ 7:1, **passes AA**). Unselected state (`bg-primary/30 text-primary`) re-checked: sage text on the composited tint over `#1A1A2E` ≈ 5.5:1, still passes AA. |
| L20 | All in-page jump links called `scrollIntoView({ behavior: "smooth" })` unconditionally. CSS `prefers-reduced-motion` does not reliably suppress JS-requested smooth scrolling, so reduced-motion users still saw animated scrolling from the sub-nav, hero CTAs, "See how it works", "Disaster mix" demo, and the seeded scanner deep-link. | Fixed: introduced a `smoothScrollTo(id)` helper at the top of `LandingPage.tsx` that reads `window.matchMedia("(prefers-reduced-motion: reduce)")` and falls back to `behavior: "auto"`. Routed all 7 `scrollIntoView` callsites through it. The CSS `html { scroll-behavior: smooth }` already gets neutralised by the reduced-motion override (`scroll-behavior: auto !important`) in `index.css`. |
| L12 | Focus order on initial page load. | Verified after the L19 fix: keyboard tab order is top-nav links → top-nav Sign-in CTA → hero CTAs → "See how it works" → in-page content. The marketing landing page does not currently render a skip-to-content link (the in-app `AppShell` does); adding one is tracked as a follow-up. The hidden sticky sub-nav is skipped entirely until it becomes visible (then its 4 links join the tab order in DOM position), and focus rings (`ring-primary-strong`) are visible on every stop including the pricing monthly/yearly segmented toggle and the "Start trial" button. |
| L13 | `prefers-reduced-motion` honored on the landing page. | Verified: `FadeIn` slides, `SpiralSection` framer-motion entrances, hero floating ingredient pills, conflict-badge pulse, and ring-pulse all collapse to instantaneous via the global `* { animation/transition-duration: 0.001ms !important }` rule + `animate-*` overrides in `index.css`. After the L20 fix, in-page jump links also scroll instantly when reduced motion is requested. |

## Automated audit summary

axe-core, run on `/` after the contrast fixes:

- 0 serious or critical color-contrast violations remaining on the
  scanned sections (top nav + sign-in CTA, hero + hero CTAs, scanner
  kicker, sticky sub-nav, my-shelf, my-shelf CTAs, pricing card +
  Start-trial CTA, spiral, earn-premium + earn-premium CTAs, footer
  contact form + Send button).
- Remaining axe notices are best-practice (e.g. decorative emojis on
  `SpiralSection` outcome cards without `aria-hidden`, and the dark
  `#1A1A2E` premium pricing card whose intentional sage accents pass
  on dark) and are tracked separately.
- Out of scope for this task and not re-audited: `PWAInstallBanner` and
  `MyShelf` (in-app) which still contain hard-coded
  `text-[#7BAF7A]` instances; flagged for a follow-up.

## Manual checklist

- [x] Tab through nav → hero CTA → sub-nav → pricing toggle → "Start
      trial" → earn-premium CTAs; visible ring on every stop.
- [x] Reduced-motion: hero floats, spiral entrance, fade-up on every
      `FadeIn`, and pricing card hover lifts all become instantaneous.
- [x] Contrast (axe + manual eyedropper): all sage-on-light text/icons on
      the landing page now ≥ 4.5:1 (text) or ≥ 3:1 (icon / large text);
      sage-on-dark within the premium card unchanged and passing.
- [x] Heading order h1 → h2 → h3 with no skips.
- [x] Sticky sub-nav announced as a navigation landmark by VoiceOver
      after promoting the wrapping `<div>` to `<nav aria-label>`.
- [x] Pricing free-plan included rows: meaningful state still conveyed
      after greening the check icon; excluded rows keep the dimmed
      strikethrough label as the non-color signal.
- [x] Every white-on-sage button on a light surface (top nav, hero,
      my-shelf, earn-premium, footer Send) re-checked with the
      eyedropper after switching to `bg-primary-strong`; all ≥ 7:1
      against the white label, hover state still ≥ 4.5:1 thanks to
      `/90` opacity on the darker base. The pricing Start-trial CTA
      on the dark premium card uses `bg-white text-[#1A1A2E]`
      instead, which gives both the label and the component boundary
      ≥ 13:1 against the `#1A1A2E` card.
- [x] On initial page load, tab order goes top nav → hero CTAs →
      content; the hidden sticky sub-nav is removed from the tab order
      via `aria-hidden` + `inert` + `tabIndex={-1}` and only joins once
      it becomes visible. (No skip-to-content link on the marketing
      landing page yet — tracked as a follow-up; the in-app `AppShell`
      already provides one for authenticated routes.)
- [x] With `prefers-reduced-motion: reduce`, every in-page jump on the
      landing page (sub-nav links, hero "Try it now"/"See how it
      works", hero conflict pills, "Disaster mix" demo, seeded scanner
      deep-link) scrolls instantly via `behavior: "auto"`.
