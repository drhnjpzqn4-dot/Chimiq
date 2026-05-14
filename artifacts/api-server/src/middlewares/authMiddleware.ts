import { type Request, type Response, type NextFunction } from "express";
import {
  verifyJWT,
  upsertAppUserFromJwtClaims,
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
 * Verifierar Supabase access JWT (Authorization: Bearer) med jose mot JWKS
 * (ES256). Ingen sessions-tabell eller server-side session-lookup.
 *
 * - Saknas Authorization / Bearer: fortsätt anonymt (publika /api-routes).
 * - Bearer med tom eller ogiltig token: 401.
 */
export async function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  req.isAuthenticated = function (this: Request) {
    return this.user != null;
  } as Request["isAuthenticated"];

  const raw = req.headers["authorization"];
  if (typeof raw !== "string" || !raw.toLowerCase().startsWith("bearer ")) {
    next();
    return;
  }

  const token = raw.slice(7).trim();
  if (!token) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const payload = await verifyJWT(token);
  if (!payload?.sub) {
    res.status(401).json({ error: "Unauthorized" });
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

  req.user = {
    id: payload.sub,
    email,
    firstName,
    lastName,
    profileImageUrl,
    emailVerified,
    onboardingCompleted: false,
  };

  next();
}
