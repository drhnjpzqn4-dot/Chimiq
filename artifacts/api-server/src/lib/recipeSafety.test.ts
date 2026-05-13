import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock the Anthropic SDK before importing the module under test. Each test
// can override `mockCreate.mockResolvedValueOnce(...)` to control what the
// fake model returns.
const mockCreate = vi.fn();
vi.mock("@anthropic-ai/sdk", () => {
  return {
    default: class FakeAnthropic {
      messages = { create: mockCreate };
      constructor(_opts: unknown) {}
    },
  };
});

// Import AFTER vi.mock so the mocked SDK is what the module sees.
const { scanRecipeSafety, RecipeSafetyUnavailableError } = await import(
  "./recipeSafety.js"
);

const noopLog = () => {};

const VALID_VERDICT = {
  riskLevel: "caution",
  summary: "Lemon juice on facial skin can be phototoxic.",
  flagged: [
    {
      ingredient: "Lemon juice",
      reason: "UV-reactive citrus juice on skin.",
      severity: "warn",
    },
  ],
  warnings: ["Use sunscreen the day after applying."],
  saferSwaps: [
    {
      from: "Lemon juice",
      to: "Niacinamide",
      why: "Brightens without UV reactivity.",
    },
  ],
};

function textBlock(text: string) {
  return {
    content: [{ type: "text", text }],
  };
}

describe("scanRecipeSafety", () => {
  beforeEach(() => {
    process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL = "https://example.test";
    process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY = "test-key";
    mockCreate.mockReset();
  });

  afterEach(() => {
    delete process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL;
    delete process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY;
  });

  it("throws RecipeSafetyUnavailableError when base URL is missing", async () => {
    delete process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL;
    await expect(
      scanRecipeSafety({
        title: "Mask",
        category: "mask",
        ingredients: [{ name: "Aqua" }],
        log: noopLog,
      }),
    ).rejects.toBeInstanceOf(RecipeSafetyUnavailableError);
  });

  it("throws RecipeSafetyUnavailableError when API key is missing", async () => {
    delete process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY;
    await expect(
      scanRecipeSafety({
        title: "Mask",
        category: "mask",
        ingredients: [{ name: "Aqua" }],
        log: noopLog,
      }),
    ).rejects.toBeInstanceOf(RecipeSafetyUnavailableError);
  });

  it("returns parsed verdict with reviewedAt + modelVersion on a clean JSON response", async () => {
    mockCreate.mockResolvedValueOnce(textBlock(JSON.stringify(VALID_VERDICT)));
    const result = await scanRecipeSafety({
      title: "Brightening lemon mask",
      category: "mask",
      ingredients: [
        { name: "Lemon juice", amount: "1 tsp" },
        { name: "Honey", amount: "1 tbsp" },
      ],
      method: "Mix and apply for 10 minutes.",
      log: noopLog,
    });
    expect(result).not.toBeNull();
    expect(result?.riskLevel).toBe("caution");
    expect(result?.flagged).toHaveLength(1);
    expect(result?.flagged[0].ingredient).toBe("Lemon juice");
    expect(result?.modelVersion).toBe("claude-sonnet-4-5");
    expect(typeof result?.reviewedAt).toBe("string");
    // ISO 8601
    expect(() => new Date(result!.reviewedAt).toISOString()).not.toThrow();
  });

  it("extracts JSON when the model wraps the response in extra prose", async () => {
    const wrapped = `Sure! Here's the verdict:\n\n${JSON.stringify(VALID_VERDICT)}\n\nLet me know if you need anything else.`;
    mockCreate.mockResolvedValueOnce(textBlock(wrapped));
    const result = await scanRecipeSafety({
      title: "Mask",
      category: "mask",
      ingredients: [{ name: "Aqua" }],
      log: noopLog,
    });
    expect(result?.riskLevel).toBe("caution");
  });

  it("accepts a high_risk verdict (preservation issue)", async () => {
    mockCreate.mockResolvedValueOnce(
      textBlock(
        JSON.stringify({
          ...VALID_VERDICT,
          riskLevel: "high_risk",
          summary: "Aqueous recipe without preservative — mold risk.",
        }),
      ),
    );
    const result = await scanRecipeSafety({
      title: "Water toner",
      category: "toner",
      ingredients: [{ name: "Aqua" }, { name: "Glycerin" }],
      log: noopLog,
    });
    expect(result?.riskLevel).toBe("high_risk");
  });

  it("accepts a safe verdict with empty flagged/warnings/saferSwaps", async () => {
    mockCreate.mockResolvedValueOnce(
      textBlock(
        JSON.stringify({
          riskLevel: "safe",
          summary: "Looks fine.",
          flagged: [],
          warnings: [],
          saferSwaps: [],
        }),
      ),
    );
    const result = await scanRecipeSafety({
      title: "Oat mask",
      category: "mask",
      ingredients: [{ name: "Oat", amount: "2 tbsp" }],
      log: noopLog,
    });
    expect(result?.riskLevel).toBe("safe");
    expect(result?.flagged).toEqual([]);
  });

  it("returns null when extracted JSON is malformed", async () => {
    // Has a `{` so the regex matches a slice, but the slice is not valid JSON.
    mockCreate.mockResolvedValueOnce(
      textBlock("Here you go: { riskLevel: caution, oops no quotes }"),
    );
    const logs: Array<{ msg: string; data?: unknown }> = [];
    const result = await scanRecipeSafety({
      title: "Mask",
      category: "mask",
      ingredients: [{ name: "Aqua" }],
      log: (msg, data) => logs.push({ msg, data }),
    });
    expect(result).toBeNull();
    expect(logs.some((l) => l.msg.includes("failed to parse JSON"))).toBe(true);
  });

  it("returns null when response has no JSON-shaped substring", async () => {
    // No `{` at all -> jsonMatch is null -> falls back to "{}" -> parses
    // but fails schema -> returns null with schema mismatch log.
    mockCreate.mockResolvedValueOnce(textBlock("not json at all"));
    const logs: Array<{ msg: string }> = [];
    const result = await scanRecipeSafety({
      title: "Mask",
      category: "mask",
      ingredients: [{ name: "Aqua" }],
      log: (msg) => logs.push({ msg }),
    });
    expect(result).toBeNull();
    expect(logs.some((l) => l.msg.includes("schema mismatch"))).toBe(true);
  });

  it("returns null when JSON shape doesn't match the schema", async () => {
    mockCreate.mockResolvedValueOnce(
      textBlock(
        JSON.stringify({
          riskLevel: "totally-safe", // invalid enum value
          summary: "ok",
          flagged: [],
          warnings: [],
          saferSwaps: [],
        }),
      ),
    );
    const logs: Array<{ msg: string }> = [];
    const result = await scanRecipeSafety({
      title: "Mask",
      category: "mask",
      ingredients: [{ name: "Aqua" }],
      log: (msg) => logs.push({ msg }),
    });
    expect(result).toBeNull();
    expect(logs.some((l) => l.msg.includes("schema mismatch"))).toBe(true);
  });

  it("returns null when the model rejects/throws (network, rate limit, etc.)", async () => {
    mockCreate.mockRejectedValueOnce(new Error("upstream 429"));
    const logs: Array<{ msg: string }> = [];
    const result = await scanRecipeSafety({
      title: "Mask",
      category: "mask",
      ingredients: [{ name: "Aqua" }],
      log: (msg) => logs.push({ msg }),
    });
    expect(result).toBeNull();
    expect(logs.some((l) => l.msg.includes("anthropic error"))).toBe(true);
  });

  it("returns null when the response has no text block", async () => {
    mockCreate.mockResolvedValueOnce({
      content: [{ type: "tool_use", id: "x", name: "noop", input: {} }],
    });
    const result = await scanRecipeSafety({
      title: "Mask",
      category: "mask",
      ingredients: [{ name: "Aqua" }],
      log: noopLog,
    });
    expect(result).toBeNull();
  });

  it("returns null when content array is empty", async () => {
    mockCreate.mockResolvedValueOnce({ content: [] });
    const result = await scanRecipeSafety({
      title: "Mask",
      category: "mask",
      ingredients: [{ name: "Aqua" }],
      log: noopLog,
    });
    expect(result).toBeNull();
  });

  it("includes ingredient amount and notes in the user prompt", async () => {
    mockCreate.mockResolvedValueOnce(textBlock(JSON.stringify(VALID_VERDICT)));
    await scanRecipeSafety({
      title: "Test recipe",
      category: "serum",
      ingredients: [
        { name: "Niacinamide", amount: "5%", notes: "active" },
        { name: "Aqua" },
      ],
      method: "Mix gently.",
      log: noopLog,
    });
    expect(mockCreate).toHaveBeenCalledOnce();
    const callArgs = mockCreate.mock.calls[0][0];
    const userText = callArgs.messages[0].content;
    expect(userText).toContain("Test recipe");
    expect(userText).toContain("serum");
    expect(userText).toContain("Niacinamide (5%) — active");
    expect(userText).toContain("- Aqua");
    expect(userText).toContain("Mix gently.");
  });

  it("omits the Method section when method is not provided", async () => {
    mockCreate.mockResolvedValueOnce(textBlock(JSON.stringify(VALID_VERDICT)));
    await scanRecipeSafety({
      title: "No-method recipe",
      category: "oil",
      ingredients: [{ name: "Jojoba oil" }],
      log: noopLog,
    });
    const userText = mockCreate.mock.calls[0][0].messages[0].content;
    expect(userText).not.toContain("Method:");
  });

  it("uses the system prompt with the SkinScreen safety rules", async () => {
    mockCreate.mockResolvedValueOnce(textBlock(JSON.stringify(VALID_VERDICT)));
    await scanRecipeSafety({
      title: "Mask",
      category: "mask",
      ingredients: [{ name: "Aqua" }],
      log: noopLog,
    });
    const callArgs = mockCreate.mock.calls[0][0];
    expect(callArgs.system).toContain("cosmetic safety reviewer");
    expect(callArgs.system).toContain("essential oils");
    expect(callArgs.model).toBe("claude-sonnet-4-5");
  });
});
