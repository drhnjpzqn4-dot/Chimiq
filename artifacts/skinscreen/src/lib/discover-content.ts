export type Severity = "HIGH" | "MEDIUM" | "LOW";
export type Frequency = "VERY_COMMON" | "COMMON" | "EMERGING";
export type CtaType = "scan" | "shelf" | "alternatives" | "compare";

export interface DiscoverScannerSeed {
  mode: "single" | "compare";
  product1?: string;
  product1Name?: string;
  product2?: string;
  product2Name?: string;
  ingredients?: string;
  /** Shown in the scanner header for single-mode seeds so the user sees the
      product name we pre-loaded, not "Scanned product". */
  productName?: string;
  autoRun?: boolean;
}

export interface DiscoverCta {
  label: string;
  type: CtaType;
  seed?: DiscoverScannerSeed;
}

export const SCANNER_SEED_STORAGE_KEY = "skinscreen:scanner-seed";

const ROC_RETINOL =
  "Water, Dimethicone, Glycerin, Isopropyl Isostearate, Caprylic/Capric Triglyceride, PEG-100 Stearate, Propylene Glycol, Glyceryl Stearate, Cetyl Alcohol, Niacinamide, Retinol, Sodium Hyaluronate, Tocopherol, Phenoxyethanol, Ethylhexylglycerin, Disodium EDTA, Carbomer, Triethanolamine";

const PAULAS_AHA =
  "Water, Glycolic Acid 8%, Butylene Glycol, Sodium Hydroxide, Phenyl Trimethicone, Aloe Barbadensis Leaf Extract, Allantoin, Chamomilla Recutita Flower Extract, Polysorbate 20, Tetrasodium EDTA, Methylparaben";

const NEUTROGENA_BP =
  "Water, Sodium C14-16 Olefin Sulfonate, PEG-80 Sorbitan Laurate, Cocamidopropyl Betaine, Glycerin, Sodium Lauroamphoacetate, Sodium Hydroxide, Hydroxyethylcellulose, Benzoyl Peroxide 10%, Glycol Distearate, Cocamide MEA, Laureth-4, Citric Acid, Tetrasodium EDTA";

const ORDINARY_VITAMIN_C =
  "Ascorbic Acid, Squalane, Isodecyl Neopentanoate, Isononyl Isononanoate, Silica, Hydroxypropyl Cyclodextrin, Sodium Hyaluronate Crosspolymer, Triethoxycaprylylsilane";

const ORDINARY_NIACINAMIDE =
  "Aqua, Niacinamide, Pentylene Glycol, Zinc PCA, Dimethyl Isosorbide, Tamarindus Indica Seed Gum, Xanthan Gum, Isoceteth-20, Ethoxydiglycol, Phenoxyethanol, Chlorphenesin";

// Sunscreen with oxybenzone + parabens + fragrance — a textbook chemical SPF
// for the "find a safer SPF" / "endocrine disruptors" CTAs.
const BANANA_BOAT_SPF =
  "Avobenzone 3%, Homosalate 10%, Octisalate 5%, Octocrylene 6%, Oxybenzone 6%, Water, Styrene/Acrylates Copolymer, Stearic Acid, Hydrated Silica, Glyceryl Stearate, PEG-100 Stearate, Cetyl Alcohol, Caprylyl Methicone, Phenoxyethanol, Polyacrylamide, Tocopheryl Acetate, C13-14 Isoparaffin, Laureth-7, Disodium EDTA, Methylparaben, Propylparaben, Fragrance";

// Popular drugstore moisturiser with parabens, fragrance and dyes — generic
// "scan before you try" demo for first-time users.
const OLAY_REGENERIST =
  "Water, Glycerin, Niacinamide, Isohexadecane, Isopropyl Isostearate, Panthenol, Polyacrylamide, Cetyl Alcohol, Polymethylsilsesquioxane, C13-14 Isoparaffin, Behenyl Alcohol, Sucrose Polycottonseedate, PEG-100 Stearate, Tocopheryl Acetate, Allyl Methacrylates Crosspolymer, Camellia Sinensis Leaf Extract, Carnosine, Disodium EDTA, BHT, Phenoxyethanol, Methylparaben, Laureth-7, Fragrance, Yellow 5, Red 4";

// SLS + olefin sulfonate cleanser used for "find a gentler cleanser" and
// "scan your cleanser" CTAs (over-cleansing / oily-skin articles).
const NEUTROGENA_OILFREE_WASH =
  "Salicylic Acid 2%, Water, Cocamidopropyl Betaine, Sodium C14-16 Olefin Sulfonate, Hexylene Glycol, Sodium Laureth Sulfate, Glycerin, PEG-150 Pentaerythrityl Tetrastearate, Sodium Lauroamphoacetate, Citric Acid, Sodium Chloride, Tetrasodium EDTA, PEG-120 Methyl Glucose Dioleate, Aloe Barbadensis Leaf Juice, Menthol, Sodium Benzoate, Fragrance";

// "Natural" branding but loaded with 35% denatured alcohol + linalool +
// limonene — perfect demo for hidden fragrance and marketing-claim articles.
const BODY_SHOP_TEA_TREE =
  "Aqua, Alcohol Denat. (35%), Glycerin, Niacinamide, Polysorbate 20, Salicylic Acid, Melaleuca Alternifolia (Tea Tree) Leaf Oil, Citric Acid, Sodium Hydroxide, Limonene, Linalool";

// Famously comedogenic body oil (mineral oil + isopropyl myristate) for the
// "scan for pore-cloggers" CTA on the breakouts article.
const BIO_OIL =
  "Paraffinum Liquidum, Triisononanoin, Cetearyl Ethylhexanoate, Isopropyl Myristate, Retinyl Palmitate, Helianthus Annuus Seed Oil, Tocopheryl Acetate, BHT, Bisabolol, Glycine Soja Oil, Calendula Officinalis Extract, Lavandula Angustifolia Oil, Rosmarinus Officinalis Leaf Oil, Anthemis Nobilis Flower Oil, CI 26100, Fragrance";

// Hydroquinone + glycolic + SLS + parabens — harsh brightener that triggers
// "find a gentler brightener" alternatives on the dark-spots article.
const MURAD_RAPID_AGE_SPOT =
  "Hydroquinone 2%, Water, Glycolic Acid, Glycerin, Cetyl Alcohol, Glyceryl Stearate, Ammonium Glycolate, Steareth-21, Isohexadecane, Sodium Hyaluronate, Sodium Sulfite, Disodium EDTA, Sodium Lauryl Sulfate, Phenoxyethanol, Methylparaben, Propylparaben, Fragrance";

// Lightweight gel-cream that's too thin for properly dry skin AND contains
// fragrance + Blue 1 dye so the scanner reliably flags it — the dryness
// article CTA needs an alternatives result to surface "find a richer
// moisturiser" suggestions, which only render when at least one flag exists.
const NEUTROGENA_HYDRO_BOOST =
  "Water, Dimethicone, Glycerin, Dimethicone/Vinyl Dimethicone Crosspolymer, Phenoxyethanol, Polyacrylamide, Cetearyl Olivate, C13-14 Isoparaffin, Sorbitan Olivate, Synthetic Beeswax, Carbomer, Sodium Hyaluronate, Olea Europaea (Olive) Fruit Oil, Ethylhexylglycerin, Sodium Hydroxide, Disodium EDTA, Laureth-7, Fragrance, Blue 1";

// Adapalene retinoid — exactly what to flag on the pregnancy-safety article.
const DIFFERIN_ADAPALENE =
  "Adapalene 0.1%, Carbomer 940, Edetate Disodium, Methylparaben, Poloxamer 182, Propylene Glycol, Purified Water, Sodium Hydroxide";

// 5% glycolic acid toner — the most common over-exfoliation culprit, used on
// the barrier-damage article so the scanner suggests gentler swaps.
const PIXI_GLOW_TONIC =
  "Aqua, Glycolic Acid 5%, Hamamelis Virginiana (Witch Hazel) Water, Aloe Barbadensis Leaf Juice, Ammonium Glycolate, Glycerin, Aesculus Hippocastanum (Horse Chestnut) Seed Extract, Panax Ginseng Root Extract, Hexylene Glycol, Butylene Glycol, Polysorbate 20, Sodium PCA, Biotin, Fragrance, Hexyl Cinnamal";

export interface DiscoverItem {
  slug: string;
  rank: number;
  title: string;
  hook: string;
  problem: string;
  whyItMatters: string;
  citation?: { text: string; url: string };
  solution: string[];
  cta: DiscoverCta;
  /**
   * Optional preview image, relative to `public/images/discover/`
   * (e.g. `"retinol-plus-acids.jpg"`). When omitted, a generated
   * gradient placeholder is shown. Use `getDiscoverImage()` to get a
   * cache-busting URL — it appends a content-hash query string so the
   * browser/CDN refetches whenever the article body changes.
   */
  image?: string;
}

/**
 * Tiny stable string hash (FNV-1a 32-bit, base36). Used as a
 * cache-buster for Discover preview images so an updated article
 * automatically invalidates its cached thumbnail.
 */
function fnv1a(input: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(36);
}

// Safe in both Vite (browser/SSR) and Node (build-og.mjs bundles this file
// via esbuild without Vite's import.meta.env injection). Accessing
// import.meta.env directly throws in Node when env is undefined.
const DISCOVER_BASE = (
  ((import.meta as { env?: { BASE_URL?: string } }).env?.BASE_URL) ?? "/"
).replace(/\/+$/, "") || "";

export interface DiscoverImage {
  /** Cache-busted URL safe to drop into <img src>. */
  src: string;
  /** Short content hash — exposed for tests / debugging. */
  hash: string;
  /** True iff the article opts into a real file (vs. fallback gradient). */
  hasImage: boolean;
}

/**
 * Returns the preview image URL for a Discover article with a content
 * hash appended as `?v=…`. The hash covers every text field that
 * contributes to the article's "look" (title, hook, problem, why it
 * matters, solution steps), so any edit forces a fresh fetch.
 */
export function getDiscoverImage(item: DiscoverItem): DiscoverImage {
  const payload = JSON.stringify([
    item.title,
    item.hook,
    item.problem,
    item.whyItMatters,
    item.solution,
  ]);
  const hash = fnv1a(payload);
  if (item.image) {
    return {
      src: `${DISCOVER_BASE}/images/discover/${item.image}?v=${hash}`,
      hash,
      hasImage: true,
    };
  }
  return { src: "", hash, hasImage: false };
}

export interface MistakeItem extends DiscoverItem {
  severity: Severity;
}

export interface WorryItem extends DiscoverItem {
  frequency: Frequency;
}

export const SEVERITY_LABEL: Record<Severity, string> = {
  HIGH: "High risk",
  MEDIUM: "Watch out",
  LOW: "Heads up",
};

export const FREQUENCY_LABEL: Record<Frequency, string> = {
  VERY_COMMON: "Very common",
  COMMON: "Common",
  EMERGING: "Rising concern",
};

export const TOP_MISTAKES: MistakeItem[] = [
  {
    slug: "retinol-plus-acids",
    rank: 1,
    title: "Layering retinol with AHA or BHA",
    hook: "Two exfoliants in one routine — your barrier can't keep up.",
    severity: "HIGH",
    problem:
      "Retinol speeds up skin turnover. Glycolic, lactic and salicylic acids strip off the top layer. Doing both at the same time leaves your skin barrier raw, red and reactive.",
    whyItMatters:
      "A damaged barrier can take weeks to heal. In the meantime you'll see flaking, stinging and breakouts — and your skin becomes far more sensitive to sun damage.",
    citation: {
      text: "Kligman, A.M. (1988). The compatibility of combinations of glycolic acid and tretinoin.",
      url: "https://doi.org/10.3109/09546639409086912",
    },
    solution: [
      "Use retinol on its own at night, 2–3 nights a week to start.",
      "Use AHA or BHA on the alternate nights, never on the same evening.",
      "Always follow with a simple moisturiser to support recovery.",
      "If your skin is stinging the next morning, skip the next active night.",
    ],
    cta: {
      label: "Scan your routine for clashes",
      type: "compare",
      seed: {
        mode: "compare",
        product1: ROC_RETINOL,
        product1Name: "RoC Retinol Correxion Serum",
        product2: PAULAS_AHA,
        product2Name: "Paula's Choice 8% AHA Gel",
        autoRun: true,
      },
    },
  },
  {
    slug: "retinol-plus-benzoyl-peroxide",
    rank: 2,
    title: "Using retinol with benzoyl peroxide",
    hook: "BP cancels retinol the moment they touch — you pay for nothing.",
    severity: "HIGH",
    problem:
      "Benzoyl peroxide oxidises retinol on contact, turning it into an inactive byproduct. You still get the dryness from both — without any of the anti-ageing or acne benefits of the retinol.",
    whyItMatters:
      "It's the most common 'expensive routine, no results' trap. You think your retinol isn't working and buy something stronger, when the real problem is the order you're using things.",
    citation: {
      text: "Nighswonger, B.D. et al. (1993). Retinoid interactions with benzoyl peroxide. PMID: 8450449.",
      url: "https://pubmed.ncbi.nlm.nih.gov/8450449/",
    },
    solution: [
      "Use benzoyl peroxide in the morning if you need it.",
      "Save retinol strictly for night.",
      "Or alternate days — BP on Monday, retinol on Tuesday, and so on.",
      "Look for a stabilised retinaldehyde if you really need both daily.",
    ],
    cta: {
      label: "Check your shelf for this combo",
      type: "compare",
      seed: {
        mode: "compare",
        product1: NEUTROGENA_BP,
        product1Name: "Neutrogena Rapid Clear BP Wash",
        product2: ROC_RETINOL,
        product2Name: "RoC Retinol Correxion Serum",
        autoRun: true,
      },
    },
  },
  {
    slug: "skipping-spf-after-actives",
    rank: 3,
    title: "Skipping SPF after using actives",
    hook: "Acids and retinol make sun damage faster, not slower.",
    severity: "HIGH",
    problem:
      "AHAs, BHAs and retinoids all increase how much UV your skin absorbs. Without daily sunscreen you undo every benefit and add new dark spots, fine lines and damage on top.",
    whyItMatters:
      "Studies show AHAs can raise UV sensitivity by up to 50%. Skipping SPF is the fastest way to age the skin you're spending money to improve.",
    citation: {
      text: "Kornhauser, A. et al. (2010). Applications of hydroxy acids.",
      url: "https://doi.org/10.2147/CCID.S9042",
    },
    solution: [
      "Apply broad-spectrum SPF 30+ every morning, rain or shine.",
      "Use two finger-lengths for face and neck — most people use too little.",
      "Reapply every 2 hours if you're outside.",
      "Choose a sunscreen you actually like wearing — that's the one you'll use.",
    ],
    cta: {
      label: "Find a safer SPF",
      type: "alternatives",
      seed: {
        mode: "single",
        ingredients: BANANA_BOAT_SPF,
        productName: "Banana Boat Sport SPF 30",
        autoRun: true,
      },
    },
  },
  {
    slug: "too-many-actives",
    rank: 4,
    title: "Stacking three or more actives at once",
    hook: "More steps doesn't mean better skin — it usually means worse.",
    severity: "HIGH",
    problem:
      "Most '12-step routines' you see online combine retinol, vitamin C, niacinamide, acids and peptides in a single sitting. Even if each ingredient is fine on its own, the combination overwhelms your barrier.",
    whyItMatters:
      "Stacking actives is the number one cause of self-inflicted skin damage in the 15–35 age group. The fix isn't another product — it's fewer products.",
    solution: [
      "Pick one 'hero' active for the morning and one for the night.",
      "Everything else should be gentle: cleanser, moisturiser, SPF.",
      "Give a new active 4 weeks before adding anything else.",
      "If your skin reacts, simplify before you add.",
    ],
    cta: { label: "Audit your shelf", type: "shelf" },
  },
  {
    slug: "copying-influencer-routines",
    rank: 5,
    title: "Copying an influencer's full routine",
    hook: "Their skin isn't your skin — and they're paid to sell yours.",
    severity: "MEDIUM",
    problem:
      "What works for one person can ruin another's skin. Most influencer routines are sponsored, and most are designed to make you buy more — not to fix your specific concern.",
    whyItMatters:
      "Buying products you don't need leads to the 'skincare spiral': new product breaks you out, you buy a fix, the fix breaks you out, and so on. We see this constantly.",
    solution: [
      "Identify your one main concern (acne, dryness, dullness, etc.).",
      "Pick products that target that concern, nothing else.",
      "Ignore the 'must-have' lists.",
      "Give your routine 6 weeks before you judge it.",
    ],
    cta: { label: "Build a smarter shelf", type: "shelf" },
  },
  {
    slug: "no-patch-test",
    rank: 6,
    title: "Skipping the patch test",
    hook: "Two minutes of testing can save weeks of recovery.",
    severity: "MEDIUM",
    problem:
      "Most people slap a brand new product straight on their face. If you're allergic to even one ingredient, you'll find out on your whole face instead of a small patch.",
    whyItMatters:
      "Allergic reactions can leave dark marks that last months. A 24-hour patch test on your inner arm or behind your ear catches almost all of them.",
    solution: [
      "Apply a small amount behind your ear or on your inner forearm.",
      "Leave it for 24 hours without washing the spot.",
      "Look for redness, itching or bumps.",
      "If it's clear, you're safe to use it on your face.",
    ],
    cta: {
      label: "Scan a product before you try it",
      type: "scan",
      seed: {
        mode: "single",
        ingredients: OLAY_REGENERIST,
        productName: "Olay Regenerist Micro-Sculpting Cream",
        autoRun: true,
      },
    },
  },
  {
    slug: "over-cleansing",
    rank: 7,
    title: "Cleansing your face too often",
    hook: "Squeaky-clean is the sound of a damaged barrier.",
    severity: "MEDIUM",
    problem:
      "Double-cleansing every morning and night, plus harsh foaming cleansers, strips the natural oils your skin needs to stay healthy. Your skin then over-produces oil to compensate — and you get more breakouts.",
    whyItMatters:
      "It's the easiest mistake to fix and one of the most overlooked. Less cleansing usually means clearer skin within 2–3 weeks.",
    solution: [
      "Cleanse once at night with a gentle, low-foam cleanser.",
      "In the morning, just rinse with lukewarm water.",
      "Skip the second cleanse unless you wore heavy makeup or SPF.",
      "If your skin feels tight after washing, your cleanser is too harsh.",
    ],
    cta: {
      label: "Find a gentler cleanser",
      type: "alternatives",
      seed: {
        mode: "single",
        ingredients: NEUTROGENA_OILFREE_WASH,
        productName: "Neutrogena Oil-Free Acne Wash",
        autoRun: true,
      },
    },
  },
  {
    slug: "fragrance-on-sensitive-skin",
    rank: 8,
    title: "Using fragranced products on sensitive skin",
    hook: "'Parfum' is the most common allergen in skincare.",
    severity: "MEDIUM",
    problem:
      "Synthetic and natural fragrance can irritate skin even when you don't notice it. The damage builds quietly: low-level inflammation, redness and a weakened barrier over months.",
    whyItMatters:
      "Fragrance offers zero benefit to your skin. It's there to make the product smell nice — and your skin doesn't care.",
    solution: [
      "Look for 'fragrance-free' on the label (not just 'unscented').",
      "Check the ingredient list for 'parfum', 'fragrance' or essential oils.",
      "Switch fragranced moisturisers and serums first — they sit on your skin longest.",
      "Cleansers are lower priority since they rinse off.",
    ],
    cta: {
      label: "Scan for hidden fragrance",
      type: "scan",
      seed: {
        mode: "single",
        ingredients: BODY_SHOP_TEA_TREE,
        productName: "The Body Shop Tea Tree Skin Clearing Lotion",
        autoRun: true,
      },
    },
  },
  {
    slug: "buying-by-marketing",
    rank: 9,
    title: "Buying by marketing claims, not ingredients",
    hook: "'Clean', 'natural' and 'dermatologist-tested' are not regulated terms.",
    severity: "MEDIUM",
    problem:
      "Brands use beautiful packaging and vague words to make products feel safer or more effective than they are. The only thing that matters is what's actually inside the bottle.",
    whyItMatters:
      "You're paying for the bottle, the marketing, and only sometimes the formula. Knowing how to read an INCI list saves you money and your skin.",
    solution: [
      "Ignore the front of the package — flip it over.",
      "The first 5 ingredients make up most of the product.",
      "Look for the active you actually want in a meaningful percentage.",
      "If you can't find the active or it's at the bottom of the list, it won't do much.",
    ],
    cta: {
      label: "Scan the back-label instead",
      type: "scan",
      seed: {
        mode: "single",
        ingredients: BODY_SHOP_TEA_TREE,
        productName: "The Body Shop Tea Tree Skin Clearing Lotion",
        autoRun: true,
      },
    },
  },
  {
    slug: "vitamin-c-niacinamide",
    rank: 10,
    title: "Mixing vitamin C and niacinamide carelessly",
    hook: "They can work together — but only if you do it right.",
    severity: "LOW",
    problem:
      "Old advice said never mix the two. New research says it's fine, but only at room temperature and stable formulations. Layering them straight from a hot bathroom shelf can cause flushing or reduce both products' effects.",
    whyItMatters:
      "This is the most-debated combo online. The truth: it's safer than the internet says, but most people still get the timing wrong.",
    citation: {
      text: "Wohlrab, J. & Kreft, D. (2014). Niacinamide — mechanisms of action.",
      url: "https://doi.org/10.1159/000354888",
    },
    solution: [
      "Use vitamin C in the morning and niacinamide at night.",
      "Or wait 10 minutes between layers if you really want both.",
      "Store both away from heat and direct light.",
      "Stop if you see any flushing or irritation.",
    ],
    cta: {
      label: "Check your routine timing",
      type: "compare",
      seed: {
        mode: "compare",
        product1: ORDINARY_VITAMIN_C,
        product1Name: "The Ordinary Vitamin C 23%",
        product2: ORDINARY_NIACINAMIDE,
        product2Name: "The Ordinary Niacinamide 10% + Zinc 1%",
        autoRun: true,
      },
    },
  },
];

export const TOP_WORRIES: WorryItem[] = [
  {
    slug: "breakouts",
    rank: 1,
    title: "Breakouts and acne that won't go away",
    hook: "Often it's the routine, not your skin, that's the problem.",
    frequency: "VERY_COMMON",
    problem:
      "Persistent breakouts are usually a mix of pore-clogging ingredients, over-exfoliation and an inflamed barrier — not just hormones or 'bad genes'.",
    whyItMatters:
      "Treating acne with more harsh products usually makes it worse. The first move is always to identify what's triggering it.",
    solution: [
      "Cut your routine to cleanser, moisturiser and SPF for two weeks.",
      "Reintroduce one product at a time and track what your skin does.",
      "Avoid coconut oil, isopropyl myristate and heavy silicones near breakout-prone areas.",
      "If nothing improves in 8 weeks, see a dermatologist.",
    ],
    cta: {
      label: "Scan your products for pore-cloggers",
      type: "scan",
      seed: {
        mode: "single",
        ingredients: BIO_OIL,
        productName: "Bio-Oil Skincare Oil",
        autoRun: true,
      },
    },
  },
  {
    slug: "premature-ageing",
    rank: 2,
    title: "Fine lines and early ageing",
    hook: "90% of visible ageing comes from the sun — not time.",
    frequency: "VERY_COMMON",
    problem:
      "UV exposure breaks down collagen and elastin. By the time you see fine lines, the damage has been building for years.",
    whyItMatters:
      "Daily SPF in your 20s does more for your skin than every anti-ageing serum you'll buy in your 40s.",
    solution: [
      "Wear broad-spectrum SPF 30+ every single day.",
      "Add a low-strength retinol 2–3 nights a week from your mid-20s.",
      "Eat enough protein and sleep — your skin rebuilds at night.",
      "Don't smoke and limit alcohol — both accelerate collagen breakdown.",
    ],
    cta: {
      label: "Find a safer SPF",
      type: "alternatives",
      seed: {
        mode: "single",
        ingredients: BANANA_BOAT_SPF,
        productName: "Banana Boat Sport SPF 30",
        autoRun: true,
      },
    },
  },
  {
    slug: "dark-spots",
    rank: 3,
    title: "Dark spots and uneven tone",
    hook: "Picking, sun and harsh actives all leave a mark — literally.",
    frequency: "VERY_COMMON",
    problem:
      "Post-inflammatory pigmentation forms after acne, irritation or sun exposure. It's deeper in the skin and takes months — sometimes a year — to fade naturally.",
    whyItMatters:
      "Most 'brightening' products only fade the surface. SPF is what stops new spots from forming, which is the part most people skip.",
    solution: [
      "Wear SPF every day — non-negotiable for fading marks.",
      "Add vitamin C in the morning to brighten over time.",
      "Try azelaic acid 10% at night — gentle and very effective.",
      "Don't pick at spots or breakouts. Ever.",
    ],
    cta: {
      label: "Find a gentler brightener",
      type: "alternatives",
      seed: {
        mode: "single",
        ingredients: MURAD_RAPID_AGE_SPOT,
        productName: "Murad Rapid Age Spot Serum",
        autoRun: true,
      },
    },
  },
  {
    slug: "sensitivity-redness",
    rank: 4,
    title: "Sudden sensitivity and redness",
    hook: "Your barrier is asking you to stop — not switch products.",
    frequency: "VERY_COMMON",
    problem:
      "If your skin started reacting to things it used to tolerate, it's almost always a damaged barrier. The fix is doing less, not adding a 'soothing' serum on top.",
    whyItMatters:
      "Pushing through with active ingredients while your skin is reactive can lead to long-term sensitivity and rosacea-like flushing.",
    solution: [
      "Stop all actives for 2–4 weeks. No retinol, no acids, no vitamin C.",
      "Stick to a fragrance-free cleanser, ceramide moisturiser, and SPF.",
      "Avoid hot water, harsh towels and physical scrubs.",
      "Reintroduce one active at a time, slowly.",
    ],
    cta: { label: "Audit your routine", type: "shelf" },
  },
  {
    slug: "dryness",
    rank: 5,
    title: "Dryness and tight skin",
    hook: "Drinking water won't fix it — your barrier will.",
    frequency: "COMMON",
    problem:
      "Dry skin is usually caused by stripping cleansers, over-exfoliation or a missing moisturiser layer — not dehydration from inside.",
    whyItMatters:
      "Chronically dry skin gets fine lines faster, irritates more easily and breaks out more. A working barrier solves a lot of problems at once.",
    solution: [
      "Switch to a creamy or oil-based cleanser.",
      "Apply moisturiser to slightly damp skin to lock in water.",
      "Look for ceramides, glycerin and hyaluronic acid.",
      "Use a humidifier in winter or in air-conditioned rooms.",
    ],
    cta: {
      label: "Find a richer moisturiser",
      type: "alternatives",
      seed: {
        mode: "single",
        ingredients: NEUTROGENA_HYDRO_BOOST,
        productName: "Neutrogena Hydro Boost Water Gel",
        autoRun: true,
      },
    },
  },
  {
    slug: "oiliness",
    rank: 6,
    title: "Oily skin and constant shine",
    hook: "Drying your skin out makes it produce more oil, not less.",
    frequency: "COMMON",
    problem:
      "Most 'oil-control' products strip your skin so badly that your sebaceous glands compensate by making more. The cycle keeps going as long as you keep using them.",
    whyItMatters:
      "Once you balance your barrier, oil production usually settles down within weeks. Most people get there with fewer products, not more.",
    solution: [
      "Use a gentle cleanser — no alcohol, no sulphates.",
      "Moisturise with a lightweight gel-cream, every day.",
      "Add niacinamide 5% to help regulate sebum.",
      "Try blotting paper instead of mattifying powders.",
    ],
    cta: {
      label: "Scan your cleanser",
      type: "scan",
      seed: {
        mode: "single",
        ingredients: NEUTROGENA_OILFREE_WASH,
        productName: "Neutrogena Oil-Free Acne Wash",
        autoRun: true,
      },
    },
  },
  {
    slug: "hormone-disruptors",
    rank: 7,
    title: "Hormone-disrupting ingredients",
    hook: "Some preservatives and UV filters mimic your own hormones.",
    frequency: "EMERGING",
    problem:
      "Certain parabens, oxybenzone and a few other common ingredients are classed as endocrine disruptors. Daily, lifelong exposure adds up — especially during pregnancy and the teen years.",
    whyItMatters:
      "The science is still developing, but enough governments have restricted these that you don't need to keep them in your routine.",
    solution: [
      "Avoid products with oxybenzone (BP-3) — choose mineral SPF instead.",
      "Skip BHA-preserved (butylated hydroxyanisole) products.",
      "Limit propylparaben and butylparaben in leave-on products.",
      "When in doubt, scan the label.",
    ],
    cta: {
      label: "Scan for endocrine disruptors",
      type: "scan",
      seed: {
        mode: "single",
        ingredients: BANANA_BOAT_SPF,
        productName: "Banana Boat Sport SPF 30",
        autoRun: true,
      },
    },
  },
  {
    slug: "sun-damage",
    rank: 8,
    title: "Sun damage and skin cancer risk",
    hook: "It's the only skin worry that's almost entirely preventable.",
    frequency: "VERY_COMMON",
    problem:
      "UV exposure is the leading cause of skin cancer and the single biggest driver of visible skin ageing. You don't need a beach holiday — daily incidental sun adds up.",
    whyItMatters:
      "Melanoma is one of the most preventable cancers if you wear sunscreen and check your skin regularly.",
    solution: [
      "Daily broad-spectrum SPF 30+ — even on cloudy days.",
      "Reapply every 2 hours when you're outdoors.",
      "Wear a hat and sunglasses for extra cover.",
      "Check moles and skin spots every 3 months — see a doctor for anything new or changing.",
    ],
    cta: {
      label: "Find a safer SPF",
      type: "alternatives",
      seed: {
        mode: "single",
        ingredients: BANANA_BOAT_SPF,
        productName: "Banana Boat Sport SPF 30",
        autoRun: true,
      },
    },
  },
  {
    slug: "pregnancy-safe",
    rank: 9,
    title: "Pregnancy-safe skincare confusion",
    hook: "Most ingredients are fine — a few really aren't.",
    frequency: "COMMON",
    problem:
      "There's a lot of bad advice online about what's safe during pregnancy. The actual list of ingredients to avoid is short and clear.",
    whyItMatters:
      "You don't need to throw out your whole routine — but you do need to swap out a few specific ingredients to be safe for your baby.",
    solution: [
      "Avoid all retinoids: retinol, retinaldehyde, tretinoin, adapalene.",
      "Skip high-dose salicylic acid (over 2%) and oral acne medications.",
      "Avoid hydroquinone and chemical sunscreens with oxybenzone.",
      "Stick to: gentle cleanser, ceramide moisturiser, mineral SPF, vitamin C, azelaic acid, niacinamide.",
    ],
    cta: {
      label: "Scan a product for pregnancy safety",
      type: "scan",
      seed: {
        mode: "single",
        ingredients: DIFFERIN_ADAPALENE,
        productName: "Differin Adapalene 0.1% Gel",
        autoRun: true,
      },
    },
  },
  {
    slug: "barrier-damage",
    rank: 10,
    title: "Barrier damage from masks, weather or routine",
    hook: "If your skin stings water — your barrier is broken.",
    frequency: "COMMON",
    problem:
      "A damaged moisture barrier shows up as stinging, redness, tightness and breakouts that won't clear. Mask-wearing, cold air and over-active routines are the most common causes.",
    whyItMatters:
      "A weakened barrier can take 4–8 weeks to fully heal. The fix is rest, not new products.",
    solution: [
      "Stop all actives for at least 2 weeks.",
      "Use a fragrance-free cleanser, ceramide moisturiser and mineral SPF.",
      "Add a thin layer of petrolatum at night for the worst patches.",
      "Be patient — barriers heal at their own pace.",
    ],
    cta: {
      label: "Find barrier-friendly products",
      type: "alternatives",
      seed: {
        mode: "single",
        ingredients: PIXI_GLOW_TONIC,
        productName: "Pixi Glow Tonic",
        autoRun: true,
      },
    },
  },
];

export function getMistake(slug: string): MistakeItem | undefined {
  return TOP_MISTAKES.find((m) => m.slug === slug);
}

export function getWorry(slug: string): WorryItem | undefined {
  return TOP_WORRIES.find((w) => w.slug === slug);
}
