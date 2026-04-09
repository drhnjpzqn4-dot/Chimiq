import { db, cosingIngredientsTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";

export interface CosingInfo {
  inciName: string;
  restrictionStatus: string;
  annexReference: string | null;
  restrictionDescription: string | null;
  functions: string | null;
}

function normalizeInciName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

export async function getCosingInfo(ingredientName: string): Promise<CosingInfo | null> {
  const normalized = normalizeInciName(ingredientName);

  const [row] = await db
    .select()
    .from(cosingIngredientsTable)
    .where(sql`lower(${cosingIngredientsTable.inciName}) = ${normalized}`)
    .limit(1);

  if (!row) return null;

  return {
    inciName: row.inciName,
    restrictionStatus: row.restrictionStatus,
    annexReference: row.annexReference,
    restrictionDescription: row.restrictionDescription,
    functions: row.functions,
  };
}

export function formatCosingContext(info: CosingInfo | null, ingredientName: string): string {
  if (!info) return "";

  const statusLabel: Record<string, string> = {
    banned: "BANNED (EU Annex II)",
    restricted: "RESTRICTED (EU Annex III — conditions apply)",
    preservative: "Permitted preservative (EU Annex V)",
    colorant: "Permitted colorant (EU Annex IV)",
    uv_filter: "Permitted UV filter (EU Annex VI)",
    permitted: "Permitted under EU Cosmetics Regulation",
    other: "Listed in EU CosIng",
  };

  const status = statusLabel[info.restrictionStatus] ?? info.restrictionStatus;
  let context = `EU CosIng status for ${ingredientName}: ${status}`;

  if (info.annexReference) {
    context += ` [${info.annexReference}]`;
  }

  if (info.restrictionDescription) {
    context += `. Restriction: ${info.restrictionDescription}`;
  }

  if (info.functions) {
    context += `. Function(s): ${info.functions}`;
  }

  return context;
}
