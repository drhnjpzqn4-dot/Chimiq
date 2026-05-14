import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { getBaseUrl } from "@/lib/base-url";

export type UserPlan = "free" | "premium";

interface PaymentStatus {
  plan: UserPlan;
  trialEligible: boolean;
  trialDays: number;
}

const TRIAL_DAYS = 14;

async function fetchPaymentStatus(): Promise<PaymentStatus> {
  const res = await fetch(`${getBaseUrl()}api/payments/status`, {
    credentials: "include",
  });
  if (!res.ok) {
    return { plan: "free", trialEligible: false, trialDays: TRIAL_DAYS };
  }
  const data = (await res.json()) as Partial<PaymentStatus>;
  return {
    plan: data.plan === "premium" ? "premium" : "free",
    trialEligible:
      typeof data.trialEligible === "boolean" ? data.trialEligible : false,
    trialDays:
      typeof data.trialDays === "number" && data.trialDays > 0
        ? data.trialDays
        : TRIAL_DAYS,
  };
}

/**
 * Source of truth for "what plan is the viewer on, and should we offer
 * them the 14-day free trial?".
 *
 * Eligibility rules:
 *   - Anonymous viewers: eligible (they haven't signed in yet, so by
 *     definition they've never had a Stripe subscription). The marketing
 *     surfaces (landing hero, etc.) can promise the trial without a
 *     round-trip. The server re-checks before actually starting checkout
 *     (#trial), so a false positive cannot mint a real trial.
 *   - Authenticated viewers: not eligible until the server says so.
 *     This prevents a returning user who already used their trial from
 *     briefly seeing a "free trial" CTA before the /payments/status
 *     query resolves and overrides the optimistic default.
 *   - Premium viewers: never eligible (they already have access).
 */
export function useUserPlan() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { data, isLoading: queryLoading } = useQuery({
    queryKey: ["user-plan"],
    queryFn: fetchPaymentStatus,
    staleTime: 1000 * 60 * 5,
    enabled: !authLoading && isAuthenticated,
  });

  const isLoading = authLoading || (isAuthenticated && queryLoading);

  // Anonymous + still-loading-anonymous: free + eligible (marketing default).
  // Authenticated + loading: free + NOT eligible (don't flash trial copy).
  // Authenticated + resolved: use the server answer.
  const status: PaymentStatus = data ?? {
    plan: "free",
    trialEligible: !isAuthenticated && !authLoading,
    trialDays: TRIAL_DAYS,
  };

  return {
    plan: status.plan,
    isPremium: status.plan === "premium",
    trialEligible: status.plan !== "premium" && status.trialEligible,
    trialDays: status.trialDays,
    isLoading,
  };
}
