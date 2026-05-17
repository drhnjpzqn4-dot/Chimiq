import { Router, type IRouter } from "express";
import { z } from "zod";
import { ipRateLimit } from "../lib/rateLimit.js";
import { sanitizeText, SanitizationError } from "../lib/sanitize.js";
import { notifyNewFeedback } from "../lib/feedbackNotify.js";
import { isRequestAdmin } from "../lib/admin.js";
import { supabaseAdmin } from "../lib/supabase-admin.js";

const FeedbackBody = z.object({
  message: z.string().trim().min(1).max(4000),
  email: z.string().trim().email().max(320).optional().or(z.literal("")),
  locale: z.string().trim().max(16).optional(),
  pageUrl: z.string().trim().max(2000).optional(),
});

const RatingBody = z.object({
  rating: z.number().int().min(1).max(5),
  source: z.string().trim().max(80).optional(),
});

const router: IRouter = Router();

interface FeedbackSubmissionRow {
  id: number;
  message: string;
  email: string | null;
  locale: string | null;
  page_url: string | null;
  user_agent: string | null;
  status: string;
  created_at: string;
  user_id: string | null;
}

interface FeedbackUserRow {
  id: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
}

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
    const { error } = await supabaseAdmin.from("feedback_submissions").insert({
      user_id: userId,
      email: email && email.length > 0 ? email : null,
      message: safeMessage,
      locale: locale ?? null,
      page_url: pageUrl ?? null,
      user_agent: userAgent,
      ip,
    });
    if (error) throw error;

    req.log.info(
      { userId, locale, hasEmail: !!email },
      "Feedback submission received",
    );

    // Non-blocking: send the team an email via SendGrid (no-op when the
    // SendGrid connector isn't configured). Failures inside
    // notifyNewFeedback are logged but never propagated, so the user's
    // request always succeeds once the row is persisted.
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

router.post("/feedback/rating", feedbackIpLimit, async (req, res) => {
  const parseResult = RatingBody.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({ error: "Invalid rating data." });
    return;
  }

  try {
    const { error } = await supabaseAdmin.from("app_ratings").insert({
      rating: parseResult.data.rating,
      source: parseResult.data.source ?? null,
    });
    if (error) throw error;
    res.json({ ok: true });
  } catch (err) {
    req.log.error({ err }, "Failed to store app rating");
    res.status(500).json({ error: "Could not save rating. Please try again." });
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

function applyFeedbackFilters(
  query: any,
  filters: {
    status: FeedbackStatus | "all";
    hasEmail: "yes" | "no" | "any";
    q?: string;
    fromDate: Date | null;
    toDate: Date | null;
  },
) {
  let next = query;
  if (filters.status !== "all") {
    next = next.eq("status", filters.status);
  }
  if (filters.hasEmail === "yes") {
    next = next.not("email", "is", null);
  } else if (filters.hasEmail === "no") {
    next = next.is("email", null);
  }
  if (filters.fromDate) {
    next = next.gte("created_at", filters.fromDate.toISOString());
  }
  if (filters.toDate) {
    next = next.lte("created_at", filters.toDate.toISOString());
  }
  if (filters.q) {
    const escaped = filters.q.replace(/[\\%_]/g, (m) => `\\${m}`);
    next = next.ilike("message", `%${escaped}%`);
  }
  return next;
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

  const fromDate = parseDate(from);
  const toDate = parseDate(to);
  if (fromDate === "invalid" || toDate === "invalid") {
    res.status(400).json({ error: "Invalid date range." });
    return;
  }
  const offset = (page - 1) * pageSize;

  try {
    const baseFilters = { status, hasEmail, q, fromDate, toDate };
    const rowsQuery = applyFeedbackFilters(
      supabaseAdmin
        .from("feedback_submissions")
        .select("id,message,email,locale,page_url,user_agent,status,created_at,user_id")
        .order("created_at", { ascending: false })
        .range(offset, offset + pageSize - 1),
      baseFilters,
    );
    const countQuery = applyFeedbackFilters(
      supabaseAdmin
        .from("feedback_submissions")
        .select("id", { head: true, count: "exact" }),
      baseFilters,
    );

    const [rowsResult, countResult, ...statusCountResults] = await Promise.all([
      rowsQuery,
      countQuery,
      ...STATUSES.map((s) =>
        supabaseAdmin
          .from("feedback_submissions")
          .select("id", { head: true, count: "exact" })
          .eq("status", s),
      ),
    ]);
    if (rowsResult.error) throw rowsResult.error;
    if (countResult.error) throw countResult.error;
    for (const result of statusCountResults) {
      if (result.error) throw result.error;
    }

    const rows = (rowsResult.data ?? []) as FeedbackSubmissionRow[];
    const userIds = Array.from(new Set(rows.map((r) => r.user_id).filter((id): id is string => !!id)));
    let usersById = new Map<string, FeedbackUserRow>();
    if (userIds.length > 0) {
      const { data: userRows, error: userError } = await supabaseAdmin
        .from("users")
        .select("id,email,first_name,last_name")
        .in("id", userIds);
      if (userError) throw userError;
      usersById = new Map(((userRows ?? []) as FeedbackUserRow[]).map((u) => [u.id, u]));
    }

    const counts: Record<FeedbackStatus | "total", number> = {
      new: 0,
      read: 0,
      archived: 0,
      total: 0,
    };
    STATUSES.forEach((s, index) => {
      const n = statusCountResults[index]?.count ?? 0;
      counts.total += n;
      counts[s] = n;
    });

    const submissions = rows.map((r) => ({
      id: r.id,
      message: r.message,
      email: r.email,
      locale: r.locale,
      pageUrl: r.page_url,
      userAgent: r.user_agent,
      status: r.status,
      createdAt: new Date(r.created_at).toISOString(),
      userId: r.user_id,
      userEmail: r.user_id ? usersById.get(r.user_id)?.email ?? null : null,
      userName:
        r.user_id
          ? [
              usersById.get(r.user_id)?.first_name,
              usersById.get(r.user_id)?.last_name,
            ].filter(Boolean).join(" ").trim() || null
          : null,
    }));

    res.json({
      submissions,
      total: Number(countResult.count ?? 0),
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
    const { data, error } = await supabaseAdmin
      .from("feedback_submissions")
      .update({ status: parsed.data.status })
      .eq("id", id)
      .select("id");
    if (error) throw error;
    if ((data?.length ?? 0) === 0) {
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
