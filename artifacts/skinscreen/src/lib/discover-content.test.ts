import { describe, expect, it } from "vitest";
import {
  TOP_MISTAKES,
  TOP_WORRIES,
  type DiscoverCta,
  type MistakeItem,
  type WorryItem,
} from "./discover-content";

// #89 — lock the Discover → scanner pre-fill behind a contract test so a
// future refactor (or a new article added without a seed) can't silently
// break the "tap a CTA → land in the scanner with the right product
// pre-loaded" flow that #58 + #88 shipped.
//
// What the production flow needs from this data:
//   1. Every CTA except the three shelf-routing ones MUST carry a `seed`
//      payload — otherwise tapping the button drops the user into an empty
//      scanner.
//   2. Shelf CTAs MUST NOT carry a seed — they navigate to /app, where a
//      seed would be silently dropped (and we don't want one fired anyway).
//   3. Single-mode seeds need a non-empty `ingredients` string and a
//      `productName`; otherwise the scanner header reads "Scanned product"
//      and the auto-run analyses nothing.
//   4. Compare-mode seeds need both products filled (with names) — the
//      auto-run mutate() rejects empty inputs.
//   5. `alternatives`-type CTAs only render their alternatives panel when
//      the scanner returns at least one flag. So those seeds MUST contain
//      at least one well-known flagged ingredient token, otherwise the CTA
//      is a dead end ("Find a safer …" → spinner → nothing).

const ALL_ARTICLES: ReadonlyArray<MistakeItem | WorryItem> = [
  ...TOP_MISTAKES,
  ...TOP_WORRIES,
];

// Tokens that the conflict engine reliably flags. Kept lowercase; we match
// substrings inside the seeded ingredient list. If the model's flag rules
// change, update this list — it's the source of truth for "this seed will
// produce a non-empty alternatives section".
const FLAG_TOKENS = [
  "fragrance",
  "parfum",
  "paraben", // matches methylparaben, propylparaben, butylparaben
  "hydroquinone",
  "alcohol denat",
  "oxybenzone",
  "octinoxate",
  "sodium lauryl sulfate",
  "sls,",
  "isopropyl myristate",
  "retinol",
  "retinyl",
  "adapalene",
  "tretinoin",
  "glycolic acid",
  "salicylic acid",
  "blue 1",
  "yellow 5",
  "red 4",
  "linalool",
  "limonene",
  "bht",
  "mineral oil",
  "paraffinum liquidum",
];

function describeArticle(a: MistakeItem | WorryItem): string {
  return `${"severity" in a ? "MISTAKE" : "WORRY"} #${a.rank} ${a.slug}`;
}

describe("Discover article CTAs — scanner pre-fill contract (#89)", () => {
  it("every non-shelf CTA carries a seed", () => {
    const offenders: string[] = [];
    for (const a of ALL_ARTICLES) {
      const cta: DiscoverCta = a.cta;
      if (cta.type !== "shelf" && !cta.seed) {
        offenders.push(`${describeArticle(a)} (cta type=${cta.type}, label="${cta.label}")`);
      }
    }
    expect(offenders, `Missing seed:\n  ${offenders.join("\n  ")}`).toEqual([]);
  });

  it("shelf CTAs do not carry a seed (they navigate to /app, not scanner)", () => {
    const offenders: string[] = [];
    for (const a of ALL_ARTICLES) {
      if (a.cta.type === "shelf" && a.cta.seed) {
        offenders.push(describeArticle(a));
      }
    }
    expect(offenders, `Shelf CTAs with stray seed:\n  ${offenders.join("\n  ")}`).toEqual([]);
  });

  it("single-mode seeds have non-empty ingredients AND a productName", () => {
    const offenders: string[] = [];
    for (const a of ALL_ARTICLES) {
      const seed = a.cta.seed;
      if (!seed || seed.mode !== "single") continue;
      if (!seed.ingredients || seed.ingredients.trim().length === 0) {
        offenders.push(`${describeArticle(a)} (ingredients empty)`);
      }
      if (!seed.productName || seed.productName.trim().length === 0) {
        offenders.push(`${describeArticle(a)} (productName empty)`);
      }
    }
    expect(offenders, `Bad single seeds:\n  ${offenders.join("\n  ")}`).toEqual([]);
  });

  it("compare-mode seeds have non-empty product1 + product2 AND both names (whitespace-trimmed)", () => {
    const offenders: string[] = [];
    for (const a of ALL_ARTICLES) {
      const seed = a.cta.seed;
      if (!seed || seed.mode !== "compare") continue;
      if (!seed.product1 || seed.product1.trim().length === 0) {
        offenders.push(`${describeArticle(a)} (product1 ingredient list empty/whitespace)`);
      }
      if (!seed.product2 || seed.product2.trim().length === 0) {
        offenders.push(`${describeArticle(a)} (product2 ingredient list empty/whitespace)`);
      }
      if (!seed.product1Name || seed.product1Name.trim().length === 0) {
        offenders.push(`${describeArticle(a)} (product1Name empty/whitespace)`);
      }
      if (!seed.product2Name || seed.product2Name.trim().length === 0) {
        offenders.push(`${describeArticle(a)} (product2Name empty/whitespace)`);
      }
    }
    expect(offenders, `Bad compare seeds:\n  ${offenders.join("\n  ")}`).toEqual([]);
  });

  it("'alternatives'-type CTAs seed at least one reliably-flagged ingredient", () => {
    // Without this, the AlternativesSection renders empty (it gates on
    // singleResult.flags.length > 0) and the user lands on a dead-end CTA.
    //
    // NOTE: this is a token-heuristic check, not a real analyzer call.
    // The production gate is the LLM-driven flagger in the API server, so
    // a token here only *guarantees* a flag for ingredients the model has
    // historically caught. If the analyzer logic changes meaningfully,
    // this test can stay green while the alternatives panel goes blank —
    // re-run a manual QA pass through the 14 single-mode CTAs after any
    // analyzer-rules edit.
    const offenders: string[] = [];
    for (const a of ALL_ARTICLES) {
      if (a.cta.type !== "alternatives") continue;
      const seed = a.cta.seed;
      if (!seed) continue; // covered by the first test
      const haystack =
        seed.mode === "single"
          ? (seed.ingredients ?? "").toLowerCase()
          : `${seed.product1 ?? ""} ${seed.product2 ?? ""}`.toLowerCase();
      const found = FLAG_TOKENS.some((tok) => haystack.includes(tok));
      if (!found) {
        offenders.push(`${describeArticle(a)} — seed ingredients have none of: ${FLAG_TOKENS.slice(0, 5).join(", ")}, …`);
      }
    }
    expect(
      offenders,
      `Alternatives CTAs that risk an empty alternatives panel:\n  ${offenders.join("\n  ")}`,
    ).toEqual([]);
  });
});
