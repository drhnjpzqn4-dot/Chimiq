import { Router, type IRouter } from "express";
import { z } from "zod";
import { and, desc, eq, gte, ilike, isNotNull, isNull, lte, sql } from "drizzle-orm";
import { db, feedbackSubmissionsTable, usersTable } from "@workspace/db";
import { ipRateLimit } from "../lib/rateLimit.js";
import { sanitizeText, SanitizationError } from "../lib/sanitize.js";
import { notifyNewFeedback } from "../lib/feedbackNotify.js";
import { isRequestAdmin } from "../lib/admin.js";

const FeedbackBody = z.object({
  message: z.string().trim().min(1).max(4000),
  email: z.string().trim().email().max(320).optional().or(z.literal("")),
  locale: z.string().trim().max(16).optional(),
  pageUrl: z.string().trim().max(2000).optional(),
});

const router: IRouter = Router();

const feedbackIpLimit = ipRateLimit({
  windowMs: 60_000,
  max: 5,
  key: "feedback",
});

router.post("/feedback", feedbackIpLimit, async (req, res) => {
  const parseResult = FeedbackBody.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({ error: "Invalid feedback data." });
    return;
  }

  const { message, email, locale, pageUrl } = parseResult.data;

  let safeMessage: string;
  try {
    safeMessage = sanitizeText(message, {
      fieldName: "Feedback",
      maxLength: 4000,
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

  const userId = (req as { user?: { id?: string } }).user?.id ?? null;
  const userAgent = req.headers["user-agent"]?.toString().slice(0, 500) ?? null;
  const ip =
    (req.headers["x-forwarded-for"] as string | undefined)
      ?.split(",")[0]
      ?.trim() ||
    req.ip ||
    req.socket.remoteAddress ||
    null;

  try {
    await db.insert(feedbackSubmissionsTable).values({
      userId,
      email: email && email.length > 0 ? email : null,
      message: safeMessage,
      locale: locale ?? null,
      pageUrl: pageUrl ?? null,
      userAgent,
      ip,
    });

    req.log.info(
      { userId, locale, hasEmail: !!email },
      "Feedback submission received",
    );

    // Non-blocking: fire Slack notification (or no-op when the webhook
    // env var isn't set). Failures inside notifyNewFeedback are logged
    // but never propagated, so the user's request always succeeds once
    // the row is persisted.
    notifyNewFeedback(
      {
        message: safeMessage,
        email: email && email.length > 0 ? email : null,
        locale: locale ?? null,
        pageUrl: pageUrl ?? null,
        userId,
      },
      req.log,
    );

    res.json({ ok: true });
  } catch (err) {
    req.log.error({ err }, "Failed to store feedback submission");
    res.status(500).json({ error: "Could not save feedback. Please try again." });
  }
});

// --- Admin triage (#124) ----------------------------------------------------

const STATUSES = ["new", "read", "archived"] as const;
type FeedbackStatus = (typeof STATUSES)[number];

const ListQuery = z.object({
  status: z.enum(["new", "read", "archived", "all"]).optional(),
  hasEmail: z.enum(["yes", "no", "any"]).optional(),
  q: z.string().trim().max(200).optional(),
  from: z.string().trim().max(40).optional(),
  to: z.string().trim().max(40).optional(),
  page: z.coerce.number().int().min(1).max(1000).optional(),
  pageSize: z.coerce.number().int().min(1).max(200).optional(),
});

function parseDate(value: string | undefined): Date | null | "invalid" {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "invalid" : d;
}

function requireAdmin(req: Parameters<typeof isRequestAdmin>[0]): boolean {
  return isRequestAdmin(req);
}

router.get("/admin/feedback", async (req, res) => {
  if (!requireAdmin(req as { user?: { email?: string | null } })) {
    res.status(403).json({ error: "Admin access required." });
    return;
  }
  const parsed = ListQuery.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid filter values." });
    return;
  }
  const {
    status = "new",
    hasEmail = "any",
    q,
    from,
    to,
    page = 1,
    pageSize = 50,
  } = parsed.data;

  const conditions = [];
  if (status !== "all") {
    conditions.push(eq(feedbackSubmissionsTable.status, status));
  }
  if (hasEmail === "yes") {
    conditions.push(isNotNull(feedbackSubmissionsTable.email));
  } else if (hasEmail === "no") {
    conditions.push(isNull(feedbackSubmissionsTable.email));
  }
  const fromDate = parseDate(from);
  const toDate = parseDate(to);
  if (fromDate === "invalid" || toDate === "invalid") {
    res.status(400).json({ error: "Invalid date range." });
    return;
  }
  if (fromDate) conditions.push(gte(feedbackSubmissionsTable.createdAt, fromDate));
  if (toDate) conditions.push(lte(feedbackSubmissionsTable.createdAt, toDate));
  if (q) {
    // Escape ILIKE wildcards so user-supplied % / _ can't widen the query.
    const escaped = q.replace(/[\\%_]/g, (m) => `\\${m}`);
    conditions.push(ilike(feedbackSubmissionsTable.message, `%${escaped}%`));
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;
  const offset = (page - 1) * pageSize;

  try {
    const [rows, [{ total }], statusRows] = await Promise.all([
      db
        .select({
          id: feedbackSubmissionsTable.id,
          message: feedbackSubmissionsTable.message,
          email: feedbackSubmissionsTable.email,
          locale: feedbackSubmissionsTable.locale,
          pageUrl: feedbackSubmissionsTable.pageUrl,
          userAgent: feedbackSubmissionsTable.userAgent,
          status: feedbackSubmissionsTable.status,
          createdAt: feedbackSubmissionsTable.createdAt,
          userId: feedbackSubmissionsTable.userId,
          userEmail: usersTable.email,
          userFirstName: usersTable.firstName,
          userLastName: usersTable.lastName,
        })
        .from(feedbackSubmissionsTable)
        .leftJoin(usersTable, eq(feedbackSubmissionsTable.userId, usersTable.id))
        .where(where ?? sql`true`)
        .orderBy(desc(feedbackSubmissionsTable.createdAt))
        .limit(pageSize)
        .offset(offset),
      db
        .select({ total: sql<number>`count(*)::int` })
        .from(feedbackSubmissionsTable)
        .where(where ?? sql`true`),
      // Headline counts ignore filters so the tab badges reflect the
      // whole queue, not "matches in current view".
      db
        .select({
          status: feedbackSubmissionsTable.status,
          c: sql<number>`count(*)::int`,
        })
        .from(feedbackSubmissionsTable)
        .groupBy(feedbackSubmissionsTable.status),
    ]);

    const counts: Record<FeedbackStatus | "total", number> = {
      new: 0,
      read: 0,
      archived: 0,
      total: 0,
    };
    for (const row of statusRows) {
      const n = Number(row.c);
      counts.total += n;
      if (row.status === "new" || row.status === "read" || row.status === "archived") {
        counts[row.status as FeedbackStatus] += n;
      }
    }

    const submissions = rows.map((r) => ({
      id: r.id,
      message: r.message,
      email: r.email,
      locale: r.locale,
      pageUrl: r.pageUrl,
      userAgent: r.userAgent,
      status: r.status,
      createdAt: r.createdAt.toISOString(),
      userId: r.userId,
      userEmail: r.userEmail,
      userName:
        [r.userFirstName, r.userLastName].filter(Boolean).join(" ").trim() || null,
    }));

    res.json({
      submissions,
      total: Number(total),
      page,
      pageSize,
      counts,
    });
  } catch (err) {
    req.log.error({ err }, "admin feedback list failed");
    res.status(500).json({ error: "Could not load feedback." });
  }
});

const StatusBody = z.object({
  status: z.enum(STATUSES),
});

router.post("/admin/feedback/:id/status", async (req, res) => {
  if (!requireAdmin(req as { user?: { email?: string | null } })) {
    res.status(403).json({ error: "Admin access required." });
    return;
  }
  const id = Number.parseInt(String(req.params.id ?? ""), 10);
  if (!Number.isFinite(id) || id <= 0) {
    res.status(400).json({ error: "Invalid feedback id." });
    return;
  }
  const parsed = StatusBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid status." });
    return;
  }
  try {
    const result = await db
      .update(feedbackSubmissionsTable)
      .set({ status: parsed.data.status })
      .where(eq(feedbackSubmissionsTable.id, id))
      .returning({ id: feedbackSubmissionsTable.id });
    if (result.length === 0) {
      res.status(404).json({ error: "Feedback not found." });
      return;
    }
    res.json({ ok: true });
  } catch (err) {
    req.log.error({ err }, "admin feedback status update failed");
    res.status(500).json({ error: "Could not update status." });
  }
});

export default router;
