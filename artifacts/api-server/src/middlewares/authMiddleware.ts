import { type Request, type Response, type NextFunction } from "express";
import { db, usersTable, sessionsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import {
  clearSession,
  getSessionId,
  getSession,
  updateSession,
  verifyJWT,
  getSupabaseAdminClient,
  type SessionData,
  type AuthUser,
} from "../lib/auth";

declare global {
  namespace Express {
    interface User extends AuthUser {}

    interface Request {
      isAuthenticated(): this is AuthedRequest;

      user?: User | undefined;
    }

    export interface AuthedRequest {
      user: User;
    }
  }
}

/**
 * Refresh access token if expired using refresh token
 */
async function refreshIfExpired(
  sid: string,
  session: SessionData
): Promise<SessionData | null> {
  const now = Math.floor(Date.now() / 1000);
  if (!session.expires_at || now <= session.expires_at) return session;

  if (!session.refresh_token) return null;

  try {
    const supabase = getSupabaseAdminClient();
    const { data, error } = await supabase.auth.refreshSession({
      refresh_token: session.refresh_token,
    });

    if (error || !data.session) return null;

    const newSession = data.session;
    session.access_token = newSession.access_token;
    session.refresh_token = newSession.refresh_token || session.refresh_token;
    session.expires_at = newSession.expires_at
      ? Math.floor(newSession.expires_at)
      : now + 3600;

    await updateSession(sid, session);
    return session;
  } catch {
    return null;
  }
}

/**
 * Validate JWT token (for API requests with Bearer token)
 */
async function validateJWTToken(
  token: string
): Promise<AuthUser | null> {
  try {
    const payload = await verifyJWT(token);
    if (!payload || !payload.sub) return null;

    // Fetch user from local database to get all fields
    const [user] = await db
      .select({
        id: usersTable.id,
        email: usersTable.email,
        firstName: usersTable.firstName,
        lastName: usersTable.lastName,
        profileImageUrl: usersTable.profileImageUrl,
        emailVerified: usersTable.emailVerified,
        onboardingCompleted: usersTable.onboardingCompleted,
      })
      .from(usersTable)
      .where(eq(usersTable.id, payload.sub));

    if (!user) return null;

    return {
      id: user.id,
      email: user.email || null,
      firstName: user.firstName || null,
      lastName: user.lastName || null,
      profileImageUrl: user.profileImageUrl || null,
      emailVerified: user.emailVerified || false,
      onboardingCompleted: user.onboardingCompleted,
    };
  } catch {
    return null;
  }
}

export async function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  req.isAuthenticated = function (this: Request) {
    return this.user != null;
  } as Request["isAuthenticated"];

  const sid = getSessionId(req);
  if (!sid) {
    next();
    return;
  }

  // Check if it's a JWT token (Bearer token) or a session ID
  const isBearer = (req.headers["authorization"] || "").startsWith("Bearer ");

  if (isBearer) {
    // Validate JWT token directly
    const token = sid; // sid contains the Bearer token without "Bearer " prefix
    const user = await validateJWTToken(token);
    if (user) {
      req.user = user;
    }
    next();
    return;
  }

  // Handle session cookie-based auth
  const session = await getSession(sid);
  if (!session?.user?.id) {
    await clearSession(res, sid);
    next();
    return;
  }

  const refreshed = await refreshIfExpired(sid, session);
  if (!refreshed) {
    await clearSession(res, sid);
    next();
    return;
  }

  // Back-fill fields that may be missing on sessions issued before a schema
  // expansion (e.g. `emailVerified` / `onboardingCompleted`).
  let userForRequest = refreshed.user;
  if (
    userForRequest.emailVerified === undefined ||
    userForRequest.onboardingCompleted === undefined
  ) {
    try {
      const [row] = await db
        .select({
          emailVerified: usersTable.emailVerified,
          onboardingCompleted: usersTable.onboardingCompleted,
        })
        .from(usersTable)
        .where(eq(usersTable.id, userForRequest.id));
      userForRequest = {
        ...userForRequest,
        emailVerified: row?.emailVerified ?? false,
        onboardingCompleted: row?.onboardingCompleted ?? false,
      };
      refreshed.user = userForRequest;
      await updateSession(sid, refreshed);
    } catch {
      userForRequest = {
        ...userForRequest,
        emailVerified: userForRequest.emailVerified ?? false,
        onboardingCompleted: userForRequest.onboardingCompleted ?? false,
      };
    }
  }

  req.user = userForRequest;
  next();
}
