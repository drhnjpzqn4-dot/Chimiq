# Chimiq Design System

> Lager-arkitektur: Atomer (CSS) → Molekyler (React-komponenter) → Organismer (sammansatta flöden)
> Canonical CSS: `src/index.css` · `@layer components`
> Canonical typer: `src/types/design-system.ts`
> Skapad: 2026-05-18 · BESLUT-SS-071

---

## Färgpalett (BESLUT-SS-022)

| CSS-variabel | Hex | Användning |
|---|---|---|
| `--sage` | `#3C5C44` | CTA-knappar, aktiva states, ✅ "för dig" |
| `--sage-deep` | `#284430` | Hover, fokus-ring, text på cream |
| `--rose-gold` | `#B5705B` | Logo, h1/h2, signaturer |
| `--rose-gold-deep` | `#8A4F3B` | Text/links på cream (AA-säker) |
| `--gold` | `#BC8F3D` | Premium-accent — BARA premium-element |
| `--gold-soft` | `#EEDFB8` | Premium-bakgrund |
| `--cream` | `#F1EFE8` | Huvudbakgrund |
| `--cream-warm` | `#E5E2D8` | Sektion/kort-bakgrund nivå 2 |
| `--ink` | `#2C1A0E` | All brödtext |
| `--ink-soft` | `#4D5450` | Sekundär text, inaktiva ikoner |
| `--line` | `#DDDAD0` | Borders, dividers |
| `--green-soft` | `#DCE7DC` | Säker-badge bakgrund |
| `--amber-soft` | `#F0E2BC` | Caution-badge bakgrund |
| `--amber-deep` | `#8B6A1F` | Caution-badge text |
| `--rose-soft` | `#F2DECE` | High-badge bakgrund, bidra-knapp |
| `--red-deep` | `#8E3A26` | High-badge text, destruktiv action |

### Färgkonvention för knappar (BESLUT-SS-067)

| Färg | Semantik | Klass |
|---|---|---|
| 🟢 Sage | "För dig" — egna actions (Analysera, Spara, Lägg till) | `.btn-primary` |
| 🟡 Gold | "För Chimiq" — bidra, premium | `.btn-premium` |
| 🔴 Rose/red | Destruktiv (Radera), varning | Tailwind `text-destructive` |
| 🌸 Rose-soft | Bidra (community) — neutral men varm | `.btn-contribute` |

---

## Lager 1 — Atomer (CSS-klasser)

Alla klasser är definierade i `src/index.css` · `@layer components`.

### Knappar

| Klass | Bakgrund | Text | Användning |
|---|---|---|---|
| `.btn-primary` | `--sage` | vit | Primär CTA — Analysera, Kontrollera, Spara |
| `.btn-secondary` | vit | `--ink` | Sekundär action |
| `.btn-ghost` | transparent | `--ink-soft` | Tertiär/minimalknapp |
| `.btn-premium` | `--gold` | vit | Premium-CTA, paywall |
| `.btn-dashed` | transparent | `--ink-soft` | Inbjudan att lägga till något |
| `.btn-contribute` | `--rose-soft` | `--rose-gold-deep` | Bidra med produkt (community) |

### Status-badges

| Klass | Bakgrund | Text | Semantik |
|---|---|---|---|
| `.status-badge--safe` | `--green-soft` | `--sage-deep` | Trygg produkt |
| `.status-badge--caution` | `--amber-soft` | `--amber-deep` | Möjlig konflikt / varning |
| `.status-badge--high` | `--rose-soft` | `--red-deep` | Hög risk, farlig kombination |

### Produktrad

```
.product-list-row                    ← outer div (ej klickbar)
  .product-list-row__main            ← <button> (hela vänsterdelen)
    .product-list-row__icon          ← slot-ikon (32×32)
    .product-list-row__body          ← flex-column text
      .product-list-row__name        ← produktnamn
      .product-list-row__brand       ← varumärke (optional)
      <StatusBadge>                  ← trafiksignal-komponent
  .product-list-row__remove          ← <button> syskon (INTE nästlad i __main)
```

### Sektionshuvud

```
.section-header
  .section-header__left
    .section-header__label           ← RUBRIK UPPERCASE
    .section-header__count           ← antal
  .section-header__cta               ← "Lägg till" länk höger
```

### Formfält

| Klass | Element | Användning |
|---|---|---|
| `.input-base` | `<input>` | Alla textinmatningsfält |
| `.textarea-base` | `<textarea>` | Flerradstext |

---

## Lager 2 — Molekyler (React-komponenter)

### `<StatusBadge>` — `src/components/StatusBadge.tsx`

```tsx
<StatusBadge
  status="safe" | "caution" | "high"   // required
  conflictWith="Retinol 0.5%"           // optional — visas i caution-label
  warningCount={2}                       // optional — visas om > 1
/>
```

Beräknar etiketten internt. Kallaren ska INTE skicka in label-text.

### `<ProductListRow>` — `src/components/ProductListRow.tsx`

```tsx
<ProductListRow
  productName="Neutrogena Rapid Clear"
  brand="Neutrogena"                     // optional
  routineSlot="morning"                  // optional
  status="caution"
  conflictWith="Retinol 0.5%"           // optional
  warningCount={1}                       // optional
  onOpen={() => openSheet()}             // required
  onRemove={() => remove()}              // optional — visas om readOnly=false
  removeAriaLabel="Ta bort"             // optional, default "Ta bort"
  removeDisabled={false}                 // optional
  readOnly={false}                       // optional — döljer radera-knapp
/>
```

### `<SectionHeader>` — `src/components/SectionHeader.tsx`

```tsx
<SectionHeader
  label="PRODUKTER"
  count={5}                             // optional
  ctaLabel="Lägg till"                 // optional
  onCta={() => setShowForm(true)}       // optional, visas om ctaLabel finns
/>
```

### `<IngredientStatusDot>` — `src/components/IngredientStatusDot.tsx`

Kvar för bakåtkompatibilitet — en 10×10 px cirkel. `IngredientStatusLevel` är nu ett alias för `StatusLevel`.

---

## Lager 3 — Organismer (sammansatta flöden)

| Komponent | Innehåller | Sida |
|---|---|---|
| `<ScanEntry>` | Sök/Barcode/Foto — tre likvärdiga val | `/app/scan`, MyShelf, ContributeModal |
| `<ProductDetailSheet>` | Produktdatablad — bild, badge, analys | Scan, MyShelf, Home |
| `<IngredientsCapture>` | Kamera+paste+OCR | ScanEntry, ContributeModal |
| `<GamificationBanner>` | Bidrag-progress pill | Scan-sidan |
| `<MyShelf>` | Hela rutinsidan inkl. lista + knappar + analys | Shelf.tsx |

---

## Typer — `src/types/design-system.ts`

```typescript
export type StatusLevel = "safe" | "caution" | "high";
export type RoutineSlot = "morning" | "evening" | "occasional" | "wishlist" | null;
```

## Hjälpfunktioner — `src/lib/status.ts`

```typescript
toStatusLevel(v: "safe" | "warning" | "high" | StatusLevel): StatusLevel
// Bryggar gamla "warning"-strängen till "caution"
```

---

## Principen (BESLUT-SS-071)

**EN modul, EN källa-till-sanning, identiskt beteende överallt.**

Identifierar du att du duplicerar UI (knappar, formulär, modaler, banners, badges)?
→ Stoppa. Extrahera till `/components/`. Kalla på komponenten istället.

Identifierar du en ny CSS-klass som behövs?
→ Lägg till den i `@layer components` i `src/index.css`. Inte inline.

Identifierar du en ny typ?
→ Lägg till den i `src/types/design-system.ts`. Inte inline i komponenten.

---

## Ändringslog

| Datum | Beslut | Förändring |
|---|---|---|
| 2026-05-18 | SS-071 | Design system etablerat, @layer components, StatusBadge, ProductListRow, SectionHeader |
| 2026-05-18 | SS-070 | Kategoriikoner i ProductListRow (SlotIcon) |
| 2026-05-17 | SS-067 | Färgkonvention: sage=för dig, gold=för Chimiq |
| 2026-05-13 | SS-022 | Forest + Clay färgpalett |
