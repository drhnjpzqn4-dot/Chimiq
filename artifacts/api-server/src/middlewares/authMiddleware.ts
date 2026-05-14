import { type Request, type Response, type NextFunction } from "express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { verifyJWT, upsertAppUserFromJwtClaims, type AuthUser } from "../lib/auth.js";

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
 * Verifierar Supabase access JWT (Authorization: Bearer) och sätter req.user.
 * Ingen server-side sessions-tabell eller cookies.
 */
export async function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  req.isAuthenticated = function (this: Request) {
    return this.user != null;
  } as Request["isAuthenticated"];

  const authHeader = req.headers["authorization"];
  if (typeof authHeader !== "string" || !authHeader.startsWith("Bearer ")) {
    next();
    return;
  }

  const token = authHeader.slice(7).trim();
  if (!token) {
    next();
    return;
  }

  const payload = await verifyJWT(token);
  if (!payload?.sub) {
    next();
    return;
  }

  const meta = (payload.user_metadata ?? {}) as Record<string, unknown>;
  const firstName =
    typeof meta.first_name === "string" ? meta.first_name : null;
  const lastName =
    typeof meta.last_name === "string" ? meta.last_name : null;
  const profileImageUrl =
    typeof meta.avatar_url === "string" ? meta.avatar_url : null;
  const email = typeof payload.email === "string" ? payload.email : null;
  const emailVerified = payload.email_verified === true;

  await upsertAppUserFromJwtClaims({
    id: payload.sub,
    email,
    firstName,
    lastName,
    profileImageUrl,
    emailVerified,
  });

  const [row] = await db
    .select({ onboardingCompleted: usersTable.onboardingCompleted })
    .from(usersTable)
    .where(eq(usersTable.id, payload.sub))
    .limit(1);

  req.user = {
    id: payload.sub,
    email,
    firstName,
    lastName,
    profileImageUrl,
    emailVerified,
    onboardingCompleted: row?.onboardingCompleted ?? false,
  };

  next();
}
