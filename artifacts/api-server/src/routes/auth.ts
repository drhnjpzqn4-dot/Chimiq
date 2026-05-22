import { Router, type IRouter, type Request, type Response } from "express";
import {
  GetCurrentAuthUserResponse,
  ExchangeMobileAuthorizationCodeBody,
  LogoutMobileSessionResponse,
} from "@workspace/api-zod";
import { verifyJWT } from "../lib/auth.js";
import { getUserProfileFields } from "../lib/userProfile.js";
import { supabaseAdmin, supabaseAnon } from "../lib/supabase-admin.js";

const router: IRouter = Router();

router.get("/me", async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  try {
    const fields = await getUserProfileFields(req.user.id);
    res.json({
      ...req.user,
      onboardingCompleted: fields.onboardingCompleted,
      displayName: fields.displayName,
      avatarEmoji: fields.avatarEmoji ?? "✨",
    });
  } catch (err) {
    req.log?.error?.({ err }, "Failed to load /me profile fields");
    res.status(500).json({ error: "Could not load user" });
  }
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
    const supabase = supabaseAdmin;
    const consentRow = {
      user_id: userId,
      terms_version: bodyVersion,
      accepted_at: now.toISOString(),
      ip,
      user_agent: userAgent,
    };

    if (bodyVersion === MEDICAL_DISCLAIMER_VERSION) {
      const { error } = await supabase.from("legal_consents").insert(consentRow);
      if (error) throw error;
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

    const { error: insErr } = await supabase.from("legal_consents").insert(consentRow);
    if (insErr) throw insErr;
    const { error: updErr } = await supabase
      .from("users")
      .update({
        accepted_terms_version: bodyVersion,
        accepted_terms_at: now.toISOString(),
        updated_at: now.toISOString(),
      })
      .eq("id", userId);
    if (updErr) throw updErr;
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
    const supabase = supabaseAdmin;
    const { data: row, error: uErr } = await supabase
      .from("users")
      .select("accepted_terms_version, accepted_terms_at")
      .eq("id", req.user.id)
      .maybeSingle();
    if (uErr) throw uErr;

    const { data: medRows, error: mErr } = await supabase
      .from("legal_consents")
      .select("accepted_at")
      .eq("user_id", req.user.id)
      .eq("terms_version", MEDICAL_DISCLAIMER_VERSION)
      .order("accepted_at", { ascending: false })
      .limit(1);
    if (mErr) throw mErr;
    const medRow = medRows?.[0];

    res.json({
      acceptedVersion: (row?.accepted_terms_version as string | null) ?? null,
      currentVersion: CURRENT_TERMS_VERSION,
      acceptedAt: row?.accepted_terms_at
        ? new Date(row.accepted_terms_at as string).toISOString()
        : null,
      acceptedMedicalDisclaimerVersion: medRow
        ? MEDICAL_DISCLAIMER_VERSION
        : null,
      acceptedMedicalDisclaimerAt: medRow?.accepted_at
        ? new Date(medRow.accepted_at as string).toISOString()
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
    const fields = await getUserProfileFields(req.user.id);
    const user = {
      ...req.user,
      emailVerified: req.user.emailVerified === true,
      onboardingCompleted: fields.onboardingCompleted,
      displayName: fields.displayName,
      avatarEmoji: fields.avatarEmoji ?? "✨",
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
    const supabase = supabaseAnon;
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
    const supabase = supabaseAdmin;
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
