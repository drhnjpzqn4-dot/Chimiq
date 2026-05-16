/**
 * pricing.ts — Single source of truth for all Chimiq/SkinScreen pricing.
 *
 * BESLUT-SS-033: dual-valuta
 *   - sv locale → SEK (49 kr/mån, 490 kr/år)
 *   - en / fr / es locale → EUR (€4.99/mån, €49/år)
 *
 * BESLUT-SS-018: trial = 14 dagar
 *
 * Att ändra ett pris: ändra EN rad här. Hela appen följer med.
 * Att ändra trial-längd: ändra TRIAL_DAYS. Hela appen följer med.
 */

// ─── Trial ────────────────────────────────────────────────────────────────────

export const TRIAL_DAYS = 14;

// ─── Free-tier limits ─────────────────────────────────────────────────────────

export const FREE_LIMITS = {
  /** Max scans per calendar day (server-enforced via claim_daily_scan_slot RPC) */
  DAILY_SCANS: 12,
  /** Max products on shelf for free users */
  SHELF_ITEMS: 2,
  /** Max saved DIY recipes for free users */
  SAVED_RECIPES: 3,
  /** Contributions needed to earn 1 month free Premium */
  CONTRIBUTION_MILESTONE: 30,
} as const;

// ─── Premium pricing ──────────────────────────────────────────────────────────

export interface PricingPlan {
  currency: "SEK" | "EUR";
  symbol: string;
  monthly: number;
  yearly: number;
  /** Effective monthly cost when paying yearly (rounded to 2 decimals) */
  yearlyPerMonth: number;
  /** Savings % when paying yearly vs monthly (rounded) */
  savingsPercent: number;
  /** Display strings — formatted for UI */
  display: {
    monthly: string;        // "49 kr/mån" | "€4.99/mo"
    yearly: string;         // "490 kr/år" | "€49/yr"
    yearlyPerMonth: string; // "≈ 41 kr/mån" | "≈ €4.08/mo"
    saveBadge: string;      // "Spara 18%" | "Save 18%"
  };
}

export const PRICING: Record<"sek" | "eur", PricingPlan> = {
  sek: {
    currency: "SEK",
    symbol: "kr",
    monthly: 49,
    yearly: 490,
    yearlyPerMonth: Math.round((490 / 12) * 10) / 10, // 40.8 → display as "≈ 41"
    savingsPercent: Math.round((1 - 490 / (49 * 12)) * 100), // 17 → display as "~17%"
    display: {
      monthly: "49 kr/mån",
      yearly: "490 kr/år",
      yearlyPerMonth: "≈ 41 kr/mån",
      saveBadge: "Spara 17%",
    },
  },
  eur: {
    currency: "EUR",
    symbol: "€",
    monthly: 4.99,
    yearly: 49,
    yearlyPerMonth: Math.round((49 / 12) * 100) / 100, // 4.08
    savingsPercent: Math.round((1 - 49 / (4.99 * 12)) * 100), // 18
    display: {
      monthly: "€4.99/mo",
      yearly: "€49/yr",
      yearlyPerMonth: "≈ €4.08/mo",
      saveBadge: "Save 18%",
    },
  },
};

/**
 * Returns the pricing plan for a given i18n locale.
 * Swedish (sv) → SEK, everything else → EUR.
 *
 * Usage in components:
 *   const { currentLocale } = useTranslation();
 *   const pricing = getPricingForLocale(currentLocale);
 */
export function getPricingForLocale(locale: string): PricingPlan {
  return locale === "sv" ? PRICING.sek : PRICING.eur;
}

/**
 * Returns the Stripe Price ID env-var name for a given locale + billing cycle.
 * Backend reads: process.env[getPriceEnvKey("sv", "monthly")] → STRIPE_PRICE_SEK_MONTHLY
 *
 * Railway env-vars needed:
 *   STRIPE_PRICE_SEK_MONTHLY  — 49 kr/mån
 *   STRIPE_PRICE_SEK_YEARLY   — 490 kr/år
 *   STRIPE_PRICE_EUR_MONTHLY  — €4.99/mån  (price_1TXUQBC02Ie3OkkaknbaKSw0)
 *   STRIPE_PRICE_EUR_YEARLY   — €49/år     (price_1TXUTZC02Ie3OkkaOnMsp7RB)
 */
export function getPriceEnvKey(
  locale: string,
  plan: "monthly" | "yearly",
): string {
  const currency = locale === "sv" ? "SEK" : "EUR";
  return `STRIPE_PRICE_${currency}_${plan.toUpperCase()}`;
}

// ─── Feature list (i18n keys for PaywallModal / PricingSection) ───────────────

/**
 * Ordered list of i18n keys describing Premium features.
 * Components iterate over this array — add/remove features here,
 * update i18n.tsx for translations. Never hardcode feature strings in components.
 */
export const PREMIUM_FEATURE_KEYS = [
  "pricing.feature.unlimitedScans",
  "pricing.feature.unlimitedShelf",
  "pricing.feature.aiChat",
  "pricing.feature.routineCheck",
  "pricing.feature.weeklyReport",
  "pricing.feature.aiDiy",
] as const;

export type PremiumFeatureKey = (typeof PREMIUM_FEATURE_KEYS)[number];
