import { pgTable, text, timestamp, boolean } from "drizzle-orm/pg-core";

export const cachedPubchemTable = pgTable("cached_pubchem", {
  lookupKey: text("lookup_key").primaryKey(),
  cid: text("cid"),
  iupacName: text("iupac_name"),
  molecularFormula: text("molecular_formula"),
  ghsHazardCodes: text("ghs_hazard_codes"),
  ghsHazardStatements: text("ghs_hazard_statements"),
  knownToxicityFlags: text("known_toxicity_flags"),
  isCarcinogen: boolean("is_carcinogen").default(false),
  isReproductiveToxicant: boolean("is_reproductive_toxicant").default(false),
  isMutagen: boolean("is_mutagen").default(false),
  isSkinSensitiser: boolean("is_skin_sensitiser").default(false),
  isAcutelyToxic: boolean("is_acutely_toxic").default(false),
  rawSummary: text("raw_summary"),
  cachedAt: timestamp("cached_at", { withTimezone: true }).notNull().defaultNow(),
});

export type CachedPubchem = typeof cachedPubchemTable.$inferSelect;
export type InsertCachedPubchem = typeof cachedPubchemTable.$inferInsert;
