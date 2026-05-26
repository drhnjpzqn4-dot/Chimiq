import { Router, type IRouter } from "express";
import type { RiskCategory, RiskSeverity } from "../lib/risky-ingredients.js";
import { getRiskEntries, getRiskEntryBySlug } from "../lib/risky-ingredients.js";

const router: IRouter = Router();

router.get("/encyclopedia/ingredients", (req, res) => {
  const { search, category, severity, page = "1", limit = "20" } = req.query;

  let entries = getRiskEntries();

  if (search && typeof search === "string") {
    const q = search.toLowerCase().trim();
    entries = entries.filter(
      (e) =>
        e.display.toLowerCase().includes(q) ||
        e.key.includes(q) ||
        e.aliases?.some((a) => a.toLowerCase().includes(q)) ||
        e.description_se?.toLowerCase().includes(q) ||
        e.description?.toLowerCase().includes(q) ||
        e.hint_se.toLowerCase().includes(q) ||
        e.hint.toLowerCase().includes(q),
    );
  }

  if (category && typeof category === "string") {
    entries = entries.filter((e) => e.category === category);
  }

  if (severity && typeof severity === "string") {
    entries = entries.filter((e) => e.severity === severity);
  }

  entries.sort((a, b) => {
    if (a.severity !== b.severity) {
      return a.severity === "HIGH_RISK" ? -1 : 1;
    }
    return a.display.localeCompare(b.display, "sv");
  });

  const pageNum = Math.max(1, parseInt(String(page), 10) || 1);
  const limitNum = Math.min(Math.max(1, parseInt(String(limit), 10) || 20), 200);
  const start = (pageNum - 1) * limitNum;
  const paginated = entries.slice(start, start + limitNum);

  res.json({
    total: entries.length,
    page: pageNum,
    limit: limitNum,
    items: paginated.map((e) => ({
      slug: e.slug,
      display: e.display,
      category: e.category as RiskCategory,
      severity: e.severity as RiskSeverity,
      hint: e.hint,
      hint_se: e.hint_se,
      aliases: e.aliases ?? [],
      commonIn: e.commonIn,
      commonIn_se: e.commonIn_se,
      medicallyReviewed: e.medicallyReviewed ?? false,
    })),
  });
});

router.get("/encyclopedia/ingredients/:slug", (req, res) => {
  const entry = getRiskEntryBySlug(req.params.slug ?? "");
  if (!entry) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  res.json({
    slug: entry.slug,
    display: entry.display,
    category: entry.category,
    severity: entry.severity,
    hint: entry.hint,
    hint_se: entry.hint_se,
    description: entry.description,
    description_se: entry.description_se,
    commonIn: entry.commonIn,
    commonIn_se: entry.commonIn_se,
    aliases: entry.aliases ?? [],
    citation: entry.citation,
    citationUrl: entry.citationUrl,
    concentrationDependent: entry.concentrationDependent ?? false,
    concentrationNote: entry.concentrationNote,
    medicallyReviewed: entry.medicallyReviewed ?? false,
  });
});

router.get("/encyclopedia/categories", (_req, res) => {
  const entries = getRiskEntries();
  const counts: Record<string, number> = {};
  for (const e of entries) {
    counts[e.category] = (counts[e.category] ?? 0) + 1;
  }
  res.json(
    Object.entries(counts)
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count),
  );
});

export default router;
