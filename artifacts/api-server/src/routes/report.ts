import { Router, type IRouter } from "express";
import { z } from "zod";
import { requireAuth } from "../lib/authGate.js";
import { sanitizeText, SanitizationError } from "../lib/sanitize.js";
import { supabaseAdmin } from "../lib/supabase-admin.js";

const ReportBody = z.object({
  reason: z.string().trim().min(1).max(500),
});

const BARCODE_PARAM = /^[0-9]{6,14}$/;

const MAX_REPORTS_PER_USER_PER_DAY = 3;

const router: IRouter = Router();

router.post("/products/:barcode/report", requireAuth, async (req, res) => {
  const rawBarcode = req.params.barcode;
  const barcode = (Array.isArray(rawBarcode) ? rawBarcode[0] : rawBarcode)?.trim() ?? "";
  if (!BARCODE_PARAM.test(barcode)) {
    res.status(400).json({ error: "Invalid barcode." });
    return;
  }

  const parseResult = ReportBody.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({ error: "Invalid report data." });
    return;
  }

  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json({ error: "Sign in required." });
    return;
  }

  let safeReason: string;
  try {
    safeReason = sanitizeText(parseResult.data.reason, {
      fieldName: "Reason",
      maxLength: 500,
      minLength: 1,
      conversational: true,
    });
  } catch (err) {
    if (err instanceof SanitizationError) {
      res.status(400).json({ error: err.message });
      return;
    }
    throw err;
  }

  try {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { count, error: countError } = await supabaseAdmin
      .from("product_reports")
      .select("id", { count: "exact", head: true })
      .eq("reported_by", userId)
      .gte("created_at", since);
    if (countError) throw countError;

    if ((count ?? 0) >= MAX_REPORTS_PER_USER_PER_DAY) {
      res.status(429).json({ error: "You can submit at most 3 reports per day." });
      return;
    }

    const { error: insertError } = await supabaseAdmin.from("product_reports").insert({
      barcode,
      reported_by: userId,
      reason: safeReason,
    });
    if (insertError) throw insertError;

    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "Failed to save product report");
    res.status(500).json({ error: "Could not submit report." });
  }
});

export default router;
