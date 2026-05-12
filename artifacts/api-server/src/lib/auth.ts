import { createClient } from "@supabase/supabase-js";
import { jwtVerify } from "jose";
import crypto from "crypto";
import { type Request, type Response } from "express";
import { db, sessionsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

// Supabase client types
interface SupabaseUser {
  id: string;
  email?: string;
  email_confirmed_at?: string;
  user_metadata?: {
    first_name?: string;
    last_name?: string;
    avatar_url?: string;
  };
}

export interface AuthUser {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  profileImageUrl: string | null;
  emailVerified: boolean;
  /** False until the in-app onboarding wizard is completed (V10). */
  onboardingCompleted?: boolean;
}

export const SESSION_COOKIE = "sid";
export const SESSION_TTL = 7 * 24 * 60 * 60 * 1000;

export interface SessionData {
  user: AuthUser;
  access_token: string;
  refresh_token?: string;
  expires_at?: number;
}

// JWT secret for verifying Supabase JWTs
const JWT_SECRET = new TextEncoder().encode(
  process.env.SUPABASE_JWT_SECRET || ""
);

/**
 * Get or create Supabase client (singleton pattern)
 */
let supabaseClient: ReturnType<typeof createClient> | null = null;

export function getSupabaseClient() {
  if (!supabaseClient) {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error(
        "Missing SUPABASE_URL or SUPABASE_ANON_KEY environment variables"
      );
    }

    supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
    });
  }
  return supabaseClient;
}

/**
 * Get admin Supabase client with service role key (for server-side user operations)
 */
let supabaseAdminClient: ReturnType<typeof createClient> | null = null;

export function getSupabaseAdminClient() {
  if (!supabaseAdminClient) {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      throw new Error(
        "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables"
      );
    }

    supabaseAdminClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
    });
  }
  return supabaseAdminClient;
}

/**
 * Verify and decode a Supabase JWT token
 */
export async function verifyJWT(token: string): Promise<{
  sub: string;
  email?: string;
  email_verified?: boolean;
  user_metadata?: Record<string, unknown>;
} | null> {
  try {
    const verified = await jwtVerify(token, JWT_SECRET);
    return verified.payload as {
      sub: string;
      email?: string;
      email_verified?: boolean;
      user_metadata?: Record<string, unknown>;
    };
  } catch {
    return null;
  }
}

/**
 * Create a new session in the database
 */
export async function createSession(data: SessionData): Promise<string> {
  const sid = crypto.randomBytes(32).toString("hex");
  await db.insert(sessionsTable).values({
    sid,
    sess: data as unknown as Record<string, unknown>,
    expire: new Date(Date.now() + SESSION_TTL),
  });
  return sid;
}

/**
 * Get a session from the database
 */
export async function getSession(sid: string): Promise<SessionData | null> {
  const [row] = await db
    .select()
    .from(sessionsTable)
    .where(eq(sessionsTable.sid, sid));

  if (!row || row.expire < new Date()) {
    if (row) await deleteSession(sid);
    return null;
  }

  return row.sess as unknown as SessionData;
}

/**
 * Update an existing session
 */
export async function updateSession(
  sid: string,
  data: SessionData
): Promise<void> {
  await db
    .update(sessionsTable)
    .set({
      sess: data as unknown as Record<string, unknown>,
      expire: new Date(Date.now() + SESSION_TTL),
    })
    .where(eq(sessionsTable.sid, sid));
}

/**
 * Delete a session from the database
 */
export async function deleteSession(sid: string): Promise<void> {
  await db.delete(sessionsTable).where(eq(sessionsTable.sid, sid));
}

/**
 * Clear session cookie and optionally delete session from DB
 */
export async function clearSession(
  res: Response,
  sid?: string
): Promise<void> {
  if (sid) await deleteSession(sid);
  res.clearCookie(SESSION_COOKIE, { path: "/" });
}

/**
 * Extract session ID from request (from Bearer token or cookie)
 */
export function getSessionId(req: Request): string | undefined {
  const authHeader = req.headers["authorization"];
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.slice(7);
  }
  return req.cookies?.[SESSION_COOKIE];
}

/**
 * Convert Supabase user to AuthUser format
 */
export function supabaseUserToAuthUser(
  supabaseUser: SupabaseUser
): AuthUser {
  const emailVerified =
    supabaseUser.email_confirmed_at != null &&
    supabaseUser.email_confirmed_at !== "";

  return {
    id: supabaseUser.id,
    email: supabaseUser.email || null,
    firstName: supabaseUser.user_metadata?.first_name || null,
    lastName: supabaseUser.user_metadata?.last_name || null,
    profileImageUrl: supabaseUser.user_metadata?.avatar_url || null,
    emailVerified,
    onboardingCompleted: false,
  };
}
