import { useQuery } from "@tanstack/react-query";
import { getBaseUrl } from "@/lib/base-url";

export type UserPlan = "free" | "premium";

interface PaymentStatus {
  plan: UserPlan;
  trialEligible: boolean;
  trialDays: number;
}

const DEFAULT_STATUS: PaymentStatus = {
  plan: "free",
  // Anonymous / errored visitors default to eligible so the marketing
  // surfaces (landing hero, etc.) can promise the trial without an extra
  // round-trip. The server re-checks before actually starting checkout
  // (#trial), so a false positive here cannot mint a real trial.
  trialEligible: true,
  trialDays: 14,
};

async function fetchPaymentStatus(): Promise<PaymentStatus> {
  const res = await fetch(`${getBaseUrl()}api/payments/status`, {
    credentials: "include",
  });
  if (!res.ok) return DEFAULT_STATUS;
  const data = (await res.json()) as Partial<PaymentStatus>;
  return {
    plan: data.plan === "premium" ? "premium" : "free",
    trialEligible:
      typeof data.trialEligible === "boolean" ? data.trialEligible : true,
    trialDays:
      typeof data.trialDays === "number" && data.trialDays > 0
        ? data.trialDays
        : 14,
  };
}

export function useUserPlan() {
  const { data, isLoading } = useQuery({
    queryKey: ["user-plan"],
    queryFn: fetchPaymentStatus,
    staleTime: 1000 * 60 * 5,
  });

  const status = data ?? DEFAULT_STATUS;
  return {
    plan: status.plan,
    isPremium: status.plan === "premium",
    // Show trial copy when the viewer is not premium AND the server hasn't
    // told us they've already used their trial. Premium users never see a
    // trial offer.
    trialEligible: status.plan !== "premium" && status.trialEligible,
    trialDays: status.trialDays,
    isLoading,
  };
}
