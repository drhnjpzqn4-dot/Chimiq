import { db, cachedProductsTable } from "@workspace/db";
import { sql } from "drizzle-orm";

const OBF_CSV_URL =
  "https://static.openbeautyfacts.org/data/en.openbeautyfacts.org.products.csv.gz";

async function seedProductsCache() {
  console.log("Fetching Open Beauty Facts product data...");
  console.log("URL:", OBF_CSV_URL);
  console.log("This may take a few minutes...");

  try {
    const { createGunzip } = await import("zlib");
    const { Readable } = await import("stream");

    const response = await fetch(OBF_CSV_URL, {
      headers: { "User-Agent": "SkinScreen/1.0 (admin seed)" },
      signal: AbortSignal.timeout(120_000),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const { parse } = await import("csv-parse");

    const gunzip = createGunzip();
    const nodeStream = Readable.fromWeb(response.body as import("stream/web").ReadableStream);
    const csvStream = nodeStream.pipe(gunzip);

    const parser = csvStream.pipe(
      parse({
        columns: true,
        skip_empty_lines: true,
        relax_column_count: true,
        delimiter: "\t",
      }),
    );

    let count = 0;
    const BATCH_SIZE = 100;
    const MAX_PRODUCTS = 5000;
    const batch: Array<typeof cachedProductsTable.$inferInsert> = [];

    for await (const row of parser) {
      if (count >= MAX_PRODUCTS) break;

      const barcode = String(row["code"] ?? "").trim();
      const productName = String(row["product_name"] ?? "").trim();
      const ingredients =
        String(row["ingredients_text_en"] ?? row["ingredients_text"] ?? "").trim();
      const brand = String(row["brands"] ?? "").trim();

      if (!barcode || !/^[0-9]{6,14}$/.test(barcode)) continue;
      if (!productName || !ingredients || ingredients.length < 10) continue;

      batch.push({
        barcode,
        productName: productName.slice(0, 500),
        brand: brand.slice(0, 200),
        ingredients: ingredients.slice(0, 10000),
        imageUrl: null,
      });

      if (batch.length >= BATCH_SIZE) {
        await db
          .insert(cachedProductsTable)
          .values(batch)
          .onConflictDoNothing();
        count += batch.length;
        batch.length = 0;
        process.stdout.write(`\rSeeded ${count} products...`);
      }
    }

    if (batch.length > 0) {
      await db.insert(cachedProductsTable).values(batch).onConflictDoNothing();
      count += batch.length;
    }

    const result = await db.execute(
      sql`SELECT COUNT(*) as total FROM cached_products`,
    );
    const { total } = (result.rows[0] ?? { total: "0" }) as { total: string };

    console.log(`\nDone! Seeded ${count} products. Total in cache: ${total}`);
  } catch (err) {
    console.error("Error seeding products cache:", err);
    process.exit(1);
  }
}

seedProductsCache();
