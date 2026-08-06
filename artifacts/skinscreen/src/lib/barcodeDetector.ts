/**
 * SS-094 — streckkodsläsning som fungerar i Safari.
 *
 * BAKGRUND (för icke-utvecklare)
 * Webbläsare har ett inbyggt API som heter `BarcodeDetector`. Chrome och Android
 * har det. **Safari har det inte** — varken på iPhone eller Mac. Eftersom vår
 * målgrupp till stor del sitter på iPhone innebar det att streckkodsknappen på
 * chimiq.com i praktiken var död för dem: de fick falla tillbaka på att knappa
 * in tretton siffror för hand.
 *
 * LÖSNINGEN
 * `barcode-detector` är en polyfill: den härmar exakt samma API som webbläsarens
 * inbyggda, men gör själva avkodningen i WASM (kompilerad ZXing). Eftersom API:et
 * är identiskt behöver resten av scan-koden inte veta vilken av dem den använder.
 *
 * Den laddas med `await import(...)` — alltså först när användaren faktiskt
 * trycker på scanna-knappen, och bara i webbläsare som saknar det inbyggda
 * API:et. Chrome- och Android-användare laddar aldrig ned den, och den ligger
 * inte i appens startpaket. WASM-filen är ca 900 kB, så det spelar roll.
 *
 * Går importen fel (nätverk, blockerad CDN, gammal webbläsare) returneras `null`
 * och anroparen faller tillbaka på manuell inmatning precis som tidigare — inget
 * kraschar.
 *
 * ⚠️ ATT KÄNNA TILL: WASM-filen hämtas som standard från jsDelivrs CDN vid första
 * scanningen. Det betyder (a) att Safari-scanning inte fungerar offline, och (b)
 * att användarens webbläsare gör en förfrågan till en tredjepart. För en beta är
 * det oproblematiskt, men innan bred lansering mot minderåriga bör vi self-hosta
 * .wasm-filen från chimiq.com i stället — det görs med `prepareZXingModule` och
 * en egen `locateFile`. Se DECISIONS.md SS-094.
 */

/** Delmängden av BarcodeDetector-API:et som vi faktiskt använder. */
export interface FrameBarcodeDetector {
  detect(source: HTMLVideoElement): Promise<Array<{ rawValue: string }>>;
}

declare const BarcodeDetector: {
  new (options?: { formats?: string[] }): FrameBarcodeDetector;
};

/** Streckkodsformat vi bryr oss om. EAN-13 är det som sitter på kosmetika i EU. */
export const BARCODE_FORMATS = [
  "ean_13",
  "ean_8",
  "upc_a",
  "upc_e",
  "code_128",
  "code_39",
  "qr_code",
] as const;

/** True om webbläsaren har det inbyggda API:et (Chrome, Edge, Android). */
export function hasNativeBarcodeDetector(): boolean {
  return typeof window !== "undefined" && "BarcodeDetector" in window;
}

/**
 * True om enheten över huvud taget kan filma — alltså om det är lönt att visa
 * scanna-knappen. Safari hamnar här: ingen `BarcodeDetector`, men väl en kamera,
 * och med polyfillen nedan fungerar den.
 */
export function hasCameraScanSupport(): boolean {
  if (typeof window === "undefined") return false;
  if (hasNativeBarcodeDetector()) return true;
  return typeof navigator !== "undefined" && !!navigator.mediaDevices?.getUserMedia;
}

let polyfillPromise: Promise<FrameBarcodeDetector | null> | null = null;

async function loadPolyfill(formats: string[]): Promise<FrameBarcodeDetector | null> {
  try {
    // "ponyfill" = ge oss klassen, men rör inte globala objekt. (Entryn hette
    // "/pure" i det gamla paketnamnet @sec-ant/barcode-detector före v2.)
    const mod = await import("barcode-detector/ponyfill");
    return new mod.BarcodeDetector({ formats: formats as never });
  } catch {
    return null;
  }
}

/**
 * Ger tillbaka en detektor — inbyggd om den finns, annars polyfillen.
 * `null` betyder "den här enheten kan inte läsa streckkoder alls", och då ska
 * anroparen visa manuell inmatning.
 */
export async function createBarcodeDetector(
  formats: readonly string[] = BARCODE_FORMATS,
): Promise<FrameBarcodeDetector | null> {
  if (hasNativeBarcodeDetector()) {
    return new BarcodeDetector({ formats: [...formats] });
  }
  if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
    return null;
  }
  // Polyfillen (och dess WASM) hämtas bara en gång per sidladdning.
  polyfillPromise ??= loadPolyfill([...formats]);
  return polyfillPromise;
}
