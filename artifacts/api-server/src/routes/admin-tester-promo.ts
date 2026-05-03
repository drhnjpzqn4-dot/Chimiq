import { Router, type IRouter, type Request, type Response } from "express";
import type Stripe from "stripe";
import { db, testerPromoChangesTable } from "@workspace/db";
import { and, desc, eq, gte, ilike, lte, or, sql, type SQL } from "drizzle-orm";
import { getUncachableStripeClient } from "../stripeClient";
import { isRequestAdmin, getRequestEmail } from "../lib/admin";
import {
  ACTIVE_PROMO_METADATA_KEY,
  COUPON_ID,
  buildPayload,
  fetchPromoFromStripe,
  resolveActivePromo,
  type PromoPayload,
} from "../lib/testerPromo";

// In-memory cache TTL. Stripe redemption counts don't change
// second-to-second, so a short window (45s) gives admins a snappy page
// without meaningfully stale numbers. Bypass with `?refresh=1` for an
// on-demand re-fetch. The raise-cap and mint endpoints also invalidate
// this so the widget shows the new code immediately after a mutation.
const CACHE_TTL_MS = 45_000;

let cached: { payload: PromoPayload; fetchedAt: number } | null = null;

/**
 * Exposed so other modules (e.g. the raise-cap / mint endpoints below)
 * can drop the cache after they mutate the promo, without needing to
 * wait up to {@link CACHE_TTL_MS} ms for the next admin page load to
 * see the change.
 */
export function invalidateTesterPromoCache(): void {
  cached = null;
}

const router: IRouter = Router();

// Parse a `from` / `to` query string into a Date. Accepts anything the
// JS Date constructor accepts (ISO timestamps, YYYY-MM-DD). Returns
// `null` when the param is absent and the sentinel `"invalid"` when the
// caller passed something we couldn't parse, so the route can surface a
// 400 instead of silently dropping the filter.
function parseDateParam(value: unknown): Date | null | "invalid" {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string") return "invalid";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "invalid" : d;
}

function requireAdmin(req: Request, res: Response): boolean {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Authentication required." });
    return false;
  }
  if (!isRequestAdmin(req as { user?: { email?: string | null } })) {
    res.status(403).json({ error: "Admin access required." });
    return false;
  }
  return true;
}

router.get("/admin/tester-promo", async (req: Request, res: Response) => {
  if (!requireAdmin(req, res)) return;

  const bypassCache = req.query.refresh === "1" || req.query.refresh === "true";
  const now = Date.now();
  if (
    !bypassCache &&
    cached &&
    now - cached.fetchedAt < CACHE_TTL_MS
  ) {
    res.json({
      ...cached.payload,
      cached: true,
      cachedAgeMs: now - cached.fetchedAt,
    });
    return;
  }

  try {
    const { payload } = await fetchPromoFromStripe();
    cached = { payload, fetchedAt: Date.now() };
    res.json({ ...payload, cached: false, cachedAgeMs: 0 });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[admin/tester-promo] failed to fetch from Stripe", err);
    res.status(502).json({ error: "Failed to load promo data from Stripe." });
  }
});

// POST /admin/tester-promo/raise-cap
//
// Stripe doesn't allow editing `max_redemptions` on either the coupon or
// an existing promotion code, so "raising the cap" is implemented as:
//   1. Deactivate the current promotion code.
//   2. Create a new promotion code on the same coupon, reusing the same
//      customer-facing `code` string (e.g. TESTER6M) with the new cap.
//   3. Record the new promotion code's id on the coupon metadata so
//      subsequent reads pick it up automatically.
//
// From the admin's point of view this looks like the cap simply went up.
router.post("/admin/tester-promo/raise-cap", async (req: Request, res: Response) => {
  if (!requireAdmin(req, res)) return;

  const raw = (req.body as { maxRedemptions?: unknown })?.maxRedemptions;
  const maxRedemptions = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isInteger(maxRedemptions) || maxRedemptions <= 0) {
    res.status(400).json({ error: "maxRedemptions must be a positive integer." });
    return;
  }

  try {
    const stripe = await getUncachableStripeClient();
    const coupon = await stripe.coupons.retrieve(COUPON_ID);
    const currentPromo = await resolveActivePromo(stripe, coupon);

    if (
      currentPromo.max_redemptions != null &&
      maxRedemptions <= currentPromo.max_redemptions
    ) {
      res.status(400).json({
        error: `New cap (${maxRedemptions}) must be greater than the current cap (${currentPromo.max_redemptions}).`,
      });
      return;
    }

    // Deactivate the old code first so Stripe lets us reuse the same code
    // string on the new promotion code (active codes must be unique).
    const wasActive = currentPromo.active;
    if (wasActive) {
      await stripe.promotionCodes.update(currentPromo.id, { active: false });
    }

    let newPromo: Stripe.PromotionCode;
    try {
      newPromo = await stripe.promotionCodes.create({
        promotion: { type: "coupon", coupon: COUPON_ID },
        code: currentPromo.code,
        max_redemptions: maxRedemptions,
        active: true,
      });
    } catch (createErr) {
      // Rollback: re-activate the prior code so testers aren't left
      // without a working promo if the create call failed mid-flight.
      if (wasActive) {
        await stripe.promotionCodes
          .update(currentPromo.id, { active: true })
          .catch((rollbackErr) => {
            // eslint-disable-next-line no-console
            console.error(
              "[admin/tester-promo] FAILED to re-activate old promo after create failure",
              rollbackErr,
            );
          });
      }
      throw createErr;
    }

    const updatedCoupon = await stripe.coupons.update(COUPON_ID, {
      metadata: { [ACTIVE_PROMO_METADATA_KEY]: newPromo.id },
    });

    const payload = buildPayload(newPromo, updatedCoupon);
    cached = { payload, fetchedAt: Date.now() };
    await recordPromoChange({
      action: "raise_cap",
      adminEmail: getRequestEmail(req as { user?: { email?: string | null } }),
      oldPromo: currentPromo,
      newPromo,
    });
    res.json({ ...payload, cached: false, cachedAgeMs: 0 });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[admin/tester-promo] failed to raise cap", err);
    invalidateTesterPromoCache();
    res.status(502).json({ error: "Failed to raise cap in Stripe." });
  }
});

// POST /admin/tester-promo/mint
//
// Mint a brand-new promotion code on the same coupon. The founder uses
// this when she wants a different customer-facing code string (for a new
// batch of testers, an influencer, etc). The previously active code is
// deactivated so testers can't keep redeeming the old one.
router.post("/admin/tester-promo/mint", async (req: Request, res: Response) => {
  if (!requireAdmin(req, res)) return;

  const body = (req.body ?? {}) as { code?: unknown; maxRedemptions?: unknown };
  const codeRaw = typeof body.code === "string" ? body.code.trim() : "";
  const maxRaw = typeof body.maxRedemptions === "number"
    ? body.maxRedemptions
    : Number(body.maxRedemptions);

  if (!codeRaw || codeRaw.length < 3 || codeRaw.length > 40 || !/^[A-Z0-9_-]+$/i.test(codeRaw)) {
    res.status(400).json({
      error: "Code must be 3–40 characters, letters/numbers/_/- only.",
    });
    return;
  }
  if (!Number.isInteger(maxRaw) || maxRaw <= 0) {
    res.status(400).json({ error: "maxRedemptions must be a positive integer." });
    return;
  }

  try {
    const stripe = await getUncachableStripeClient();
    const coupon = await stripe.coupons.retrieve(COUPON_ID);
    const currentPromo = await resolveActivePromo(stripe, coupon).catch(() => null);

    const wasActive = currentPromo?.active === true;
    if (currentPromo && wasActive) {
      await stripe.promotionCodes.update(currentPromo.id, { active: false });
    }

    let newPromo: Stripe.PromotionCode;
    try {
      newPromo = await stripe.promotionCodes.create({
        promotion: { type: "coupon", coupon: COUPON_ID },
        code: codeRaw.toUpperCase(),
        max_redemptions: maxRaw,
        active: true,
      });
    } catch (createErr) {
      // Rollback: re-activate the prior code so we don't leave the
      // tester promo silently disabled after a failed mint.
      if (currentPromo && wasActive) {
        await stripe.promotionCodes
          .update(currentPromo.id, { active: true })
          .catch((rollbackErr) => {
            // eslint-disable-next-line no-console
            console.error(
              "[admin/tester-promo] FAILED to re-activate old promo after mint failure",
              rollbackErr,
            );
          });
      }
      throw createErr;
    }

    const updatedCoupon = await stripe.coupons.update(COUPON_ID, {
      metadata: { [ACTIVE_PROMO_METADATA_KEY]: newPromo.id },
    });

    const payload = buildPayload(newPromo, updatedCoupon);
    cached = { payload, fetchedAt: Date.now() };
    await recordPromoChange({
      action: "mint",
      adminEmail: getRequestEmail(req as { user?: { email?: string | null } }),
      oldPromo: currentPromo,
      newPromo,
    });
    res.json({ ...payload, cached: false, cachedAgeMs: 0 });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[admin/tester-promo] failed to mint new code", err);
    invalidateTesterPromoCache();
    const message = err instanceof Error ? err.message : "Unknown error";
    // Stripe returns a clear "code already exists" error — surface it so
    // the admin knows to pick a different string.
    if (/already.*exist|already.*in use/i.test(message)) {
      res.status(409).json({ error: "That code is already in use. Pick a different one." });
      return;
    }
    res.status(502).json({ error: "Failed to mint new code in Stripe." });
  }
});

// Persist a row describing the swap from the previous active promo to the
// newly created one. We do this *after* Stripe has accepted the change so
// the audit log only records confirmed mutations. Logged-but-not-thrown:
// a DB failure must not roll back a successful Stripe operation, since
// the promo is already live for testers — we'd rather lose the audit row
// than confuse the founder with a 502 after a real change.
async function recordPromoChange(opts: {
  action: "raise_cap" | "mint";
  adminEmail: string | null;
  oldPromo: Stripe.PromotionCode | null;
  newPromo: Stripe.PromotionCode;
}): Promise<void> {
  try {
    await db.insert(testerPromoChangesTable).values({
      action: opts.action,
      adminEmail: opts.adminEmail ?? "unknown",
      oldCode: opts.oldPromo?.code ?? null,
      oldMaxRedemptions: opts.oldPromo?.max_redemptions ?? null,
      oldPromotionCodeId: opts.oldPromo?.id ?? null,
      newCode: opts.newPromo.code,
      newMaxRedemptions: opts.newPromo.max_redemptions ?? null,
      newPromotionCodeId: opts.newPromo.id,
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[admin/tester-promo] failed to write history row", err);
  }
}

// GET /admin/tester-promo/history
//
// Returns admin-driven promo changes (raise cap / mint), newest first.
//
// Query params (all optional, all backward-compatible — calling with no
// params still returns the most recent 20 rows like the widget expects):
//   - page: 1-indexed page number (default 1)
//   - pageSize: rows per page, 1..100 (default 20)
//   - action: filter to "raise_cap" or "mint" only
//   - q: free-text search; matches case-insensitively against
//        new_code, old_code, or admin_email (substring)
//
// Response includes `total` (matching the action filter) and the page
// metadata so the dedicated history page can paginate without guessing.
router.get("/admin/tester-promo/history", async (req: Request, res: Response) => {
  if (!requireAdmin(req, res)) return;

  const pageRaw = Number(req.query.page);
  const pageSizeRaw = Number(req.query.pageSize);
  const page = Number.isInteger(pageRaw) && pageRaw > 0 ? pageRaw : 1;
  const pageSize =
    Number.isInteger(pageSizeRaw) && pageSizeRaw > 0
      ? Math.min(pageSizeRaw, 100)
      : 20;

  const actionParam = typeof req.query.action === "string" ? req.query.action : "";
  const actionFilter =
    actionParam === "raise_cap" || actionParam === "mint" ? actionParam : null;

  const qRaw = typeof req.query.q === "string" ? req.query.q.trim() : "";
  // Cap query length so we don't push a giant string into the DB. 200
  // chars is well above any realistic promo code or email length.
  const qFilter = qRaw.length > 0 ? qRaw.slice(0, 200) : null;

  const fromDate = parseDateParam(req.query.from);
  const toDate = parseDateParam(req.query.to);
  if (fromDate === "invalid" || toDate === "invalid") {
    res.status(400).json({ error: "Invalid date range." });
    return;
  }

  const whereParts: SQL[] = [];
  if (actionFilter) {
    whereParts.push(eq(testerPromoChangesTable.action, actionFilter));
  }
  if (fromDate) {
    whereParts.push(gte(testerPromoChangesTable.createdAt, fromDate));
  }
  if (toDate) {
    whereParts.push(lte(testerPromoChangesTable.createdAt, toDate));
  }
  if (qFilter) {
    // Escape LIKE wildcards in the user input so e.g. "%" or "_" is
    // treated as a literal, not a wildcard.
    const escaped = qFilter.replace(/[\\%_]/g, (c) => `\\${c}`);
    const pattern = `%${escaped}%`;
    const orClause = or(
      ilike(testerPromoChangesTable.newCode, pattern),
      ilike(testerPromoChangesTable.oldCode, pattern),
      ilike(testerPromoChangesTable.adminEmail, pattern),
    );
    if (orClause) whereParts.push(orClause);
  }
  const whereClause =
    whereParts.length === 0
      ? undefined
      : whereParts.length === 1
        ? whereParts[0]
        : and(...whereParts);

  try {
    const offset = (page - 1) * pageSize;
    const [rows, totalRow] = await Promise.all([
      db
        .select()
        .from(testerPromoChangesTable)
        .where(whereClause)
        .orderBy(desc(testerPromoChangesTable.createdAt))
        .limit(pageSize)
        .offset(offset),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(testerPromoChangesTable)
        .where(whereClause),
    ]);
    const total = totalRow[0]?.count ?? 0;
    res.json({
      changes: rows.map((r) => ({
        id: r.id,
        action: r.action,
        adminEmail: r.adminEmail,
        oldCode: r.oldCode,
        oldMaxRedemptions: r.oldMaxRedemptions,
        oldPromotionCodeId: r.oldPromotionCodeId,
        newCode: r.newCode,
        newMaxRedemptions: r.newMaxRedemptions,
        newPromotionCodeId: r.newPromotionCodeId,
        createdAt: r.createdAt.toISOString(),
      })),
      total,
      page,
      pageSize,
      action: actionFilter,
      q: qFilter,
      from: fromDate ? fromDate.toISOString() : null,
      to: toDate ? toDate.toISOString() : null,
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[admin/tester-promo] failed to load history", err);
    res.status(500).json({ error: "Failed to load promo history." });
  }
});

// GET /admin/tester-promo/history/summary
//
// Returns per-bucket counts of raise_cap and mint actions, respecting
// the same filters as /history (action, q, from, to). The bucket size
// is "quarter" by default; pass `bucket=month` for finer granularity
// when the active range is short. Buckets are returned oldest first
// because that's the order Pia reads them in (Q1 → Q2 → …) above the
// newest-first table.
router.get(
  "/admin/tester-promo/history/summary",
  async (req: Request, res: Response) => {
    if (!requireAdmin(req, res)) return;

    const actionParam =
      typeof req.query.action === "string" ? req.query.action : "";
    const actionFilter =
      actionParam === "raise_cap" || actionParam === "mint" ? actionParam : null;

    const fromDate = parseDateParam(req.query.from);
    const toDate = parseDateParam(req.query.to);
    if (fromDate === "invalid" || toDate === "invalid") {
      res.status(400).json({ error: "Invalid date range." });
      return;
    }

    const qRaw = typeof req.query.q === "string" ? req.query.q.trim() : "";
    const qFilter = qRaw.length > 0 ? qRaw.slice(0, 200) : null;

    const bucketParam =
      typeof req.query.bucket === "string" ? req.query.bucket : "";
    const bucket: "quarter" | "month" =
      bucketParam === "month" ? "month" : "quarter";

    const whereParts: SQL[] = [];
    if (actionFilter) {
      whereParts.push(eq(testerPromoChangesTable.action, actionFilter));
    }
    if (fromDate) {
      whereParts.push(gte(testerPromoChangesTable.createdAt, fromDate));
    }
    if (toDate) {
      whereParts.push(lte(testerPromoChangesTable.createdAt, toDate));
    }
    if (qFilter) {
      const escaped = qFilter.replace(/[\\%_]/g, (c) => `\\${c}`);
      const pattern = `%${escaped}%`;
      const orClause = or(
        ilike(testerPromoChangesTable.newCode, pattern),
        ilike(testerPromoChangesTable.oldCode, pattern),
        ilike(testerPromoChangesTable.adminEmail, pattern),
      );
      if (orClause) whereParts.push(orClause);
    }
    const whereClause =
      whereParts.length === 0
        ? undefined
        : whereParts.length === 1
          ? whereParts[0]
          : and(...whereParts);

    try {
      // date_trunc on a timestamptz uses the session's TimeZone, which
      // could shift a row across a quarter/month boundary depending on
      // where the DB is configured. Force the truncation to happen in
      // UTC by converting to UTC first, then cast the resulting naive
      // timestamp back to timestamptz "AT TIME ZONE 'UTC'" so it round
      // -trips as the same UTC instant the frontend formats from.
      const truncUnit = bucket === "month" ? "month" : "quarter";
      const truncExpr = sql`(date_trunc(${truncUnit}, ${testerPromoChangesTable.createdAt} at time zone 'UTC') at time zone 'UTC')`;
      const rows = await db
        .select({
          bucketStart: sql<Date>`${truncExpr}`.as("bucket_start"),
          raiseCap: sql<number>`count(*) filter (where ${testerPromoChangesTable.action} = 'raise_cap')::int`,
          mint: sql<number>`count(*) filter (where ${testerPromoChangesTable.action} = 'mint')::int`,
          total: sql<number>`count(*)::int`,
        })
        .from(testerPromoChangesTable)
        .where(whereClause)
        .groupBy(sql`bucket_start`)
        .orderBy(sql`bucket_start asc`);

      res.json({
        bucket,
        buckets: rows.map((r) => ({
          bucketStart:
            r.bucketStart instanceof Date
              ? r.bucketStart.toISOString()
              : new Date(r.bucketStart as unknown as string).toISOString(),
          raiseCap: r.raiseCap ?? 0,
          mint: r.mint ?? 0,
          total: r.total ?? 0,
        })),
        action: actionFilter,
        q: qFilter,
        from: fromDate ? fromDate.toISOString() : null,
        to: toDate ? toDate.toISOString() : null,
      });
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("[admin/tester-promo] failed to load history summary", err);
      res.status(500).json({ error: "Failed to load promo history summary." });
    }
  },
);

// GET /admin/tester-promo/history.csv
//
// Streams *all* rows matching the action filter (no pagination) as CSV so
// Pia can pull the audit log into a spreadsheet for quarterly reviews.
// Columns are intentionally snake_case to match the database / what an
// analyst would expect, even though the JSON endpoint above uses camelCase.
function csvEscape(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  const s = String(value);
  // Quote if the value contains a comma, quote, or newline. Double any
  // embedded quotes per RFC 4180.
  if (/[",\r\n]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

router.get("/admin/tester-promo/history.csv", async (req: Request, res: Response) => {
  if (!requireAdmin(req, res)) return;

  const actionParam = typeof req.query.action === "string" ? req.query.action : "";
  const actionFilter =
    actionParam === "raise_cap" || actionParam === "mint" ? actionParam : null;

  const fromDate = parseDateParam(req.query.from);
  const toDate = parseDateParam(req.query.to);
  if (fromDate === "invalid" || toDate === "invalid") {
    res.status(400).json({ error: "Invalid date range." });
    return;
  }

  const qRaw = typeof req.query.q === "string" ? req.query.q.trim() : "";
  const qFilter = qRaw.length > 0 ? qRaw.slice(0, 200) : null;

  const whereParts: SQL[] = [];
  if (actionFilter) {
    whereParts.push(eq(testerPromoChangesTable.action, actionFilter));
  }
  if (fromDate) {
    whereParts.push(gte(testerPromoChangesTable.createdAt, fromDate));
  }
  if (toDate) {
    whereParts.push(lte(testerPromoChangesTable.createdAt, toDate));
  }
  if (qFilter) {
    const escaped = qFilter.replace(/[\\%_]/g, (c) => `\\${c}`);
    const pattern = `%${escaped}%`;
    const orClause = or(
      ilike(testerPromoChangesTable.newCode, pattern),
      ilike(testerPromoChangesTable.oldCode, pattern),
      ilike(testerPromoChangesTable.adminEmail, pattern),
    );
    if (orClause) whereParts.push(orClause);
  }
  const whereClause =
    whereParts.length === 0
      ? undefined
      : whereParts.length === 1
        ? whereParts[0]
        : and(...whereParts);

  try {
    const rows = await db
      .select()
      .from(testerPromoChangesTable)
      .where(whereClause)
      .orderBy(desc(testerPromoChangesTable.createdAt));

    // Embed the chosen date range (or today, if unfiltered) into the
    // filename so saving multiple exports to the same folder doesn't
    // overwrite the previous one and Pia can tell at a glance which
    // quarter a file represents.
    const isoDay = (d: Date) => d.toISOString().slice(0, 10);
    const rangePart =
      fromDate && toDate
        ? `${isoDay(fromDate)}_to_${isoDay(toDate)}`
        : fromDate
          ? `from-${isoDay(fromDate)}`
          : toDate
            ? `until-${isoDay(toDate)}`
            : isoDay(new Date());
    const filenameSuffix = actionFilter ? `-${actionFilter}` : "";
    const filename = `tester-promo-history-${rangePart}${filenameSuffix}.csv`;
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${filename}"`,
    );

    const header = [
      "created_at",
      "action",
      "admin_email",
      "old_code",
      "old_max_redemptions",
      "new_code",
      "new_max_redemptions",
    ].join(",");
    res.write(header + "\r\n");

    for (const r of rows) {
      const line = [
        csvEscape(r.createdAt.toISOString()),
        csvEscape(r.action),
        csvEscape(r.adminEmail),
        csvEscape(r.oldCode),
        csvEscape(r.oldMaxRedemptions),
        csvEscape(r.newCode),
        csvEscape(r.newMaxRedemptions),
      ].join(",");
      res.write(line + "\r\n");
    }
    res.end();
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[admin/tester-promo] failed to export history CSV", err);
    if (!res.headersSent) {
      res.status(500).json({ error: "Failed to export promo history." });
    } else {
      res.end();
    }
  }
});

export default router;
