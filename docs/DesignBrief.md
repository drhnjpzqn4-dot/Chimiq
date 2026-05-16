# Chimiq — Design Brief

> Det här dokumentet är **lag** för all UI-kod i `chimiq.com` (marknadssidan) och `chimiq.com/app` (inloggade appen). Cursor: läs hela innan du rör en rad. Vid konflikt mellan denna fil och en enskild ticket — **denna fil vinner**, och be Pia avgöra.

**Stack:** React + Vite + TypeScript + Tailwind + shadcn/ui + Wouter. Backend: TypeScript/Express + Drizzle + Supabase EU. Capacitor för iOS/Android.

**Single source of truth för exakta färg- + typografi-värden:** `artifacts/skinscreen/src/index.css` — den filen vinner alltid vid konflikt. `remotion-cimiq/src/brand.ts` speglar samma värden för video. Den här briefen beskriver *reglerna*; index.css håller *värdena*.

---

## 1. Vad Chimiq är (1 mening per riktning)

- **Produkt:** En oberoende ingrediensanalys för hudvård — du skannar, vi visar vad som är i den + officiella varningar.
- **Användare:** Svenska tonåringar 13–19 + deras föräldrar. Använder enhandigt, på mobil, på t-banan, i pauser.
- **Affärsmodell:** Free är användbar (skanna obegränsat, 2 produkter på hyllan, kemikalie-DB, DIY-bläddring). Premium ger AI-chat, obegränsad hylla, full routine cross-check, AI-DIY-recept. 14 dagars trial.
- **Mission (säg det ofta):** "Vi bygger Sveriges säkraste hudvårdsdatabas — tillsammans." Bidrag är en parallell väg till Premium.

## 2. Ton (kunnig kompis, inte skräm-influencer)

| Sammanhang | Aldrig | Alltid |
|---|---|---|
| Stark ingrediens | "FARA! Detta kan skada din hud!" | "Heads up — den här är stark. Undvik om huden är irriterad." |
| Tom hylla | "Inga produkter" | "Hyllan är tom. Lägg till din första →" |
| Okänd produkt | "Error: produkt ej i databas" | "Vi har inte sett denna än. Hjälp oss?" |
| Kombo-varning | "Konflikt detekterad" | "Du har retinol + AHA. Skippa en ikväll." |
| Lyckad scan | "Success" | "Klart! Här är vad vi hittade 👇" |
| Premium-paywall | "Lås upp Premium nu!" | "Chatten är Premium — testa fritt i 14 dagar" |

**Hård regel — inga råd, bara fakta.** Vi får inte ge medicinsk rådgivning. Kopiera ALDRIG mönstret "Din rutin ser bra ut" / "Skippa AHA ikväll" / "Du borde…". Vi rapporterar fakta (vad ingrediensen är, EU-status, källhänvisning) och vidarebefordrar officiella varningar (EU Safety Gate recalls). Användaren drar slutsatsen.

## 3. Den ENA brand-känslan (web + app delar denna)

Varm, jordnära, vetenskaplig. Cream-bakgrund, sage som funktionell färg, rose-gold som signatur (logo + serif-rubriker), gull-accent reserverad för Premium. Aldrig glansigt, aldrig medicinskt-vitt, aldrig influencer-rosa.

**Skillnaden mellan webb och app är densitet och syfte — INTE färg, typ eller komponenter:**

| | chimiq.com (marknad) | chimiq.com/app (inloggad) |
|---|---|---|
| Mål | Konvertera → signup | Daglig användning |
| Layout | Generös, redaktionell, full-bleed-bilder | Kompakt, top-bar + bottom-nav, kortbaserad |
| Typografi | Stora serif-rubriker (40–96px), gott om vita ytor | Serif på h1/h2 (22–28px), resten sans |
| CTA | Sage knapp + sekundär rose-gold-länk | Sage knapp (FAB centerad i nav) |
| Bilder | Produktfoto + lifestyle (placeholders nu) | Ingen lifestyle — produktbilder från DB |
| Innehåll per skärm | 1 hero + 1 sektion synlig | 1 primär handling + max 3 sekundära |

**Båda använder exakt samma färgvariabler, samma typsnittsstack, samma button-/card-/pill-komponenter.** Om en knapp ser olika ut mellan landing och app → det är en bug.

## 4. Färg — Forest + Clay-paletten (BESLUT-SS-022, 2026-05-13)

> **Exakta värden lever i `artifacts/skinscreen/src/index.css` — den filen vinner.** Tabellen nedan är snabbreferens; lägg aldrig till eller ändra en hex här utan att samtidigt ändra index.css.

```
--rose-gold        #B5705B   Clay/terrakotta — logo, h1/h2-serif-rubriker, varma signaturelement
--rose-gold-deep   #8A4F3B   AA-säker text-version (links, headlines, aktiv tab)
--sage             #3C5C44   Skogsgrön — funktionell primär, ALLA CTA-knappar, aktiva states
--sage-deep        #284430   Sage-text på cream (AA), hover, focus-ring
--gold             #BC8F3D   ENDAST Premium-accent (badge, paywall-CTA, Premium-kort)
--gold-soft        #EEDFB8   Premium-bakgrund (subtilt)
--cream            #F1EFE8   Huvudbakgrund (web + app body)
--cream-warm       #E5E2D8   Sektioner, kort-bakgrund nivå 2
--ink              #2C1A0E   All body-text — dark chocolate (BESLUT-SS-020)
--ink-soft         #4D5450   Sekundär text, hjälp-text, ikoner inaktiv
--line             #DDDAD0   Borders, dividers
```

**Tre statusfärger (traffic-light) — ALDRIG ensamma, alltid med ikon (BESLUT-SS-021):**
```
🟢 sage-deep #284430 på green-soft #DCE7DC — ✓ Trygg
🟡 amber-deep #8B6A1F på amber-soft #F0E2BC — ⚠ Försiktig
🔴 red-deep   #8E3A26 på red-soft   #EDD6CF — ⊘ Avråds
```

**Förbjudet:**
- Gamla paletten (ljus sage `#7BAF7A`, varm rose-gold `#C9967E`, gull `#D29A55`, cream `#FAF6F2`, ink `#1F1A17`) — ersatt av Forest + Clay ovan. Ser du dessa hex i kod eller mockup: fel, ska bytas.
- Lavendel (`#C5A3C9`) och teal (`#0D9488`) — borttagna sedan länge. Använd sage / cream-warm.
- Pure white (`#FFFFFF`) — använd `--cream` på bakgrunder, kort blir `#FFFFFF` ENDAST när de ligger ovanpå cream-warm.
- Gradients som dekoration — endast på FAB-knappen (sage → sage-deep) och Premium-badge (gold-soft → gold).
- Hårdkodade hex i komponenter. Använd CSS-variabler eller Tailwind-tokens.

## 5. Typografi

**Stack (BESLUT-SS-022):**
```
--font-serif: "Source Serif 4", "Iowan Old Style", Georgia, serif;
--font-sans:  "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
```
Google Fonts laddas i `index.html`: Source Serif 4 (400, 500) + Inter (400, 500, 600).

**Skala (web):**
| Token | Storlek | Vikt | Användning |
|---|---|---|---|
| `display` | 64–96px serif | 400 | Hero på landing |
| `h1` | 40px serif | 500 | Sid-rubriker landing |
| `h2` | 28px serif | 500 | Sektions-rubriker |
| `h3` | 20px sans | 600 | Kort-rubriker |
| `body` | 17px sans | 400 | Brödtext landing |
| `small` | 14px sans | 400 | Hjälp-text |

**Skala (app):**
| Token | Storlek | Vikt | Användning |
|---|---|---|---|
| `h1` | 28px serif | 500 | Sid-rubriker ("Profile", "Discover") |
| `h2` | 22px serif | 500 | Sektions-rubriker i listor |
| `h3` | 17px sans | 600 | Kort-rubriker, produktnamn |
| `body` | 16px sans | 400 | Brödtext (ALDRIG mindre) |
| `label` | 13px sans | 500 | Pills, taggar, meta |
| `caption` | 12px sans | 400 | Footer-disclaimers |

**Hårda regler:**
- Body min 16px i app, 17px på webb. Aldrig under.
- `line-height: 1.5` på all body-text, `1.2` på serif-rubriker.
- `text-wrap: pretty` på rubriker.
- Serif används ENDAST på h1/h2 + hero-display. Knappar, brödtext, listor = sans.
- Aldrig all-caps utom labels (Premium-badge, tab-labels på 11px).

## 6. Spacing & radius

- 4px-grid: `4 / 8 / 12 / 16 / 24 / 32 / 48 / 64 / 96`.
- Radius: `8` (pills), `12` (knappar, små kort), `16` (kort i app), `24` (stora kort på web), `9999` (FAB, avatar).
- Skugga: använd sparsamt. Standard `box-shadow: 0 1px 2px rgba(31,26,23,.06), 0 8px 24px rgba(31,26,23,.04)` på lyfta kort. INGA stora "drop-shadow"-effekter.
- Min tap-target i app: **48×48px**. För close-x och liknande små ikoner — använd 24px ikon i 48px touch-yta.

## 7. Komponenter — gemensamma för web + app

Använd shadcn/ui som bas. Bygg INTE nya — wrappa befintliga.

**Knappar:**
- `Primary`: sage bakgrund, vit text, 48px hög, 12px radius, sans 16px medium.
- `Secondary`: cream bakgrund, ink text, 1px line-border, samma mått.
- `Ghost`: ingen bakgrund, sage-deep text, för text-länkar.
- `Premium`: gold bakgrund, ink text, ✨-ikon prefix, samma mått.
- **Aldrig:** outline-only utan färgad text, gradient på vanliga knappar, ikoner utan label på primärknappar.

**Kort:**
- Vit bakgrund på cream-warm, eller cream-warm på cream. 16px radius, 16–20px padding.
- Premium-kort: gold-soft bakgrund, gold-border 1px, gold ✨ uppe vänster.

**Ingrediens-pill (kärnkomponent — finns redan som `IngredientPill`):**
- Pill med 8px radius, 6–10px padding, 13px label.
- Alltid ikon + text + färg. Aldrig bara färg.
- ✓ Trygg / ⚠ Försiktig / ⊘ Avråds.

**Top-bar (app):**
- 🧪 logo-molekyl (24px) + "Chimiq" wordmark (serif 18px rose-gold-deep) till vänster.
- Höger: tom slot för ⚠ varningstriangel (visas BARA vid aktiv konflikt/recall, pulserar lätt, tap → /shelf).
- Ingen avatar i top-bar. Avatar bor i Profile-tabben.

**Bottom-nav (app) — 5 tabs, Scan som FAB:**
```
   Home    Shelf    [📷 Scan]    Discover    Profile
                       ↑
                  centrerad, lyft 26px, sage-gradient,
                  4px cream-border runt cirkeln
```
- Aktiv: rose-gold-deep ikon + label.
- Inaktiv: ink-soft ikon + label.
- Tab-label 11px sans 500.

**Paywall-modal (premium-trigger):**
- Bottom-sheet på app, modal på web.
- Cream-warm bakgrund, gold-soft accent-block uppe.
- Header serif 22px: "Chatten är Premium" / "Hyllan är full".
- 3 bullets med ✨-ikoner som beskriver Premium-värdet.
- Primär CTA sage: "Testa fritt i 14 dagar".
- Sekundär text-länk: "Inte just nu".
- Småtext under: "Avsluta när som helst · Inga kort krävs första 14 dagarna".

## 8. Ikonografi

- **Lucide-react** är enda ikonbiblioteket. Inga emojis i UI (utom traffic-light: ✓ ⚠ ⊘ som faktiskt är Lucide `Check` / `AlertTriangle` / `Ban`).
- Storlek: 16px (inline), 20px (i knapp), 24px (top-bar, nav).
- Stroke-width: 1.75 (Lucide default 2 är för tjockt mot vår fina typografi).
- Färg: ärver från text, eller `--ink-soft` för dekorativa.

**Emoji är OK på:** hälsning (☀️🌙👋😴), Premium-badge (✨), DIY-recept-kategorier i tags. **Inte OK på:** ingrediensvarningar, knappar, navigering.

## 9. Den unifierade arkitekturen — `chimiq.com` ↔ `chimiq.com/app`

**Marketing (`/`, `/pricing`, `/discover`, `/recipes`, `/legal/*`):**
- Bred maxbredd 1240px på desktop, 720px innehållsbredd.
- Hero med stor serif display + sage CTA + sekundär ghost.
- Footer i alla utom legal: rose-gold-deep logo, sage CTA "Ladda ner appen".
- ETT konsekvent header-mönster: logo-molekyl + "Chimiq" + nav-länkar (Funktioner / Discover / Pris / Logga in) + sage "Kom igång"-knapp.

**App (`/app/*`):**
- Maxbredd 480px på desktop (centrerad, cream-bakgrund utanför). På mobil full-width.
- Top-bar fixerad. Bottom-nav fixerad. Innehåll mellan dem scrollar.
- Inga marknadssfält (CTAs till "ladda ner appen", testimonials, etc).

**Bryggan mellan dem:**
1. **Samma header-logotyp** (storlek, font, rose-gold-deep) på båda. När en inloggad användare landar på `/pricing` ska det inte kännas som "en annan produkt".
2. **Pricing-sidans CTA → app/upgrade-flow.** Använd samma paywall-mönster som inuti appen.
3. **`/discover` (public) och `/app/discover` delar visuell layout.** Public visar 3 mest populära ingredienser från kemikalie-DB + CTA "Skanna din egen". App visar samma DB men personaliserad till hyllan.
4. **`/recipes` (public DIY-bibliotek) och `/app/recipes` delar receptkortet.** Public har "Logga in för att spara" på alla, app har stjärna.
5. **Hela legal-sektionen (`/legal/*`)** ärver app-typografi (kompakt) eftersom den läses från inuti appen.

## 10. Bottom nav-strukturen är beslutad

Refactora INTE detta utan att fråga Pia:
```
Home · Shelf · [📷 Scan] · Discover · Profile
```
- Default route efter login = `/app/home`.
- `/app/browse` finns kvar som route (för existerande deep-links + streckkods-detaljer), men **inte i nav**.
- `My shelf & routine check` i Profile-menyn behålls temporärt som redirect → `/app/shelf`.
- `/app/leaderboard`, `/app/rewards`, `/app/problems`, `/app/recipes/new` finns redan — länka från relevanta sidor, inte från nav.

## 11. Premium-strategin i UI

**Free vs Premium-matris (auktoritativ — alla paywall-triggers ska matcha):**

| Feature | Free | Premium |
|---|---|---|
| Skanna | Obegränsat (12/dag) | Obegränsat |
| Hyllan | 2 produkter | Obegränsat |
| AI-chat | Paywall-modal | ✅ |
| Kombo-check 2 produkter | ✅ | ✅ |
| Routine cross-check 3+ | Paywall | ✅ |
| Discover Problems (kemikalie-DB) | ✅ | ✅ |
| DIY-recept bläddra | ✅ | ✅ |
| DIY-recept spara | Max 3 | Obegränsat |
| AI-DIY för min hudtyp | Paywall | ✅ |
| Skicka eget recept (bidrag) | ✅ | ✅ |
| Bäst-före-varningar | ✅ | ✅ |
| Batch-recall (EU Safety Gate) | ✅ | ✅ |

**Premium-promotion i UI — Apple-säkert:**
- Chat-FAB syns för **alla**. Free tap → paywall-modal (inte låst-ikon).
- Premium-badge `✨ PRO` upp-höger på chat-kort, AI-DIY-kort, locked shelf-slots.
- Vid begränsning: "Hyllan är full (2/2). Få plats för hela rutinen →"
- Tydligt pris (49 kr/mån eller motsvarande) synligt INNAN köp.
- "Manage Subscription"-knapp i Profile som deeplinkar:
  - iOS: `itms-apps://apps.apple.com/account/subscriptions`
  - Android: `https://play.google.com/store/account/subscriptions`
  - Web: Stripe Customer Portal
- **Aldrig** "Pay outside the app"-länkar inuti iOS-buildet.

**Bidrag = parallell väg till Premium:**
- 30 produkter bidragna → 1 månad gratis Premium.
- 100 bidrag → "Database Hero"-status → 6 månader.
- Visa progress-bar `X / 30` på Profile + Home.

## 12. Arbetsmetod — så jobbar Cursor

1. **Inget rivs.** 95% av features finns redan i kodbasen. Vi reorganiserar, byter färg-token, lägger till radius, döljer/visar. Bygg nytt ENDAST om filen inte finns.
2. **Visa diff per fil INNAN du gör ändringen.** Varje PR ändrar ≤ 4 filer.
3. **Använd shadcn-komponenter som finns.** Lägg inte till nya UI-libs.
4. **i18n: lägg till nycklar i alla 4 språk (sv/en/fr/es)** när du lägger till copy. Aldrig hårdkodad text.
5. **Kör `pnpm --filter @workspace/skinscreen test:a11y` innan commit.** Inga regressions tillåtna.
6. **Hårdkoda aldrig färg/spacing.** Använd CSS-variabler + Tailwind-tokens från `index.css`. Om en token saknas — lägg till den, hårdkoda inte runt det.
7. **Rör inte** dessa filer utan att fråga Pia: `lib/i18n.tsx` (mer än att lägga till nycklar), `lib/legal-consent.ts`, `hooks/useUserPlan.ts`, `components/IngredientDetailSheet.tsx`, `components/IngredientScanner.tsx`, `App.tsx`, `mobile/`, `index.css` (förutom att lägga till nya tokens).
8. **Tre saker ALDRIG:**
   - "Best Tip of the Week" från användare (verifierings-/credibility-risk — vi väntar på dermatolog-Q&A).
   - "Pay on chimiq.com" eller liknande out-of-app-betalning i iOS-buildet.
   - Preloaded sample products för inloggade användare (Pias #1 frustration).
9. **Bygg sprint-för-sprint enligt `05-reflektion-och-svar.md` punkt 11.** Inte allt på en gång.

## 13. Det här är NEJ (saker som ofta föreslås men inte ska göras)

- ❌ Gamification med poäng/badges som central feature (använd ENDAST för db-bidrag).
- ❌ Social feed med vänner.
- ❌ AI-chatbot på Home som central widget (den bor som FAB).
- ❌ Dark mode (light first; senare).
- ❌ Stora hero-illustrationer skapade av AI (använd placeholders, fråga Pia om foto).
- ❌ Mer än 1 push-notis/dag.
- ❌ "Du borde…" / "Din rutin ser bra ut" / råd-copy.
- ❌ Veckorapporter med värdering (fakta-rapporter, däremot, är OK).

## 14. När du är osäker

1. Öppna `Design Reference.html` och titta på motsvarande komponent.
2. Sök i `artifacts/skinscreen/src/components/` efter motsvarande pattern.
3. Om det inte finns — fråga Pia. Skapa inte ett nytt mönster utan godkännande.

---

**Sammanfattning för Cursor (klistra in i prompt-headern):**

> Du jobbar på Chimiq — en ingrediensanalys-app för svenska tonåringar. Läs hela `docs/DesignBrief.md` innan du rör en rad; exakta färg-/typvärden finns i `artifacts/skinscreen/src/index.css` (den filen vinner). Forest + Clay-paletten (BESLUT-SS-022): sage `#3C5C44` är funktionell primär (CTA), rose-gold/clay `#B5705B` är signatur (logo, serif-rubriker), gold `#BC8F3D` är ENDAST för Premium, cream `#F1EFE8` bakgrund, ink `#2C1A0E` text. Ingen lavendel, ingen teal, inga hårdkodade hex — använd CSS-variabler/Tailwind-tokens. Ton: kunnig kompis, inte skräm-influencer. Inga råd, bara fakta. Bottom nav är 5 tabs Home/Shelf/[Scan-FAB]/Discover/Profile. Free max 2 produkter på hyllan, AI-chat = Premium. Ändra max 4 filer per PR. Visa diff innan ändring.
