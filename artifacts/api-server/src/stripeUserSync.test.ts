import { beforeEach, describe, expect, it, vi } from "vitest";
import type Stripe from "stripe";

// Capture every .set() payload + the .where() clause so each test can
// assert exactly what got written. The drizzle update chain is
// .update(...).set(...).where(...) — the where call resolves the promise.
const setCalls: Array<unknown> = [];
const whereCalls: Array<unknown> = [];
let lastUpdateTable: unknown = null;

vi.mock("@workspace/db", () => {
  return {
    db: {
      update(table: unknown) {
        lastUpdateTable = table;
        return {
          set(values: unknown) {
            setCalls.push(values);
            return {
              where(clause: unknown) {
                whereCalls.push(clause);
                return Promise.resolve();
              },
            };
          },
        };
      },
    },
    usersTable: {
      // Symbolic markers so eq(usersTable.x, ...) returns something
      // distinguishable. We don't assert on the exact clause shape.
      id: { name: "id" },
      stripeCustomerId: { name: "stripeCustomerId" },
    },
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
  lastUpdateTable = null;
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
      });
    });

    it("grants premium when subscription is trialing", async () => {
      await applyStripeEventToUser(
        ev("customer.subscription.updated", {
          id: "sub_1",
          customer: "cus_1",
          status: "trialing",
        }),
        noopLogger,
      );
      expect(setCalls[0]).toEqual({
        plan: "premium",
        stripeSubscriptionId: "sub_1",
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
      expect(setCalls[0]).toEqual({
        plan: "free",
        stripeSubscriptionId: null,
      });
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
      expect(setCalls).toHaveLength(0);
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
      expect(setCalls[0]).toEqual({
        plan: "free",
        stripeSubscriptionId: null,
      });
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
