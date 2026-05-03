import { Router, type IRouter, type Request, type Response } from "express";
import type Stripe from "stripe";
import { getUncachableStripeClient } from "../stripeClient";
import { isRequestAdmin } from "../lib/admin";

// Original (bootstrap) promotion code on the TESTER6M coupon. We treat this
// as a fallback only — once the founder raises the cap or mints a new code
// from the admin widget, we record the new promotion code's id on the
// coupon's metadata (`active_promotion_code_id`) and read it back from
// there. Storing it on the coupon keeps Stripe as the single source of
// truth so we don't need a separate DB table just for one ID.
const FALLBACK_PROMOTION_CODE_ID = "promo_1TT4njC02Ie3Okka4fxyFFkx";
const COUPON_ID = "zsUaJOzp";
const ACTIVE_PROMO_METADATA_KEY = "active_promotion_code_id";

// In-memory cache TTL. Stripe redemption counts don't change
// second-to-second, so a short window (45s) gives admins a snappy page
// without meaningfully stale numbers. Bypass with `?refresh=1` for an
// on-demand re-fetch. The raise-cap and mint endpoints also invalidate
// this so the widget shows the new code immediately after a mutation.
const CACHE_TTL_MS = 45_000;

interface PromoPayload {
  code: string | null;
  promotionCodeId: string;
  active: boolean;
  timesRedeemed: number;
  maxRedemptions: number | null;
  promoMaxRedemptions: number | null;
  remaining: number | null;
  couponName: string | null;
}

let cached: { payload: PromoPayload; fetchedAt: number } | null = null;

/**
 * Exposed so other modules (e.g. the raise-cap / mint endpoints below)
 * can drop the cache after they mutate the promo, without needing to
 * wait up to {@link CACHE_TTL_MS} ms for the next admin page load to
 * see the change.
 */
export function invalidateTesterPromoCache(): void {
  cached = null;
}

async function getActivePromotionCodeId(coupon: Stripe.Coupon): Promise<string> {
  const fromMetadata = coupon.metadata?.[ACTIVE_PROMO_METADATA_KEY];
  if (fromMetadata && typeof fromMetadata === "string" && fromMetadata.trim()) {
    return fromMetadata.trim();
  }
  return FALLBACK_PROMOTION_CODE_ID;
}

// Resolve the active promotion code, with recovery if the metadata
// pointer is stale (e.g. the recorded promo was deleted in the Stripe
// Dashboard). Falls back to the most recently created promotion code on
// the coupon, then to the bootstrap id.
async function resolveActivePromo(
  stripe: Stripe,
  coupon: Stripe.Coupon,
): Promise<Stripe.PromotionCode> {
  const promoId = await getActivePromotionCodeId(coupon);
  try {
    return await stripe.promotionCodes.retrieve(promoId);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn(
      `[admin/tester-promo] active promo ${promoId} unreachable, falling back to coupon listing`,
      err,
    );
    const list = await stripe.promotionCodes.list({ coupon: COUPON_ID, limit: 50 });
    if (list.data.length === 0) {
      throw err;
    }
    // Prefer an active code; otherwise the most recently created one.
    const active = list.data.find((p) => p.active);
    const sorted = [...list.data].sort((a, b) => (b.created ?? 0) - (a.created ?? 0));
    return active ?? sorted[0];
  }
}

function buildPayload(promo: Stripe.PromotionCode, coupon: Stripe.Coupon): PromoPayload {
  // Stripe stores the per-promotion-code cap on the promotion code, and a
  // separate (often broader) cap on the coupon. Show whichever is tighter
  // so the founder sees the real ceiling testers will hit.
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
    promotionCodeId: promo.id,
    active: promo.active,
    timesRedeemed,
    maxRedemptions,
    promoMaxRedemptions: promoMax,
    remaining,
    couponName: coupon.name ?? null,
  };
}

async function fetchPromoFromStripe(): Promise<PromoPayload> {
  const stripe = await getUncachableStripeClient();
  const coupon = await stripe.coupons.retrieve(COUPON_ID);
  const promo = await resolveActivePromo(stripe, coupon);
  return buildPayload(promo, coupon);
}

const router: IRouter = Router();

function requireAdmin(req: Request, res: Response): boolean {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Authentication required." });
    return false;
  }
  if (!isRequestAdmin(req as { user?: { email?: string | null } })) {
    res.status(403).json({ error: "Admin access required." });
    return false;
  }
  return true;
}

router.get("/admin/tester-promo", async (req: Request, res: Response) => {
  if (!requireAdmin(req, res)) return;

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

// POST /admin/tester-promo/raise-cap
//
// Stripe doesn't allow editing `max_redemptions` on either the coupon or
// an existing promotion code, so "raising the cap" is implemented as:
//   1. Deactivate the current promotion code.
//   2. Create a new promotion code on the same coupon, reusing the same
//      customer-facing `code` string (e.g. TESTER6M) with the new cap.
//   3. Record the new promotion code's id on the coupon metadata so
//      subsequent reads pick it up automatically.
//
// From the admin's point of view this looks like the cap simply went up.
router.post("/admin/tester-promo/raise-cap", async (req: Request, res: Response) => {
  if (!requireAdmin(req, res)) return;

  const raw = (req.body as { maxRedemptions?: unknown })?.maxRedemptions;
  const maxRedemptions = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isInteger(maxRedemptions) || maxRedemptions <= 0) {
    res.status(400).json({ error: "maxRedemptions must be a positive integer." });
    return;
  }

  try {
    const stripe = await getUncachableStripeClient();
    const coupon = await stripe.coupons.retrieve(COUPON_ID);
    const currentPromo = await resolveActivePromo(stripe, coupon);

    if (
      currentPromo.max_redemptions != null &&
      maxRedemptions <= currentPromo.max_redemptions
    ) {
      res.status(400).json({
        error: `New cap (${maxRedemptions}) must be greater than the current cap (${currentPromo.max_redemptions}).`,
      });
      return;
    }

    // Deactivate the old code first so Stripe lets us reuse the same code
    // string on the new promotion code (active codes must be unique).
    const wasActive = currentPromo.active;
    if (wasActive) {
      await stripe.promotionCodes.update(currentPromo.id, { active: false });
    }

    let newPromo: Stripe.PromotionCode;
    try {
      newPromo = await stripe.promotionCodes.create({
        promotion: { type: "coupon", coupon: COUPON_ID },
        code: currentPromo.code,
        max_redemptions: maxRedemptions,
        active: true,
      });
    } catch (createErr) {
      // Rollback: re-activate the prior code so testers aren't left
      // without a working promo if the create call failed mid-flight.
      if (wasActive) {
        await stripe.promotionCodes
          .update(currentPromo.id, { active: true })
          .catch((rollbackErr) => {
            // eslint-disable-next-line no-console
            console.error(
              "[admin/tester-promo] FAILED to re-activate old promo after create failure",
              rollbackErr,
            );
          });
      }
      throw createErr;
    }

    const updatedCoupon = await stripe.coupons.update(COUPON_ID, {
      metadata: { [ACTIVE_PROMO_METADATA_KEY]: newPromo.id },
    });

    const payload = buildPayload(newPromo, updatedCoupon);
    cached = { payload, fetchedAt: Date.now() };
    res.json({ ...payload, cached: false, cachedAgeMs: 0 });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[admin/tester-promo] failed to raise cap", err);
    invalidateTesterPromoCache();
    res.status(502).json({ error: "Failed to raise cap in Stripe." });
  }
});

// POST /admin/tester-promo/mint
//
// Mint a brand-new promotion code on the same coupon. The founder uses
// this when she wants a different customer-facing code string (for a new
// batch of testers, an influencer, etc). The previously active code is
// deactivated so testers can't keep redeeming the old one.
router.post("/admin/tester-promo/mint", async (req: Request, res: Response) => {
  if (!requireAdmin(req, res)) return;

  const body = (req.body ?? {}) as { code?: unknown; maxRedemptions?: unknown };
  const codeRaw = typeof body.code === "string" ? body.code.trim() : "";
  const maxRaw = typeof body.maxRedemptions === "number"
    ? body.maxRedemptions
    : Number(body.maxRedemptions);

  if (!codeRaw || codeRaw.length < 3 || codeRaw.length > 40 || !/^[A-Z0-9_-]+$/i.test(codeRaw)) {
    res.status(400).json({
      error: "Code must be 3–40 characters, letters/numbers/_/- only.",
    });
    return;
  }
  if (!Number.isInteger(maxRaw) || maxRaw <= 0) {
    res.status(400).json({ error: "maxRedemptions must be a positive integer." });
    return;
  }

  try {
    const stripe = await getUncachableStripeClient();
    const coupon = await stripe.coupons.retrieve(COUPON_ID);
    const currentPromo = await resolveActivePromo(stripe, coupon).catch(() => null);

    const wasActive = currentPromo?.active === true;
    if (currentPromo && wasActive) {
      await stripe.promotionCodes.update(currentPromo.id, { active: false });
    }

    let newPromo: Stripe.PromotionCode;
    try {
      newPromo = await stripe.promotionCodes.create({
        promotion: { type: "coupon", coupon: COUPON_ID },
        code: codeRaw.toUpperCase(),
        max_redemptions: maxRaw,
        active: true,
      });
    } catch (createErr) {
      // Rollback: re-activate the prior code so we don't leave the
      // tester promo silently disabled after a failed mint.
      if (currentPromo && wasActive) {
        await stripe.promotionCodes
          .update(currentPromo.id, { active: true })
          .catch((rollbackErr) => {
            // eslint-disable-next-line no-console
            console.error(
              "[admin/tester-promo] FAILED to re-activate old promo after mint failure",
              rollbackErr,
            );
          });
      }
      throw createErr;
    }

    const updatedCoupon = await stripe.coupons.update(COUPON_ID, {
      metadata: { [ACTIVE_PROMO_METADATA_KEY]: newPromo.id },
    });

    const payload = buildPayload(newPromo, updatedCoupon);
    cached = { payload, fetchedAt: Date.now() };
    res.json({ ...payload, cached: false, cachedAgeMs: 0 });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[admin/tester-promo] failed to mint new code", err);
    invalidateTesterPromoCache();
    const message = err instanceof Error ? err.message : "Unknown error";
    // Stripe returns a clear "code already exists" error — surface it so
    // the admin knows to pick a different string.
    if (/already.*exist|already.*in use/i.test(message)) {
      res.status(409).json({ error: "That code is already in use. Pick a different one." });
      return;
    }
    res.status(502).json({ error: "Failed to mint new code in Stripe." });
  }
});

export default router;
