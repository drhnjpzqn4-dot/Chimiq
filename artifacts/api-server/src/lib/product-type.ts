/**
 * Produkttyp för analyskontext och cache — skincare vs smink m.m.
 */
import { z } from "zod";

export type ProductType = "skincare" | "haircare" | "cosmetics" | "other";

export const ProductTypeSchema = z.enum(["skincare", "haircare", "cosmetics", "other"]);

/** OBF `categories_tags` / kategoristängar som indikerar smink/makeup. */
export const COSMETIC_CATEGORY_TAGS = [
  "en:make-up",
  "en:makeup",
  "en:face-makeup",
  "en:foundations",
  "en:face-foundations",
  "en:concealer",
  "en:concealers",
  "en:face-powder",
  "en:blush",
  "en:bronzer",
  "en:highlighter",
  "en:primers",
  "en:face-primer",
  "en:eye-makeup",
  "en:eye-shadows",
  "en:eyeshadow",
  "en:eyeliners",
  "en:eyeliner",
  "en:mascaras",
  "en:mascara",
  "en:eyebrow-makeup",
  "en:lip-products",
  "en:lipsticks",
  "en:lip-gloss",
  "en:lip-liner",
  "en:lip-balm",
  "en:nail-products",
  "en:nail-polish",
  "en:nail-care",
  "en:makeup-removers",
  "en:eye-makeup-remover",
  "en:micellar-water",
  "en:setting-sprays",
  "en:face-mist",
] as const;

const HAIRCARE_TERMS = [
  "hair",
  "shampoo",
  "conditioner",
  "hair dye",
  "hair color",
  "haircare",
  "hair care",
];

const SKINCARE_TERMS = [
  "face cream",
  "facial cream",
  "moisturizer",
  "moisturiser",
  "face wash",
  "facial wash",
  "cleanser",
  "cleansing",
  "serum",
  "face oil",
  "facial oil",
  "eye cream",
  "eye serum",
  "toner",
  "essence",
  "lotion",
  "face lotion",
  "sunscreen",
  "sun cream",
  "spf",
  "sun protection",
  "face mask",
  "sheet mask",
  "peel",
  "exfoliant",
  "exfoliator",
  "retinol",
  "vitamin c",
  "hyaluronic",
  "niacinamide",
  "body lotion",
  "body cream",
  "body oil",
  "hand cream",
  "day cream",
  "night cream",
  "anti-aging",
  "anti-ageing",
  "skincare",
  "skin care",
  "bb cream",
  "cc cream",
];

const COSMETIC_TEXT_TERMS = [
  "makeup",
  "make-up",
  "mascara",
  "eyeliner",
  "eyeshadow",
  "eye shadow",
  "lipstick",
  "lip gloss",
  "lip liner",
  "foundation",
  "concealer",
  "blush",
  "bronzer",
  "highlighter",
  "primer",
  "nail polish",
  "setting spray",
];

/**
 * Härled produkttyp från OBF-kategorier eller fri kategoritext.
 */
export function detectProductType(categories: string | null | undefined): ProductType {
  const lower = (categories ?? "").toLowerCase();
  if (!lower.trim()) return "other";

  if (HAIRCARE_TERMS.some((term) => lower.includes(term))) {
    return "haircare";
  }

  if (
    COSMETIC_CATEGORY_TAGS.some((tag) => lower.includes(tag)) ||
    COSMETIC_TEXT_TERMS.some((term) => lower.includes(term))
  ) {
    return "cosmetics";
  }

  if (SKINCARE_TERMS.some((term) => lower.includes(term))) {
    return "skincare";
  }

  return "other";
}
