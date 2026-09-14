# Handoff 2026-09-14 — "Continue/Klar gör ingenting" i onboardingen

## Symptom (rapporterat av Pia)
Efter ~4 månaders uppehåll: loggar in i **iPhone-appen (TestFlight)**, möts av
onboardingen ("Vad heter du?" + 4 frågor) trots att profilen redan var klar.
Sista knappen **"Klar"** gjorde ingenting — kom aldrig vidare.

## Grundorsak
**Railway-trialen har gått ut.** Railway-dashboarden visar
"Trial Ended — Upgrade now to continue using the platform" och projektet
**Chimiq: 0/1 service online**.

`workspaceapi-server-production-58f9.up.railway.app` svarar därför
`404 — The train has not arrived at the station` (Railway edge, ingen körande tjänst).

Både native-appen (`NATIVE_API_BASE_URL` i `src/lib/native.ts`) och webben
(rewrite i `artifacts/skinscreen/vercel.json`) pekar på den värden.

### Varför det gav exakt de här symptomen
1. `useAuth.applySession()` gjorde `onboardingCompleted = extra?.onboardingCompleted ?? false`.
   När `/api/auth/user` misslyckas blev svaret tyst `false` → appen antog "ny användare"
   → onboardingen visades, trots att Postgres säger `onboarding_completed = true`
   för pia@seafari.se (verifierat i Chimiq-prod, Supabase `wzzoipnaucqxnasubljk`).
2. `submitAll()` POST:ar till samma döda backend. Utan timeout kunde knappen bli kvar i
   `submitting` → "Klar" ser helt inert ut.

### Vad som INTE är fel
- Supabase (auth + db) är `ACTIVE_HEALTHY` — därför gick inloggningen igenom.
- Ingen datförlust: användarraderna ligger kvar med onboarding_completed = true.

## Åtgärdat i koden (ej byggt/pushat)
Gör felet ärligt i stället för tyst. Typecheck (`tsc --noEmit`) grön.

**`src/hooks/useAuth.tsx`**
- `fetchBackendUserProfile()` returnerar nu `{reachable:true, profile}` / `{reachable:false}`
  i stället för `null` för både "inget svar" och "ingen profil".
- 401/403 = nåbar backend (riktigt svar). Övriga icke-ok + nätverksfel/timeout = onåbar.
- 15 s timeout via `AbortController`.
- Onåbar backend → faller tillbaka på cachad status i localStorage
  (`chimiq.onboardingCompleted:<userId>`) i stället för `false`.
- Nytt fält i `AuthState`: `backendReachable`.

**`src/pages/OnboardingFlow.tsx`**
- 20 s timeout på POST → knappen kan aldrig fastna i `submitting`.
- 404/5xx och nätverksfel ger `onboarding.offlineError` ("vi når inte servern") i stället för
  det generiska "Kunde inte spara".
- Gul banner högst upp när `!backendReachable`, med "Försök igen"-knapp (`refetch()`).

**`src/lib/i18n.tsx`**
- Nya nycklar i en/sv/fr/es: `onboarding.offlineError`, `onboarding.offlineBanner`,
  `onboarding.offlineRetry`.

## Kvar att göra
1. **BESLUT: var ska api-server bo?** Railway kräver betald plan för att starta tjänsten igen.
   Alternativ: uppgradera Railway, eller flytta Express-appen (Vercel Functions / Render / Fly).
   Inget i appen fungerar mot backend förrän detta är löst.
2. Commit + push.
3. `pnpm build:mobile` + ny arkivering i Xcode → TestFlight (annars når fixen aldrig telefonen,
   se CLAUDE.md).
4. Verifiera: med backend nere ska appen visa bannern, inte kasta in en färdig användare
   i onboardingen; med backend uppe ska inloggning gå direkt till /app/scan.
