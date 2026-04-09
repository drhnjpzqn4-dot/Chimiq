import { db, cosingIngredientsTable } from "@workspace/db";
import { sql } from "drizzle-orm";
import { parse as parseCsv } from "csv-parse";
import { Readable } from "stream";

const COSING_CSV_URLS = [
  "https://ec.europa.eu/growth/tools-databases/cosing/rest/ingredients/csv",
  "https://data.europa.eu/api/hub/store/data/cosmetic-ingredients-cosing.csv",
];

type RestrictionStatus =
  | "banned"
  | "restricted"
  | "permitted"
  | "preservative"
  | "colorant"
  | "uv_filter"
  | "other";

interface CosIngRow {
  inciName: string;
  casNumber: string | null;
  ecNumber: string | null;
  functions: string | null;
  restrictionStatus: RestrictionStatus;
  annexReference: string | null;
  restrictionDescription: string | null;
}

function extractAnnexNumbers(text: string): string[] {
  const matches = text.match(/annex\s+([ivxlc]+)/gi) ?? [];
  return matches.map((m) => m.replace(/^annex\s+/i, "").toUpperCase().trim());
}

function mapRestrictionStatus(annexRef: string | undefined, rawStatus: string | undefined): RestrictionStatus {
  const annexNums = extractAnnexNumbers(annexRef ?? "");
  const status = (rawStatus ?? "").toLowerCase();

  for (const num of annexNums) {
    if (num === "II") return "banned";
    if (num === "III") return "restricted";
    if (num === "V") return "preservative";
    if (num === "IV") return "colorant";
    if (num === "VI") return "uv_filter";
  }

  if (status.includes("prohibit") || status.includes("banned")) return "banned";
  if (status.includes("restrict")) return "restricted";
  if (status.includes("preserv")) return "preservative";
  if (status.includes("colorant") || status.includes("colour")) return "colorant";
  if (status.includes("uv filter") || status.includes("sunscreen")) return "uv_filter";
  if (status.includes("permit") || status.includes("allow")) return "permitted";

  return "other";
}

async function parseCosIngCsvText(csvText: string): Promise<CosIngRow[]> {
  return new Promise((resolve, reject) => {
    const results: CosIngRow[] = [];
    const stream = Readable.from([csvText]);

    stream
      .pipe(
        parseCsv({
          columns: true,
          skip_empty_lines: true,
          relax_column_count: true,
          delimiter: ";",
          trim: true,
          bom: true,
        }),
      )
      .on("data", (row: Record<string, string>) => {
        const findField = (...keys: string[]): string | null => {
          for (const key of keys) {
            const found = Object.keys(row).find(
              (k) => k.toLowerCase().trim() === key.toLowerCase(),
            );
            if (found && row[found]?.trim()) return row[found].trim();
          }
          for (const key of keys) {
            const found = Object.keys(row).find((k) =>
              k.toLowerCase().includes(key.toLowerCase()),
            );
            if (found && row[found]?.trim()) return row[found].trim();
          }
          return null;
        };

        const inciName = findField("inci name", "inci", "name");
        if (!inciName || inciName.length < 2) return;

        const annexRef = findField("annex", "ref", "restriction ref");
        const rawStatus = findField("status", "type", "restriction type");

        results.push({
          inciName: inciName.toUpperCase(),
          casNumber: findField("cas no", "cas number", "cas"),
          ecNumber: findField("ec no", "ec number", "einecs"),
          functions: findField("function", "cosing function", "functions"),
          restrictionStatus: mapRestrictionStatus(annexRef ?? undefined, rawStatus ?? undefined),
          annexReference: annexRef,
          restrictionDescription: findField("description", "condition", "remark"),
        });
      })
      .on("end", () => resolve(results))
      .on("error", reject);
  });
}

async function fetchCosIngCsv(): Promise<CosIngRow[]> {
  for (const url of COSING_CSV_URLS) {
    console.log(`Trying CosIng CSV from: ${url}`);
    try {
      const res = await fetch(url, {
        signal: AbortSignal.timeout(30_000),
        headers: { "User-Agent": "SkinScreen/1.0 (admin seed)", Accept: "text/csv,*/*" },
      });

      if (!res.ok) {
        console.log(`  → HTTP ${res.status}, trying next URL`);
        continue;
      }

      const text = await res.text();
      if (!text || text.trim().startsWith("<") || text.trim().startsWith("{")) {
        console.log(`  → Non-CSV response, trying next URL`);
        continue;
      }

      console.log(`  → Got ${text.length} bytes, parsing...`);
      const rows = await parseCosIngCsvText(text);
      if (rows.length > 0) {
        console.log(`  → Parsed ${rows.length} ingredients`);
        return rows;
      }
      console.log(`  → Parsed 0 rows, trying next URL`);
    } catch (err) {
      console.log(`  → Fetch/parse error: ${err instanceof Error ? err.message : err}`);
    }
  }
  return [];
}

const EMBEDDED_SEED: CosIngRow[] = [
  { inciName: "RETINOL", casNumber: "68-26-8", ecNumber: null, functions: "skin conditioning", restrictionStatus: "restricted", annexReference: "Annex III", restrictionDescription: "Max 0.3% in face products; prohibited in body lotions; not for children under 3" },
  { inciName: "RETINOIC ACID", casNumber: "302-79-4", ecNumber: null, functions: "skin conditioning", restrictionStatus: "banned", annexReference: "Annex II", restrictionDescription: "Prohibited in cosmetic products" },
  { inciName: "TRETINOIN", casNumber: "302-79-4", ecNumber: null, functions: "skin conditioning", restrictionStatus: "banned", annexReference: "Annex II", restrictionDescription: "Prohibited in cosmetic products" },
  { inciName: "RETINAL", casNumber: "116-31-4", ecNumber: null, functions: "skin conditioning", restrictionStatus: "restricted", annexReference: "Annex III", restrictionDescription: "Max 0.05% leave-on; not for children under 3 years" },
  { inciName: "HYDROQUINONE", casNumber: "123-31-9", ecNumber: null, functions: "skin conditioning, antioxidant", restrictionStatus: "banned", annexReference: "Annex II", restrictionDescription: "Prohibited in cosmetic products" },
  { inciName: "MERCURY", casNumber: null, ecNumber: null, functions: "preservative", restrictionStatus: "banned", annexReference: "Annex II", restrictionDescription: "Prohibited in cosmetic products" },
  { inciName: "LEAD ACETATE", casNumber: "301-04-2", ecNumber: null, functions: null, restrictionStatus: "banned", annexReference: "Annex II", restrictionDescription: "Prohibited in cosmetic products" },
  { inciName: "FORMALDEHYDE", casNumber: "50-00-0", ecNumber: null, functions: "preservative", restrictionStatus: "restricted", annexReference: "Annex III", restrictionDescription: "Max 0.2% (oral hygiene 0.1%); label 'contains formaldehyde' if >0.05%" },
  { inciName: "METHYLISOTHIAZOLINONE", casNumber: "2682-20-4", ecNumber: null, functions: "preservative", restrictionStatus: "restricted", annexReference: "Annex III", restrictionDescription: "Leave-on: prohibited. Rinse-off: max 0.0015% (15 ppm)" },
  { inciName: "METHYLCHLOROISOTHIAZOLINONE", casNumber: "26172-55-4", ecNumber: null, functions: "preservative", restrictionStatus: "restricted", annexReference: "Annex V", restrictionDescription: "Rinse-off only: max 0.0015% as 3:1 mixture with methylisothiazolinone" },
  { inciName: "PHENOXYETHANOL", casNumber: "122-99-6", ecNumber: null, functions: "preservative", restrictionStatus: "preservative", annexReference: "Annex V", restrictionDescription: "Max 1.0%; not for nappy area of children under 3 years" },
  { inciName: "BENZOPHENONE-3", casNumber: "131-57-7", ecNumber: null, functions: "uv absorber", restrictionStatus: "restricted", annexReference: "Annex VI", restrictionDescription: "Max 6% (10% as photoprotector); must label 'contains oxybenzone'" },
  { inciName: "OXYBENZONE", casNumber: "131-57-7", ecNumber: null, functions: "uv absorber", restrictionStatus: "restricted", annexReference: "Annex VI", restrictionDescription: "Max 6%; must label 'contains oxybenzone'" },
  { inciName: "PROPYLPARABEN", casNumber: "94-13-3", ecNumber: null, functions: "preservative", restrictionStatus: "restricted", annexReference: "Annex V", restrictionDescription: "Max 0.14% as acid; prohibited in leave-on products for nappy area of children under 3" },
  { inciName: "BUTYLPARABEN", casNumber: "94-26-8", ecNumber: null, functions: "preservative", restrictionStatus: "restricted", annexReference: "Annex V", restrictionDescription: "Max 0.14% as acid; prohibited in leave-on products for nappy area of children under 3" },
  { inciName: "METHYLPARABEN", casNumber: "99-76-3", ecNumber: null, functions: "preservative", restrictionStatus: "preservative", annexReference: "Annex V", restrictionDescription: "Max 0.4% as acid (individually) or 0.8% for mixtures of esters" },
  { inciName: "ETHYLPARABEN", casNumber: "120-47-8", ecNumber: null, functions: "preservative", restrictionStatus: "preservative", annexReference: "Annex V", restrictionDescription: "Max 0.4% as acid (individually) or 0.8% for mixtures of esters" },
  { inciName: "DMDM HYDANTOIN", casNumber: "6440-58-0", ecNumber: null, functions: "preservative, formaldehyde releaser", restrictionStatus: "restricted", annexReference: "Annex V", restrictionDescription: "Max 0.6%; formaldehyde-releasing; label if >0.05% formaldehyde released" },
  { inciName: "QUATERNIUM-15", casNumber: "51229-78-8", ecNumber: null, functions: "preservative", restrictionStatus: "restricted", annexReference: "Annex V", restrictionDescription: "Max 0.2%; formaldehyde-releasing preservative" },
  { inciName: "IMIDAZOLIDINYL UREA", casNumber: "39236-46-9", ecNumber: null, functions: "preservative", restrictionStatus: "preservative", annexReference: "Annex V", restrictionDescription: "Max 0.6%; releases formaldehyde" },
  { inciName: "DIAZOLIDINYL UREA", casNumber: "78491-02-8", ecNumber: null, functions: "preservative", restrictionStatus: "preservative", annexReference: "Annex V", restrictionDescription: "Max 0.5%; releases formaldehyde" },
  { inciName: "KOJIC ACID", casNumber: "501-30-4", ecNumber: null, functions: "skin lightening", restrictionStatus: "restricted", annexReference: "Annex III", restrictionDescription: "Max 1% in face care and hand care products" },
  { inciName: "SALICYLIC ACID", casNumber: "69-72-7", ecNumber: null, functions: "preservative, keratolytic", restrictionStatus: "restricted", annexReference: "Annex III", restrictionDescription: "Leave-on body lotions 2%; rinse-off hair/skin 3%; not for children under 3 (except shampoos)" },
  { inciName: "GLYCOLIC ACID", casNumber: "79-14-1", ecNumber: null, functions: "exfoliant", restrictionStatus: "restricted", annexReference: "Annex III", restrictionDescription: "AHA: max 6% leave-on pH ≥3.5; 10% rinse-off; sun protection warning required" },
  { inciName: "LACTIC ACID", casNumber: "50-21-5", ecNumber: null, functions: "buffering agent, exfoliant", restrictionStatus: "restricted", annexReference: "Annex III", restrictionDescription: "AHA restrictions: max 6% leave-on pH ≥3.5; sun protection warning required" },
  { inciName: "BENZOYL PEROXIDE", casNumber: "94-36-0", ecNumber: null, functions: "antimicrobial", restrictionStatus: "restricted", annexReference: "Annex III", restrictionDescription: "For hair bleaching only in professional use" },
  { inciName: "TRICLOSAN", casNumber: "3380-34-5", ecNumber: null, functions: "preservative", restrictionStatus: "restricted", annexReference: "Annex V", restrictionDescription: "Max 0.3% in toothpaste, hand soap, body soap/shower gels, deodorants, face powders, blemish concealers only" },
  { inciName: "BHA", casNumber: "25013-16-5", ecNumber: null, functions: "antioxidant", restrictionStatus: "restricted", annexReference: "Annex III", restrictionDescription: "Max 0.5%; classified as possible endocrine disruptor; under review" },
  { inciName: "BUTYLATED HYDROXYANISOLE", casNumber: "25013-16-5", ecNumber: null, functions: "antioxidant", restrictionStatus: "restricted", annexReference: "Annex III", restrictionDescription: "Max 0.5%; possible endocrine disruptor; restricted in leave-on products" },
  { inciName: "4-METHYLBENZYLIDENE CAMPHOR", casNumber: "36861-47-9", ecNumber: null, functions: "uv absorber", restrictionStatus: "restricted", annexReference: "Annex VI", restrictionDescription: "Max 4%; possible endocrine disruptor, under SCCS review" },
  { inciName: "ETHYLHEXYL METHOXYCINNAMATE", casNumber: "5466-77-3", ecNumber: null, functions: "uv absorber", restrictionStatus: "uv_filter", annexReference: "Annex VI", restrictionDescription: "Max 10%; possible endocrine effects at high doses under investigation" },
  { inciName: "HOMOSALATE", casNumber: "118-56-9", ecNumber: null, functions: "uv absorber", restrictionStatus: "restricted", annexReference: "Annex VI", restrictionDescription: "Max 7.34% (reduced from 10% in 2022); endocrine disruption concern" },
  { inciName: "SODIUM LAURYL SULFATE", casNumber: "151-21-3", ecNumber: null, functions: "surfactant, emulsifier", restrictionStatus: "other", annexReference: null, restrictionDescription: "Permitted; may cause irritation at high concentrations; safe in rinse-off products" },
  { inciName: "PARFUM", casNumber: null, ecNumber: null, functions: "fragrance", restrictionStatus: "other", annexReference: null, restrictionDescription: "26 identified fragrance allergens must be disclosed above threshold (0.01% leave-on, 0.1% rinse-off)" },
  { inciName: "FRAGRANCE", casNumber: null, ecNumber: null, functions: "fragrance", restrictionStatus: "other", annexReference: null, restrictionDescription: "26 identified fragrance allergens must be disclosed above threshold (0.01% leave-on, 0.1% rinse-off)" },
  { inciName: "LIMONENE", casNumber: "5989-27-5", ecNumber: null, functions: "fragrance", restrictionStatus: "restricted", annexReference: "Annex III", restrictionDescription: "Must be indicated in ingredient list; known fragrance allergen" },
  { inciName: "LINALOOL", casNumber: "78-70-6", ecNumber: null, functions: "fragrance", restrictionStatus: "restricted", annexReference: "Annex III", restrictionDescription: "Must be indicated in ingredient list; known fragrance allergen" },
  { inciName: "EUGENOL", casNumber: "97-53-0", ecNumber: null, functions: "fragrance", restrictionStatus: "restricted", annexReference: "Annex III", restrictionDescription: "Must be listed above 0.01% leave-on / 0.1% rinse-off; known allergen" },
  { inciName: "CINNAMAL", casNumber: "104-55-2", ecNumber: null, functions: "fragrance", restrictionStatus: "restricted", annexReference: "Annex III", restrictionDescription: "Must be listed above threshold; classified allergen" },
  { inciName: "COUMARIN", casNumber: "91-64-5", ecNumber: null, functions: "fragrance", restrictionStatus: "restricted", annexReference: "Annex III", restrictionDescription: "Max 0.015% leave-on / 0.1% rinse-off; known allergen" },
  { inciName: "TITANIUM DIOXIDE", casNumber: "13463-67-7", ecNumber: null, functions: "uv absorber, colorant", restrictionStatus: "restricted", annexReference: "Annex IV / Annex VI", restrictionDescription: "Nano form: authorised in sunscreens; NOT authorised in spray/powder applications due to inhalation risk" },
  { inciName: "ZINC OXIDE", casNumber: "1314-13-2", ecNumber: null, functions: "uv absorber", restrictionStatus: "uv_filter", annexReference: "Annex VI", restrictionDescription: "Max 25%; nano form authorised for face/skin sunscreen use only, not spray products" },
  { inciName: "NIACINAMIDE", casNumber: "98-92-0", ecNumber: null, functions: "skin conditioning, antioxidant", restrictionStatus: "permitted", annexReference: null, restrictionDescription: "No restrictions; generally regarded as well-tolerated" },
  { inciName: "ASCORBIC ACID", casNumber: "50-81-7", ecNumber: null, functions: "antioxidant", restrictionStatus: "permitted", annexReference: null, restrictionDescription: "No restrictions; widely used vitamin C form" },
  { inciName: "HYALURONIC ACID", casNumber: "9004-61-9", ecNumber: null, functions: "humectant, skin conditioning", restrictionStatus: "permitted", annexReference: null, restrictionDescription: "No restrictions; well-tolerated humectant" },
];

async function upsertBatch(rows: CosIngRow[]): Promise<number> {
  if (rows.length === 0) return 0;

  await db
    .insert(cosingIngredientsTable)
    .values(
      rows.map((row) => ({
        inciName: row.inciName,
        casNumber: row.casNumber,
        ecNumber: row.ecNumber,
        functions: row.functions,
        restrictionStatus: row.restrictionStatus,
        annexReference: row.annexReference,
        restrictionDescription: row.restrictionDescription,
      })),
    )
    .onConflictDoUpdate({
      target: cosingIngredientsTable.inciName,
      set: {
        casNumber: sql`EXCLUDED.cas_number`,
        ecNumber: sql`EXCLUDED.ec_number`,
        functions: sql`EXCLUDED.functions`,
        restrictionStatus: sql`EXCLUDED.restriction_status`,
        annexReference: sql`EXCLUDED.annex_reference`,
        restrictionDescription: sql`EXCLUDED.restriction_description`,
        syncedAt: sql`NOW()`,
      },
    });

  return rows.length;
}

async function seedCosing() {
  console.log("Starting CosIng seed...");

  const BATCH_SIZE = 100;
  let totalUpserted = 0;

  const csvRows = await fetchCosIngCsv();

  if (csvRows.length > 0) {
    console.log(`Parsed ${csvRows.length} ingredients from EU CosIng CSV`);

    for (let i = 0; i < csvRows.length; i += BATCH_SIZE) {
      totalUpserted += await upsertBatch(csvRows.slice(i, i + BATCH_SIZE));
      process.stdout.write(`\rUpserted ${totalUpserted}/${csvRows.length} from CSV...`);
    }
    console.log();

    const csvNames = new Set(csvRows.map((r) => r.inciName));
    const additionalEmbedded = EMBEDDED_SEED.filter((r) => !csvNames.has(r.inciName));
    if (additionalEmbedded.length > 0) {
      console.log(`Supplementing with ${additionalEmbedded.length} embedded entries not in CSV`);
      for (let i = 0; i < additionalEmbedded.length; i += BATCH_SIZE) {
        totalUpserted += await upsertBatch(additionalEmbedded.slice(i, i + BATCH_SIZE));
      }
    }
  } else {
    console.log(`CosIng CSV unavailable — using ${EMBEDDED_SEED.length} embedded authoritative entries`);

    for (let i = 0; i < EMBEDDED_SEED.length; i += BATCH_SIZE) {
      totalUpserted += await upsertBatch(EMBEDDED_SEED.slice(i, i + BATCH_SIZE));
      process.stdout.write(`\rUpserted ${totalUpserted}/${EMBEDDED_SEED.length}...`);
    }
    console.log();
  }

  console.log(`Done. Seeded/updated ${totalUpserted} CosIng ingredient entries.`);
}

seedCosing().catch((err) => {
  console.error("CosIng seed failed:", err);
  process.exit(1);
});
