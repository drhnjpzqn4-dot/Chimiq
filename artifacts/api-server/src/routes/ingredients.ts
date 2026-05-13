import { Router, type IRouter } from "express";
import { getCosingInfo } from "../lib/cosing.js";
import { db, cachedPubchemTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";

const router: IRouter = Router();

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
    const [pubchemRow] = await db
      .select()
      .from(cachedPubchemTable)
      .where(sql`lower(${cachedPubchemTable.lookupKey}) = ${normalized}`)
      .limit(1);

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
      if (pubchemRow.isCarcinogen) safetyFlags.push("Possible carcinogen (IARC/GHS)");
      if (pubchemRow.isReproductiveToxicant) safetyFlags.push("Reproductive toxicity flag");
      if (pubchemRow.isMutagen) safetyFlags.push("Possible mutagen");
      if (pubchemRow.isSkinSensitiser) safetyFlags.push("Skin sensitiser");
      if (pubchemRow.isAcutelyToxic) safetyFlags.push("Acutely toxic");
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
      iupacName: pubchemRow?.iupacName ?? null,
      safetyFlags,
      // True only when we found something genuinely useful beyond the name
      hasData: Boolean(
        cosing || pubchemRow?.iupacName || (pubchemRow && safetyFlags.length > 0),
      ),
    });
  } catch (err) {
    console.error("[ingredients/lookup] error", err);
    res.status(500).json({ error: "Lookup failed" });
  }
});

export default router;
