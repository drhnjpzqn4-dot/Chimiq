import { db, cachedPubchemTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";

const PUBCHEM_BASE = "https://pubchem.ncbi.nlm.nih.gov/rest/pug";
const TIMEOUT_MS = 10_000;
const CACHE_TTL_DAYS = 90;

export interface PubChemSafetyData {
  cid: string | null;
  iupacName: string | null;
  molecularFormula: string | null;
  ghsHazardCodes: string[];
  ghsHazardStatements: string[];
  knownToxicityFlags: string[];
  isCarcinogen: boolean;
  isReproductiveToxicant: boolean;
  isMutagen: boolean;
  isSkinSensitiser: boolean;
  isAcutelyToxic: boolean;
  rawSummary: string | null;
}

function normalizeLookupKey(query: string): string {
  return query.trim().toLowerCase().replace(/\s+/g, " ");
}

async function fetchJson(url: string): Promise<unknown> {
  const res = await fetch(url, {
    signal: AbortSignal.timeout(TIMEOUT_MS),
    headers: { "User-Agent": "SkinScreen/1.0 (https://skinscreen.app)" },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function getCidByName(name: string): Promise<string | null> {
  try {
    const url = `${PUBCHEM_BASE}/compound/name/${encodeURIComponent(name)}/cids/JSON`;
    const data = (await fetchJson(url)) as { IdentifierList?: { CID?: number[] } };
    const cids = data?.IdentifierList?.CID;
    return cids && cids.length > 0 ? String(cids[0]) : null;
  } catch {
    return null;
  }
}

async function getCidByCas(cas: string): Promise<string | null> {
  try {
    const url = `${PUBCHEM_BASE}/compound/name/${encodeURIComponent(cas)}/cids/JSON`;
    const data = (await fetchJson(url)) as { IdentifierList?: { CID?: number[] } };
    const cids = data?.IdentifierList?.CID;
    return cids && cids.length > 0 ? String(cids[0]) : null;
  } catch {
    return null;
  }
}

interface GhsClassification {
  GHSHazardCode?: string;
  GHSHazardStatement?: string;
}

interface ClassificationSection {
  TOCHeading?: string;
  Information?: Array<{ Name?: string; Value?: { StringWithMarkup?: Array<{ String?: string }> } }>;
  GHSClassification?: GhsClassification[];
}

async function fetchGhsData(cid: string): Promise<{
  hazardCodes: string[];
  hazardStatements: string[];
}> {
  try {
    const classUrl = `https://pubchem.ncbi.nlm.nih.gov/rest/pug_view/data/compound/${cid}/JSON?heading=GHS+Classification`;
    const data = (await fetchJson(classUrl)) as {
      Record?: {
        Section?: ClassificationSection[];
      };
    };

    const sections = data?.Record?.Section ?? [];
    const hazardCodes: string[] = [];
    const hazardStatements: string[] = [];

    function extractFromSection(section: ClassificationSection) {
      if (section.GHSClassification) {
        for (const cls of section.GHSClassification) {
          if (cls.GHSHazardCode) hazardCodes.push(cls.GHSHazardCode);
          if (cls.GHSHazardStatement) hazardStatements.push(cls.GHSHazardStatement);
        }
      }
      if (section.Information) {
        for (const info of section.Information) {
          const val = info.Value?.StringWithMarkup?.[0]?.String ?? "";
          const name = info.Name ?? "";
          if (name === "GHS Hazard Statements" && val) {
            const codes = val.match(/H\d{3}/g) ?? [];
            hazardCodes.push(...codes);
            hazardStatements.push(val.replace(/<[^>]+>/g, "").trim());
          }
        }
      }
    }

    for (const section of sections) {
      extractFromSection(section);
    }

    return {
      hazardCodes: [...new Set(hazardCodes)],
      hazardStatements: [...new Set(hazardStatements)],
    };
  } catch {
    return { hazardCodes: [], hazardStatements: [] };
  }
}

function classifyHazards(codes: string[], statements: string[]): {
  isCarcinogen: boolean;
  isReproductiveToxicant: boolean;
  isMutagen: boolean;
  isSkinSensitiser: boolean;
  isAcutelyToxic: boolean;
  knownToxicityFlags: string[];
} {
  const allText = [...codes, ...statements].join(" ").toLowerCase();

  const isCarcinogen =
    codes.some((c) => ["H350", "H351"].includes(c)) ||
    allText.includes("carcinogen") ||
    allText.includes("carcinogenicity");

  const isReproductiveToxicant =
    codes.some((c) => ["H360", "H361", "H362"].includes(c)) ||
    allText.includes("reproductive") ||
    allText.includes("fertility") ||
    allText.includes("developmental");

  const isMutagen =
    codes.some((c) => ["H340", "H341"].includes(c)) ||
    allText.includes("mutagenic") ||
    allText.includes("genotoxic");

  const isSkinSensitiser =
    codes.some((c) => ["H317", "H334"].includes(c)) ||
    allText.includes("skin sensitiz") ||
    allText.includes("contact allerg") ||
    allText.includes("respiratory sensitiz");

  const isAcutelyToxic =
    codes.some((c) => ["H300", "H301", "H302", "H310", "H311", "H312", "H330", "H331", "H332"].includes(c)) ||
    allText.includes("acutely toxic") ||
    allText.includes("fatal if") ||
    allText.includes("harmful if");

  const knownToxicityFlags: string[] = [];
  if (isCarcinogen) knownToxicityFlags.push("carcinogen");
  if (isReproductiveToxicant) knownToxicityFlags.push("reproductive_toxicant");
  if (isMutagen) knownToxicityFlags.push("mutagen");
  if (isSkinSensitiser) knownToxicityFlags.push("skin_sensitiser");
  if (isAcutelyToxic) knownToxicityFlags.push("acutely_toxic");

  return { isCarcinogen, isReproductiveToxicant, isMutagen, isSkinSensitiser, isAcutelyToxic, knownToxicityFlags };
}

async function fetchCompoundProperties(cid: string): Promise<{
  iupacName: string | null;
  molecularFormula: string | null;
}> {
  try {
    const url = `${PUBCHEM_BASE}/compound/cid/${cid}/property/IUPACName,MolecularFormula/JSON`;
    const data = (await fetchJson(url)) as {
      PropertyTable?: { Properties?: Array<{ IUPACName?: string; MolecularFormula?: string }> };
    };
    const props = data?.PropertyTable?.Properties?.[0];
    return {
      iupacName: props?.IUPACName ?? null,
      molecularFormula: props?.MolecularFormula ?? null,
    };
  } catch {
    return { iupacName: null, molecularFormula: null };
  }
}

async function lookupFromPubChem(query: string, isCas = false): Promise<PubChemSafetyData | null> {
  const cid = isCas ? await getCidByCas(query) : await getCidByName(query);
  if (!cid) return null;

  const [{ hazardCodes, hazardStatements }, { iupacName, molecularFormula }] = await Promise.all([
    fetchGhsData(cid),
    fetchCompoundProperties(cid),
  ]);

  const classification = classifyHazards(hazardCodes, hazardStatements);

  return {
    cid,
    iupacName,
    molecularFormula,
    ghsHazardCodes: hazardCodes,
    ghsHazardStatements: hazardStatements,
    rawSummary: hazardStatements.length > 0 ? hazardStatements[0] : null,
    ...classification,
  };
}

export async function getPubChemSafetyData(
  ingredientName: string,
  casNumber?: string,
): Promise<PubChemSafetyData | null> {
  const lookupKey = normalizeLookupKey(casNumber ?? ingredientName);

  const [cached] = await db
    .select()
    .from(cachedPubchemTable)
    .where(
      sql`${cachedPubchemTable.lookupKey} = ${lookupKey}
        AND ${cachedPubchemTable.cachedAt} > NOW() - INTERVAL '${sql.raw(String(CACHE_TTL_DAYS))} days'`,
    );

  if (cached) {
    return {
      cid: cached.cid,
      iupacName: cached.iupacName,
      molecularFormula: cached.molecularFormula,
      ghsHazardCodes: cached.ghsHazardCodes ? cached.ghsHazardCodes.split("|").filter(Boolean) : [],
      ghsHazardStatements: cached.ghsHazardStatements ? cached.ghsHazardStatements.split("||").filter(Boolean) : [],
      knownToxicityFlags: cached.knownToxicityFlags ? cached.knownToxicityFlags.split("|").filter(Boolean) : [],
      isCarcinogen: cached.isCarcinogen ?? false,
      isReproductiveToxicant: cached.isReproductiveToxicant ?? false,
      isMutagen: cached.isMutagen ?? false,
      isSkinSensitiser: cached.isSkinSensitiser ?? false,
      isAcutelyToxic: cached.isAcutelyToxic ?? false,
      rawSummary: cached.rawSummary,
    };
  }

  let data: PubChemSafetyData | null = null;

  if (casNumber) {
    data = await lookupFromPubChem(casNumber, true);
  }

  if (!data) {
    data = await lookupFromPubChem(ingredientName, false);
  }

  const cacheValues = data
    ? {
        lookupKey,
        cid: data.cid,
        iupacName: data.iupacName,
        molecularFormula: data.molecularFormula,
        ghsHazardCodes: data.ghsHazardCodes.join("|"),
        ghsHazardStatements: data.ghsHazardStatements.join("||"),
        knownToxicityFlags: data.knownToxicityFlags.join("|"),
        isCarcinogen: data.isCarcinogen,
        isReproductiveToxicant: data.isReproductiveToxicant,
        isMutagen: data.isMutagen,
        isSkinSensitiser: data.isSkinSensitiser,
        isAcutelyToxic: data.isAcutelyToxic,
        rawSummary: data.rawSummary,
      }
    : {
        lookupKey,
        cid: null,
        iupacName: null,
        molecularFormula: null,
        ghsHazardCodes: "",
        ghsHazardStatements: "",
        knownToxicityFlags: "",
        isCarcinogen: false,
        isReproductiveToxicant: false,
        isMutagen: false,
        isSkinSensitiser: false,
        isAcutelyToxic: false,
        rawSummary: null,
      };

  await db
    .insert(cachedPubchemTable)
    .values(cacheValues)
    .onConflictDoUpdate({
      target: cachedPubchemTable.lookupKey,
      set: {
        cid: sql`EXCLUDED.cid`,
        iupacName: sql`EXCLUDED.iupac_name`,
        molecularFormula: sql`EXCLUDED.molecular_formula`,
        ghsHazardCodes: sql`EXCLUDED.ghs_hazard_codes`,
        ghsHazardStatements: sql`EXCLUDED.ghs_hazard_statements`,
        knownToxicityFlags: sql`EXCLUDED.known_toxicity_flags`,
        isCarcinogen: sql`EXCLUDED.is_carcinogen`,
        isReproductiveToxicant: sql`EXCLUDED.is_reproductive_toxicant`,
        isMutagen: sql`EXCLUDED.is_mutagen`,
        isSkinSensitiser: sql`EXCLUDED.is_skin_sensitiser`,
        isAcutelyToxic: sql`EXCLUDED.is_acutely_toxic`,
        rawSummary: sql`EXCLUDED.raw_summary`,
        cachedAt: sql`NOW()`,
      },
    })
    .catch(() => {});

  return data;
}
