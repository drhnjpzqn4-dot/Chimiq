#!/usr/bin/env tsx
/**
 * Backfill saknade image_url i cached_products från OBF API v3.
 *
 * Kör lokalt:
 *   cd ~/PiasVentures/chimiq-code
 *   pnpm --filter @workspace/scripts run backfill:obf-images
 *
 * Kräver miljövariabler (samma som import-obf-bulk):
 *   SUPABASE_URL=https://wzzoipnaucqxnasubljk.supabase.co
 *   SUPABASE_SERVICE_ROLE_KEY=<service role key>
 */
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env["SUPABASE_URL"];
const SUPABASE_SERVICE_ROLE_KEY = process.env["SUPABASE_SERVICE_ROLE_KEY"];

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set.");
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const OBF_FIELDS = "image_front_url,image_front_small_url";
const BATCH_SIZE = 5;
const BATCH_DELAY_MS = 300;
const PAGE_SIZE = 1000;
const USER_AGENT = "Chimiq-OBF-Image-Backfill/1.0 (chimiq.com)";

interface CachedRow {
  barcode: string;
}

interface OBFResponse {
  status?: number | string;
  product?: {
    status?: number;
    image_front_url?: string;
    image_front_small_url?: string;
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isObfHit(data: OBFResponse): boolean {
  if (data.status === 1 || data.status === "success") return true;
  if (data.product && data.product.status === 1) return true;
  return Boolean(data.product?.image_front_url ?? data.product?.image_front_small_url);
}

function pickImageUrl(product: OBFResponse["product"]): string | null {
  if (!product) return null;
  const front = (product.image_front_url ?? "").trim();
  if (front) return front;
  const small = (product.image_front_small_url ?? "").trim();
  return small || null;
}

async function fetchObfImageUrl(barcode: string): Promise<string | null> {
  const url = `https://world.openbeautyfacts.org/api/v3/product/${encodeURIComponent(barcode)}.json?fields=${OBF_FIELDS}`;
  const res = await fetch(url, {
    headers: { "User-Agent": USER_AGENT },
  });

  if (res.status === 404) return null;

  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }

  const data = (await res.json()) as OBFResponse;
  if (!isObfHit(data)) return null;

  return pickImageUrl(data.product);
}

async function fetchRowsWithoutImage(): Promise<CachedRow[]> {
  const rows: CachedRow[] = [];
  let offset = 0;

  while (true) {
    const { data, error } = await supabase
      .from("cached_products")
      .select("barcode")
      .is("image_url", null)
      .not("barcode", "is", null)
      .not("barcode", "like", "CHIMIQ_%")
      .order("barcode")
      .range(offset, offset + PAGE_SIZE - 1);

    if (error) {
      throw new Error(`Supabase select failed: ${error.message}`);
    }

    const page = (data ?? []) as CachedRow[];
    rows.push(...page);

    if (page.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }

  return rows;
}

async function updateImageUrl(barcode: string, imageUrl: string): Promise<void> {
  const { error } = await supabase
    .from("cached_products")
    .update({ image_url: imageUrl })
    .eq("barcode", barcode);

  if (error) {
    throw new Error(error.message);
  }
}

async function processRow(barcode: string, stats: { updated: number; skipped: number; errors: number }) {
  try {
    const imageUrl = await fetchObfImageUrl(barcode);
    if (!imageUrl) {
      console.log(`SKIP ${barcode} — no image`);
      stats.skipped++;
      return;
    }

    await updateImageUrl(barcode, imageUrl);
    console.log(`UPDATE ${barcode} → ${imageUrl}`);
    stats.updated++;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.log(`ERROR ${barcode} — ${message}`);
    stats.errors++;
  }
}

async function main() {
  console.log("[backfill] Hämtar produkter utan image_url...");
  const rows = await fetchRowsWithoutImage();
  const total = rows.length;
  console.log(`[backfill] ${total} produkter att bearbeta.`);

  if (total === 0) {
    console.log("Uppdaterade 0 / 0 produkter. 0 hoppade över. 0 fel.");
    return;
  }

  const stats = { updated: 0, skipped: 0, errors: 0 };

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    await Promise.all(batch.map((row) => processRow(row.barcode, stats)));

    if (i + BATCH_SIZE < rows.length) {
      await sleep(BATCH_DELAY_MS);
    }
  }

  console.log(
    `Uppdaterade ${stats.updated} / ${total} produkter. ${stats.skipped} hoppade över. ${stats.errors} fel.`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
