import { supabaseAdmin } from "./supabase-admin.js";

/**
 * Free-tier daily scan cap. Mirrored on the client (`Scan.tsx`'s
 * `FREE_DAILY_LIMIT`) för display, men servern är source of truth.
 */
export const FREE_DAILY_SCAN_LIMIT = 12;

/** UTC YYYY-MM-DD for today. */
export function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

export interface ScanCountSnapshot {
  count: number;
  limit: number;
  remaining: number;
  date: string;
}

/** Read today's count for a user without mutating it. */
export async function getTodayScanCount(userId: string): Promise<ScanCountSnapshot> {
  const date = todayUtc();
  const supabase = supabaseAdmin;
  const { data, error } = await supabase
    .from("daily_scan_counts")
    .select("count")
    .eq("user_id", userId)
    .eq("scan_date", date)
    .maybeSingle();
  if (error) throw error;
  const count = (data?.count as number | undefined) ?? 0;
  return {
    count,
    limit: FREE_DAILY_SCAN_LIMIT,
    remaining: Math.max(0, FREE_DAILY_SCAN_LIMIT - count),
    date,
  };
}

/**
 * Atomically increment today's counter and return the new value.
 * RPC: `increment_daily_scan_count`.
 */
export async function incrementTodayScanCount(userId: string): Promise<number> {
  const supabase = supabaseAdmin;
  const { data, error } = await supabase.rpc("increment_daily_scan_count", {
    p_user_id: userId,
  });
  if (error) throw error;
  return (data as number) ?? 0;
}

/**
 * Atomically claim a scan slot under a daily cap. RPC: `claim_daily_scan_slot`.
 * Returns null if at/over cap.
 */
export async function claimDailyScanSlot(
  userId: string,
  limit: number = FREE_DAILY_SCAN_LIMIT,
): Promise<number | null> {
  const supabase = supabaseAdmin;
  const { data, error } = await supabase.rpc("claim_daily_scan_slot", {
    p_user_id: userId,
    p_limit: limit,
  });
  if (error) throw error;
  if (data === null || data === undefined) return null;
  return data as number;
}

/** Roll back a previously-claimed slot. RPC: `release_daily_scan_slot`. */
export async function releaseDailyScanSlot(userId: string): Promise<void> {
  const supabase = supabaseAdmin;
  const { error } = await supabase.rpc("release_daily_scan_slot", {
    p_user_id: userId,
  });
  if (error) throw error;
}
