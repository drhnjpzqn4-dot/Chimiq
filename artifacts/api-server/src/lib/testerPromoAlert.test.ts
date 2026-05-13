import { beforeEach, describe, expect, it, vi } from "vitest";

const fetchPromoFromStripeMock = vi.fn();
const couponsUpdateMock = vi.fn();
const sgSendMock = vi.fn();
const sgSetApiKeyMock = vi.fn();

vi.mock("./testerPromo.js", async () => {
  const actual =
    await vi.importActual<typeof import("./testerPromo.js")>("./testerPromo.js");
  return {
    ...actual,
    fetchPromoFromStripe: fetchPromoFromStripeMock,
  };
});

vi.mock("../stripeClient.js", () => ({
  getUncachableStripeClient: async () => ({
    coupons: { update: couponsUpdateMock },
  }),
}));

vi.mock("@sendgrid/mail", () => ({
  default: { setApiKey: sgSetApiKeyMock, send: sgSendMock },
}));

const { checkAndAlertTesterPromo } = await import("./testerPromoAlert.js");
const { ALERTED_PROMO_ID_KEY, ALERTED_THRESHOLDS_KEY, COUPON_ID } =
  await import("./testerPromo.js");

const noopLogger = {
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  debug: vi.fn(),
} as unknown as Parameters<typeof checkAndAlertTesterPromo>[0];

// Local shape stubs — avoids import type Stripe namespace access (TS2702).
interface StripeCoupon {
  id?: string;
  name?: string | null;
  metadata: Record<string, string> | null;
  max_redemptions?: number | null;
}
interface StripePromotionCode {
  id: string;
  code: string;
  active: boolean;
  times_redeemed: number;
  max_redemptions?: number | null;
  created?: number;
}
interface SnapshotOpts {
  promoId?: string;
  code?: string | null;
  timesRedeemed: number;
  maxRedemptions: number | null;
  metadata?: Record<string, string>;
}

function snapshot(opts: SnapshotOpts) {
  const {
    promoId = "promo_current",
    code = "TEST6M",
    timesRedeemed,
    maxRedemptions,
    metadata = {},
  } = opts;
  const remaining =
    maxRedemptions != null ? Math.max(0, maxRedemptions - timesRedeemed) : null;
  return {
    payload: {
      code,
      promotionCodeId: promoId,
      active: true,
      timesRedeemed,
      maxRedemptions,
      promoMaxRedemptions: maxRedemptions,
      remaining,
      couponName: "Tester 6M",
      alertedThresholds: [],
    },
    promo: { id: promoId } as StripePromotionCode,
    coupon: { id: COUPON_ID, metadata } as unknown as StripeCoupon,
  };
}

beforeEach(() => {
  fetchPromoFromStripeMock.mockReset();
  couponsUpdateMock.mockReset();
  sgSendMock.mockReset();
  sgSetApiKeyMock.mockReset();
  // Default: SendGrid credentials available via the connector fetch.
  vi.stubGlobal(
    "fetch",
    vi.fn(async () =>
      new Response(
        JSON.stringify({
          items: [
            { settings: { api_key: "SG.fake", from_email: "noreply@x.test" } },
          ],
        }),
        { status: 200 },
      ),
    ),
  );
  vi.stubEnv("REPLIT_CONNECTORS_HOSTNAME", "connectors.test");
  vi.stubEnv("REPL_IDENTITY", "fake-identity");
  vi.stubEnv("TESTER_PROMO_ALERT_TO", "pia@test.local");
  couponsUpdateMock.mockResolvedValue({});
  sgSendMock.mockResolvedValue([{ statusCode: 202 }]);
});

describe("checkAndAlertTesterPromo", () => {
  it("fires once at 80% and records the threshold on coupon metadata", async () => {
    fetchPromoFromStripeMock.mockResolvedValue(
      snapshot({ timesRedeemed: 80, maxRedemptions: 100 }),
    );
    await checkAndAlertTesterPromo(noopLogger);

    expect(sgSendMock).toHaveBeenCalledTimes(1);
    expect(sgSendMock.mock.calls[0][0]).toMatchObject({
      to: "pia@test.local",
      subject: expect.stringContaining("80%"),
    });
    expect(couponsUpdateMock).toHaveBeenCalledWith(COUPON_ID, {
      metadata: {
        [ALERTED_PROMO_ID_KEY]: "promo_current",
        [ALERTED_THRESHOLDS_KEY]: "80",
      },
    });
  });

  it("fires once at 100% and labels the email as FULL", async () => {
    fetchPromoFromStripeMock.mockResolvedValue(
      snapshot({
        timesRedeemed: 100,
        maxRedemptions: 100,
        // 80 already alerted on, so only 100 should fire now.
        metadata: {
          [ALERTED_PROMO_ID_KEY]: "promo_current",
          [ALERTED_THRESHOLDS_KEY]: "80",
        },
      }),
    );
    await checkAndAlertTesterPromo(noopLogger);

    expect(sgSendMock).toHaveBeenCalledTimes(1);
    expect(sgSendMock.mock.calls[0][0].subject).toContain("FULL");
    expect(couponsUpdateMock).toHaveBeenCalledWith(COUPON_ID, {
      metadata: {
        [ALERTED_PROMO_ID_KEY]: "promo_current",
        [ALERTED_THRESHOLDS_KEY]: "80,100",
      },
    });
  });

  it("does not re-fire when both thresholds are already recorded", async () => {
    fetchPromoFromStripeMock.mockResolvedValue(
      snapshot({
        timesRedeemed: 100,
        maxRedemptions: 100,
        metadata: {
          [ALERTED_PROMO_ID_KEY]: "promo_current",
          [ALERTED_THRESHOLDS_KEY]: "80,100",
        },
      }),
    );
    await checkAndAlertTesterPromo(noopLogger);

    expect(sgSendMock).not.toHaveBeenCalled();
    expect(couponsUpdateMock).not.toHaveBeenCalled();
  });

  it("resets the throttle when the promotion code id changes (raise-cap / mint)", async () => {
    fetchPromoFromStripeMock.mockResolvedValue(
      snapshot({
        promoId: "promo_NEW",
        timesRedeemed: 80,
        maxRedemptions: 100,
        // Recorded id belongs to the old promo — should be ignored.
        metadata: {
          [ALERTED_PROMO_ID_KEY]: "promo_OLD",
          [ALERTED_THRESHOLDS_KEY]: "80,100",
        },
      }),
    );
    await checkAndAlertTesterPromo(noopLogger);

    expect(sgSendMock).toHaveBeenCalledTimes(1);
    expect(couponsUpdateMock).toHaveBeenCalledWith(COUPON_ID, {
      metadata: {
        [ALERTED_PROMO_ID_KEY]: "promo_NEW",
        [ALERTED_THRESHOLDS_KEY]: "80",
      },
    });
  });

  it("is a no-op for an uncapped promo", async () => {
    fetchPromoFromStripeMock.mockResolvedValue(
      snapshot({ timesRedeemed: 9999, maxRedemptions: null }),
    );
    await checkAndAlertTesterPromo(noopLogger);

    expect(sgSendMock).not.toHaveBeenCalled();
    expect(couponsUpdateMock).not.toHaveBeenCalled();
  });

  it("is a no-op when below the lowest threshold", async () => {
    fetchPromoFromStripeMock.mockResolvedValue(
      snapshot({ timesRedeemed: 50, maxRedemptions: 100 }),
    );
    await checkAndAlertTesterPromo(noopLogger);

    expect(sgSendMock).not.toHaveBeenCalled();
    expect(couponsUpdateMock).not.toHaveBeenCalled();
  });

  it("does not record the throttle when SendGrid send fails", async () => {
    sgSendMock.mockRejectedValue(new Error("sendgrid down"));
    fetchPromoFromStripeMock.mockResolvedValue(
      snapshot({ timesRedeemed: 80, maxRedemptions: 100 }),
    );
    await checkAndAlertTesterPromo(noopLogger);

    expect(sgSendMock).toHaveBeenCalledTimes(1);
    expect(couponsUpdateMock).not.toHaveBeenCalled();
  });

  it("does not record the throttle when SendGrid credentials are unavailable", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("{}", { status: 500 })),
    );
    fetchPromoFromStripeMock.mockResolvedValue(
      snapshot({ timesRedeemed: 80, maxRedemptions: 100 }),
    );
    await checkAndAlertTesterPromo(noopLogger);

    expect(sgSendMock).not.toHaveBeenCalled();
    expect(couponsUpdateMock).not.toHaveBeenCalled();
  });

  it("crossing both thresholds at once fires two emails and records both", async () => {
    fetchPromoFromStripeMock.mockResolvedValue(
      snapshot({ timesRedeemed: 100, maxRedemptions: 100 }),
    );
    await checkAndAlertTesterPromo(noopLogger);

    expect(sgSendMock).toHaveBeenCalledTimes(2);
    expect(couponsUpdateMock).toHaveBeenCalledWith(COUPON_ID, {
      metadata: {
        [ALERTED_PROMO_ID_KEY]: "promo_current",
        [ALERTED_THRESHOLDS_KEY]: "80,100",
      },
    });
  });

  it("swallows fetchPromoFromStripe failures without crashing", async () => {
    fetchPromoFromStripeMock.mockRejectedValue(new Error("stripe down"));
    await checkAndAlertTesterPromo(noopLogger);

    expect(sgSendMock).not.toHaveBeenCalled();
    expect(couponsUpdateMock).not.toHaveBeenCalled();
  });
});
