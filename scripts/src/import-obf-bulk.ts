import { createReadStream, createWriteStream, existsSync, unlink } from "node:fs";
import { pipeline } from "node:stream/promises";
import { createGunzip } from "node:zlib";
import https from "node:https";
import { createClient } from "@supabase/supabase-js";
import { parse } from "csv-parse";

const COSMETIC_CATEGORY_TAGS = [
  "en:make-up",
  "en:makeup",
  "en:face-makeup",
  "en:foundations",
  "en:face-foundations",
  "en:concealer",
  "en:concealers",
  "en:face-powder",
  "en:blush",
  "en:bronzer",
  "en:highlighter",
  "en:primers",
  "en:face-primer",
  "en:eye-makeup",
  "en:eye-shadows",
  "en:eyeshadow",
  "en:eyeliners",
  "en:eyeliner",
  "en:mascaras",
  "en:mascara",
  "en:eyebrow-makeup",
  "en:lip-products",
  "en:lipsticks",
  "en:lip-gloss",
  "en:lip-liner",
  "en:lip-balm",
  "en:nail-products",
  "en:nail-polish",
  "en:nail-care",
  "en:makeup-removers",
  "en:eye-makeup-remover",
  "en:micellar-water",
  "en:setting-sprays",
  "en:face-mist",
] as const;

const SUPABASE_URL = process.env["SUPABASE_URL"];
const SUPABASE_SERVICE_ROLE_KEY = process.env["SUPABASE_SERVICE_ROLE_KEY"];

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set.");
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const OBF_DUMP_URL =
  "https://world.openbeautyfacts.org/data/en.openbeautyfacts.org.products.csv.gz";
const DOWNLOAD_PATH = "/tmp/obf-products.csv.gz";
const CSV_PATH = "/tmp/obf-products.csv";
const BATCH_SIZE = 100;

const SKINCARE_INCLUDE_TERMS = [
  "face cream", "facial cream", "moisturizer", "moisturiser",
  "face wash", "facial wash", "cleanser", "cleansing",
  "serum", "face oil", "facial oil", "eye cream", "eye serum",
  "toner", "essence", "lotion", "face lotion",
  "sunscreen", "sun cream", "spf", "sun protection",
  "foundation", "bb cream", "cc cream", "primer",
  "concealer", "blush", "highlighter", "contour",
  "lipstick", "lip balm", "lip gloss", "lip care",
  "face mask", "sheet mask", "peel", "exfoliant", "exfoliator",
  "micellar", "makeup remover", "face wipe",
  "retinol", "vitamin c", "hyaluronic", "niacinamide",
  "body lotion", "body cream", "body oil", "hand cream",
  "day cream", "night cream", "anti-aging", "anti-ageing",
  "skincare", "skin care",
];

function detectProductType(categories: string): "skincare" | "haircare" | "cosmetics" | "other" {
  const lower = categories.toLowerCase();
  if (/hair|shampoo|conditioner|hair dye|hair color/.test(lower)) return "haircare";
  if (COSMETIC_CATEGORY_TAGS.some((tag) => lower.includes(tag))) return "cosmetics";
  if (SKINCARE_INCLUDE_TERMS.some((term) => lower.includes(term))) return "skincare";
  return "other";
}

const COSMETIC_CATEGORIES = [...COSMETIC_CATEGORY_TAGS];

const EXCLUDE_TERMS = [
  "hair", "shampoo", "conditioner", "hair dye", "hair color",
  "toothpaste", "dental", "oral care", "mouthwash",
  "deodorant", "antiperspirant",
  "food", "beverage", "snack", "supplement",
  "baby food", "infant",
  "shower gel", "body wash", "soap bar",
  "shaving", "razor",
];

interface OBFRow {
  code?: string;
  product_name?: string;
  brands?: string;
  categories?: string;
  categories_en?: string;
  categories_tags?: string;
  ingredients_text?: string;
  ingredients_text_en?: string;
  image_front_url?: string;
  image_url?: string;
  quantity?: string;
  labels_en?: string;
}

interface CachedProductRecord {
  barcode: string;
  product_name: string;
  brand: string;
  ingredients: string;
  image_url: string | null;
  source: "obf";
  quantity: string | null;
  categories: string | null;
  labels: string | null;
  product_type: string;
  cached_at: string;
}

function categoryBlob(row: OBFRow): string {
  return [row.categories_tags, row.categories_en, row.categories].filter(Boolean).join(",");
}

function shouldInclude(row: OBFRow): boolean {
  const lower = categoryBlob(row).toLowerCase();
  if (EXCLUDE_TERMS.some((term) => lower.includes(term))) return false;
  if (COSMETIC_CATEGORIES.some((tag) => lower.includes(tag))) return true;
  return SKINCARE_INCLUDE_TERMS.some((term) => lower.includes(term));
}

function normalizeBarcode(value: string | undefined): string {
  return (value ?? "").trim();
}

function trimOrNull(value: string | undefined, maxLength: number): string | null {
  const trimmed = (value ?? "").trim();
  return trimmed ? trimmed.slice(0, maxLength) : null;
}

async function downloadFile(url: string, dest: string, redirects = 0): Promise<void> {
  if (existsSync(dest)) {
    console.log(`[download] Fil finns redan: ${dest}`);
    return;
  }
  if (redirects > 5) {
    throw new Error(`Too many redirects while downloading ${url}`);
  }

  console.log(`[download] Laddar ned ${url}...`);
  await new Promise<void>((resolve, reject) => {
    const request = https.get(
      url,
      { headers: { "User-Agent": "Chimiq-OBF-Bulk-Import/1.0" } },
      (res) => {
        const location = res.headers.location;
        if (
          res.statusCode &&
          res.statusCode >= 300 &&
          res.statusCode < 400 &&
          location
        ) {
          res.resume();
          downloadFile(new URL(location, url).toString(), dest, redirects + 1)
            .then(resolve)
            .catch(reject);
          return;
        }

        if (!res.statusCode || res.statusCode < 200 || res.statusCode >= 300) {
          res.resume();
          reject(new Error(`Download failed with HTTP ${res.statusCode ?? "unknown"}`));
          return;
        }

        const file = createWriteStream(dest);
        res.pipe(file);
        file.on("finish", () => {
          file.close((err) => {
            if (err) reject(err);
            else resolve();
          });
        });
        file.on("error", (err) => {
          unlink(dest, () => undefined);
          reject(err);
        });
      },
    );
    request.on("error", (err) => {
      unlink(dest, () => undefined);
      reject(err);
    });
  });
}

async function decompressFile(src: string, dest: string): Promise<void> {
  if (existsSync(dest)) {
    console.log(`[decompress] Fil finns redan: ${dest}`);
    return;
  }
  console.log("[decompress] Packar upp...");
  await pipeline(createReadStream(src), createGunzip(), createWriteStream(dest));
  console.log(`[decompress] Klar: ${dest}`);
}

function mapRow(row: OBFRow): CachedProductRecord | null {
  const barcode = normalizeBarcode(row.code);
  const productName = (row.product_name ?? "").trim().slice(0, 500);
  const brand = (row.brands ?? "").split(",")[0]?.trim().slice(0, 200) ?? "";
  const ingredients = (row.ingredients_text_en ?? row.ingredients_text ?? "")
    .trim()
    .slice(0, 10000);

  if (!/^[0-9]{8,14}$/.test(barcode)) return null;
  if (productName.length < 2) return null;
  if (ingredients.length < 10) return null;

  const categories = trimOrNull(row.categories_en ?? row.categories, 500);
  const categorySource = categoryBlob(row) || categories || "";

  return {
    barcode,
    product_name: productName,
    brand,
    ingredients,
    image_url: trimOrNull(row.image_front_url ?? row.image_url, 1000),
    source: "obf",
    quantity: trimOrNull(row.quantity, 100),
    categories,
    labels: trimOrNull(row.labels_en, 300),
    product_type: detectProductType(categorySource),
    cached_at: new Date().toISOString(),
  };
}

async function importBatch(rows: OBFRow[]): Promise<number> {
  const records = rows.flatMap((row) => {
    const mapped = mapRow(row);
    return mapped ? [mapped] : [];
  });

  if (records.length === 0) return 0;

  const { error } = await supabase
    .from("cached_products")
    .upsert(records, {
      onConflict: "barcode",
      ignoreDuplicates: false,
    });

  if (error) {
    console.error("[import] Batch-fel:", error.message);
    return 0;
  }
  return records.length;
}

async function testSupabaseConnection(): Promise<void> {
  console.log("[supabase] Testar anslutning...");
  const { error } = await supabase
    .from("cached_products")
    .select("barcode")
    .limit(1);
  if (error) {
    throw new Error(`Supabase-anslutning misslyckades: ${error.message}`);
  }
  console.log("[supabase] Anslutning OK ✓");
}

async function main(): Promise<void> {
  console.log("=== OBF Bulk Import ===");
  console.log(`Supabase: ${SUPABASE_URL}`);

  await testSupabaseConnection();

  await downloadFile(OBF_DUMP_URL, DOWNLOAD_PATH);
  await decompressFile(DOWNLOAD_PATH, CSV_PATH);

  let totalParsed = 0;
  let totalImported = 0;
  let totalSkipped = 0;
  let nextProgressLog = 1000;
  let batch: OBFRow[] = [];

  const parser = createReadStream(CSV_PATH).pipe(
    parse({
      columns: true,
      delimiter: "\t",
      relax_column_count: true,
      relax_quotes: true,
      skip_records_with_error: true,
      skip_empty_lines: true,
      bom: true,
    }),
  );

  for await (const row of parser as AsyncIterable<OBFRow>) {
    totalParsed++;

    if (!shouldInclude(row)) {
      totalSkipped++;
      continue;
    }

    batch.push(row);

    if (batch.length >= BATCH_SIZE) {
      const imported = await importBatch(batch);
      totalImported += imported;
      totalSkipped += batch.length - imported;
      batch = [];

      if (totalImported >= nextProgressLog) {
        console.log(
          `[progress] Parsade: ${totalParsed.toLocaleString()} | ` +
            `Importerade: ${totalImported.toLocaleString()} | ` +
            `Hoppade över: ${totalSkipped.toLocaleString()}`,
        );
        nextProgressLog += 1000;
      }
    }
  }

  if (batch.length > 0) {
    const imported = await importBatch(batch);
    totalImported += imported;
    totalSkipped += batch.length - imported;
  }

  console.log("\n=== Klar ===");
  console.log(`Totalt parsade rader: ${totalParsed.toLocaleString()}`);
  console.log(`Importerade till DB: ${totalImported.toLocaleString()}`);
  console.log(`Hoppade över (fel kategori/data): ${totalSkipped.toLocaleString()}`);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
