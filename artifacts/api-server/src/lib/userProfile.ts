import { supabaseAdmin } from "./supabase-admin.js";

export interface UserProfileFields {
  onboardingCompleted: boolean;
  displayName: string | null;
  avatarEmoji: string | null;
}

export async function getUserProfileFields(
  userId: string,
): Promise<UserProfileFields> {
  const { data, error } = await supabaseAdmin
    .from("users")
    .select("onboarding_completed, display_name, avatar_emoji")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw error;
  return {
    onboardingCompleted: (data?.onboarding_completed as boolean | undefined) ?? false,
    displayName: (data?.display_name as string | null | undefined) ?? null,
    avatarEmoji: (data?.avatar_emoji as string | null | undefined) ?? null,
  };
}

/** Accepts 1–2 emoji grapheme clusters (combined emoji sequences). */
export function isValidAvatarEmoji(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;
  try {
    const segmenter = new Intl.Segmenter();
    const segments = [...segmenter.segment(trimmed)].map((s) => s.segment);
    return segments.length >= 1 && segments.length <= 2;
  } catch {
    return [...trimmed].length >= 1 && [...trimmed].length <= 4;
  }
}
