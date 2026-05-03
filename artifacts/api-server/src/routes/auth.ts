import * as oidc from "openid-client";
import { Router, type IRouter, type Request, type Response } from "express";
import {
  GetCurrentAuthUserResponse,
  ExchangeMobileAuthorizationCodeBody,
  ExchangeMobileAuthorizationCodeResponse,
  LogoutMobileSessionResponse,
} from "@workspace/api-zod";
import { db, usersTable, legalConsentsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import {
  clearSession,
  getOidcConfig,
  getSessionId,
  createSession,
  deleteSession,
  SESSION_COOKIE,
  SESSION_TTL,
  ISSUER_URL,
  type SessionData,
} from "../lib/auth";

const OIDC_COOKIE_TTL = 10 * 60 * 1000;

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

function setOidcCookie(res: Response, name: string, value: string) {
  res.cookie(name, value, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: OIDC_COOKIE_TTL,
  });
}

// Allowlist of native deep-link callback URLs. The Capacitor shell opens the
// system browser at /api/login?returnTo=<one of these>, completes OIDC, and
// the final 302 to this URL is what the OS routes back into the app via the
// registered URL scheme. Without this allowlist getSafeReturnTo() would
// rewrite the custom-scheme URL to "/" and the user would land on the web
// app instead of returning to the native shell.
const NATIVE_RETURN_TO_ALLOWLIST = new Set<string>([
  "skinscreen://auth/callback",
]);

function getSafeReturnTo(value: unknown): string {
  if (typeof value !== "string") return "/";
  if (NATIVE_RETURN_TO_ALLOWLIST.has(value)) return value;
  if (!value.startsWith("/") || value.startsWith("//")) return "/";
  return value;
}

async function upsertUser(claims: Record<string, unknown>) {
  // Trust the OIDC `email_verified` claim. Major IdPs (Google, GitHub,
  // Microsoft, etc.) set this to `true` only when the user has actually
  // proven control of the address. If the claim is absent we fall back to
  // `false` so we never grant verified status by accident.
  const emailVerified = claims.email_verified === true;

  const userData = {
    id: claims.sub as string,
    email: (claims.email as string) || null,
    firstName: (claims.first_name as string) || null,
    lastName: (claims.last_name as string) || null,
    profileImageUrl: (claims.profile_image_url || claims.picture) as
      | string
      | null,
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

// #101 — server-side legal-consent audit trail. The client posts here
// immediately after the consent modal's "Agree & continue" tap, before
// redirecting to login. We accept any non-empty version string so the
// schema isn't a deploy-coupling bottleneck — what matters is that we
// have a defensible row stored when the user said yes.
const CURRENT_TERMS_VERSION = "1.0";

router.post("/legal/consent", async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Sign in first." });
    return;
  }
  const userId = req.user.id;
  // The version is server-authoritative: a client can only ever record
  // acceptance of the version we are currently serving, never a forged or
  // future one. Any client-supplied version is ignored for the audit row.
  const version = CURRENT_TERMS_VERSION;

  // `req.ip` is populated from the Express trust-proxy chain (see app.ts),
  // so it reflects the real client when behind the Replit edge and is
  // resistant to header spoofing from arbitrary upstream callers.
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
    res.json({ ok: true, acceptedVersion: version, acceptedAt: now.toISOString() });
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
  // Defensive default: a session created before `emailVerified` was added
  // to AuthUser may still be in flight. Always coerce to boolean so the
  // response schema parser never throws a 500 on a stale session.
  const user = req.isAuthenticated()
    ? { ...req.user, emailVerified: req.user.emailVerified === true }
    : null;
  res.json(GetCurrentAuthUserResponse.parse({ user }));
});

router.get("/login", async (req: Request, res: Response) => {
  const config = await getOidcConfig();
  const callbackUrl = `${getOrigin(req)}/api/callback`;

  const returnTo = getSafeReturnTo(req.query.returnTo);

  const state = oidc.randomState();
  const nonce = oidc.randomNonce();
  const codeVerifier = oidc.randomPKCECodeVerifier();
  const codeChallenge = await oidc.calculatePKCECodeChallenge(codeVerifier);

  const redirectTo = oidc.buildAuthorizationUrl(config, {
    redirect_uri: callbackUrl,
    scope: "openid email profile offline_access",
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
    prompt: "login consent",
    state,
    nonce,
  });

  setOidcCookie(res, "code_verifier", codeVerifier);
  setOidcCookie(res, "nonce", nonce);
  setOidcCookie(res, "state", state);
  setOidcCookie(res, "return_to", returnTo);

  res.redirect(redirectTo.href);
});

// Query params are not validated because the OIDC provider may include
// parameters not expressed in the schema.
router.get("/callback", async (req: Request, res: Response) => {
  const config = await getOidcConfig();
  const callbackUrl = `${getOrigin(req)}/api/callback`;

  const codeVerifier = req.cookies?.code_verifier;
  const nonce = req.cookies?.nonce;
  const expectedState = req.cookies?.state;

  if (!codeVerifier || !expectedState) {
    res.redirect("/api/login");
    return;
  }

  const currentUrl = new URL(
    `${callbackUrl}?${new URL(req.url, `http://${req.headers.host}`).searchParams}`,
  );

  let tokens: oidc.TokenEndpointResponse & oidc.TokenEndpointResponseHelpers;
  try {
    tokens = await oidc.authorizationCodeGrant(config, currentUrl, {
      pkceCodeVerifier: codeVerifier,
      expectedNonce: nonce,
      expectedState,
      idTokenExpected: true,
    });
  } catch {
    res.redirect("/api/login");
    return;
  }

  const returnTo = getSafeReturnTo(req.cookies?.return_to);

  res.clearCookie("code_verifier", { path: "/" });
  res.clearCookie("nonce", { path: "/" });
  res.clearCookie("state", { path: "/" });
  res.clearCookie("return_to", { path: "/" });

  const claims = tokens.claims();
  if (!claims) {
    res.redirect("/api/login");
    return;
  }

  const dbUser = await upsertUser(
    claims as unknown as Record<string, unknown>,
  );

  const now = Math.floor(Date.now() / 1000);
  const sessionData: SessionData = {
    user: {
      id: dbUser.id,
      email: dbUser.email,
      firstName: dbUser.firstName,
      lastName: dbUser.lastName,
      profileImageUrl: dbUser.profileImageUrl,
      emailVerified: dbUser.emailVerified,
    },
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    expires_at: tokens.expiresIn() ? now + tokens.expiresIn()! : claims.exp,
  };

  const sid = await createSession(sessionData);
  setSessionCookie(res, sid);
  res.redirect(returnTo);
});

router.get("/logout", async (req: Request, res: Response) => {
  const config = await getOidcConfig();
  const origin = getOrigin(req);

  const sid = getSessionId(req);
  await clearSession(res, sid);

  const endSessionUrl = oidc.buildEndSessionUrl(config, {
    client_id: process.env.REPL_ID!,
    post_logout_redirect_uri: origin,
  });

  res.redirect(endSessionUrl.href);
});

router.post(
  "/mobile-auth/token-exchange",
  async (req: Request, res: Response) => {
    const parsed = ExchangeMobileAuthorizationCodeBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Missing or invalid required parameters" });
      return;
    }

    const { code, code_verifier, redirect_uri, state, nonce } = parsed.data;

    try {
      const config = await getOidcConfig();

      const callbackUrl = new URL(redirect_uri);
      callbackUrl.searchParams.set("code", code);
      callbackUrl.searchParams.set("state", state);
      callbackUrl.searchParams.set("iss", ISSUER_URL);

      const tokens = await oidc.authorizationCodeGrant(config, callbackUrl, {
        pkceCodeVerifier: code_verifier,
        expectedNonce: nonce ?? undefined,
        expectedState: state,
        idTokenExpected: true,
      });

      const claims = tokens.claims();
      if (!claims) {
        res.status(401).json({ error: "No claims in ID token" });
        return;
      }

      const dbUser = await upsertUser(
        claims as unknown as Record<string, unknown>,
      );

      const now = Math.floor(Date.now() / 1000);
      const sessionData: SessionData = {
        user: {
          id: dbUser.id,
          email: dbUser.email,
          firstName: dbUser.firstName,
          lastName: dbUser.lastName,
          profileImageUrl: dbUser.profileImageUrl,
          emailVerified: dbUser.emailVerified,
        },
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_at: tokens.expiresIn() ? now + tokens.expiresIn()! : claims.exp,
      };

      const sid = await createSession(sessionData);
      res.json(ExchangeMobileAuthorizationCodeResponse.parse({ token: sid }));
    } catch (err) {
      req.log.error({ err }, "Mobile token exchange error");
      res.status(500).json({ error: "Token exchange failed" });
    }
  },
);

router.post("/mobile-auth/logout", async (req: Request, res: Response) => {
  const sid = getSessionId(req);
  if (sid) {
    await deleteSession(sid);
  }
  res.json(LogoutMobileSessionResponse.parse({ success: true }));
});

export default router;
