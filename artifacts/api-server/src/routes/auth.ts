import { Router, type IRouter, type Request, type Response } from "express";
import {
  GetCurrentAuthUserResponse,
  ExchangeMobileAuthorizationCodeBody,
  LogoutMobileSessionResponse,
} from "@workspace/api-zod";
import { db, usersTable, legalConsentsTable } from "@workspace/db";
import { and, desc, eq } from "drizzle-orm";
import {
  getSupabaseAdminClient,
  getSupabaseClient,
  verifyJWT,
} from "../lib/auth.js";

const router: IRouter = Router();

router.get("/me", (req: Request, res: Response) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  res.json(req.user);
});

const CURRENT_TERMS_VERSION = "1.0";
const MEDICAL_DISCLAIMER_VERSION = "medical_disclaimer_v1";

router.post("/legal/consent", async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Sign in first." });
    return;
  }
  const userId = req.user.id;
  const bodyVersion =
    typeof req.body?.version === "string" && req.body.version.trim().length > 0
      ? req.body.version.trim()
      : CURRENT_TERMS_VERSION;

  const ip = req.ip ? req.ip.slice(0, 64) : null;
  const userAgent =
    typeof req.headers["user-agent"] === "string"
      ? req.headers["user-agent"].slice(0, 1000)
      : null;

  try {
    const now = new Date();

    if (bodyVersion === MEDICAL_DISCLAIMER_VERSION) {
      await db.insert(legalConsentsTable).values({
        userId,
        termsVersion: MEDICAL_DISCLAIMER_VERSION,
        acceptedAt: now,
        ip,
        userAgent,
      });
      res.json({
        ok: true,
        acceptedMedicalDisclaimerVersion: MEDICAL_DISCLAIMER_VERSION,
        acceptedMedicalDisclaimerAt: now.toISOString(),
      });
      return;
    }

    if (bodyVersion !== CURRENT_TERMS_VERSION) {
      res.status(400).json({ error: "Unknown consent version." });
      return;
    }

    await db.insert(legalConsentsTable).values({
      userId,
      termsVersion: bodyVersion,
      acceptedAt: now,
      ip,
      userAgent,
    });
    await db
      .update(usersTable)
      .set({ acceptedTermsVersion: bodyVersion, acceptedTermsAt: now })
      .where(eq(usersTable.id, userId));
    res.json({
      ok: true,
      acceptedVersion: bodyVersion,
      acceptedAt: now.toISOString(),
    });
  } catch (err) {
    req.log?.error?.({ err }, "Failed to record legal consent");
    res.status(500).json({ error: "Could not record consent." });
  }
});

router.get("/legal/consent", async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) {
    res.json({
      acceptedVersion: null,
      currentVersion: CURRENT_TERMS_VERSION,
      acceptedAt: null,
      acceptedMedicalDisclaimerVersion: null,
      acceptedMedicalDisclaimerAt: null,
      currentMedicalDisclaimerVersion: MEDICAL_DISCLAIMER_VERSION,
    });
    return;
  }
  try {
    const [row] = await db
      .select({
        acceptedTermsVersion: usersTable.acceptedTermsVersion,
        acceptedTermsAt: usersTable.acceptedTermsAt,
      })
      .from(usersTable)
      .where(eq(usersTable.id, req.user.id))
      .limit(1);

    const [medRow] = await db
      .select({ acceptedAt: legalConsentsTable.acceptedAt })
      .from(legalConsentsTable)
      .where(
        and(
          eq(legalConsentsTable.userId, req.user.id),
          eq(legalConsentsTable.termsVersion, MEDICAL_DISCLAIMER_VERSION),
        ),
      )
      .orderBy(desc(legalConsentsTable.acceptedAt))
      .limit(1);

    res.json({
      acceptedVersion: row?.acceptedTermsVersion ?? null,
      currentVersion: CURRENT_TERMS_VERSION,
      acceptedAt: row?.acceptedTermsAt
        ? new Date(row.acceptedTermsAt).toISOString()
        : null,
      acceptedMedicalDisclaimerVersion: medRow
        ? MEDICAL_DISCLAIMER_VERSION
        : null,
      acceptedMedicalDisclaimerAt: medRow?.acceptedAt
        ? new Date(medRow.acceptedAt).toISOString()
        : null,
      currentMedicalDisclaimerVersion: MEDICAL_DISCLAIMER_VERSION,
    });
  } catch (err) {
    req.log?.error?.({ err }, "Failed to load legal consent");
    res.status(500).json({ error: "Could not load consent." });
  }
});

const handleAuthUserGet = async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) {
    res.json(GetCurrentAuthUserResponse.parse({ user: null }));
    return;
  }
  try {
    const [row] = await db
      .select({ onboardingCompleted: usersTable.onboardingCompleted })
      .from(usersTable)
      .where(eq(usersTable.id, req.user.id));
    const user = {
      ...req.user,
      emailVerified: req.user.emailVerified === true,
      onboardingCompleted: row?.onboardingCompleted ?? false,
    };
    res.json(GetCurrentAuthUserResponse.parse({ user }));
  } catch (err) {
    req.log?.error?.({ err }, "Failed to load user onboarding state");
    res.status(500).json({ error: "Could not load user" });
  }
};

router.get("/auth/user", handleAuthUserGet);

router.post(
  "/mobile-auth/token-exchange",
  async (req: Request, res: Response) => {
    const parsed = ExchangeMobileAuthorizationCodeBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Missing or invalid required parameters" });
      return;
    }
    res.status(410).json({
      error:
        "Use @supabase/supabase-js in the client; server session exchange is removed.",
    });
  },
);

router.post("/mobile-auth/logout", async (_req: Request, res: Response) => {
  res.json(LogoutMobileSessionResponse.parse({ success: true }));
});

router.post("/auth/forgot-password", async (req: Request, res: Response) => {
  const { email } = req.body;
  if (!email) {
    res.status(400).json({ error: "Email required" });
    return;
  }
  try {
    const supabase = getSupabaseClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: "https://www.chimiq.com/reset-password",
    });
    if (error) {
      req.log?.warn?.({ error: error.message }, "Forgot password Supabase error");
    }
    res.json({ ok: true });
  } catch (err) {
    req.log?.error?.({ err }, "Forgot password error");
    res.status(500).json({ error: "Failed to send reset email" });
  }
});

router.post("/auth/reset-password", async (req: Request, res: Response) => {
  const { access_token, password } = req.body;
  if (!access_token || !password) {
    res.status(400).json({ error: "access_token and password required" });
    return;
  }
  try {
    const payload = await verifyJWT(access_token);
    if (!payload || !payload.sub) {
      res.status(401).json({ error: "Invalid or expired reset link" });
      return;
    }
    const supabase = getSupabaseAdminClient();
    const { error } = await supabase.auth.admin.updateUserById(
      payload.sub as string,
      { password },
    );
    if (error) {
      res.status(400).json({ error: error.message });
      return;
    }
    res.json({ ok: true });
  } catch (err) {
    req.log?.error?.({ err }, "Reset password error");
    res.status(500).json({ error: "Failed to reset password" });
  }
});

export default router;
