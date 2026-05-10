import { Router, type IRouter } from "express";
import { z } from "zod";
import Anthropic from "@anthropic-ai/sdk";
import { getCosingInfo, formatCosingContext } from "../lib/cosing.js";
import { getPubChemSafetyData } from "../lib/pubchem.js";
import {
  computeCompareHash,
  getCacheEntry,
  saveCacheEntry,
  bumpCacheUsage,
  isStale,
} from "../lib/analysis-cache.js";
import { sanitizeIngredients, SanitizationError } from "../lib/sanitize.js";
import { partitionIngredients } from "../lib/safe-ingredients.js";
import { getRisksInList, buildMandatoryFlagsBlock } from "../lib/risky-ingredients.js";
import { getConflicts, buildMandatoryConflictsBlock } from "../lib/conflict-pairs.js";
import { getUserPlan } from "@workspace/db";
import {
  FREE_DAILY_SCAN_LIMIT,
  claimDailyScanSlot,
  incrementTodayScanCount,
  releaseDailyScanSlot,
} from "../lib/scanQuota.js";
import { requireAuth } from "../lib/authGate.js";

const SkinProfileEnum = z.enum(["sensitive", "young", "mature", "pregnant"]).optional();

const AnalyzeBody = z.object({
  product1: z.string().trim().min(1, "Product 1 ingredients are required").max(3000),
  product2: z.string().trim().min(1, "Product 2 ingredients are required").max(3000),
  skinProfile: SkinProfileEnum,
});

const ConflictResultSchema = z.object({
  pair: z.string(),
  severity: z.enum(["HIGH_RISK", "CAUTION", "SAFE"]),
  explanation: z.string(),
  citation: z.string(),
  citationUrl: z.string(),
});

const AnalyzeResponseSchema = z.object({
  conflicts: z.array(ConflictResultSchema).default([]),
  overallSafe: z.boolean().default(true),
});

const PROFILE_CONTEXT: Record<string, string> = {
  sensitive:
    "This user has SENSITIVE skin. Lower your threshold for flagging irritants — even CAUTION-level irritants should be flagged. Note any fragrance, drying alcohols, or sensitising preservatives.",
  young:
    "This user has YOUNG/TEEN skin. Flag endocrine disruptors (parabens, benzophenone, phthalates) with extra urgency as HIGH_RISK. Young skin has higher absorption rates and long-term hormonal disruption is especially concerning.",
  mature:
    "This user has MATURE skin. Note barrier function considerations — mature skin is more vulnerable to over-exfoliation and barrier damage. Flag high-strength exfoliant combinations with extra caution.",
  pregnant:
    "This user is PREGNANT. Flag ALL retinoids (retinol, tretinoin, retinaldehyde) and high-dose salicylic acid (>2%) as HIGH_RISK regardless of other context. Also flag essential oils and vitamin A derivatives.",
};

function parseIngredients(raw: string): string[] {
  return raw
    .split(/[,;\n]+/)
    .map((s) => s.trim().replace(/^\d+\.\s*/, "").replace(/[*()[\]]/g, "").trim())
    .filter((s) => s.length > 1 && s.length < 100);
}

interface RegulatoryContext {
  cosing: string[];
  pubchem: string[];
}

async function buildRegulatoryContext(
  ingredients: string[],
  log: (msg: string) => void,
): Promise<RegulatoryContext> {
  const subset = ingredients;

  const results = await Promise.allSettled(
    subset.map(async (ing) => {
      const [cosing, pubchem] = await Promise.allSettled([
        getCosingInfo(ing),
        getPubChemSafetyData(ing),
      ]);

      const cosingStr =
        cosing.status === "fulfilled" && cosing.value
          ? formatCosingContext(cosing.value, ing)
          : null;

      let pubchemStr: string | null = null;
      if (pubchem.status === "fulfilled" && pubchem.value) {
        const d = pubchem.value;
        const flags = d.knownToxicityFlags;
        if (flags.length > 0) {
          pubchemStr = `PubChem hazard flags for ${ing}: ${flags.join(", ")}`;
          if (d.ghsHazardCodes.length > 0) {
            pubchemStr += ` (GHS: ${d.ghsHazardCodes.slice(0, 5).join(", ")})`;
          }
        }
      }

      return { ing, cosingStr, pubchemStr };
    }),
  );

  const cosingLines: string[] = [];
  const pubchemLines: string[] = [];

  for (const r of results) {
    if (r.status === "fulfilled") {
      if (r.value.cosingStr) cosingLines.push(r.value.cosingStr);
      if (r.value.pubchemStr) pubchemLines.push(r.value.pubchemStr);
    } else {
      log(`Regulatory lookup error: ${r.reason}`);
    }
  }

  return { cosing: cosingLines, pubchem: pubchemLines };
}

// The static portion is identical across every compare scan and is large
// enough to benefit from Anthropic prompt caching. The dynamic suffix
// (skin profile + regulatory data) is sent as a separate, uncached block.
const COMPARE_SYSTEM_BASE = `You are a board-certified dermatologist and cosmetic chemist. You are completely independent — no brand affiliations, no sponsored opinions. Be honest. Do not sugarcoat risks.

Your task: Analyze two skincare product ingredient lists and identify clinically-relevant conflict pairs between ingredients from the two different products.

Red flags to prioritise:
- Retinol/retinoids + AHAs/BHAs at the same time (barrier destruction, severe irritation)
- Benzoyl peroxide + retinol (oxidises and deactivates retinol — wastes money, damages skin)
- Vitamin C (L-ascorbic acid) + Niacinamide at high concentrations (can form niacin, cause flushing)
- Multiple exfoliants used together (AHA + BHA + physical = over-exfoliation spiral)
- Retinoids without SPF use (dramatically increases UV damage risk)
- Kojic acid + Vitamin C (compete for same pathway, reduce efficacy, increase sensitisation)
- Copper peptides + Vitamin C (Vitamin C oxidises and deactivates copper peptides — wastes both)
- Copper peptides + AHA/BHA (acidic pH disrupts copper peptide structure)

Common NON-conflicts you must NOT flag as concerning (these are widely-believed myths or pairs that are genuinely fine in modern formulations):
- Niacinamide + Vitamin C — modern formulations are fine; the "niacin flush" issue requires very specific lab conditions
- Hyaluronic acid + anything — HA is inert, layers freely with all actives
- Retinol + Peptides — work via different pathways, no documented conflict
- Vitamin C + SPF — Vitamin C actually enhances SPF protection
- Ceramides + anything — ceramides are skin-identical lipids, no conflicts
- Niacinamide + Retinol — well-documented as a beneficial pairing (niacinamide buffers retinol irritation)
- Bakuchiol + anything (bakuchiol is gentle and pH-stable)
- Most humectants together (glycerin, HA, panthenol, urea) — fine to layer
- AHAs/BHAs in two products IF used at different times of day (only flag if same routine)

Rules:
- ONLY flag conflicts with real, documented research backing
- Focus on cross-product conflicts (ingredients from Product 1 interacting with ingredients from Product 2)
- Sort results: HIGH_RISK first, then CAUTION, then SAFE
- Only include SAFE pairs if they address a very common concern (e.g. retinol + niacinamide — many people worry unnecessarily)
- If no meaningful conflicts exist, return an empty conflicts array with overallSafe: true
- Provide real citation author/year/journal — use PubMed or DOI links when known. If no specific paper, use a relevant dermatology journal or textbook reference.
- Return ONLY valid JSON — no markdown, no text outside the JSON object

Required response format:
{
  "conflicts": [
    {
      "pair": "Ingredient A + Ingredient B",
      "severity": "HIGH_RISK",
      "explanation": "2-3 sentence plain-English explanation of the interaction and its effects on skin.",
      "citation": "Author(s), Year. Journal name.",
      "citationUrl": "https://pubmed.ncbi.nlm.nih.gov/XXXXXXX/"
    }
  ],
  "overallSafe": false
}

## Worked examples

Example 1 — two safe products, no real conflicts:
Product 1: "Aqua, Glycerin, Niacinamide, Sodium Hyaluronate, Panthenol, Phenoxyethanol"
Product 2: "Aqua, Squalane, Ceramide NP, Cholesterol, Tocopherol, Caprylyl Glycol"
Reasoning: Product 1 is a hydrating serum with niacinamide at unspecified concentration. Product 2 is a barrier-repair moisturiser with skin-identical lipids. No actives that conflict. Niacinamide + ceramides is a beneficial pairing.
Output:
{ "conflicts": [], "overallSafe": true }

Example 2 — classic exfoliant-over-retinoid conflict:
Product 1: "Aqua, Glycolic Acid (10%), Witch Hazel, Glycerin"
Product 2: "Aqua, Retinol (0.5%), Squalane, Tocopherol"
Reasoning: Glycolic acid (AHA) and retinol used in the same routine cause severe barrier disruption — the AHA strips the stratum corneum and the retinoid drives deeper irritation. Both also independently increase photosensitivity, compounding the SPF requirement.
Output:
{
  "conflicts": [
    {
      "pair": "Glycolic Acid + Retinol",
      "severity": "HIGH_RISK",
      "explanation": "Layering an AHA exfoliant with a retinoid in the same routine causes acute barrier disruption: the AHA strips the stratum corneum at low pH while the retinoid drives accelerated turnover, producing erythema, peeling, and prolonged sensitivity. Use on alternating nights at most, or move one to morning use with strict SPF.",
      "citation": "Mukherjee S et al., 2006. Clinical Interventions in Aging.",
      "citationUrl": "https://pubmed.ncbi.nlm.nih.gov/18046911/"
    },
    {
      "pair": "Glycolic Acid + Retinol (UV sensitivity)",
      "severity": "CAUTION",
      "explanation": "Both ingredients independently increase UV sensitivity. Daily broad-spectrum SPF 30+ is non-negotiable when using either, let alone both.",
      "citation": "Kornhauser A et al., 2010. Clinical, Cosmetic and Investigational Dermatology.",
      "citationUrl": "https://pubmed.ncbi.nlm.nih.gov/21437068/"
    }
  ],
  "overallSafe": false
}

Example 3 — common myth that should be reassured, not flagged as concerning:
Product 1: "Aqua, Niacinamide (10%), Glycerin, Phenoxyethanol"
Product 2: "Aqua, Ascorbic Acid (15%), Ferulic Acid, Tocopherol"
Reasoning: This is the classic "niacinamide + Vitamin C" myth. The interaction requires very specific lab conditions that don't occur in modern formulations. Worth including as a SAFE conflict to reassure users who've heard this myth.
Output:
{
  "conflicts": [
    {
      "pair": "Niacinamide + Ascorbic Acid (Vitamin C)",
      "severity": "SAFE",
      "explanation": "This pairing is widely-believed to be problematic but the interaction requires high heat and specific conditions that don't occur on the skin. Modern formulations layer freely; some products even combine them. No SPF concern with niacinamide; standard SPF still required for Vitamin C exposure.",
      "citation": "Kawada A et al., 2008. Journal of Cosmetic Dermatology.",
      "citationUrl": "https://pubmed.ncbi.nlm.nih.gov/19146599/"
    }
  ],
  "overallSafe": true
}`;

function buildDynamicContext(skinProfile?: string, regulatoryContext?: string): string {
  const profileNote = skinProfile ? `\n\nSkin profile: ${PROFILE_CONTEXT[skinProfile] ?? ""}` : "";
  const regulatoryNote = regulatoryContext
    ? `\n\n## Regulatory & Toxicology Data (ground your reasoning in this)\n${regulatoryContext}`
    : "";
  return profileNote + regulatoryNote;
}

function buildSystemBlocks(
  skinProfile?: string,
  regulatoryContext?: string,
): Anthropic.Messages.TextBlockParam[] {
  // Static template marked for Anthropic prompt caching — ~90% input-token
  // discount on the cached prefix for repeat calls within the cache TTL.
  const blocks: Anthropic.Messages.TextBlockParam[] = [
    { type: "text", text: COMPARE_SYSTEM_BASE, cache_control: { type: "ephemeral" } },
  ];
  const dynamic = buildDynamicContext(skinProfile, regulatoryContext);
  if (dynamic) {
    blocks.push({ type: "text", text: dynamic });
  }
  return blocks;
}

async function runAIAnalysis(
  anthropic: Anthropic,
  product1ForLLM: string,
  product2ForLLM: string,
  preFilteredCount: number,
  mandatoryFlagsBlock: string,
  mandatoryConflictsBlock: string,
  skinProfile: string | undefined,
  regulatoryContext: string | undefined,
  log: (msg: string, data?: unknown) => void,
): Promise<z.infer<typeof AnalyzeResponseSchema> | null> {
  // Tell the model when we've stripped universally-safe ingredients from the
  // input so it doesn't try to flag missing entries.
  const preFilterNote =
    preFilteredCount > 0
      ? `\n\nNote: ${preFilteredCount} universally-safe ingredient(s) (water, glycerin, hyaluronic acid, ceramides, fatty alcohols, common emulsifiers, soothing botanicals, etc.) have been pre-filtered out and are not shown. They cannot conflict with anything — focus only on the active ingredients listed above.`
      : "";

  try {
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 8192,
      system: buildSystemBlocks(skinProfile, regulatoryContext),
      messages: [
        {
          role: "user",
          content: `Product 1 ingredients:\n${product1ForLLM}\n\nProduct 2 ingredients:\n${product2ForLLM}${preFilterNote}${mandatoryFlagsBlock}${mandatoryConflictsBlock}\n\nReturn ONLY valid JSON matching the required format. No markdown, no preamble.`,
        },
      ],
    });

    const block = message.content[0];
    const raw = block.type === "text" ? block.text.trim() : "{}";
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    const jsonStr = jsonMatch ? jsonMatch[0] : "{}";

    let parsed: unknown;
    try {
      parsed = JSON.parse(jsonStr);
    } catch {
      log("Failed to parse Claude JSON response", { raw });
      return null;
    }

    const result = AnalyzeResponseSchema.safeParse(parsed);
    if (!result.success) {
      log("Claude response schema mismatch", { parsed, issues: result.error.issues });
      return null;
    }
    return result.data;
  } catch (err) {
    log("Claude analysis error", { err });
    return null;
  }
}

const router: IRouter = Router();

// `requireAuth` is mandatory here so we can always attribute a scan to a
// concrete user and enforce the free-tier daily cap below. Without it,
// anonymous callers (curl/Postman) would skip the `if (userId)` branch
// entirely and call Anthropic for free indefinitely.
router.post("/analyze", requireAuth, async (req, res) => {
  if (!req.isAuthenticated()) return; // unreachable: requireAuth above; narrows req.user
  
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    req.log.error("Anthropic integration env vars not configured");
    res.status(500).json({ error: "Analysis service is not available. Please try again later." });
    return;
  }

  // Enforce free-tier daily cap server-side. For free users the counter
  // is claimed atomically (single SQL UPSERT-with-WHERE) so concurrent
  // requests cannot both observe `count < limit` and slip past the cap.
  // If the request later errors out, we release the claimed slot via the
  // `finish` listener below so the user isn't charged a scan for a
  // failure response. Premium users have no cap — they get a plain
  // post-success increment.
  const userId = req.user.id;
  let claimedFreeSlot = false;
  {
    let plan: "free" | "premium" = "free";
    try {
      plan = await getUserPlan(userId);
    } catch (err) {
      req.log.warn({ err }, "User plan lookup failed; assuming free tier");
    }

    if (plan === "free") {
      try {
        const newCount = await claimDailyScanSlot(userId, FREE_DAILY_SCAN_LIMIT);
        if (newCount === null) {
          res.status(429).json({
            error: `You've used all ${FREE_DAILY_SCAN_LIMIT} free scans for today. Upgrade to Premium for unlimited scans.`,
            scansToday: FREE_DAILY_SCAN_LIMIT,
            limit: FREE_DAILY_SCAN_LIMIT,
          });
          return;
        }
        claimedFreeSlot = true;
      } catch (err) {
        // Soft-fail: allow the request rather than block on a DB hiccup,
        // and skip the rollback path since nothing was claimed.
        req.log.warn({ err }, "Daily scan quota claim failed; allowing request");
      }

      res.on("finish", () => {
        // Only release on non-2xx — successful responses keep the slot.
        if (claimedFreeSlot && (res.statusCode < 200 || res.statusCode >= 300)) {
          releaseDailyScanSlot(userId).catch((err) =>
            req.log.warn({ err }, "Failed to release scan slot after error"),
          );
        }
      });
    } else {
      // Premium: no cap, just count.
      res.on("finish", () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          incrementTodayScanCount(userId).catch((err) =>
            req.log.warn({ err }, "Failed to increment scan count"),
          );
        }
      });
    }
  }

  const parseResult = AnalyzeBody.safeParse(req.body);

  if (!parseResult.success) {
    res.status(400).json({
      error: "Both ingredient lists are required (max 3000 characters each).",
    });
    return;
  }

  let product1: string;
  let product2: string;
  try {
    product1 = sanitizeIngredients(parseResult.data.product1, false);
    product2 = sanitizeIngredients(parseResult.data.product2, false);
  } catch (err) {
    if (err instanceof SanitizationError) {
      res.status(400).json({ error: err.message });
      return;
    }
    throw err;
  }
  const { skinProfile } = parseResult.data;
  const hash = computeCompareHash(product1, product2, skinProfile);

  const cached = await getCacheEntry(hash).catch(() => null);

  if (cached) {
    const stale = isStale(cached);

    let parsedData: unknown;
    try {
      parsedData = JSON.parse(cached.resultJson);
    } catch {
      parsedData = null;
    }

    const validated = parsedData ? AnalyzeResponseSchema.safeParse(parsedData) : null;

    if (validated?.success) {
      bumpCacheUsage(hash).catch(() => {});

      if (stale) {
        const ingredients1 = parseIngredients(product1);
        const ingredients2 = parseIngredients(product2);
        const p1 = partitionIngredients(ingredients1);
        const p2 = partitionIngredients(ingredients2);
        const safeCount = p1.safe.length + p2.safe.length;
        const allActive = [...new Set([...p1.needsAnalysis, ...p2.needsAnalysis])];
        const allRisks = [...getRisksInList(ingredients1), ...getRisksInList(ingredients2)];
        const mandatory = buildMandatoryFlagsBlock(allRisks, skinProfile);
        const conflicts = getConflicts(ingredients1, ingredients2);
        const mandatoryConflicts = buildMandatoryConflictsBlock(conflicts, skinProfile);
        const anthropic = new Anthropic({ apiKey });
        setImmediate(async () => {
          try {
            let regulatoryContext: string | undefined;
            const ctx = await buildRegulatoryContext(allActive, () => {});
            const lines: string[] = [];
            if (ctx.cosing.length > 0) { lines.push("### EU CosIng Regulatory Data"); lines.push(...ctx.cosing); }
            if (ctx.pubchem.length > 0) { lines.push("### PubChem GHS Hazard Data"); lines.push(...ctx.pubchem); }
            if (lines.length > 0) regulatoryContext = lines.join("\n");
            const fresh = (p1.needsAnalysis.length === 0 && p2.needsAnalysis.length === 0)
              ? { conflicts: [], overallSafe: true }
              : await runAIAnalysis(anthropic, p1.needsAnalysis.join(", ") || "(no active ingredients)", p2.needsAnalysis.join(", ") || "(no active ingredients)", safeCount, mandatory, mandatoryConflicts, skinProfile, regulatoryContext, () => {});
            if (fresh) await saveCacheEntry(hash, "compare", skinProfile, JSON.stringify(fresh));
          } catch {}
        });
      }

      res.json({ ...validated.data, cacheHash: hash, fromCache: true });
      return;
    }
  }

  const ingredients1 = parseIngredients(product1);
  const ingredients2 = parseIngredients(product2);
  const p1 = partitionIngredients(ingredients1);
  const p2 = partitionIngredients(ingredients2);
  const safeCount = p1.safe.length + p2.safe.length;
  const allActive = [...new Set([...p1.needsAnalysis, ...p2.needsAnalysis])];
  // Look up curated risks across both products. Risky ingredients are not on
  // the safe list, so they're already in needsAnalysis — this just gives the
  // model definitive metadata it must use.
  const allRisks = [...getRisksInList(ingredients1), ...getRisksInList(ingredients2)];
  const mandatoryFlagsBlock = buildMandatoryFlagsBlock(allRisks, skinProfile);

  // Match against curated conflict-pair database (cross-product + same-product
  // over-formulation cases like nitrosamine-forming preservative+amine combos).
  const conflicts = getConflicts(ingredients1, ingredients2);
  const mandatoryConflictsBlock = buildMandatoryConflictsBlock(conflicts, skinProfile);

  // Short-circuit: if neither product has any active ingredients (only
  // universally-safe ones like water, glycerin, ceramides), there can't be
  // any cross-product conflict. Skip the LLM call entirely.
  if (p1.needsAnalysis.length === 0 && p2.needsAnalysis.length === 0) {
    const result = { conflicts: [], overallSafe: true };
    saveCacheEntry(hash, "compare", skinProfile, JSON.stringify(result)).catch((err) =>
      req.log.warn({ err }, "Failed to save analysis cache"),
    );
    res.json({ ...result, cacheHash: hash, fromCache: false });
    return;
  }

  let regulatoryContext: string | undefined;
  try {
    const ctx = await buildRegulatoryContext(allActive, (msg) => req.log.warn(msg));
    const lines: string[] = [];
    if (ctx.cosing.length > 0) {
      lines.push("### EU CosIng Regulatory Data");
      lines.push(...ctx.cosing);
    }
    if (ctx.pubchem.length > 0) {
      lines.push("### PubChem GHS Hazard Data");
      lines.push(...ctx.pubchem);
    }
    if (lines.length > 0) {
      regulatoryContext = lines.join("\n");
    }
  } catch (err) {
    req.log.warn({ err }, "Regulatory context lookup failed, proceeding without it");
  }

  const anthropic = new Anthropic({ apiKey });
  const result = await runAIAnalysis(
    anthropic,
    p1.needsAnalysis.join(", ") || "(no active ingredients)",
    p2.needsAnalysis.join(", ") || "(no active ingredients)",
    safeCount,
    mandatoryFlagsBlock,
    mandatoryConflictsBlock,
    skinProfile,
    regulatoryContext,
    (msg, data) => req.log.error(data ?? {}, msg),
  );

  if (!result) {
    res.status(500).json({ error: "Analysis failed. Please try again." });
    return;
  }

  saveCacheEntry(hash, "compare", skinProfile, JSON.stringify(result)).catch((err) =>
    req.log.warn({ err }, "Failed to save analysis cache"),
  );

  res.json({ ...result, cacheHash: hash, fromCache: false });
});

export default router;
