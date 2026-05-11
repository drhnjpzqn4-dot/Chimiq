import { Router, type IRouter, type Request, type Response } from "express";
import {
  GetCurrentAuthUserResponse,
  ExchangeMobileAuthorizationCodeBody,
  ExchangeMobileAuthorizationCodeResponse,
  LogoutMobileSessionResponse,
} from "@workspace/api-zod";
import { db, usersTable, legalConsentsTable, sessionsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import {
  clearSession,
  getSessionId,
  createSession,
  deleteSession,
  SESSION_COOKIE,
  SESSION_TTL,
  type SessionData,
  getSupabaseAdminClient,
  getSupabaseClient,
  supabaseUserToAuthUser,
  verifyJWT,
} from "../lib/auth";

const router: IRouter = Router();

function getOrigin(req: Request): string {
  const proto = req.headers["x-forwarded-proto"] || "https";
  const host =
    req.headers["x-forwarded-host"] || req.headers["host"] || "localhost";
  return `${proto}://${host}`;
}

function setSessionCookie(res: Response, sid: string) {
  res.cookie(SESSION_COOKIE, sid, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL,
  });
}

// Allowlist of native deep-link callback URLs
const NATIVE_RETURN_TO_ALLOWLIST = new Set<string>([
  "skinscreen://auth/callback",
]);

function getSafeReturnTo(value: unknown): string {
  if (typeof value !== "string") return "/";
  if (NATIVE_RETURN_TO_ALLOWLIST.has(value)) return value;
  if (!value.startsWith("/") || value.startsWith("//")) return "/";
  return value;
}

/**
 * Upsert user in local database from Supabase auth
 */
async function upsertUser(
  supabaseUserId: string,
  email: string | undefined,
  firstName: string | null,
  lastName: string | null,
  profileImageUrl: string | null,
  emailVerified: boolean
) {
  const userData = {
    id: supabaseUserId,
    email: email || null,
    firstName,
    lastName,
    profileImageUrl,
    emailVerified,
  };

  const [user] = await db
    .insert(usersTable)
    .values(userData)
    .onConflictDoUpdate({
      target: usersTable.id,
      set: {
        ...userData,
        updatedAt: new Date(),
      },
    })
    .returning();
  return user;
}

router.get("/me", (req: Request, res: Response) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  res.json(req.user);
});

// Legal consent endpoints (unchanged from original)
const CURRENT_TERMS_VERSION = "1.0";

router.post("/legal/consent", async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Sign in first." });
    return;
  }
  const userId = req.user.id;
  const version = CURRENT_TERMS_VERSION;

  const ip = req.ip ? req.ip.slice(0, 64) : null;
  const userAgent =
    typeof req.headers["user-agent"] === "string"
      ? req.headers["user-agent"].slice(0, 1000)
      : null;

  try {
    const now = new Date();
    await db.insert(legalConsentsTable).values({
      userId,
      termsVersion: version,
      acceptedAt: now,
      ip,
      userAgent,
    });
    await db
      .update(usersTable)
      .set({ acceptedTermsVersion: version, acceptedTermsAt: now })
      .where(eq(usersTable.id, userId));
    res.json({
      ok: true,
      acceptedVersion: version,
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
    res.json({
      acceptedVersion: row?.acceptedTermsVersion ?? null,
      currentVersion: CURRENT_TERMS_VERSION,
      acceptedAt: row?.acceptedTermsAt
        ? new Date(row.acceptedTermsAt).toISOString()
        : null,
    });
  } catch (err) {
    req.log?.error?.({ err }, "Failed to load legal consent");
    res.status(500).json({ error: "Could not load consent." });
  }
});

router.get("/auth/user", (req: Request, res: Response) => {
  const user = req.isAuthenticated()
    ? { ...req.user, emailVerified: req.user.emailVerified === true }
    : null;
  res.json(GetCurrentAuthUserResponse.parse({ user }));
});

/**
 * GET /api/login?returnTo=/path
 * Initiates email/password auth flow.
 * Returns redirect to Supabase auth URL or displays login form.
 * For MVP, we're using email/password auth via REST API.
 */
router.get("/login", async (req: Request, res: Response) => {
  const returnTo = getSafeReturnTo(req.query.returnTo);
  
  // Store returnTo in a temporary cookie for callback to retrieve
  res.cookie("auth_return_to", returnTo, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 10 * 60 * 1000, // 10 minutes
  });

  // For now, redirect to a login page (frontend handles the flow)
  // The frontend will POST to /api/auth/signin with email/password
  // This endpoint is mainly for maintaining API compatibility
  res.redirect(`/?login=true&returnTo=${encodeURIComponent(returnTo)}`);
});

/**
 * POST /api/auth/signin
 * Accepts email and password, signs in via Supabase, creates local session
 */
router.post("/auth/signin", async (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400).json({ error: "Email and password required" });
    return;
  }

  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error || !data.session) {
      res.status(401).json({ error: error?.message || "Sign in failed" });
      return;
    }

    const session = data.session;
    const user = data.user;

    // Upsert user in local database
    const dbUser = await upsertUser(
      user.id,
      user.email,
      user.user_metadata?.first_name as string | null,
      user.user_metadata?.last_name as string | null,
      user.user_metadata?.avatar_url as string | null,
      user.email_confirmed_at != null && user.email_confirmed_at !== ""
    );

    // Create local session
    const now = Math.floor(Date.now() / 1000);
    const sessionData: SessionData = {
      user: supabaseUserToAuthUser(user),
      access_token: session.access_token,
      refresh_token: session.refresh_token || undefined,
      expires_at: session.expires_at ? Math.floor(session.expires_at) : now + 3600,
    };

    const sid = await createSession(sessionData);
    setSessionCookie(res, sid);

    res.json({
      ok: true,
      user: supabaseUserToAuthUser(user),
      token: sid,
    });
  } catch (err) {
    req.log?.error?.({ err }, "Sign in error");
    res.status(500).json({ error: "Sign in failed" });
  }
});

/**
 * POST /api/auth/signup
 * Create new user via Supabase Auth
 */
router.post("/auth/signup", async (req: Request, res: Response) => {
  const { email, password, firstName, lastName } = req.body;

  if (!email || !password) {
    res.status(400).json({ error: "Email and password required" });
    return;
  }

  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          first_name: firstName || null,
          last_name: lastName || null,
        },
      },
    });

    if (error || !data.user) {
      res
        .status(400)
        .json({ error: error?.message || "Sign up failed" });
      return;
    }

    const user = data.user;

    // Upsert user in local database
    await upsertUser(
      user.id,
      user.email,
      firstName || null,
      lastName || null,
      null,
      user.email_confirmed_at != null && user.email_confirmed_at !== ""
    );

    // If email confirmation is disabled, Supabase returns a session immediately — auto-login
    if (data.session) {
      const now = Math.floor(Date.now() / 1000);
      const sessionData: SessionData = {
        user: supabaseUserToAuthUser(user),
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token || undefined,
        expires_at: data.session.expires_at ? Math.floor(data.session.expires_at) : now + 3600,
      };
      const sid = await createSession(sessionData);
      setSessionCookie(res, sid);
      res.json({
        ok: true,
        autoLoggedIn: true,
        user: supabaseUserToAuthUser(user),
      });
      return;
    }

    res.json({
      ok: true,
      message: "Check your email to confirm your account",
      user: {
        id: user.id,
        email: user.email,
      },
    });
  } catch (err) {
    req.log?.error?.({ err }, "Sign up error");
    res.status(500).json({ error: "Sign up failed" });
  }
});

/**
 * GET /api/callback
 * Handles Supabase callback (if using OAuth in the future)
 * For email/password flow, this is not needed but kept for OAuth compatibility
 */
router.get("/callback", async (req: Request, res: Response) => {
  // OAuth callback would be handled here if using Google/GitHub/etc
  // For email/password, the frontend handles the session directly
  const returnTo = getSafeReturnTo(req.cookies?.auth_return_to || "/");
  res.clearCookie("auth_return_to", { path: "/" });
  res.redirect(returnTo);
});

/**
 * GET /api/logout
 * Clear local session and sign out from Supabase
 */
router.get("/logout", async (req: Request, res: Response) => {
  const sid = getSessionId(req);
  await clearSession(res, sid);

  // Sign out from Supabase if we have a token
  // This is a best-effort operation — we always clear the local session
  try {
    const sessionData = sid ? await db.select().from(sessionsTable).where(eq(sessionsTable.sid, sid)) : null;
    // Sessions are already cleared above, so we just redirect
  } catch {
    // Ignore errors
  }

  res.redirect("/");
});

/**
 * POST /api/mobile-auth/token-exchange
 * For mobile apps: exchange authorization code for access token
 * For Supabase, this would use the refresh token flow
 */
router.post(
  "/mobile-auth/token-exchange",
  async (req: Request, res: Response) => {
    const parsed = ExchangeMobileAuthorizationCodeBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Missing or invalid required parameters" });
      return;
    }

    const { code } = parsed.data;

    try {
      // For Supabase, the code here would be a one-time code from sign-up confirmation
      // In the mobile flow, the client should handle the full auth and send us the token
      // This endpoint is mainly for legacy compatibility
      res.status(400).json({
        error:
          "Mobile token exchange should use /api/auth/signin instead",
      });
    } catch (err) {
      req.log.error({ err }, "Mobile token exchange error");
      res.status(500).json({ error: "Token exchange failed" });
    }
  }
);

/**
 * POST /api/mobile-auth/logout
 * Clear mobile session
 */
router.post("/mobile-auth/logout", async (req: Request, res: Response) => {
  const sid = getSessionId(req);
  if (sid) {
    await deleteSession(sid);
  }
  res.json(LogoutMobileSessionResponse.parse({ success: true }));
});

/**
 * POST /api/auth/refresh
 * Refresh access token using refresh token
 */
router.post("/auth/refresh", async (req: Request, res: Response) => {
  const sid = getSessionId(req);
  if (!sid) {
    res.status(401).json({ error: "No session" });
    return;
  }

  try {
    const { sessionsTable } = await import("@workspace/db");
    const [sessionRow] = await db
      .select()
      .from(sessionsTable)
      .where(eq(sessionsTable.sid, sid));

    if (!sessionRow) {
      res.status(401).json({ error: "Session not found" });
      return;
    }

    const sessionData = sessionRow.sess as unknown as SessionData;
    if (!sessionData.refresh_token) {
      res.status(401).json({ error: "No refresh token" });
      return;
    }

    const supabase = getSupabaseClient();
    const { data, error } = await supabase.auth.refreshSession({
      refresh_token: sessionData.refresh_token,
    });

    if (error || !data.session) {
      res.status(401).json({ error: "Refresh failed" });
      return;
    }

    const newSession = data.session;
    const now = Math.floor(Date.now() / 1000);
    sessionData.access_token = newSession.access_token;
    sessionData.refresh_token = newSession.refresh_token || sessionData.refresh_token;
    sessionData.expires_at = newSession.expires_at
      ? Math.floor(newSession.expires_at)
      : now + 3600;

    await db
      .update(sessionsTable)
      .set({
        sess: sessionData as unknown as Record<string, unknown>,
        expire: new Date(Date.now() + SESSION_TTL),
      })
      .where(eq(sessionsTable.sid, sid));

    res.json({ ok: true, accessToken: newSession.access_token });
  } catch (err) {
    req.log?.error?.({ err }, "Token refresh error");
    res.status(500).json({ error: "Refresh failed" });
  }
});


/**
 * POST /api/auth/forgot-password
 * Send a password reset email via Supabase
 */
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
    // Always return ok — prevents email enumeration attacks
    res.json({ ok: true });
  } catch (err) {
    req.log?.error?.({ err }, "Forgot password error");
    res.status(500).json({ error: "Failed to send reset email" });
  }
});

/**
 * POST /api/auth/token-exchange
 * Exchange a Supabase access_token (from magic link / URL hash) for a server session cookie.
 * Used when the frontend receives #access_token=... in the URL hash.
 */
router.post("/auth/token-exchange", async (req: Request, res: Response) => {
  const { access_token, refresh_token } = req.body;
  if (!access_token) {
    res.status(400).json({ error: "access_token required" });
    return;
  }
  try {
    const payload = await verifyJWT(access_token);
    if (!payload || !payload.sub) {
      res.status(401).json({ error: "Invalid or expired token" });
      return;
    }
    const supabase = getSupabaseAdminClient();
    const { data: { user }, error } = await supabase.auth.admin.getUserById(payload.sub as string);
    if (error || !user) {
      res.status(401).json({ error: "User not found" });
      return;
    }
    await upsertUser(
      user.id,
      user.email,
      user.user_metadata?.first_name as string | null ?? null,
      user.user_metadata?.last_name as string | null ?? null,
      user.user_metadata?.avatar_url as string | null ?? null,
      user.email_confirmed_at != null && user.email_confirmed_at !== ""
    );
    const now = Math.floor(Date.now() / 1000);
    const sessionData: SessionData = {
      user: supabaseUserToAuthUser(user),
      access_token,
      refresh_token: refresh_token || undefined,
      expires_at: (payload.exp as number) ?? now + 3600,
    };
    const sid = await createSession(sessionData);
    setSessionCookie(res, sid);
    res.json({ ok: true, user: supabaseUserToAuthUser(user) });
  } catch (err) {
    req.log?.error?.({ err }, "Token exchange error");
    res.status(500).json({ error: "Token exchange failed" });
  }
});

/**
 * POST /api/auth/reset-password
 * Update user password using a recovery access_token
 */
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
    const { error } = await supabase.auth.admin.updateUserById(payload.sub as string, { password });
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
