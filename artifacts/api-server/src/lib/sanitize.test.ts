import { describe, expect, it } from "vitest";
import {
  SanitizationError,
  sanitizeBrand,
  sanitizeIngredients,
  sanitizeProductName,
  sanitizeText,
} from "./sanitize.js";

const VALID_INGREDIENTS =
  "Aqua, Glycerin, Niacinamide, Sodium Hyaluronate, Tocopherol, Panthenol, Citric Acid";

describe("sanitizeText - basic input handling", () => {
  it("rejects null/undefined when not allowEmpty", () => {
    expect(() => sanitizeText(undefined, { fieldName: "X", maxLength: 10 })).toThrow(
      SanitizationError,
    );
    expect(() => sanitizeText(null, { fieldName: "X", maxLength: 10 })).toThrow(
      SanitizationError,
    );
  });

  it("returns empty string for null/undefined when allowEmpty", () => {
    expect(sanitizeText(undefined, { fieldName: "X", maxLength: 10, allowEmpty: true })).toBe("");
    expect(sanitizeText(null, { fieldName: "X", maxLength: 10, allowEmpty: true })).toBe("");
  });

  it("rejects non-string input", () => {
    expect(() => sanitizeText(123, { fieldName: "X", maxLength: 10 })).toThrow(SanitizationError);
    expect(() => sanitizeText({}, { fieldName: "X", maxLength: 10 })).toThrow(SanitizationError);
    expect(() => sanitizeText([], { fieldName: "X", maxLength: 10 })).toThrow(SanitizationError);
  });

  it("rejects whitespace-only when not allowEmpty", () => {
    expect(() => sanitizeText("   \n\t  ", { fieldName: "X", maxLength: 10 })).toThrow(
      SanitizationError,
    );
  });

  it("collapses runs of whitespace and trims", () => {
    expect(sanitizeText("  hello   world  ", { fieldName: "X", maxLength: 50 })).toBe(
      "hello world",
    );
  });

  it("accepts a normal valid value with no false positives", () => {
    expect(sanitizeText("CeraVe Moisturizing Cream", { fieldName: "X", maxLength: 200 })).toBe(
      "CeraVe Moisturizing Cream",
    );
  });
});

describe("sanitizeText - HTML and script protection", () => {
  it("strips bare HTML tags", () => {
    expect(sanitizeText("<b>hello</b> world", { fieldName: "X", maxLength: 100 })).toBe(
      "hello world",
    );
  });

  it("rejects <script> blocks", () => {
    expect(() =>
      sanitizeText("<script>alert(1)</script>", { fieldName: "X", maxLength: 200 }),
    ).toThrow(/script-like/);
  });

  it("rejects javascript: URLs", () => {
    expect(() =>
      sanitizeText("click javascript:alert(1)", { fieldName: "X", maxLength: 200 }),
    ).toThrow(/script-like/);
  });

  it("rejects on*= event handlers", () => {
    expect(() =>
      sanitizeText('<img src=x onerror="alert(1)">', { fieldName: "X", maxLength: 200 }),
    ).toThrow(/script-like/);
    expect(() => sanitizeText("onclick = bad", { fieldName: "X", maxLength: 200 })).toThrow(
      /script-like/,
    );
  });

  it("rejects data:text/html payloads", () => {
    expect(() =>
      sanitizeText("data:text/html,<h1>x</h1>", { fieldName: "X", maxLength: 200 }),
    ).toThrow(/script-like/);
  });

  it("rejects iframe / object / embed tags", () => {
    expect(() =>
      sanitizeText("<iframe src=evil></iframe>", { fieldName: "X", maxLength: 200 }),
    ).toThrow(/script-like/);
    expect(() => sanitizeText("<object data=x></object>", { fieldName: "X", maxLength: 200 })).toThrow(
      /script-like/,
    );
    expect(() => sanitizeText("<embed src=x>", { fieldName: "X", maxLength: 200 })).toThrow(
      /script-like/,
    );
  });
});

describe("sanitizeText - SQL injection patterns", () => {
  it("rejects UNION SELECT", () => {
    expect(() =>
      sanitizeText("foo UNION SELECT * FROM users", { fieldName: "X", maxLength: 200 }),
    ).toThrow(/code-like/);
  });

  it("rejects DROP TABLE", () => {
    expect(() =>
      sanitizeText("'; DROP TABLE users", { fieldName: "X", maxLength: 200 }),
    ).toThrow(SanitizationError);
  });

  it("rejects INSERT INTO / DELETE FROM / UPDATE SET / ALTER TABLE / TRUNCATE", () => {
    expect(() =>
      sanitizeText("INSERT INTO foo values", { fieldName: "X", maxLength: 200 }),
    ).toThrow(/code-like/);
    expect(() => sanitizeText("DELETE FROM foo", { fieldName: "X", maxLength: 200 })).toThrow(
      /code-like/,
    );
    expect(() =>
      sanitizeText("update users set x=1", { fieldName: "X", maxLength: 200 }),
    ).toThrow(/code-like/);
    expect(() => sanitizeText("alter table foo", { fieldName: "X", maxLength: 200 })).toThrow(
      /code-like/,
    );
    expect(() => sanitizeText("truncate table foo", { fieldName: "X", maxLength: 200 })).toThrow(
      /code-like/,
    );
  });

  it("rejects SQL comment markers", () => {
    expect(() => sanitizeText("admin'-- ", { fieldName: "X", maxLength: 200 })).toThrow(
      /code-like/,
    );
    expect(() => sanitizeText("foo /* bar */", { fieldName: "X", maxLength: 200 })).toThrow(
      /code-like/,
    );
  });

  it("rejects xp_cmdshell", () => {
    expect(() => sanitizeText("EXEC xp_cmdshell 'dir'", { fieldName: "X", maxLength: 200 })).toThrow(
      /code-like/,
    );
  });

  it("does not flag innocuous words containing 'select' or 'update'", () => {
    expect(sanitizeText("Selected for you", { fieldName: "X", maxLength: 200 })).toBe(
      "Selected for you",
    );
    expect(sanitizeText("Latest update available", { fieldName: "X", maxLength: 200 })).toBe(
      "Latest update available",
    );
  });
});

describe("sanitizeText - length enforcement", () => {
  it("enforces maxLength", () => {
    expect(() => sanitizeText("a".repeat(11), { fieldName: "X", maxLength: 10 })).toThrow(
      /too long/,
    );
  });

  it("enforces minLength when provided", () => {
    expect(() =>
      sanitizeText("hi", { fieldName: "X", maxLength: 100, minLength: 5 }),
    ).toThrow(/too short/);
  });

  it("accepts values right at the maxLength boundary", () => {
    const value = "a".repeat(10);
    expect(sanitizeText(value, { fieldName: "X", maxLength: 10 })).toBe(value);
  });
});

describe("sanitizeProductName / sanitizeBrand", () => {
  it("sanitizes a normal product name", () => {
    expect(sanitizeProductName("Hydrating Toner")).toBe("Hydrating Toner");
  });

  it("requires product name by default", () => {
    expect(() => sanitizeProductName("")).toThrow(SanitizationError);
  });

  it("allows brand to be empty by default", () => {
    expect(sanitizeBrand(undefined)).toBe("");
    expect(sanitizeBrand("")).toBe("");
  });

  it("strips HTML from brand", () => {
    expect(sanitizeBrand("<b>Acme</b>")).toBe("Acme");
  });
});

describe("sanitizeIngredients", () => {
  it("accepts a valid INCI list", () => {
    expect(sanitizeIngredients(VALID_INGREDIENTS)).toBe(VALID_INGREDIENTS);
  });

  it("accepts a semicolon-separated INCI list", () => {
    const input = "Aqua; Glycerin; Niacinamide; Tocopherol";
    expect(sanitizeIngredients(input)).toContain("Aqua");
  });

  it("accepts a newline-separated INCI list (one ingredient per line)", () => {
    const input = "Aqua\nGlycerin\nNiacinamide\nTocopherol\nButylene Glycol";
    const out = sanitizeIngredients(input);
    expect(out).toContain("Aqua");
    expect(out).toContain("Tocopherol");
    // Newlines must be replaced with comma+space so the downstream
    // tokenizer (which splits on commas) sees 5 distinct ingredients.
    expect(out.split(/,\s*/).length).toBeGreaterThanOrEqual(5);
  });

  it("accepts a CRLF newline paste with mixed trailing whitespace", () => {
    const input = "  Aqua  \r\n Glycerin\r\nNiacinamide,\r\n  Tocopherol\r\n";
    const out = sanitizeIngredients(input);
    expect(out).toContain("Aqua");
    expect(out).toContain("Niacinamide");
    expect(out).toContain("Tocopherol");
  });

  it("rejects fewer than 3 tokens", () => {
    expect(() => sanitizeIngredients("Aqua, Glycerin")).toThrow(/at least 3 ingredients/);
  });

  it("rejects input below the minimum length", () => {
    expect(() => sanitizeIngredients("Hi")).toThrow(/too short/);
  });

  it("enforces the 5000-character cap", () => {
    const huge = ("Aqua, ".repeat(1000)).slice(0, 5001);
    expect(() => sanitizeIngredients(huge)).toThrow(/too long/);
  });

  it("rejects strings that fail the 40%-letters heuristic", () => {
    expect(() => sanitizeIngredients("123, 456, 789, 000, !!!, ???")).toThrow(/looks invalid/);
  });

  it("rejects prose-style sentences pretending to be ingredient lists", () => {
    const prose =
      "This is a wonderful cream that you and we have been using for the best results.";
    expect(() => sanitizeIngredients(prose)).toThrow(SanitizationError);
  });

  it("rejects ingredient tokens that look like full sentences", () => {
    const sentenceyTokens =
      "This product is amazing and wonderful for daily skincare use everyday, " +
      "Another long sentence describing all the lovely benefits at length here, " +
      "Yet a third long winded sentence that goes on and on with details";
    expect(() => sanitizeIngredients(sentenceyTokens)).toThrow(SanitizationError);
  });

  it("allows empty when allowEmpty is true", () => {
    expect(sanitizeIngredients(undefined, true)).toBe("");
    expect(sanitizeIngredients("", true)).toBe("");
  });

  it("still rejects malicious content even when allowEmpty", () => {
    expect(() => sanitizeIngredients("<script>alert(1)</script>", true)).toThrow(/script-like/);
  });

  it("rejects HTML/script payloads in ingredients", () => {
    expect(() =>
      sanitizeIngredients("<script>x</script>, Aqua, Glycerin, Niacinamide"),
    ).toThrow(/script-like/);
  });
});
