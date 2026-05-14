import { supabaseAdmin } from "./supabase-admin.js";

export async function getUserPlan(userId: string): Promise<"free" | "premium"> {
  const supabase = supabaseAdmin;
  const { data, error } = await supabase
    .from("users")
    .select("plan, premium_until")
    .eq("id", userId)
    .maybeSingle();
  if (error || !data) return "free";
  if (data.plan === "premium") return "premium";
  if (data.premium_until) {
    const until = new Date(data.premium_until as string);
    if (until > new Date()) return "premium";
  }
  return "free";
}
