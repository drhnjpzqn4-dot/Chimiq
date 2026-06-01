/**
 * GTIN/EAN-validering med kontrollsiffra.
 *
 * En streckkod (EAN-8, UPC-12, EAN-13, GTIN-14) har en inbyggd kontrollsiffra:
 * den sista siffran är en checksumma av de föregående. Genom att räkna om den
 * kan vi avvisa felinslagna eller påhittade koder direkt.
 *
 * OBS: detta bevisar att numret är VÄLFORMAT — inte att det är RÄTT produkt.
 * Korsa mot OBF/egen DB eller läs hellre koden med kameran för säker matchning.
 */

/** Normaliserar inmatning: tar bort mellanslag/bindestreck. */
export function normalizeBarcode(input: string): string {
  return (input ?? "").replace(/[\s-]/g, "");
}

/**
 * Returnerar true om koden är en giltig GTIN (8, 12, 13 eller 14 siffror) med
 * korrekt kontrollsiffra.
 */
export function isValidGtin(input: string): boolean {
  const code = normalizeBarcode(input);
  if (!/^[0-9]{8}$|^[0-9]{12,14}$/.test(code)) return false;

  const digits = code.split("").map(Number);
  const check = digits.pop()!;
  // Från höger: växla vikt 3 och 1 (standard GS1-algoritm för alla GTIN-längder).
  let sum = 0;
  for (let i = digits.length - 1, weight = 3; i >= 0; i--, weight = weight === 3 ? 1 : 3) {
    sum += digits[i] * weight;
  }
  const expected = (10 - (sum % 10)) % 10;
  return expected === check;
}

/** Zod-vänlig variant: tom/utelämnad streckkod är OK; finns den måste den vara giltig. */
export function isValidOrEmptyGtin(input: string | undefined | null): boolean {
  if (!input) return true;
  return isValidGtin(input);
}
