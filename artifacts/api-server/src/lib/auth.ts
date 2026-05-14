import { createClient } from "@supabase/supabase-js";
import { jwtVerify } from "jose";
import { type Request } from "express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

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
  onboardingCompleted?: boolean;
}

const JWT_SECRET = new TextEncoder().encode(
  process.env.SUPABASE_JWT_SECRET || "",
);

let supabaseClient: ReturnType<typeof createClient> | null = null;

export function getSupabaseClient() {
  if (!supabaseClient) {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error(
        "Missing SUPABASE_URL or SUPABASE_ANON_KEY environment variables",
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

let supabaseAdminClient: ReturnType<typeof createClient> | null = null;

export function getSupabaseAdminClient() {
  if (!supabaseAdminClient) {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      throw new Error(
        "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables",
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

/** Synkar users-rad från Supabase JWT (för FK och onboarding). */
export async function upsertAppUserFromJwtClaims(data: {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  profileImageUrl: string | null;
  emailVerified: boolean;
}): Promise<void> {
  const userData = {
    id: data.id,
    email: data.email,
    firstName: data.firstName,
    lastName: data.lastName,
    profileImageUrl: data.profileImageUrl,
    emailVerified: data.emailVerified,
  };

  await db
    .insert(usersTable)
    .values(userData)
    .onConflictDoUpdate({
      target: usersTable.id,
      set: {
        ...userData,
        updatedAt: new Date(),
      },
    });
}

export function supabaseUserToAuthUser(supabaseUser: SupabaseUser): AuthUser {
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

/** @deprecated — endast om någon route fortfarande läser sid ur cookie (ska tas bort). */
export function getBearerToken(req: Request): string | undefined {
  const authHeader = req.headers["authorization"];
  if (typeof authHeader === "string" && authHeader.startsWith("Bearer ")) {
    return authHeader.slice(7).trim();
  }
  return undefined;
}
