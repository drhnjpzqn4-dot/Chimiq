import { Router, type IRouter } from "express";
import { z } from "zod";
import { Resend } from "resend";
import { requireAuth } from "../lib/authGate.js";
import { sanitizeText, SanitizationError } from "../lib/sanitize.js";
import { supabaseAdmin } from "../lib/supabase-admin.js";
import { isRequestAdmin } from "../lib/admin.js";

const ReportBody = z.object({
  reason: z.string().trim().min(1).max(500),
});

const BARCODE_PARAM = /^[0-9]{6,14}$/;

const MAX_REPORTS_PER_USER_PER_DAY = 3;

// SS-081d: rapporter mejlas till hello@chimiq.com. Kräver RESEND_API_KEY i miljön
// (Resend ej konfigurerat ännu → mejl hoppas tyst över, raden sparas ändå i DB).
const REPORT_INBOX = "hello@chimiq.com";
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

function notifyReportInbox(
  params: { barcode: string; reason: string; productName?: string | null },
  log: { warn: (obj: unknown, msg: string) => void },
): void {
  if (!resend) return;
  const { barcode, reason, productName } = params;
  void (async () => {
    try {
      await resend.emails.send({
        from: "Chimiq <noreply@chimiq.com>",
        to: REPORT_INBOX,
        subject: `Felrapport: ${productName ?? barcode}`,
        text: `En användare har rapporterat felaktig info.\n\nProdukt: ${productName ?? "(okänt namn)"}\nStreckkod: ${barcode}\n\nVad är fel:\n${reason}\n\nGranska på: https://chimiq.com/admin`,
      });
    } catch (err) {
      log.warn({ err }, "Report notification email failed");
    }
  })();
}

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

    // SS-081d: mejla hello@chimiq.com (hämta produktnamn för en läsbar rubrik).
    const { data: prod } = await supabaseAdmin
      .from("cached_products")
      .select("product_name")
      .eq("barcode", barcode)
      .maybeSingle<{ product_name: string | null }>();
    notifyReportInbox({ barcode, reason: safeReason, productName: prod?.product_name ?? null }, req.log);

    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "Failed to save product report");
    res.status(500).json({ error: "Could not submit report." });
  }
});

/**
 * SS-081d: GET /admin/reports — lista inkomna felrapporter för admin-vyn
 * (chimiq.com/admin). Admin-gatead. Bifogar produktnamn/märke från cached_products.
 */
const AdminReportsQuery = z.object({
  limit: z.coerce.number().int().min(1).max(200).optional(),
});

router.get("/admin/reports", async (req, res) => {
  if (!isRequestAdmin(req as { user?: { email?: string } })) {
    res.status(403).json({ error: "Admin access required." });
    return;
  }
  const parsed = AdminReportsQuery.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid filter values." });
    return;
  }
  try {
    const { data: reports, error } = await supabaseAdmin
      .from("product_reports")
      .select("id, barcode, reason, reported_by, created_at")
      .order("created_at", { ascending: false })
      .limit(parsed.data.limit ?? 200);
    if (error) throw error;
    const rows = (reports ?? []) as Array<{
      id: string | number;
      barcode: string;
      reason: string;
      reported_by: string | null;
      created_at: string;
    }>;

    // Bifoga produktnamn/märke per unik barcode (en batch-fråga).
    const barcodes = [...new Set(rows.map((r) => r.barcode))];
    const nameByBarcode = new Map<string, { product_name: string | null; brand: string | null }>();
    if (barcodes.length > 0) {
      const { data: prods } = await supabaseAdmin
        .from("cached_products")
        .select("barcode, product_name, brand")
        .in("barcode", barcodes);
      for (const p of (prods ?? []) as Array<{ barcode: string; product_name: string | null; brand: string | null }>) {
        nameByBarcode.set(p.barcode, { product_name: p.product_name, brand: p.brand });
      }
    }

    res.json({
      reports: rows.map((r) => ({
        id: r.id,
        barcode: r.barcode,
        reason: r.reason,
        reportedBy: r.reported_by,
        createdAt: r.created_at,
        productName: nameByBarcode.get(r.barcode)?.product_name ?? null,
        brand: nameByBarcode.get(r.barcode)?.brand ?? null,
      })),
    });
  } catch (err) {
    req.log.error({ err }, "Admin reports query failed");
    res.status(500).json({ error: "Failed to load reports." });
  }
});

export default router;
