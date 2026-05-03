import { beforeEach, describe, expect, it, vi } from "vitest";
import type Stripe from "stripe";

// Capture every .set() payload + the .where() clause so each test can
// assert exactly what got written. The drizzle update chain is
// .update(...).set(...).where(...) — the where call resolves the promise.
const setCalls: Array<unknown> = [];
const whereCalls: Array<unknown> = [];
const updateTables: Array<unknown> = [];
let lastUpdateTable: unknown = null;

// Test-controllable result of the audit-row UPDATE (#107). Tests can set
// this to simulate a matched audit row, which the webhook handler then
// uses as a signal to skip downgrading.
let auditUpdateReturn: Array<{ paymentIntentId: string }> = [];

const usersTableMock = {
  id: { name: "id" },
  stripeCustomerId: { name: "stripeCustomerId" },
};
const paymentTestChargesTableMock = {
  paymentIntentId: { name: "paymentIntentId" },
  chargeId: { name: "chargeId" },
  webhookReceivedAt: { name: "webhookReceivedAt" },
  webhookEventId: { name: "webhookEventId" },
};

// Filter helper for tests that only care about writes to the user record.
function userSetCalls(): Array<unknown> {
  return setCalls.filter((_v, i) => updateTables[i] === usersTableMock);
}

vi.mock("@workspace/db", () => {
  return {
    db: {
      update(table: unknown) {
        lastUpdateTable = table;
        return {
          set(values: unknown) {
            setCalls.push(values);
            updateTables.push(lastUpdateTable);
            return {
              where(clause: unknown) {
                whereCalls.push(clause);
                // Mirror drizzle's chained `.returning()` API for the
                // audit-update path.
                const promise = Promise.resolve() as Promise<unknown> & {
                  returning?: () => Promise<Array<{ paymentIntentId: string }>>;
                };
                promise.returning = () => Promise.resolve(auditUpdateReturn);
                return promise;
              },
            };
          },
        };
      },
    },
    usersTable: usersTableMock,
    paymentTestChargesTable: paymentTestChargesTableMock,
  };
});

const { applyStripeEventToUser } = await import("./stripeUserSync");

const noopLogger = {
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
} as unknown as Parameters<typeof applyStripeEventToUser>[1];

function ev<T>(type: string, object: T, id = "evt_test"): Stripe.Event {
  return {
    id,
    type,
    data: { object },
    object: "event",
  } as unknown as Stripe.Event;
}

beforeEach(() => {
  setCalls.length = 0;
  whereCalls.length = 0;
  updateTables.length = 0;
  lastUpdateTable = null;
  auditUpdateReturn = [];
  vi.clearAllMocks();
});

describe("applyStripeEventToUser", () => {
  describe("checkout.session.completed", () => {
    it("upgrades user to premium with subscription + customer ids", async () => {
      await applyStripeEventToUser(
        ev("checkout.session.completed", {
          metadata: { userId: "user-123" },
          subscription: "sub_abc",
          customer: "cus_xyz",
        }),
        noopLogger,
      );
      expect(setCalls).toHaveLength(1);
      expect(setCalls[0]).toEqual({
        plan: "premium",
        stripeSubscriptionId: "sub_abc",
        stripeCustomerId: "cus_xyz",
      });
    });

    it("handles object-form subscription / customer", async () => {
      await applyStripeEventToUser(
        ev("checkout.session.completed", {
          metadata: { userId: "user-123" },
          subscription: { id: "sub_abc" },
          customer: { id: "cus_xyz" },
        }),
        noopLogger,
      );
      expect(setCalls[0]).toEqual({
        plan: "premium",
        stripeSubscriptionId: "sub_abc",
        stripeCustomerId: "cus_xyz",
      });
    });

    it("upgrades plan even when subscription/customer are missing (one-time charge)", async () => {
      await applyStripeEventToUser(
        ev("checkout.session.completed", {
          metadata: { userId: "user-123" },
        }),
        noopLogger,
      );
      expect(setCalls[0]).toEqual({ plan: "premium" });
    });

    it("does NOT touch the DB if userId metadata is missing", async () => {
      await applyStripeEventToUser(
        ev("checkout.session.completed", {
          metadata: {},
          subscription: "sub_abc",
        }),
        noopLogger,
      );
      expect(setCalls).toHaveLength(0);
      expect(noopLogger.warn).toHaveBeenCalled();
    });
  });

  describe("customer.subscription.created / updated", () => {
    it("grants premium when subscription is active", async () => {
      await applyStripeEventToUser(
        ev("customer.subscription.created", {
          id: "sub_1",
          customer: "cus_1",
          status: "active",
        }),
        noopLogger,
      );
      expect(setCalls[0]).toEqual({
        plan: "premium",
        stripeSubscriptionId: "sub_1",
        subscriptionStatus: "active",
        trialEndsAt: null,
      });
    });

    it("grants premium when subscription is trialing", async () => {
      await applyStripeEventToUser(
        ev("customer.subscription.updated", {
          id: "sub_1",
          customer: "cus_1",
          status: "trialing",
          trial_end: 1_700_000_000,
        }),
        noopLogger,
      );
      expect(setCalls[0]).toEqual({
        plan: "premium",
        stripeSubscriptionId: "sub_1",
        subscriptionStatus: "trialing",
        trialEndsAt: new Date(1_700_000_000 * 1000),
      });
    });

    it("downgrades to free on past_due", async () => {
      await applyStripeEventToUser(
        ev("customer.subscription.updated", {
          id: "sub_1",
          customer: "cus_1",
          status: "past_due",
        }),
        noopLogger,
      );
      expect(setCalls[0]).toEqual({
        plan: "free",
        stripeSubscriptionId: null,
        subscriptionStatus: "past_due",
        trialEndsAt: null,
      });
    });

    it("downgrades to free on canceled", async () => {
      await applyStripeEventToUser(
        ev("customer.subscription.updated", {
          id: "sub_1",
          customer: "cus_1",
          status: "canceled",
        }),
        noopLogger,
      );
      expect(setCalls[0]).toEqual({
        plan: "free",
        stripeSubscriptionId: null,
        subscriptionStatus: "canceled",
        trialEndsAt: null,
      });
    });

    it("downgrades to free on incomplete_expired", async () => {
      await applyStripeEventToUser(
        ev("customer.subscription.updated", {
          id: "sub_1",
          customer: "cus_1",
          status: "incomplete_expired",
        }),
        noopLogger,
      );
      expect(setCalls[0]).toEqual({
        plan: "free",
        stripeSubscriptionId: null,
        subscriptionStatus: "incomplete_expired",
        trialEndsAt: null,
      });
    });

    it("handles object-form customer reference", async () => {
      await applyStripeEventToUser(
        ev("customer.subscription.created", {
          id: "sub_1",
          customer: { id: "cus_obj" },
          status: "active",
        }),
        noopLogger,
      );
      // Look at the where clause was called with something — we can't
      // introspect the eq() result easily, but the call happened with the
      // active-state set payload.
      expect(setCalls[0]).toEqual({
        plan: "premium",
        stripeSubscriptionId: "sub_1",
        subscriptionStatus: "active",
        trialEndsAt: null,
      });
      expect(whereCalls).toHaveLength(1);
    });
  });

  describe("customer.subscription.deleted", () => {
    it("downgrades the user mapped to that customer", async () => {
      await applyStripeEventToUser(
        ev("customer.subscription.deleted", {
          id: "sub_1",
          customer: "cus_1",
          status: "canceled",
        }),
        noopLogger,
      );
      expect(setCalls[0]).toEqual({
        plan: "free",
        stripeSubscriptionId: null,
        subscriptionStatus: "canceled",
        trialEndsAt: null,
      });
    });
  });

  describe("charge.refunded", () => {
    it("downgrades on a full refund", async () => {
      await applyStripeEventToUser(
        ev("charge.refunded", {
          id: "ch_1",
          customer: "cus_1",
          amount: 1000,
          amount_refunded: 1000,
        }),
        noopLogger,
      );
      // The handler probes the audit table first (no match → continues
      // to the downgrade write on usersTable).
      expect(userSetCalls()).toEqual([
        {
          plan: "free",
          stripeSubscriptionId: null,
          subscriptionStatus: "canceled",
          trialEndsAt: null,
        },
      ]);
    });

    it("ignores partial refunds (does NOT touch user.plan)", async () => {
      await applyStripeEventToUser(
        ev("charge.refunded", {
          id: "ch_1",
          customer: "cus_1",
          amount: 1000,
          amount_refunded: 400,
        }),
        noopLogger,
      );
      expect(userSetCalls()).toHaveLength(0);
    });

    it("ignores refunds with no customer", async () => {
      await applyStripeEventToUser(
        ev("charge.refunded", {
          id: "ch_1",
          customer: null,
          amount: 1000,
          amount_refunded: 1000,
        }),
        noopLogger,
      );
      expect(setCalls).toHaveLength(0);
    });

    it("matches the audit row for a go-live test charge and skips downgrade (#107)", async () => {
      // Simulate the admin button having inserted an audit row before
      // refunding: the UPDATE on payment_test_charges returns one row,
      // which is the handler's signal that this is a verification ping.
      auditUpdateReturn = [{ paymentIntentId: "pi_test" }];
      await applyStripeEventToUser(
        ev("charge.refunded", {
          id: "ch_test_charge",
          customer: "cus_admin",
          payment_intent: "pi_test",
          amount: 100,
          amount_refunded: 100,
        }),
        noopLogger,
      );
      // Audit-row write happened, but no usersTable write.
      expect(userSetCalls()).toHaveLength(0);
      expect(updateTables).toContain(paymentTestChargesTableMock);
    });

    it("falls back to charge.metadata.purpose when audit row is missing (#107)", async () => {
      auditUpdateReturn = [];
      await applyStripeEventToUser(
        ev("charge.refunded", {
          id: "ch_test_charge",
          customer: "cus_admin",
          payment_intent: "pi_test",
          amount: 100,
          amount_refunded: 100,
          metadata: { purpose: "go_live_test_charge" },
        }),
        noopLogger,
      );
      expect(userSetCalls()).toHaveLength(0);
    });

    it("treats over-refund (rounding edge) as full refund", async () => {
      await applyStripeEventToUser(
        ev("charge.refunded", {
          id: "ch_1",
          customer: "cus_1",
          amount: 1000,
          amount_refunded: 1001,
        }),
        noopLogger,
      );
      expect(userSetCalls()).toEqual([
        {
          plan: "free",
          stripeSubscriptionId: null,
          subscriptionStatus: "canceled",
          trialEndsAt: null,
        },
      ]);
    });
  });

  describe("unhandled events", () => {
    it("is a no-op for invoice.* events", async () => {
      await applyStripeEventToUser(
        ev("invoice.payment_succeeded", { id: "in_1" }),
        noopLogger,
      );
      expect(setCalls).toHaveLength(0);
    });

    it("is a no-op for payment_intent.* events", async () => {
      await applyStripeEventToUser(
        ev("payment_intent.succeeded", { id: "pi_1" }),
        noopLogger,
      );
      expect(setCalls).toHaveLength(0);
    });

    it("is a no-op for unknown event types", async () => {
      await applyStripeEventToUser(
        ev("customer.tax_id.created", { id: "txi_1" }),
        noopLogger,
      );
      expect(setCalls).toHaveLength(0);
    });
  });
});
