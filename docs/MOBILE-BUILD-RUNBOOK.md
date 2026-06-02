# Chimiq — Mobil-build runbook (Capacitor → iOS/Xcode)

**Syfte:** Få ändringar som redan finns i webbkoden (t.ex. SS-076 källänkar i PDF) in i iOS-appen.
Arkitektur = "väg B" (BESLUT 2026-05-31): appen laddar sin EGNA bundlade webbuild från `webDir`.
Inget pushas till GitHub i detta flöde — allt körs lokalt på Mac.

> Stäng GitHub Desktop innan git-kommandon (lås-strul). Webbläsare: Safari/Firefox.

---

## iOS — steg för steg

```bash
# 1. Hämta senaste koden (du har redan pushat SS-076, detta är bara för säkerhets skull)
cd ~/PiasVentures/chimiq-code
git pull origin main

# 2. Bygg webbappen i Capacitor-läge (VITE_CAPACITOR=true → rätt API/paths för native)
#    Output hamnar i artifacts/skinscreen/dist/public (= cap webDir)
pnpm --filter @workspace/skinscreen build:cap

# 3. Synka den färska builden in i native iOS-projektet
cd ~/PiasVentures/chimiq-code/artifacts/skinscreen/mobile/capacitor
npm run sync:ios

# 4. Öppna projektet i Xcode (öppnar App.xcworkspace, inte .xcodeproj)
npm run open:ios
```

## I Xcode (manuellt — kan inte scriptas helt)

1. Välj target **App** → fliken **General**.
2. Höj **Build**-numret (t.ex. 9 → 10). *Version* (1.0.x) höjs bara vid större release.
   - VIKTIGT: `server.url` får ALDRIG vara satt för en TestFlight/App Store-build
     (orsakade build 9-kraschen). Variabeln `CAP_SERVER_URL` ska vara OSATT — den är
     bara för live-reload under utveckling.
3. Välj destination **Any iOS Device (arm64)** uppe i verktygsfältet.
4. Meny: **Product → Archive**. Vänta tills arkivet byggs.
5. I Organizer-fönstret som öppnas: **Distribute App → TestFlight (Internal/External)** →
   följ signerings-stegen (automatisk signering, ditt Apple Developer-konto).

## Testa EFTER installation på telefon
- Öppna en rutinrapport → "Spara som PDF".
- PDF i en native-app använder enhetens dela/skriv-ut-ark, INTE webbläsarens print.
  Verifiera att (a) PDF skapas och (b) "Källa:"-raderna med DOI/PubMed-länkar syns.

---

## Android (när du vill — separat spår)
```bash
cd ~/PiasVentures/chimiq-code
pnpm --filter @workspace/skinscreen build:cap
cd ~/PiasVentures/chimiq-code/artifacts/skinscreen/mobile/capacitor
npm run sync:android
npm run build:android      # skapar release-bundle (.aab) via gradlew
# Ladda upp .aab i Google Play Console → Internal testing
```

---
*Skapad 2026-06-02. Källa till sökvägar/scripts: `mobile/capacitor/capacitor.config.ts` + `package.json`.*
