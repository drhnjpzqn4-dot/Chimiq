import * as oidc from "openid-client";
import { type Request, type Response, type NextFunction } from "express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import {
  clearSession,
  getOidcConfig,
  getSessionId,
  getSession,
  updateSession,
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

async function refreshIfExpired(
  sid: string,
  session: SessionData,
): Promise<SessionData | null> {
  const now = Math.floor(Date.now() / 1000);
  if (!session.expires_at || now <= session.expires_at) return session;

  if (!session.refresh_token) return null;

  try {
    const config = await getOidcConfig();
    const tokens = await oidc.refreshTokenGrant(
      config,
      session.refresh_token,
    );
    session.access_token = tokens.access_token;
    session.refresh_token = tokens.refresh_token ?? session.refresh_token;
    session.expires_at = tokens.expiresIn()
      ? now + tokens.expiresIn()!
      : session.expires_at;
    await updateSession(sid, session);
    return session;
  } catch {
    return null;
  }
}

export async function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  req.isAuthenticated = function (this: Request) {
    return this.user != null;
  } as Request["isAuthenticated"];

  const sid = getSessionId(req);
  if (!sid) {
    next();
    return;
  }

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
  // expansion (e.g. `emailVerified` was added in the DIY-recipes work). We
  // hydrate from the canonical users row and persist the patched session so
  // we only do the lookup once per stale session.
  let userForRequest = refreshed.user;
  if (userForRequest.emailVerified === undefined) {
    try {
      const [row] = await db
        .select({ emailVerified: usersTable.emailVerified })
        .from(usersTable)
        .where(eq(usersTable.id, userForRequest.id));
      userForRequest = {
        ...userForRequest,
        emailVerified: row?.emailVerified ?? false,
      };
      refreshed.user = userForRequest;
      await updateSession(sid, refreshed);
    } catch {
      // If the lookup fails default to false for this request only — never
      // grant verified status by accident.
      userForRequest = { ...userForRequest, emailVerified: false };
    }
  }

  req.user = userForRequest;
  next();
}
