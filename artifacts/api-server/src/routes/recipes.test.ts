import { beforeEach, describe, expect, it, vi } from "vitest";
import express, { type Express } from "express";
import http from "node:http";
import type { AddressInfo } from "node:net";

// ---------------------------------------------------------------------------
// Hoisted state + mocks. vi.mock() factories run BEFORE top-level imports, so
// any state they capture must be created via vi.hoisted().
// ---------------------------------------------------------------------------
const hoisted = vi.hoisted(() => {
  const state = {
    selectResults: [] as unknown[][],
    insertResults: [] as unknown[][],
    updateResults: [] as unknown[][],
    insertValues: [] as unknown[],
    updateSets: [] as unknown[],
    whereCalls: [] as unknown[],
    transactionCount: 0,
  };

  function tableMarker(name: string) {
    return new Proxy(
      {},
      {
        get: (_t, prop) =>
          typeof prop === "string" ? `${name}.${prop}` : prop,
      },
    );
  }

  function makeChain(resolveValue: unknown) {
    const p = Promise.resolve(resolveValue);
    const obj: Record<string, unknown> = {};
    obj.from = () => obj;
    obj.where = (cond: unknown) => {
      state.whereCalls.push(cond);
      return obj;
    };
    obj.orderBy = () => obj;
    obj.limit = () => obj;
    obj.returning = () => obj;
    obj.then = p.then.bind(p);
    obj.catch = p.catch.bind(p);
    obj.finally = p.finally.bind(p);
    return obj;
  }

  return { state, tableMarker, makeChain };
});

const { state, tableMarker, makeChain } = hoisted;

vi.mock("@workspace/db", () => {
  const fakeDb = {
    select: () => makeChain(state.selectResults.shift() ?? []),
    insert: () => ({
      values: (v: unknown) => {
        state.insertValues.push(v);
        return makeChain(state.insertResults.shift() ?? []);
      },
    }),
    update: () => ({
      set: (v: unknown) => {
        state.updateSets.push(v);
        return makeChain(state.updateResults.shift() ?? []);
      },
    }),
    execute: () => Promise.resolve(),
    transaction: async (fn: (tx: unknown) => Promise<unknown>) => {
      state.transactionCount += 1;
      return fn({
        select: fakeDb.select,
        insert: fakeDb.insert,
        update: fakeDb.update,
        execute: fakeDb.execute,
      });
    },
  };
  return {
    db: fakeDb,
    recipesTable: tableMarker("recipes"),
    recipeEditEventsTable: tableMarker("recipeEditEvents"),
    usersTable: tableMarker("users"),
    RECIPE_RISK_LEVELS: ["safe", "caution", "high_risk"],
    RECIPE_STATUSES: ["pending", "approved", "changes_requested", "rejected"],
  };
});

const safetyMock = vi.hoisted(() => ({
  scan: vi.fn(),
  Unavailable: class extends Error {
    constructor() {
      super("Recipe safety scanner is not configured.");
      this.name = "RecipeSafetyUnavailableError";
    }
  },
}));

vi.mock("../lib/recipeSafety.js", () => ({
  scanRecipeSafety: safetyMock.scan,
  RecipeSafetyUnavailableError: safetyMock.Unavailable,
}));

// Import recipes router AFTER all mocks are registered.
const { default: recipesRouter } = await import("./recipes.js");

// ---------------------------------------------------------------------------
// Test app + server helpers
// ---------------------------------------------------------------------------

interface FakeUser {
  id: string;
  email: string;
  emailVerified?: boolean;
}

function makeApp(user?: FakeUser): Express {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    (req as unknown as { log: unknown }).log = {
      info: () => {},
      warn: () => {},
      error: () => {},
      debug: () => {},
    };
    if (user) (req as unknown as { user: FakeUser }).user = user;
    (req as unknown as { isAuthenticated: () => boolean }).isAuthenticated =
      function (this: { user?: FakeUser }) {
        return this.user != null;
      };
    next();
  });
  app.use("/api", recipesRouter);
  return app;
}

async function startServer(app: Express) {
  const server = http.createServer(app);
  await new Promise<void>((resolve) =>
    server.listen(0, "127.0.0.1", () => resolve()),
  );
  const port = (server.address() as AddressInfo).port;
  return {
    base: `http://127.0.0.1:${port}`,
    close: () => new Promise<void>((r) => server.close(() => r())),
  };
}

const validBody = (over: Record<string, unknown> = {}) => ({
  title: "Soothing Aloe Mask",
  category: "mask",
  skinTypes: ["all"],
  ingredients: [
    { name: "Aloe vera gel", amount: "2 tbsp" },
    { name: "Honey", amount: "1 tbsp" },
  ],
  method:
    "Mix the ingredients in a clean bowl and apply gently to the face for ten minutes, then rinse.",
  ...over,
});

async function postJson(base: string, path: string, body: unknown) {
  return fetch(`${base}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

const verdict = {
  riskLevel: "safe" as const,
  summary: "ok",
  flagged: [],
  warnings: [],
  saferSwaps: [],
  reviewedAt: "2026-05-03T00:00:00.000Z",
  modelVersion: "test-model",
};

import { SUPER_ADMIN_EMAIL } from "../lib/admin.js";

const ADMIN_EMAIL = SUPER_ADMIN_EMAIL;

beforeEach(() => {
  state.selectResults = [];
  state.insertResults = [];
  state.updateResults = [];
  state.insertValues = [];
  state.updateSets = [];
  state.whereCalls = [];
  state.transactionCount = 0;
  safetyMock.scan.mockReset();
  safetyMock.scan.mockResolvedValue(verdict);
  // ADMIN_EMAILS is ignored by lib/admin.ts (Pia is the only admin),
  // but we clear it so a test environment with a stale value can't
  // confuse readers of these tests.
  delete process.env.ADMIN_EMAILS;
});

// ---------------------------------------------------------------------------
// POST /recipes auth + email gates (#46a / #71)
// ---------------------------------------------------------------------------

describe("POST /api/recipes — auth + verified-email gates", () => {
  it("returns 401 when the caller is not authenticated", async () => {
    const { base, close } = await startServer(makeApp(undefined));
    const r = await postJson(base, "/api/recipes", validBody());
    expect(r.status).toBe(401);
    const json = (await r.json()) as { error: string };
    expect(json.error).toMatch(/sign in/i);
    expect(state.insertValues).toHaveLength(0);
    expect(safetyMock.scan).not.toHaveBeenCalled();
    await close();
  });

  it("returns 403 when the caller's email is not verified", async () => {
    const { base, close } = await startServer(
      makeApp({ id: "u1", email: "u1@x.com", emailVerified: false }),
    );
    const r = await postJson(base, "/api/recipes", validBody());
    expect(r.status).toBe(403);
    const json = (await r.json()) as { error: string };
    expect(json.error).toMatch(/verify your email/i);
    expect(state.insertValues).toHaveLength(0);
    expect(safetyMock.scan).not.toHaveBeenCalled();
    await close();
  });
});

// ---------------------------------------------------------------------------
// POST /recipes 5/day rate limit (#46a / #71)
// ---------------------------------------------------------------------------

describe("POST /api/recipes — 5-per-day rate limit", () => {
  it("accepts 5 submissions and rejects the 6th with 429 (clock frozen)", async () => {
    // Freeze wall-clock so `since = now - 24h` is deterministic — proves the
    // rate-limit window is anchored to a stable cutoff rather than drifting
    // mid-test.
    const FROZEN = new Date("2026-05-03T12:00:00.000Z");
    vi.useFakeTimers();
    vi.setSystemTime(FROZEN);

    const user: FakeUser = {
      id: "u1",
      email: "u1@x.com",
      emailVerified: true,
    };
    const { base, close } = await startServer(makeApp(user));

    try {
      for (let i = 0; i < 5; i++) {
        // Pre-check: count(recipes), count(edit-events).
        state.selectResults.push([{ count: i }], [{ count: 0 }]);
        // In-transaction recount: count(recipes), count(edit-events).
        state.selectResults.push([{ count: i }], [{ count: 0 }]);
        state.insertResults.push([
          { id: `00000000-0000-0000-0000-00000000000${i}`, status: "pending" },
        ]);

        const r = await postJson(base, "/api/recipes", validBody());
        expect(r.status, `submit #${i + 1} should succeed`).toBe(201);
      }

      expect(state.insertValues).toHaveLength(5);
      expect(safetyMock.scan).toHaveBeenCalledTimes(5);

      // Every count query was filtered by gte(createdAt, now-24h). Pull the
      // most recent count-style WHERE and assert the cutoff matches our
      // frozen clock exactly.
      const expectedSince = new Date(FROZEN.getTime() - 24 * 60 * 60 * 1000);
      const gteFilter = state.whereCalls
        .map((w) => w as { args?: Array<{ op: string; val?: unknown }> })
        .flatMap((w) => w.args ?? [])
        .find((a) => a.op === "gte");
      expect(gteFilter).toBeDefined();
      expect((gteFilter!.val as Date).getTime()).toBe(expectedSince.getTime());

      // 6th request: pre-check returns 5 — short-circuits before AI scan.
      state.selectResults.push([{ count: 5 }], [{ count: 0 }]);
      const sixth = await postJson(base, "/api/recipes", validBody());
      expect(sixth.status).toBe(429);
      const body = (await sixth.json()) as { error: string };
      expect(body.error).toMatch(/today's submission limit/i);

      expect(state.insertValues).toHaveLength(5);
      expect(safetyMock.scan).toHaveBeenCalledTimes(5);
    } finally {
      vi.useRealTimers();
      await close();
    }
  });

  it("returns 429 even if pre-check passes but transaction recount sees the 5th row (advisory-lock path)", async () => {
    const user: FakeUser = {
      id: "u1",
      email: "u1@x.com",
      emailVerified: true,
    };
    const { base, close } = await startServer(makeApp(user));

    // Pre-check passes (4 recipes + 0 edits < 5).
    state.selectResults.push([{ count: 4 }], [{ count: 0 }]);
    // In-transaction recount sees a concurrent insert had pushed it to 5.
    state.selectResults.push([{ count: 5 }], [{ count: 0 }]);

    const r = await postJson(base, "/api/recipes", validBody());
    expect(r.status).toBe(429);
    expect(state.insertValues).toHaveLength(0);
    await close();
  });
});

// ---------------------------------------------------------------------------
// Sanitiser strips/blocks script + HTML payloads in title / method / ingredient
// ---------------------------------------------------------------------------

describe("POST /api/recipes — sanitisation of submitted text", () => {
  const verifiedUser: FakeUser = {
    id: "u1",
    email: "u1@x.com",
    emailVerified: true,
  };

  function queueSuccessfulSubmit() {
    state.selectResults.push([{ count: 0 }], [{ count: 0 }]);
    state.selectResults.push([{ count: 0 }], [{ count: 0 }]);
    state.insertResults.push([
      { id: "00000000-0000-0000-0000-000000000099", status: "pending" },
    ]);
  }

  it("strips bare HTML tags from title before persisting", async () => {
    queueSuccessfulSubmit();
    const { base, close } = await startServer(makeApp(verifiedUser));
    const r = await postJson(
      base,
      "/api/recipes",
      validBody({ title: "Bright <b>Mask</b> Recipe" }),
    );
    expect(r.status).toBe(201);
    const inserted = state.insertValues[0] as { title: string };
    // <b>...</b> tags are stripped, runs of whitespace collapsed.
    expect(inserted.title).toBe("Bright Mask Recipe");
    await close();
  });

  it("strips bare HTML tags from method before persisting", async () => {
    queueSuccessfulSubmit();
    const { base, close } = await startServer(makeApp(verifiedUser));
    const r = await postJson(
      base,
      "/api/recipes",
      validBody({
        method:
          "Mix the <em>aloe</em> and <strong>honey</strong> in a clean bowl, then apply for ten minutes and rinse.",
      }),
    );
    expect(r.status).toBe(201);
    const inserted = state.insertValues[0] as { method: string };
    expect(inserted.method).toBe(
      "Mix the aloe and honey in a clean bowl, then apply for ten minutes and rinse.",
    );
    expect(inserted.method).not.toMatch(/<\/?[a-z]/i);
    await close();
  });

  it("strips bare HTML tags from ingredient name before persisting", async () => {
    queueSuccessfulSubmit();
    const { base, close } = await startServer(makeApp(verifiedUser));
    const r = await postJson(
      base,
      "/api/recipes",
      validBody({
        ingredients: [
          { name: "Aloe <b>vera</b> gel", amount: "2 tbsp" },
          { name: "Honey", amount: "1 tbsp" },
        ],
      }),
    );
    expect(r.status).toBe(201);
    const inserted = state.insertValues[0] as {
      ingredients: Array<{ name: string }>;
    };
    expect(inserted.ingredients[0].name).toBe("Aloe vera gel");
    expect(inserted.ingredients[0].name).not.toMatch(/<\/?[a-z]/i);
    await close();
  });

  it("rejects script tags in the title with a 400", async () => {
    const { base, close } = await startServer(makeApp(verifiedUser));
    const r = await postJson(
      base,
      "/api/recipes",
      validBody({ title: "<script>alert(1)</script>Mask" }),
    );
    expect(r.status).toBe(400);
    expect(state.insertValues).toHaveLength(0);
    await close();
  });

  it("rejects a javascript: payload in the method body with a 400", async () => {
    const { base, close } = await startServer(makeApp(verifiedUser));
    const r = await postJson(
      base,
      "/api/recipes",
      validBody({
        method:
          "Mix gently and apply javascript:alert(1) for ten minutes then rinse.",
      }),
    );
    expect(r.status).toBe(400);
    expect(state.insertValues).toHaveLength(0);
    await close();
  });

  it("rejects an iframe payload buried in an ingredient name with a 400", async () => {
    const { base, close } = await startServer(makeApp(verifiedUser));
    const r = await postJson(
      base,
      "/api/recipes",
      validBody({
        ingredients: [
          { name: "Aloe vera <iframe src=evil></iframe>" },
          { name: "Honey" },
        ],
      }),
    );
    expect(r.status).toBe(400);
    expect(state.insertValues).toHaveLength(0);
    await close();
  });
});

// ---------------------------------------------------------------------------
// Admin endpoints — non-admin denied, admin allowed
// ---------------------------------------------------------------------------

describe("Admin endpoints — admin-only enforcement", () => {
  const adminUser: FakeUser = {
    id: "admin-1",
    email: ADMIN_EMAIL,
    emailVerified: true,
  };
  const civilianUser: FakeUser = {
    id: "u2",
    email: "u2@x.com",
    emailVerified: true,
  };
  const RECIPE_ID = "00000000-0000-0000-0000-0000000000aa";

  it("POST /admin/recipes/:id/approve returns 403 for non-admin", async () => {
    const { base, close } = await startServer(makeApp(civilianUser));
    const r = await postJson(
      base,
      `/api/admin/recipes/${RECIPE_ID}/approve`,
      {},
    );
    expect(r.status).toBe(403);
    expect(state.updateSets).toHaveLength(0);
    await close();
  });

  it("POST /admin/recipes/:id/approve returns 200 for an admin and updates status", async () => {
    state.updateResults.push([
      { id: RECIPE_ID, submitterId: "u2", status: "approved" },
    ]);
    // Fire-and-forget submitter email lookup that runs after res.json().
    state.selectResults.push([{ email: "u2@x.com" }]);

    const { base, close } = await startServer(makeApp(adminUser));
    const r = await postJson(
      base,
      `/api/admin/recipes/${RECIPE_ID}/approve`,
      {},
    );
    expect(r.status).toBe(200);
    const body = (await r.json()) as { recipe: { status: string } };
    expect(body.recipe.status).toBe("approved");
    expect(state.updateSets).toHaveLength(1);
    expect((state.updateSets[0] as { status: string }).status).toBe("approved");
    await close();
  });

  it("GET /admin/recipes returns 403 for a non-admin caller", async () => {
    const { base, close } = await startServer(makeApp(civilianUser));
    const r = await fetch(`${base}/api/admin/recipes`);
    expect(r.status).toBe(403);
    await close();
  });

  it("GET /admin/recipes returns 200 for an admin caller", async () => {
    state.selectResults.push([
      { id: RECIPE_ID, title: "X", status: "pending" },
    ]);
    const { base, close } = await startServer(makeApp(adminUser));
    const r = await fetch(`${base}/api/admin/recipes`);
    expect(r.status).toBe(200);
    const body = (await r.json()) as { recipes: unknown[] };
    expect(body.recipes).toHaveLength(1);
    await close();
  });

  it("POST /admin/recipes/bulk returns 403 for a non-admin caller", async () => {
    const { base, close } = await startServer(makeApp(civilianUser));
    const r = await postJson(base, "/api/admin/recipes/bulk", {
      ids: [RECIPE_ID],
      action: "approve",
    });
    expect(r.status).toBe(403);
    expect(state.updateSets).toHaveLength(0);
    await close();
  });

  // Table-driven coverage for every status-changing admin endpoint —
  // confirms each one applies the same admin gate AND writes the right
  // status on success.
  const adminActions: Array<{
    label: string;
    path: string;
    expectedStatus: "approved" | "rejected" | "changes_requested";
  }> = [
    {
      label: "approve",
      path: `approve`,
      expectedStatus: "approved",
    },
    {
      label: "reject",
      path: `reject`,
      expectedStatus: "rejected",
    },
    {
      label: "request-changes",
      path: `request-changes`,
      expectedStatus: "changes_requested",
    },
  ];

  it.each(adminActions)(
    "POST /admin/recipes/:id/$label rejects non-admin (403) and accepts admin (200)",
    async ({ path, expectedStatus }) => {
      // Non-admin is denied without any DB write.
      {
        const { base, close } = await startServer(makeApp(civilianUser));
        const r = await postJson(
          base,
          `/api/admin/recipes/${RECIPE_ID}/${path}`,
          {},
        );
        expect(r.status).toBe(403);
        expect(state.updateSets).toHaveLength(0);
        await close();
      }

      // Admin succeeds and the persisted update carries the right status.
      state.updateResults.push([
        { id: RECIPE_ID, submitterId: "u2", status: expectedStatus },
      ]);
      state.selectResults.push([{ email: "u2@x.com" }]); // fire-and-forget
      const { base, close } = await startServer(makeApp(adminUser));
      const r = await postJson(
        base,
        `/api/admin/recipes/${RECIPE_ID}/${path}`,
        {},
      );
      expect(r.status).toBe(200);
      const wrote = state.updateSets[0] as { status: string };
      expect(wrote.status).toBe(expectedStatus);
      await close();
    },
  );

  it("POST /admin/recipes/bulk accepts an admin caller and writes the bulk status", async () => {
    state.updateResults.push([
      { id: RECIPE_ID, submitterId: "u2", title: "X" },
    ]);
    // Lookup of submitter emails fired before the response.
    state.selectResults.push([{ id: "u2", email: "u2@x.com" }]);

    const { base, close } = await startServer(makeApp(adminUser));
    const r = await postJson(base, "/api/admin/recipes/bulk", {
      ids: [RECIPE_ID],
      action: "reject",
    });
    expect(r.status).toBe(200);
    const body = (await r.json()) as { updated: number; ids: string[] };
    expect(body.updated).toBe(1);
    expect(body.ids).toEqual([RECIPE_ID]);
    expect((state.updateSets[0] as { status: string }).status).toBe("rejected");
    await close();
  });
});

// ---------------------------------------------------------------------------
// Public list / detail must filter to status='approved' (#71)
// ---------------------------------------------------------------------------

describe("GET /api/recipes — public list filters to approved only", () => {
  it("queries with status='approved' in the WHERE clause", async () => {
    state.selectResults.push([
      {
        id: "00000000-0000-0000-0000-000000000001",
        title: "Approved Mask",
        category: "mask",
        skinTypes: ["all"],
        ingredients: [],
        riskLevel: "safe",
        photoUrl: null,
        aiVerdict: null,
        createdAt: new Date(),
      },
    ]);
    const { base, close } = await startServer(makeApp());
    const r = await fetch(`${base}/api/recipes`);
    expect(r.status).toBe(200);

    const where = state.whereCalls[0] as {
      op: string;
      args: Array<{ op: string; col?: string; val?: string }>;
    };
    expect(where.op).toBe("and");
    const hasApprovedFilter = where.args.some(
      (a) =>
        a.op === "eq" && a.col === "recipes.status" && a.val === "approved",
    );
    expect(hasApprovedFilter).toBe(true);
    await close();
  });
});

describe("GET /api/recipes/:id — only approved recipes are public", () => {
  const ID = "00000000-0000-0000-0000-000000000010";

  it("returns 404 when no row matches the id+approved filter", async () => {
    state.selectResults.push([]); // simulates non-approved or missing
    const { base, close } = await startServer(makeApp());
    const r = await fetch(`${base}/api/recipes/${ID}`);
    expect(r.status).toBe(404);

    const where = state.whereCalls[0] as {
      op: string;
      args: Array<{ op: string; col?: string; val?: string }>;
    };
    expect(where.op).toBe("and");
    expect(
      where.args.some(
        (a) =>
          a.op === "eq" && a.col === "recipes.status" && a.val === "approved",
      ),
    ).toBe(true);
    expect(
      where.args.some((a) => a.op === "eq" && a.col === "recipes.id"),
    ).toBe(true);
    await close();
  });

  it("returns 200 with the recipe when an approved row exists", async () => {
    state.selectResults.push([
      {
        id: ID,
        title: "Approved",
        category: "mask",
        skinTypes: ["all"],
        ingredients: [],
        method: "do the thing",
        photoUrl: null,
        aiVerdict: null,
        riskLevel: "safe",
        adminNote: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
    const { base, close } = await startServer(makeApp());
    const r = await fetch(`${base}/api/recipes/${ID}`);
    expect(r.status).toBe(200);
    const body = (await r.json()) as { recipe: { id: string } };
    expect(body.recipe.id).toBe(ID);
    await close();
  });

  it("returns 400 for an obviously-malformed id (UUID guard)", async () => {
    const { base, close } = await startServer(makeApp());
    const r = await fetch(`${base}/api/recipes/not-a-uuid`);
    expect(r.status).toBe(400);
    await close();
  });
});
