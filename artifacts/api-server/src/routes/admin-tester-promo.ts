import { Router, type IRouter, type Request, type Response } from "express";
import { getUncachableStripeClient } from "../stripeClient";
import { isRequestAdmin } from "../lib/admin";

const PROMOTION_CODE_ID = "promo_1TT4njC02Ie3Okka4fxyFFkx";
const COUPON_ID = "zsUaJOzp";

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

  try {
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

    res.json({
      code: promo.code,
      active: promo.active,
      timesRedeemed,
      maxRedemptions,
      remaining,
      couponName: coupon.name ?? null,
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[admin/tester-promo] failed to fetch from Stripe", err);
    res.status(502).json({ error: "Failed to load promo data from Stripe." });
  }
});

export default router;
