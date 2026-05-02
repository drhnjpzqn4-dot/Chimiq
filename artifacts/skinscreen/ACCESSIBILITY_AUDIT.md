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
