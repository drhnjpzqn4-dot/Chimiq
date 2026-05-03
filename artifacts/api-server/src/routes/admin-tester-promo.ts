import { Router, type IRouter, type Request, type Response } from "express";
import { getUncachableStripeClient } from "../stripeClient";
import { isRequestAdmin } from "../lib/admin";

const PROMOTION_CODE_ID = "promo_1TT4njC02Ie3Okka4fxyFFkx";
const COUPON_ID = "zsUaJOzp";

// In-memory cache TTL. Stripe redemption counts don't change
// second-to-second, so a short window (45s) gives admins a snappy page
// without meaningfully stale numbers. Bypass with `?refresh=1` for an
// on-demand re-fetch.
const CACHE_TTL_MS = 45_000;

interface PromoPayload {
  code: string | null;
  active: boolean;
  timesRedeemed: number;
  maxRedemptions: number | null;
  remaining: number | null;
  couponName: string | null;
}

let cached: { payload: PromoPayload; fetchedAt: number } | null = null;

async function fetchPromoFromStripe(): Promise<PromoPayload> {
  const stripe = await getUncachableStripeClient();
  const [promo, coupon] = await Promise.all([
    stripe.promotionCodes.retrieve(PROMOTION_CODE_ID),
    stripe.coupons.retrieve(COUPON_ID),
  ]);

  // Stripe stores the per-promotion-code cap on the promotion code, and
  // a separate (often broader) cap on the coupon. Show whichever is
  // tighter so the founder sees the real ceiling testers will hit.
  const promoMax = promo.max_redemptions ?? null;
  const couponMax = coupon.max_redemptions ?? null;
  const maxRedemptions =
    promoMax != null && couponMax != null
      ? Math.min(promoMax, couponMax)
      : (promoMax ?? couponMax);

  const timesRedeemed = promo.times_redeemed ?? 0;
  const remaining =
    maxRedemptions != null ? Math.max(0, maxRedemptions - timesRedeemed) : null;

  return {
    code: promo.code,
    active: promo.active,
    timesRedeemed,
    maxRedemptions,
    remaining,
    couponName: coupon.name ?? null,
  };
}

/**
 * Exposed so other modules (e.g. a future "raise the cap" admin
 * endpoint) can drop the cache after they mutate the promo, without
 * needing to wait up to {@link CACHE_TTL_MS} ms for the next admin
 * page load to see the change.
 */
export function invalidateTesterPromoCache(): void {
  cached = null;
}

const router: IRouter = Router();

router.get("/admin/tester-promo", async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Authentication required." });
    return;
  }
  if (!isRequestAdmin(req as { user?: { email?: string | null } })) {
    res.status(403).json({ error: "Admin access required." });
    return;
  }

  const bypassCache = req.query.refresh === "1" || req.query.refresh === "true";
  const now = Date.now();
  if (
    !bypassCache &&
    cached &&
    now - cached.fetchedAt < CACHE_TTL_MS
  ) {
    res.json({
      ...cached.payload,
      cached: true,
      cachedAgeMs: now - cached.fetchedAt,
    });
    return;
  }

  try {
    const payload = await fetchPromoFromStripe();
    cached = { payload, fetchedAt: Date.now() };
    res.json({ ...payload, cached: false, cachedAgeMs: 0 });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[admin/tester-promo] failed to fetch from Stripe", err);
    res.status(502).json({ error: "Failed to load promo data from Stripe." });
  }
});

export default router;
