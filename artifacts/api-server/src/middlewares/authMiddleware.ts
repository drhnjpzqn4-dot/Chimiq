import { type Request, type Response, type NextFunction } from "express";
import { db, usersTable } from "@workspace/db";
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
} from "../lib/auth.js";

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
 * Validate Supabase JWT (legacy / mobile flows where Bearer is a real JWT).
 */
async function validateJWTToken(token: string): Promise<AuthUser | null> {
  try {
    const payload = await verifyJWT(token);
    if (!payload || !payload.sub) return null;

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

/**
 * Laddar användare från Postgres-session (sid) — samma källa som httpOnly-kakan.
 */
async function authenticateServerSession(
  res: Response,
  sid: string
): Promise<AuthUser | null> {
  const session = await getSession(sid);
  if (!session?.user?.id) {
    await clearSession(res, sid);
    return null;
  }

  const refreshed = await refreshIfExpired(sid, session);
  if (!refreshed) {
    await clearSession(res, sid);
    return null;
  }

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

  return userForRequest;
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

  const authHeader = req.headers["authorization"];
  const isBearer =
    typeof authHeader === "string" && authHeader.startsWith("Bearer ");

  if (isBearer) {
    // Först: Bearer-värdet är vårt server-session id (sid) — samma som i JSON { token }.
    const fromDb = await authenticateServerSession(res, sid);
    if (fromDb) {
      req.user = fromDb;
      next();
      return;
    }
    // Annars: försök Supabase access JWT (äldre / specialfall).
    const jwtUser = await validateJWTToken(sid);
    if (jwtUser) {
      req.user = jwtUser;
    }
    next();
    return;
  }

  const user = await authenticateServerSession(res, sid);
  if (user) {
    req.user = user;
  }
  next();
}
