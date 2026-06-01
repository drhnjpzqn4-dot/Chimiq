# SkinScreen post-signup app — canvas layout

This deck lives on the workspace canvas. Three high-fidelity design variants
are placed in a 3-column layout for the founder to compare and choose.

## Layout (canvas coordinates)

| Shape ID                       | Type   | x     | y    | Size       | Content                                                                 |
| ------------------------------ | ------ | ----- | ---- | ---------- | ----------------------------------------------------------------------- |
| `title-deck`                   | text   | 0     | 0    | 1460 × 60  | "SkinScreen — post-signup app, 3 directions"                            |
| `subtitle-deck`                | text   | 0     | 70   | 1460 × 40  | Pick-a-variant prompt (see below)                                       |
| `header-A`                     | text   | 0     | 120  | 420 × 32   | "A · Inline Checklist"                                                  |
| `header-B`                     | text   | 520   | 120  | 420 × 32   | "B · Bottom-Sheet Celebration"                                          |
| `header-C`                     | text   | 1040  | 120  | 420 × 32   | "C · Quiet Utility"                                                     |
| `variant-inline-checklist`     | iframe | 0     | 160  | 420 × 5400 | Live preview of `InlineChecklist.tsx`                                   |
| `variant-bottom-sheet`         | iframe | 520   | 160  | 420 × 5400 | Live preview of `BottomSheet.tsx`                                       |
| `variant-quiet-utility`        | iframe | 1040  | 160  | 420 × 5400 | Live preview of `QuietUtility.tsx`                                      |

## Subtitle (pick-a-variant prompt)

> Each column is a 5-screen mobile flow: Lookup home → results (full match) →
> results (partial match with gap-fill card) → no-match (full contribution) →
> my contributions. Pick the variant that best fits ChimIQ's voice — I'll
> graduate it into the live app under follow-up #96.

## Iframe URLs

Each iframe points at the mockup-sandbox preview server:

- `https://${REPLIT_DOMAINS}/__mockup/preview/skinscreen-app/InlineChecklist`
- `https://${REPLIT_DOMAINS}/__mockup/preview/skinscreen-app/BottomSheet`
- `https://${REPLIT_DOMAINS}/__mockup/preview/skinscreen-app/QuietUtility`

## Shared design system

All three variants import from `_shared/`:

- `tokens.ts` — palette mirrors the live SkinScreen app (sage `#7BAF7A`
  primary, `#3E6E3D` strong, rose `#D69A7E` accent, Inter + Playfair fonts)
- `PhoneFrame.tsx` — phone chrome, status bar, screen labels, deck column
- `demoData.ts` — shared demo product data (full match, partial match,
  missing product) so variants can be compared apples-to-apples

## Gap-fill contract (consistent across all variants)

Every contribution touchpoint — partial-match gap-fill card AND no-match
full contribution — uses the same card pattern:

1. Header with title + dismiss control (X) + Premium-progress reward hint
2. Only the missing fields shown (partial match) or every field (no match):
   barcode (read-only), brand, product name, front photo, ingredients photo,
   user rating
3. Single primary CTA: **"Confirm — this is correct"**
