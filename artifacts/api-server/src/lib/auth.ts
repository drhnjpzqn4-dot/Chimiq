import { createRemoteJWKSet, jwtVerify } from "jose";
import { type Request } from "express";
import { supabaseAdmin } from "./supabase-admin.js";

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

let supabaseJwks: ReturnType<typeof createRemoteJWKSet> | null = null;

function getSupabaseJwks() {
  if (supabaseJwks) return supabaseJwks;
  const base = process.env.SUPABASE_URL?.replace(/\/+$/, "");
  if (!base) {
    throw new Error("SUPABASE_URL saknas — krävs för JWT-verifiering via JWKS");
  }
  const jwksUrl = new URL(`${base}/auth/v1/.well-known/jwks.json`);
  supabaseJwks = createRemoteJWKSet(jwksUrl);
  return supabaseJwks;
}

export async function verifyJWT(token: string): Promise<{
  sub: string;
  email?: string;
  email_verified?: boolean;
  user_metadata?: Record<string, unknown>;
} | null> {
  try {
    const JWKS = getSupabaseJwks();
    const { payload } = await jwtVerify(token, JWKS);
    return payload as {
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
  const now = new Date().toISOString();
  const { error } = await supabaseAdmin.from("users").upsert(
    {
      id: data.id,
      email: data.email,
      first_name: data.firstName,
      last_name: data.lastName,
      profile_image_url: data.profileImageUrl,
      email_verified: data.emailVerified,
      updated_at: now,
    },
    { onConflict: "id" },
  );
  if (error) throw error;
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
