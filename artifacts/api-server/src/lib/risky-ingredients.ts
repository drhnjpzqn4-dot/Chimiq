/**
 * Curated risk database — the inverse of safe-ingredients.ts.
 *
 * Each entry describes an ingredient with a documented safety concern strong
 * enough that we want a flag to appear EVERY time it shows up in an analysis.
 * The entries are surfaced to Claude as "mandatory flags" so the model does
 * not silently omit a known concern (e.g. forgetting to flag DMDM Hydantoin
 * because it was buried at position 17 in a long INCI list).
 *
 * Severity defaults are based on the general adult population. Profile
 * overrides bump severity up (rarely down) for sensitive / young / mature /
 * pregnant users. The model still writes the explanation prose so it can
 * personalise tone and detail — we only enforce category, severity, and the
 * fact that a flag must exist.
 */
import { normalizeIngredientName } from "./analysis-cache.js";

export type RiskCategory =
  | "ENDOCRINE_DISRUPTOR"
  | "FORMALDEHYDE_RELEASER"
  | "FRAGRANCE"
  | "HARSH_PRESERVATIVE"
  | "PHOTOSENSITISER"
  | "KNOWN_ALLERGEN"
  | "NANOPARTICLE"
  | "CAUTION";

export type RiskSeverity = "HIGH_RISK" | "CAUTION";

export type SkinProfile = "sensitive" | "young" | "mature" | "pregnant";

export interface RiskEntry {
  /** Canonical INCI display name shown back to the user. */
  display: string;
  category: RiskCategory;
  /** Severity for the general adult population. */
  severity: RiskSeverity;
  /** Per-profile severity bumps. Only specify when it differs from default. */
  profileOverrides?: Partial<Record<SkinProfile, RiskSeverity>>;
  /**
   * Short hint passed to the model (1 sentence). The model will expand this
   * into a fuller explanation in its own words.
   */
  hint: string;
  /** Suggested citation; the model may use a stronger one if it knows of one. */
  citation: string;
  citationUrl: string;
  /**
   * If true, only flag when ingredient is in the FIRST half of the INCI list
   * (i.e. likely above ~1% concentration). The model is told to apply this
   * concentration check before flagging.
   */
  concentrationDependent?: boolean;
  /** Free-text concentration nuance the model should consider. */
  concentrationNote?: string;
  /**
   * Alternative INCI names that should match this entry. The primary key in
   * the RAW_RISKS object is also automatically registered as a lookup key —
   * `aliases` lists any additional synonyms (e.g. "Oxybenzone" for
   * Benzophenone-3, "Ethylhexyl Methoxycinnamate" for Octinoxate).
   */
  aliases?: string[];
}

/**
 * Map of normalized ingredient name → risk metadata.
 *
 * Keys MUST be normalized via `normalizeIngredientName` (lowercase, hyphens
 * collapsed, parens stripped) so lookup is consistent with the safe list and
 * the cache key. The constructor below normalizes them defensively.
 */
const RAW_RISKS: Record<string, RiskEntry> = {
  // ─── Formaldehyde releasers ─────────────────────────────────────────────
  "dmdm hydantoin": {
    display: "DMDM Hydantoin",
    category: "FORMALDEHYDE_RELEASER",
    severity: "HIGH_RISK",
    hint: "Slowly releases formaldehyde — known human carcinogen and contact allergen.",
    citation: "IARC Monographs Vol. 100F, 2012.",
    citationUrl: "https://publications.iarc.fr/123",
  },
  "diazolidinyl urea": {
    display: "Diazolidinyl Urea",
    category: "FORMALDEHYDE_RELEASER",
    severity: "HIGH_RISK",
    hint: "Formaldehyde-releasing preservative; restricted in EU; common contact sensitiser.",
    citation: "SCCS/1612/19, EU Scientific Committee on Consumer Safety.",
    citationUrl: "https://health.ec.europa.eu/scientific-committees/scientific-committee-consumer-safety-sccs_en",
  },
  "imidazolidinyl urea": {
    display: "Imidazolidinyl Urea",
    category: "FORMALDEHYDE_RELEASER",
    severity: "HIGH_RISK",
    hint: "Releases formaldehyde at low levels; restricted in EU.",
    citation: "SCCS/1612/19.",
    citationUrl: "https://health.ec.europa.eu/scientific-committees/scientific-committee-consumer-safety-sccs_en",
  },
  "quaternium 15": {
    display: "Quaternium-15",
    category: "FORMALDEHYDE_RELEASER",
    severity: "HIGH_RISK",
    hint: "Strongest formaldehyde releaser used in cosmetics; high contact dermatitis risk.",
    citation: "de Groot AC, 2010. Contact Dermatitis.",
    citationUrl: "https://pubmed.ncbi.nlm.nih.gov/20136890/",
  },
  "bronopol": {
    display: "2-Bromo-2-Nitropropane-1,3-Diol (Bronopol)",
    category: "FORMALDEHYDE_RELEASER",
    severity: "HIGH_RISK",
    hint: "Formaldehyde releaser; can also form carcinogenic nitrosamines.",
    citation: "SCCNFP/0556/02.",
    citationUrl: "https://health.ec.europa.eu/scientific-committees/scientific-committee-consumer-safety-sccs_en",
  },

  // ─── Endocrine disruptors / parabens ────────────────────────────────────
  "propylparaben": {
    display: "Propylparaben",
    category: "ENDOCRINE_DISRUPTOR",
    severity: "CAUTION",
    profileOverrides: { young: "HIGH_RISK", pregnant: "HIGH_RISK" },
    hint: "Weak xeno-estrogen; restricted in EU leave-on products to 0.14% (single) or 0.8% (total parabens).",
    citation: "SCCS/1514/13.",
    citationUrl: "https://health.ec.europa.eu/scientific-committees/scientific-committee-consumer-safety-sccs_en",
  },
  "butylparaben": {
    display: "Butylparaben",
    category: "ENDOCRINE_DISRUPTOR",
    severity: "CAUTION",
    profileOverrides: { young: "HIGH_RISK", pregnant: "HIGH_RISK" },
    hint: "Weak xeno-estrogen; same EU restrictions as propylparaben.",
    citation: "SCCS/1514/13.",
    citationUrl: "https://health.ec.europa.eu/scientific-committees/scientific-committee-consumer-safety-sccs_en",
  },
  "isobutylparaben": {
    display: "Isobutylparaben",
    category: "ENDOCRINE_DISRUPTOR",
    severity: "HIGH_RISK",
    hint: "Banned in EU cosmetics since 2015 (Regulation 358/2014).",
    citation: "EU Regulation 358/2014.",
    citationUrl: "https://eur-lex.europa.eu/eli/reg/2014/358/oj",
  },
  "isopropylparaben": {
    display: "Isopropylparaben",
    category: "ENDOCRINE_DISRUPTOR",
    severity: "HIGH_RISK",
    hint: "Banned in EU cosmetics since 2015.",
    citation: "EU Regulation 358/2014.",
    citationUrl: "https://eur-lex.europa.eu/eli/reg/2014/358/oj",
  },
  "benzophenone 3": {
    display: "Benzophenone-3 (Oxybenzone)",
    category: "ENDOCRINE_DISRUPTOR",
    severity: "CAUTION",
    profileOverrides: { young: "HIGH_RISK", pregnant: "HIGH_RISK" },
    hint: "UV filter with documented endocrine activity; high systemic absorption; banned in some reef-safe regulations.",
    citation: "Matta MK et al., 2020. JAMA.",
    citationUrl: "https://pubmed.ncbi.nlm.nih.gov/31961417/",
    aliases: ["oxybenzone", "benzophenone-3"],
  },
  "octinoxate": {
    display: "Ethylhexyl Methoxycinnamate (Octinoxate)",
    category: "ENDOCRINE_DISRUPTOR",
    severity: "CAUTION",
    profileOverrides: { young: "HIGH_RISK", pregnant: "HIGH_RISK" },
    hint: "Chemical UV filter with thyroid disruption signals in animal studies; high systemic absorption.",
    citation: "Krause M et al., 2012. International Journal of Andrology.",
    citationUrl: "https://pubmed.ncbi.nlm.nih.gov/22612478/",
    aliases: ["ethylhexyl methoxycinnamate"],
  },
  "homosalate": {
    display: "Homosalate",
    category: "ENDOCRINE_DISRUPTOR",
    severity: "CAUTION",
    profileOverrides: { pregnant: "HIGH_RISK" },
    hint: "Chemical UV filter; SCCS reduced safe-use limit to 7.34% in 2021 due to systemic absorption and endocrine concerns.",
    citation: "SCCS/1622/20.",
    citationUrl: "https://health.ec.europa.eu/scientific-committees/scientific-committee-consumer-safety-sccs_en",
  },
  "octocrylene": {
    display: "Octocrylene",
    category: "ENDOCRINE_DISRUPTOR",
    severity: "CAUTION",
    hint: "Chemical UV filter; degrades over time into benzophenone (a probable carcinogen). Watch product expiry.",
    citation: "Downs CA et al., 2021. Chem Res Toxicol.",
    citationUrl: "https://pubmed.ncbi.nlm.nih.gov/33682414/",
  },
  "triclosan": {
    display: "Triclosan",
    category: "ENDOCRINE_DISRUPTOR",
    severity: "HIGH_RISK",
    hint: "Antimicrobial with thyroid disruption and antimicrobial resistance concerns; restricted in EU to 0.3%.",
    citation: "FDA Final Rule 2017; SCCS/1414/11.",
    citationUrl: "https://www.federalregister.gov/documents/2016/09/06/2016-21337/",
  },

  // ─── Triethanolamine (nitrosamine concern) ──────────────────────────────
  "triethanolamine": {
    display: "Triethanolamine (TEA)",
    category: "CAUTION",
    severity: "CAUTION",
    profileOverrides: { sensitive: "CAUTION", young: "HIGH_RISK", pregnant: "HIGH_RISK" },
    hint: "Can react with nitrosating preservatives to form carcinogenic nitrosamines; restricted under EU Annex III.",
    citation: "SCCS/1463/12.",
    citationUrl: "https://health.ec.europa.eu/scientific-committees/scientific-committee-consumer-safety-sccs_en",
  },
  "diethanolamine": {
    display: "Diethanolamine (DEA)",
    category: "CAUTION",
    severity: "HIGH_RISK",
    hint: "Banned in EU cosmetics due to nitrosamine formation risk.",
    citation: "EU Cosmetics Regulation 1223/2009 Annex II.",
    citationUrl: "https://eur-lex.europa.eu/eli/reg/2009/1223/oj",
  },

  // ─── Photosensitisers / AHAs ────────────────────────────────────────────
  "glycolic acid": {
    display: "Glycolic Acid",
    category: "PHOTOSENSITISER",
    severity: "CAUTION",
    profileOverrides: { sensitive: "CAUTION", mature: "CAUTION" },
    hint: "AHA exfoliant; thins stratum corneum and increases UV sensitivity. Daily SPF 30+ required.",
    citation: "Kornhauser A, Coelho SG, Hearing VJ, 2010. Int J Dermatol.",
    citationUrl: "https://pubmed.ncbi.nlm.nih.gov/20486451/",
    concentrationNote: "Concern scales with concentration above ~5%.",
  },
  "lactic acid": {
    display: "Lactic Acid",
    category: "PHOTOSENSITISER",
    severity: "CAUTION",
    hint: "AHA exfoliant; same SPF requirement as glycolic acid.",
    citation: "Kornhauser A et al., 2010. Int J Dermatol.",
    citationUrl: "https://pubmed.ncbi.nlm.nih.gov/20486451/",
    concentrationNote: "Concern scales with concentration above ~5%.",
  },
  "mandelic acid": {
    display: "Mandelic Acid",
    category: "PHOTOSENSITISER",
    severity: "CAUTION",
    hint: "AHA exfoliant; gentler than glycolic but still photosensitising.",
    citation: "Sarkar R et al., 2017. J Cutan Aesthet Surg.",
    citationUrl: "https://pubmed.ncbi.nlm.nih.gov/28584455/",
  },
  "salicylic acid": {
    display: "Salicylic Acid",
    category: "PHOTOSENSITISER",
    severity: "CAUTION",
    profileOverrides: { pregnant: "HIGH_RISK" },
    hint: "BHA exfoliant; mild photosensitiser. Pregnancy: avoid concentrations above 2%.",
    citation: "Bozzo P et al., 2011. Can Fam Physician.",
    citationUrl: "https://pubmed.ncbi.nlm.nih.gov/21523855/",
  },
  "citric acid": {
    display: "Citric Acid",
    category: "PHOTOSENSITISER",
    severity: "CAUTION",
    hint: "AHA at active concentrations (>3%); pH adjuster at trace amounts. Apply concentration check before flagging.",
    citation: "Kornhauser A et al., 2010. Int J Dermatol.",
    citationUrl: "https://pubmed.ncbi.nlm.nih.gov/20486451/",
    concentrationDependent: true,
    concentrationNote: "Only flag when in the first half of the INCI list. If listed near the end (under 'preservatives' / 'pH adjusters'), do NOT flag.",
  },
  "retinol": {
    display: "Retinol",
    category: "PHOTOSENSITISER",
    severity: "CAUTION",
    profileOverrides: { sensitive: "CAUTION", pregnant: "HIGH_RISK" },
    hint: "Vitamin A derivative; thins stratum corneum, photosensitising, contraindicated in pregnancy.",
    citation: "Mukherjee S et al., 2006. Clin Interv Aging.",
    citationUrl: "https://pubmed.ncbi.nlm.nih.gov/18046911/",
  },
  "retinyl palmitate": {
    display: "Retinyl Palmitate",
    category: "PHOTOSENSITISER",
    severity: "CAUTION",
    profileOverrides: { pregnant: "HIGH_RISK" },
    hint: "Vitamin A ester; converts to retinol on skin. Same pregnancy contraindication as retinol; also raises photo-stability concerns when used in daytime sun-exposed products.",
    citation: "NTP Technical Report on Retinyl Palmitate, 2012.",
    citationUrl: "https://ntp.niehs.nih.gov/publications/reports/tr/500s/tr568",
  },
  "retinyl acetate": {
    display: "Retinyl Acetate",
    category: "PHOTOSENSITISER",
    severity: "CAUTION",
    profileOverrides: { pregnant: "HIGH_RISK" },
    hint: "Vitamin A ester; same retinoid family — contraindicated in pregnancy.",
    citation: "Bozzo P et al., 2011. Can Fam Physician.",
    citationUrl: "https://pubmed.ncbi.nlm.nih.gov/21523855/",
  },
  "retinaldehyde": {
    display: "Retinaldehyde",
    category: "PHOTOSENSITISER",
    severity: "CAUTION",
    profileOverrides: { pregnant: "HIGH_RISK" },
    hint: "Vitamin A derivative; same pregnancy contraindication as retinol.",
    citation: "Bozzo P et al., 2011. Can Fam Physician.",
    citationUrl: "https://pubmed.ncbi.nlm.nih.gov/21523855/",
  },
  "tretinoin": {
    display: "Tretinoin (Retinoic Acid)",
    category: "PHOTOSENSITISER",
    severity: "HIGH_RISK",
    hint: "Prescription retinoid; absolutely contraindicated in pregnancy (teratogen).",
    citation: "Loureiro KD et al., 2005. Am J Med Genet A.",
    citationUrl: "https://pubmed.ncbi.nlm.nih.gov/16216923/",
  },
  "adapalene": {
    display: "Adapalene",
    category: "PHOTOSENSITISER",
    severity: "CAUTION",
    profileOverrides: { pregnant: "HIGH_RISK" },
    hint: "Synthetic retinoid; pregnancy category C — should be avoided.",
    citation: "ACOG Committee Opinion 2024.",
    citationUrl: "https://www.acog.org/clinical/clinical-guidance",
  },

  // ─── Urea (high-concentration keratolytic) ──────────────────────────────
  "urea": {
    display: "Urea",
    category: "CAUTION",
    severity: "CAUTION",
    hint: "Hydrating at low concentrations (<10%); keratolytic exfoliant at high concentrations (>10%). Apply concentration check.",
    citation: "Pan M et al., 2013. J Eur Acad Dermatol Venereol.",
    citationUrl: "https://pubmed.ncbi.nlm.nih.gov/22928883/",
    concentrationDependent: true,
    concentrationNote: "Only flag when listed in the first quarter of the INCI list (likely >10%) or when product is marketed as 'urea cream' / foot cream.",
  },

  // ─── Harsh sulfates / surfactants ───────────────────────────────────────
  "sodium lauryl sulfate": {
    display: "Sodium Lauryl Sulfate (SLS)",
    category: "CAUTION",
    severity: "CAUTION",
    profileOverrides: { sensitive: "HIGH_RISK", young: "HIGH_RISK", mature: "HIGH_RISK" },
    hint: "Aggressive surfactant; well-documented stratum corneum disruption and irritation.",
    citation: "Bondi CAM et al., 2015. Environ Health Insights.",
    citationUrl: "https://pubmed.ncbi.nlm.nih.gov/26617461/",
  },
  "sodium laureth sulfate": {
    display: "Sodium Laureth Sulfate (SLES)",
    category: "CAUTION",
    severity: "CAUTION",
    profileOverrides: { sensitive: "CAUTION" },
    hint: "Milder than SLS but can still strip the barrier with repeated daily use; ethoxylation by-product 1,4-dioxane is a separate manufacturing concern.",
    citation: "Robinson VC et al., 2010. Int J Toxicol.",
    citationUrl: "https://pubmed.ncbi.nlm.nih.gov/21164074/",
  },

  // ─── Drying alcohols ────────────────────────────────────────────────────
  "alcohol denat": {
    display: "Alcohol Denat.",
    category: "CAUTION",
    severity: "CAUTION",
    profileOverrides: { sensitive: "HIGH_RISK", mature: "HIGH_RISK" },
    hint: "Drying when listed in the first half of the INCI list; can compromise barrier with repeat use.",
    citation: "Lodén M, Maibach HI, 2000. Dry Skin and Moisturizers.",
    citationUrl: "https://www.routledge.com/Dry-Skin-and-Moisturizers/Loden-Maibach/p/book/9780849375200",
    concentrationDependent: true,
    concentrationNote: "Only flag when in the first half of the INCI list.",
  },
  "sd alcohol 40": {
    display: "SD Alcohol 40",
    category: "CAUTION",
    severity: "CAUTION",
    profileOverrides: { sensitive: "HIGH_RISK" },
    hint: "Same drying concern as alcohol denat.",
    citation: "Lodén M, Maibach HI, 2000.",
    citationUrl: "https://www.routledge.com/Dry-Skin-and-Moisturizers/Loden-Maibach/p/book/9780849375200",
    concentrationDependent: true,
  },

  // ─── Fragrance / known allergens ────────────────────────────────────────
  "parfum": {
    display: "Parfum / Fragrance",
    category: "FRAGRANCE",
    severity: "CAUTION",
    profileOverrides: { sensitive: "HIGH_RISK", young: "HIGH_RISK" },
    hint: "Undisclosed mix of up to ~3,000 possible aroma chemicals; #1 cause of contact dermatitis from cosmetics.",
    citation: "Schnuch A et al., 2007. Contact Dermatitis.",
    citationUrl: "https://pubmed.ncbi.nlm.nih.gov/17244089/",
  },
  "fragrance": {
    display: "Fragrance",
    category: "FRAGRANCE",
    severity: "CAUTION",
    profileOverrides: { sensitive: "HIGH_RISK", young: "HIGH_RISK" },
    hint: "Same as parfum; #1 cause of cosmetic contact dermatitis.",
    citation: "Schnuch A et al., 2007. Contact Dermatitis.",
    citationUrl: "https://pubmed.ncbi.nlm.nih.gov/17244089/",
  },
  "limonene": {
    display: "Limonene",
    category: "KNOWN_ALLERGEN",
    severity: "CAUTION",
    profileOverrides: { sensitive: "HIGH_RISK" },
    hint: "EU-listed fragrance allergen; oxidises into more potent sensitisers on storage.",
    citation: "EU Regulation 1223/2009 Annex III, entry 67.",
    citationUrl: "https://eur-lex.europa.eu/eli/reg/2009/1223/oj",
  },
  "linalool": {
    display: "Linalool",
    category: "KNOWN_ALLERGEN",
    severity: "CAUTION",
    profileOverrides: { sensitive: "HIGH_RISK" },
    hint: "EU-listed fragrance allergen; oxidation products are common contact allergens.",
    citation: "EU Regulation 1223/2009 Annex III, entry 78.",
    citationUrl: "https://eur-lex.europa.eu/eli/reg/2009/1223/oj",
  },
  "geraniol": {
    display: "Geraniol",
    category: "KNOWN_ALLERGEN",
    severity: "CAUTION",
    profileOverrides: { sensitive: "HIGH_RISK" },
    hint: "EU-listed fragrance allergen.",
    citation: "EU Regulation 1223/2009 Annex III.",
    citationUrl: "https://eur-lex.europa.eu/eli/reg/2009/1223/oj",
  },
  "citronellol": {
    display: "Citronellol",
    category: "KNOWN_ALLERGEN",
    severity: "CAUTION",
    profileOverrides: { sensitive: "HIGH_RISK" },
    hint: "EU-listed fragrance allergen.",
    citation: "EU Regulation 1223/2009 Annex III.",
    citationUrl: "https://eur-lex.europa.eu/eli/reg/2009/1223/oj",
  },
  "eugenol": {
    display: "Eugenol",
    category: "KNOWN_ALLERGEN",
    severity: "CAUTION",
    profileOverrides: { sensitive: "HIGH_RISK" },
    hint: "EU-listed fragrance allergen; potent sensitiser at high concentrations.",
    citation: "EU Regulation 1223/2009 Annex III.",
    citationUrl: "https://eur-lex.europa.eu/eli/reg/2009/1223/oj",
  },
  "cinnamal": {
    display: "Cinnamal",
    category: "KNOWN_ALLERGEN",
    severity: "CAUTION",
    profileOverrides: { sensitive: "HIGH_RISK" },
    hint: "EU-listed fragrance allergen; one of the more common positive patch-test reactions.",
    citation: "EU Regulation 1223/2009 Annex III.",
    citationUrl: "https://eur-lex.europa.eu/eli/reg/2009/1223/oj",
  },
  "isoeugenol": {
    display: "Isoeugenol",
    category: "KNOWN_ALLERGEN",
    severity: "CAUTION",
    profileOverrides: { sensitive: "HIGH_RISK" },
    hint: "EU-listed fragrance allergen; restricted to 0.02% in leave-on products.",
    citation: "EU Regulation 1223/2009 Annex III.",
    citationUrl: "https://eur-lex.europa.eu/eli/reg/2009/1223/oj",
  },
  "hydroxycitronellal": {
    display: "Hydroxycitronellal",
    category: "KNOWN_ALLERGEN",
    severity: "CAUTION",
    profileOverrides: { sensitive: "HIGH_RISK" },
    hint: "EU-listed fragrance allergen.",
    citation: "EU Regulation 1223/2009 Annex III.",
    citationUrl: "https://eur-lex.europa.eu/eli/reg/2009/1223/oj",
  },
  "methylisothiazolinone": {
    display: "Methylisothiazolinone (MI)",
    category: "HARSH_PRESERVATIVE",
    severity: "HIGH_RISK",
    hint: "Top-five contact allergen of the past decade; banned from EU leave-on products.",
    citation: "SCCS/1521/13.",
    citationUrl: "https://health.ec.europa.eu/scientific-committees/scientific-committee-consumer-safety-sccs_en",
  },
  "methylchloroisothiazolinone": {
    display: "Methylchloroisothiazolinone (MCI)",
    category: "HARSH_PRESERVATIVE",
    severity: "HIGH_RISK",
    hint: "Strong sensitiser; banned from EU leave-on products; rinse-off restricted to 0.0015%.",
    citation: "SCCS/1521/13.",
    citationUrl: "https://health.ec.europa.eu/scientific-committees/scientific-committee-consumer-safety-sccs_en",
  },

  // ─── Phenoxyethanol (concentration-dependent) ───────────────────────────
  "phenoxyethanol": {
    display: "Phenoxyethanol",
    category: "HARSH_PRESERVATIVE",
    severity: "CAUTION",
    profileOverrides: { sensitive: "CAUTION" },
    hint: "Generally safe under the EU 1% cap; flag only when likely to be near the maximum concentration.",
    citation: "Lessmann H et al., 2009. Contact Dermatitis.",
    citationUrl: "https://pubmed.ncbi.nlm.nih.gov/19207384/",
    concentrationDependent: true,
    concentrationNote: "Phenoxyethanol is capped at 1% in the EU. It usually appears near the END of the INCI list (preservative position). Do NOT flag when in the last third of the list. Only flag if listed unusually high (first half) or for sensitive-skin users when in the middle of the list.",
  },

  // ─── Mineral nanoparticles (sunscreen actives) ──────────────────────────
  "titanium dioxide nano": {
    display: "Titanium Dioxide (nano)",
    category: "NANOPARTICLE",
    severity: "CAUTION",
    hint: "Inhalation risk in spray formats only; topical application on intact skin is considered safe by SCCS.",
    citation: "SCCS/1617/20.",
    citationUrl: "https://health.ec.europa.eu/scientific-committees/scientific-committee-consumer-safety-sccs_en",
  },
  "zinc oxide nano": {
    display: "Zinc Oxide (nano)",
    category: "NANOPARTICLE",
    severity: "CAUTION",
    hint: "Inhalation risk in spray formats only; topical application is considered safe by SCCS.",
    citation: "SCCS/1518/13.",
    citationUrl: "https://health.ec.europa.eu/scientific-committees/scientific-committee-consumer-safety-sccs_en",
  },

  // ─── Hydroquinone (skin lightener) ──────────────────────────────────────
  "hydroquinone": {
    display: "Hydroquinone",
    category: "CAUTION",
    severity: "HIGH_RISK",
    hint: "Banned from EU cosmetics (allowed only in nail systems and prescription medical products); ochronosis risk.",
    citation: "EU Regulation 1223/2009 Annex II, entry 1339.",
    citationUrl: "https://eur-lex.europa.eu/eli/reg/2009/1223/oj",
  },

  // ─── Ethanolamines / acrylamide ─────────────────────────────────────────
  "polyacrylamide": {
    display: "Polyacrylamide",
    category: "CAUTION",
    severity: "CAUTION",
    hint: "Residual acrylamide monomer is a known carcinogen; well-manufactured products keep it under 0.1 ppm.",
    citation: "SCCNFP/0716/03.",
    citationUrl: "https://health.ec.europa.eu/scientific-committees/scientific-committee-consumer-safety-sccs_en",
  },

  // ─── Coal tar derivatives ───────────────────────────────────────────────
  "coal tar": {
    display: "Coal Tar",
    category: "CAUTION",
    severity: "HIGH_RISK",
    hint: "IARC Group 1 human carcinogen; banned from EU cosmetics.",
    citation: "EU Regulation 1223/2009 Annex II, entry 1136.",
    citationUrl: "https://eur-lex.europa.eu/eli/reg/2009/1223/oj",
  },

  // ─── Synthetic antioxidants (endocrine concerns) ────────────────────────
  "bht": {
    display: "BHT (Butylated Hydroxytoluene)",
    category: "ENDOCRINE_DISRUPTOR",
    severity: "CAUTION",
    profileOverrides: { young: "CAUTION", pregnant: "CAUTION" },
    hint: "Synthetic antioxidant; weak endocrine signals in animal studies. Generally accepted safe at typical 0.1% use level but listed in EWG's higher-concern tier.",
    citation: "SCCS/1636/21.",
    citationUrl: "https://health.ec.europa.eu/scientific-committees/scientific-committee-consumer-safety-sccs_en",
    aliases: ["butylated hydroxytoluene"],
  },
  "bha": {
    display: "BHA (Butylated Hydroxyanisole)",
    category: "ENDOCRINE_DISRUPTOR",
    severity: "CAUTION",
    profileOverrides: { young: "HIGH_RISK", pregnant: "HIGH_RISK" },
    hint: "Synthetic antioxidant; classified as 'reasonably anticipated to be a human carcinogen' by the US NTP. Note: this is the antioxidant BHA, NOT beta-hydroxy acid (salicylic acid).",
    citation: "NTP 14th Report on Carcinogens, 2016.",
    citationUrl: "https://ntp.niehs.nih.gov/whatwestudy/assessments/cancer/roc",
    aliases: ["butylated hydroxyanisole"],
  },

  // ─── Talc (asbestos contamination concern) ──────────────────────────────
  "talc": {
    display: "Talc",
    category: "CAUTION",
    severity: "CAUTION",
    profileOverrides: { young: "CAUTION", pregnant: "CAUTION" },
    hint: "Cosmetic talc may be contaminated with asbestos depending on mining source; reputable suppliers test for asbestos-free grade. Avoid loose powder products on the face.",
    citation: "FDA, 2023. Talc safety guidance.",
    citationUrl: "https://www.fda.gov/cosmetics/cosmetic-ingredients/talc",
  },
};

/**
 * Normalised lookup map built once at module load. Each entry is registered
 * under its primary key AND under any aliases so different INCI synonyms
 * resolve to the same risk record.
 */
const RISK_MAP: Map<string, RiskEntry> = (() => {
  const map = new Map<string, RiskEntry>();
  for (const [key, value] of Object.entries(RAW_RISKS)) {
    const allKeys = [key, ...(value.aliases ?? [])];
    for (const k of allKeys) {
      const normalized = normalizeIngredientName(k);
      if (normalized) map.set(normalized, value);
    }
  }
  return map;
})();

export interface MatchedRisk {
  /** The exact ingredient string as the user submitted it (preserves case). */
  inputName: string;
  /** Position in the parsed INCI list, 0-indexed. Lets the model apply
   *  concentration heuristics (first quarter ≈ active, last quarter ≈ trace). */
  position: number;
  /** Total length of the parsed INCI list, for the same heuristic. */
  totalIngredients: number;
  entry: RiskEntry;
}

/**
 * Walk a parsed ingredient list and return every entry that matches the curated
 * risk database. Returned entries preserve the user's original casing for the
 * input name and include positional information so the LLM can apply
 * concentration heuristics for `concentrationDependent` items.
 */
export function getRisksInList(parsed: string[]): MatchedRisk[] {
  const matches: MatchedRisk[] = [];
  parsed.forEach((name, position) => {
    const normalized = normalizeIngredientName(name);
    if (!normalized) return;
    const entry = RISK_MAP.get(normalized);
    if (entry) {
      matches.push({ inputName: name, position, totalIngredients: parsed.length, entry });
    }
  });
  return matches;
}

/**
 * Resolve the appropriate severity for a risk entry given a skin profile.
 */
export function severityFor(entry: RiskEntry, skinProfile?: string): RiskSeverity {
  if (skinProfile && entry.profileOverrides) {
    const override = entry.profileOverrides[skinProfile as SkinProfile];
    if (override) return override;
  }
  return entry.severity;
}

/**
 * Build a "MANDATORY FLAGS" block to append to the user message. Tells Claude
 * which ingredients in the input it MUST flag, with category and severity
 * already determined from our curated database. The model still writes the
 * explanation prose so it can personalise tone, but it cannot silently omit
 * a known concern.
 *
 * Returns an empty string if no risks were matched, so the caller can skip
 * appending the section entirely.
 */
export function buildMandatoryFlagsBlock(matches: MatchedRisk[], skinProfile?: string): string {
  if (matches.length === 0) return "";
  const lines = matches.map((m) => {
    const sev = severityFor(m.entry, skinProfile);
    const positionPct = Math.round(((m.position + 1) / m.totalIngredients) * 100);
    const parts = [
      `- "${m.entry.display}" — category=${m.entry.category}, severity=${sev}`,
      `  hint: ${m.entry.hint}`,
      `  citation: ${m.entry.citation} (${m.entry.citationUrl})`,
      `  position: #${m.position + 1} of ${m.totalIngredients} (${positionPct}% down the list)`,
    ];
    if (m.entry.concentrationDependent) {
      parts.push(
        `  CONCENTRATION CHECK REQUIRED: ${m.entry.concentrationNote ?? "Only flag if likely to be present at active (not trace) concentration based on its position in the INCI list."}`,
      );
    } else if (m.entry.concentrationNote) {
      parts.push(`  concentration note: ${m.entry.concentrationNote}`);
    }
    return parts.join("\n");
  });
  return [
    "",
    "MANDATORY FLAGS — the following ingredients in this product appear in our curated risk database:",
    ...lines,
    "",
    "Default behaviour: include a flag for each ingredient above using the supplied category and severity. Write your own 1–2 sentence explanation that incorporates the hint and adapts the tone to the user's skin profile.",
    "Exception: if an entry is marked CONCENTRATION CHECK REQUIRED and the position in the INCI list strongly suggests a trace amount (e.g. last third of a list of 8+ ingredients), you MAY skip the flag. For very short lists (≤5 ingredients), do not skip — concentration cannot be inferred reliably. You may also add additional flags for other concerning ingredients you identify outside this list.",
  ].join("\n");
}
