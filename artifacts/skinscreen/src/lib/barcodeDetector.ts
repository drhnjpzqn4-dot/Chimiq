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
 * SJÄLVHOSTAD WASM (SS-095)
 * Som standard hämtar zxing-wasm sin .wasm-fil från jsDelivrs CDN
 * (`fastly.jsdelivr.net`). Vi serverar den från chimiq.com i stället — se
 * `wasmUrl` nedan. Ingen tredjepartsförfrågan från våra användares webbläsare,
 * och scanning fungerar även när CDN:en är blockerad eller nere.
 */

/**
 * SS-095 — WASM-filen serveras från vår egen domän.
 *
 * `?url` är Vites sätt att säga "ge mig adressen till den här filen, ladda den
 * inte". Vid bygget kopieras `zxing_reader.wasm` in bland våra egna statiska
 * filer (med innehållshash i namnet) och `wasmUrl` blir en sträng som pekar dit.
 * Kostar ingenting vid sidladdning — det ÄR bara en sträng. Själva filen på
 * ~900 kB hämtas först när någon faktiskt scannar i Safari.
 *
 * Varför inte kopiera filen till `public/` för hand: då måste någon komma ihåg
 * att kopiera om den varje gång paketet uppdateras. JS-koden och .wasm-filen
 * måste vara byggda ur samma version — annars kraschar avkodaren. Med importen
 * nedan följer filen automatiskt med paketversionen. Därför är `zxing-wasm`
 * också pinnad till exakt `3.1.1` i package.json (ingen `^`): det är den version
 * `barcode-detector@3.2.1` är byggd mot.
 */
import wasmUrl from "zxing-wasm/reader/zxing_reader.wasm?url";

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

    // SS-095: peka om .wasm-hämtningen från jsDelivr till vår egen domän.
    // Egen try/catch: skulle API:et ändras i en framtida version vill vi hellre
    // falla tillbaka på CDN:en (scanning fungerar, men med tredjepartsanrop) än
    // att tappa streckkodsläsningen helt.
    try {
      mod.prepareZXingModule({
        overrides: {
          locateFile: (path: string, prefix: string) =>
            path.endsWith(".wasm") ? wasmUrl : `${prefix}${path}`,
        },
        fireImmediately: false,
      });
    } catch {
      /* faller tillbaka på paketets inbyggda CDN-adress */
    }

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
