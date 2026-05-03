#!/usr/bin/env tsx
/**
 * Refreshes Open Beauty Facts (OBF) front-image URLs in IngredientScanner.tsx.
 *
 * The numeric "rev" segment in
 *   https://images.openbeautyfacts.org/images/products/<slashed-barcode>/front_<lang>.<rev>.400.jpg
 * changes whenever a contributor re-uploads the product photo, so hard-coded
 * URLs eventually 404. This script:
 *   1. Scans the source file for OBF image URLs (covers QUICK_START_PRODUCTS,
 *      COMPARE_PRESETS, SINGLE_PRESET, and the *_PRESET_IMAGE constants).
 *   2. Calls the OBF v2 API for each barcode to discover the current rev.
 *   3. Resolves the current front image (preferring the same `front_<lang>`
 *      already in the file, falling back to any other available `front_*`
 *      variant if that one was removed).
 *   4. Verifies the new URL returns HTTP 200.
 *   5. Rewrites the source file in place when anything changed.
 *
 * Run manually:
 *   pnpm --filter @workspace/scripts run refresh:obf-images
 *
 * Run in CI / on a schedule: same command. Exits non-zero if any URL cannot
 * be resolved or verified, so a scheduled job can alert when the gallery is
 * about to silently break.
 */
import { readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const TARGET = resolve(
  __dirname,
  "../../artifacts/skinscreen/src/components/IngredientScanner.tsx",
);

const URL_RE =
  /https:\/\/images\.openbeautyfacts\.org\/images\/products\/((?:\d+\/)+)front_([a-z]{2})\.(\d+)\.400\.jpg/g;

interface ParsedUrl {
  full: string;
  slashedBarcode: string;
  barcode: string;
  lang: string;
  rev: string;
}

function parseUrls(source: string): ParsedUrl[] {
  const seen = new Map<string, ParsedUrl>();
  for (const m of source.matchAll(URL_RE)) {
    if (seen.has(m[0])) continue;
    seen.set(m[0], {
      full: m[0],
      slashedBarcode: m[1],
      barcode: m[1].replace(/\//g, ""),
      lang: m[2],
      rev: m[3],
    });
  }
  return [...seen.values()];
}

interface OBFImageEntry {
  rev?: string | number;
  sizes?: Record<string, unknown>;
}

async function fetchProduct(
  barcode: string,
): Promise<Record<string, OBFImageEntry> | null> {
  const url = `https://world.openbeautyfacts.org/api/v2/product/${barcode}.json?fields=images,code,status`;
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "skinscreen-refresh-obf-images/1.0 (https://github.com/skinscreen)",
    },
  });
  if (!res.ok) return null;
  const json = (await res.json()) as {
    status?: number;
    product?: { images?: Record<string, OBFImageEntry> };
  };
  if (json.status !== 1 || !json.product?.images) return null;
  return json.product.images;
}

async function urlOk(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, { method: "HEAD" });
    return res.ok;
  } catch {
    return false;
  }
}

function pickFrontKey(
  images: Record<string, OBFImageEntry>,
  preferLang: string,
): { key: string; rev: string } | null {
  const preferred = `front_${preferLang}`;
  const candidates = [
    preferred,
    ...Object.keys(images).filter(
      (k) => k.startsWith("front_") && k !== preferred,
    ),
  ];
  for (const key of candidates) {
    const entry = images[key];
    if (!entry) continue;
    const rev = entry.rev != null ? String(entry.rev) : null;
    if (!rev) continue;
    if (entry.sizes && !("400" in entry.sizes)) continue;
    return { key, rev };
  }
  return null;
}

async function main() {
  const source = await readFile(TARGET, "utf8");
  const urls = parseUrls(source);
  console.log(`Found ${urls.length} unique OBF URLs in ${TARGET}.`);

  let updated = source;
  let changes = 0;
  let failures = 0;

  for (const u of urls) {
    const images = await fetchProduct(u.barcode);
    if (!images) {
      console.error(`x ${u.barcode}: API lookup failed`);
      failures++;
      await new Promise((r) => setTimeout(r, 200));
      continue;
    }
    const picked = pickFrontKey(images, u.lang);
    if (!picked) {
      console.error(`x ${u.barcode}: no usable front image in OBF response`);
      failures++;
      await new Promise((r) => setTimeout(r, 200));
      continue;
    }
    const newUrl = `https://images.openbeautyfacts.org/images/products/${u.slashedBarcode}${picked.key}.${picked.rev}.400.jpg`;
    const ok = await urlOk(newUrl);
    if (!ok) {
      console.error(
        `x ${u.barcode}: resolved URL returned non-200 (${newUrl})`,
      );
      failures++;
      await new Promise((r) => setTimeout(r, 200));
      continue;
    }
    if (newUrl === u.full) {
      console.log(`= ${u.barcode}: already current`);
    } else {
      console.log(`> ${u.barcode}: ${u.full}\n            -> ${newUrl}`);
      updated = updated.split(u.full).join(newUrl);
      changes++;
    }
    // Be polite to the volunteer-run OBF API.
    await new Promise((r) => setTimeout(r, 200));
  }

  if (changes > 0) {
    await writeFile(TARGET, updated, "utf8");
    console.log(`\nWrote ${changes} URL update(s) to ${TARGET}`);
  } else {
    console.log(`\nNo URL changes needed.`);
  }

  if (failures > 0) {
    console.error(
      `\n${failures} URL(s) could not be resolved or verified. Investigate before merging.`,
    );
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
