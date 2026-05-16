import { Router, type IRouter } from "express";
import { getCosingInfo } from "../lib/cosing.js";
import { supabaseAdmin } from "../lib/supabase-admin.js";

const router: IRouter = Router();

interface CachedPubchemRow {
  cid: string | null;
  iupac_name: string | null;
  is_carcinogen: boolean | null;
  is_reproductive_toxicant: boolean | null;
  is_mutagen: boolean | null;
  is_skin_sensitiser: boolean | null;
  is_acutely_toxic: boolean | null;
}

/**
 * GET /api/ingredients/lookup?name=Niacinamide
 *
 * Lightweight read-only ingredient lookup used by the result-page chip drawer
 * (#99). Returns whatever we already have cached locally (CosIng + PubChem
 * cache) — does NOT call PubChem live to keep the endpoint fast and free of
 * rate-limit risk on a hot UI path. If the analyze pipeline has previously
 * looked the ingredient up, we'll have rich data; otherwise the caller still
 * gets the canonical name back so the sheet renders gracefully.
 */
router.get("/ingredients/lookup", async (req, res) => {
  const rawName = typeof req.query.name === "string" ? req.query.name.trim() : "";
  if (!rawName) {
    res.status(400).json({ error: "Missing 'name' query param" });
    return;
  }
  if (rawName.length > 200) {
    res.status(400).json({ error: "Name too long" });
    return;
  }

  try {
    const cosing = await getCosingInfo(rawName);

    // Pubchem cache lookup — match on lookup_key (lowercased trimmed name)
    const normalized = rawName.toLowerCase().trim();
    const { data: pubchemRow, error: pubchemError } = await supabaseAdmin
      .from("cached_pubchem")
      .select(
        "cid, iupac_name, is_carcinogen, is_reproductive_toxicant, is_mutagen, is_skin_sensitiser, is_acutely_toxic",
      )
      .ilike("lookup_key", normalized)
      .limit(1)
      .maybeSingle<CachedPubchemRow>();
    if (pubchemError) throw pubchemError;

    const restrictionLabels: Record<string, string> = {
      banned: "Banned in EU cosmetics (Annex II)",
      restricted: "Restricted in EU cosmetics (Annex III)",
      preservative: "Permitted preservative (EU Annex V)",
      colorant: "Permitted colorant (EU Annex IV)",
      uv_filter: "Permitted UV filter (EU Annex VI)",
      permitted: "Permitted under EU Cosmetics Regulation",
      other: "Listed in EU CosIng",
    };

    const safetyFlags: string[] = [];
    if (pubchemRow) {
      if (pubchemRow.is_carcinogen) safetyFlags.push("Possible carcinogen (IARC/GHS)");
      if (pubchemRow.is_reproductive_toxicant) safetyFlags.push("Reproductive toxicity flag");
      if (pubchemRow.is_mutagen) safetyFlags.push("Possible mutagen");
      if (pubchemRow.is_skin_sensitiser) safetyFlags.push("Skin sensitiser");
      if (pubchemRow.is_acutely_toxic) safetyFlags.push("Acutely toxic");
    }

    res.json({
      name: cosing?.inciName ?? rawName,
      functions: cosing?.functions ?? null,
      regulatoryStatus: cosing
        ? restrictionLabels[cosing.restrictionStatus] ?? cosing.restrictionStatus
        : null,
      restrictionDetail: cosing?.restrictionDescription ?? null,
      annexReference: cosing?.annexReference ?? null,
      pubchemCid: pubchemRow?.cid ?? null,
      iupacName: pubchemRow?.iupac_name ?? null,
      safetyFlags,
      // True only when we found something genuinely useful beyond the name
      hasData: Boolean(
        cosing || pubchemRow?.iupac_name || (pubchemRow && safetyFlags.length > 0),
      ),
    });
  } catch (err) {
    console.error("[ingredients/lookup] error", err);
    res.status(500).json({ error: "Lookup failed" });
  }
});

export default router;
