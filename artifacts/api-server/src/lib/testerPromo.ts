import { getUncachableStripeClient } from "../stripeClient.js";
type StripeClient = Awaited<ReturnType<typeof getUncachableStripeClient>>;

// Local shape definitions — only the fields our code reads.
// Avoids import type Stripe namespace access (TS2702 under moduleResolution:bundler).
export interface StripeCoupon {
  id?: string;
  name?: string | null;
  metadata: Record<string, string> | null;
  max_redemptions?: number | null;
}
export interface StripePromotionCode {
  id: string;
  code: string;
  active: boolean;
  times_redeemed: number;
  max_redemptions?: number | null;
  created?: number;
}

// Original (bootstrap) promotion code on the TESTER6M coupon. We treat this
// as a fallback only — once the founder raises the cap or mints a new code
// from the admin widget, we record the new promotion code's id on the
// coupon's metadata (`active_promotion_code_id`) and read it back from
// there. Storing it on the coupon keeps Stripe as the single source of
// truth so we don't need a separate DB table just for one ID.
export const FALLBACK_PROMOTION_CODE_ID = "promo_1TT4njC02Ie3Okka4fxyFFkx";
export const COUPON_ID = "zsUaJOzp";
export const ACTIVE_PROMO_METADATA_KEY = "active_promotion_code_id";

// Metadata keys used by the tester-promo alert job to throttle emails.
// Defined here (rather than in testerPromoAlert.ts) so buildPayload can
// surface the throttle state to the admin widget without creating a
// circular import. The alert job re-exports them from this module.
export const ALERTED_PROMO_ID_KEY = "alerted_promo_id";
export const ALERTED_THRESHOLDS_KEY = "alerted_thresholds";

export function parseAlertedThresholds(
  value: string | undefined | null,
): number[] {
  if (!value) return [];
  const parsed = value
    .split(",")
    .map((s) => Number(s.trim()))
    .filter((n) => Number.isFinite(n));
  return [...new Set(parsed)].sort((a, b) => a - b);
}

export interface PromoPayload {
  code: string | null;
  promotionCodeId: string;
  active: boolean;
  timesRedeemed: number;
  maxRedemptions: number | null;
  promoMaxRedemptions: number | null;
  remaining: number | null;
  couponName: string | null;
  // Thresholds (e.g. [80, 100]) for which Pia has already received an
  // alert email for *this* active promotion code. Empty when no alerts
  // have fired yet, or when the recorded throttle belongs to a previous
  // promo id (raise-cap / mint resets the slate).
  alertedThresholds: number[];
}

async function getActivePromotionCodeId(coupon: StripeCoupon): Promise<string> {
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
export async function resolveActivePromo(
  stripe: StripeClient,
  coupon: StripeCoupon,
): Promise<StripePromotionCode> {
  const promoId = await getActivePromotionCodeId(coupon);
  try {
    return await stripe.promotionCodes.retrieve(promoId);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn(
      `[tester-promo] active promo ${promoId} unreachable, falling back to coupon listing`,
      err,
    );
    const list = await stripe.promotionCodes.list({ coupon: COUPON_ID, limit: 50 });
    if (list.data.length === 0) {
      throw err;
    }
    const active = list.data.find((p) => p.active);
    const sorted = [...list.data].sort((a, b) => (b.created ?? 0) - (a.created ?? 0));
    return active ?? sorted[0];
  }
}

export function buildPayload(
  promo: StripePromotionCode,
  coupon: StripeCoupon,
): PromoPayload {
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

  // Only surface alert state when it belongs to the *current* promo id.
  // Raise-cap and mint both create a new promotion code id, which resets
  // the alert throttle — showing stale thresholds from a previous code
  // would mislead Pia into thinking she's been emailed about this one.
  const recordedPromoId = coupon.metadata?.[ALERTED_PROMO_ID_KEY] ?? null;
  const alertedThresholds =
    recordedPromoId === promo.id
      ? parseAlertedThresholds(coupon.metadata?.[ALERTED_THRESHOLDS_KEY])
      : [];

  return {
    code: promo.code,
    promotionCodeId: promo.id,
    active: promo.active,
    timesRedeemed,
    maxRedemptions,
    promoMaxRedemptions: promoMax,
    remaining,
    couponName: coupon.name ?? null,
    alertedThresholds,
  };
}

export async function fetchPromoFromStripe(): Promise<{
  payload: PromoPayload;
  promo: StripePromotionCode;
  coupon: StripeCoupon;
}> {
  const stripe = await getUncachableStripeClient();
  const coupon = await stripe.coupons.retrieve(COUPON_ID);
  const promo = await resolveActivePromo(stripe, coupon);
  return { payload: buildPayload(promo, coupon), promo, coupon };
}
