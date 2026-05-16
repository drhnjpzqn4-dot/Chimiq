import { supabaseAdmin } from "./supabase-admin.js";

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

interface CachedPubChemRow {
  cid: string | null;
  iupac_name: string | null;
  molecular_formula: string | null;
  ghs_hazard_codes: string | null;
  ghs_hazard_statements: string | null;
  known_toxicity_flags: string | null;
  is_carcinogen: boolean | null;
  is_reproductive_toxicant: boolean | null;
  is_mutagen: boolean | null;
  is_skin_sensitiser: boolean | null;
  is_acutely_toxic: boolean | null;
  raw_summary: string | null;
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

  const cacheCutoff = new Date(Date.now() - CACHE_TTL_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const { data: cached, error: cacheError } = await supabaseAdmin
    .from("cached_pubchem")
    .select(
      "cid,iupac_name,molecular_formula,ghs_hazard_codes,ghs_hazard_statements,known_toxicity_flags,is_carcinogen,is_reproductive_toxicant,is_mutagen,is_skin_sensitiser,is_acutely_toxic,raw_summary",
    )
    .eq("lookup_key", lookupKey)
    .gt("cached_at", cacheCutoff)
    .maybeSingle<CachedPubChemRow>();
  if (cacheError) throw cacheError;

  if (cached) {
    return {
      cid: cached.cid,
      iupacName: cached.iupac_name,
      molecularFormula: cached.molecular_formula,
      ghsHazardCodes: cached.ghs_hazard_codes ? cached.ghs_hazard_codes.split("|").filter(Boolean) : [],
      ghsHazardStatements: cached.ghs_hazard_statements ? cached.ghs_hazard_statements.split("||").filter(Boolean) : [],
      knownToxicityFlags: cached.known_toxicity_flags ? cached.known_toxicity_flags.split("|").filter(Boolean) : [],
      isCarcinogen: cached.is_carcinogen ?? false,
      isReproductiveToxicant: cached.is_reproductive_toxicant ?? false,
      isMutagen: cached.is_mutagen ?? false,
      isSkinSensitiser: cached.is_skin_sensitiser ?? false,
      isAcutelyToxic: cached.is_acutely_toxic ?? false,
      rawSummary: cached.raw_summary,
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
        lookup_key: lookupKey,
        cid: data.cid,
        iupac_name: data.iupacName,
        molecular_formula: data.molecularFormula,
        ghs_hazard_codes: data.ghsHazardCodes.join("|"),
        ghs_hazard_statements: data.ghsHazardStatements.join("||"),
        known_toxicity_flags: data.knownToxicityFlags.join("|"),
        is_carcinogen: data.isCarcinogen,
        is_reproductive_toxicant: data.isReproductiveToxicant,
        is_mutagen: data.isMutagen,
        is_skin_sensitiser: data.isSkinSensitiser,
        is_acutely_toxic: data.isAcutelyToxic,
        raw_summary: data.rawSummary,
        cached_at: new Date().toISOString(),
      }
    : {
        lookup_key: lookupKey,
        cid: null,
        iupac_name: null,
        molecular_formula: null,
        ghs_hazard_codes: "",
        ghs_hazard_statements: "",
        known_toxicity_flags: "",
        is_carcinogen: false,
        is_reproductive_toxicant: false,
        is_mutagen: false,
        is_skin_sensitiser: false,
        is_acutely_toxic: false,
        raw_summary: null,
        cached_at: new Date().toISOString(),
      };

  try {
    const { error } = await supabaseAdmin
      .from("cached_pubchem")
      .upsert(cacheValues, { onConflict: "lookup_key" });
    if (error) throw error;
  } catch {
    // Cache writes are best-effort; live PubChem data is still returned.
  }

  return data;
}
