import { useQuery } from "@tanstack/react-query";
import { getBaseUrl } from "@/lib/base-url";

export type UserPlan = "free" | "premium";

async function fetchUserPlan(): Promise<UserPlan> {
  const res = await fetch(`${getBaseUrl()}api/payments/status`, {
    credentials: "include",
  });
  if (!res.ok) return "free";
  const data = (await res.json()) as { plan?: UserPlan };
  return data.plan === "premium" ? "premium" : "free";
}

export function useUserPlan() {
  const { data, isLoading } = useQuery({
    queryKey: ["user-plan"],
    queryFn: fetchUserPlan,
    staleTime: 1000 * 60 * 5,
  });

  return {
    plan: data ?? "free",
    isPremium: data === "premium",
    isLoading,
  };
}
