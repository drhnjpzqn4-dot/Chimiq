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
  /** Swedish translation of the hint — used when the API serves a Swedish user. */
  hint_se: string;
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
    hint_se: "Frigör långsamt formaldehyd — ett ämne som klassas som cancerframkallande för människa och är en vanlig kontaktallergen.",
    citation: "IARC Monographs Vol. 100F, 2012.",
    citationUrl: "https://publications.iarc.fr/123",
  },
  "diazolidinyl urea": {
    display: "Diazolidinyl Urea",
    category: "FORMALDEHYDE_RELEASER",
    severity: "HIGH_RISK",
    hint: "Formaldehyde-releasing preservative; restricted in EU; common contact sensitiser.",
    hint_se: "Konserveringsmedel som frigör formaldehyd; begränsat i EU och en vanlig orsak till kontaktallergi.",
    citation: "SCCS/1612/19, EU Scientific Committee on Consumer Safety.",
    citationUrl: "https://health.ec.europa.eu/scientific-committees/scientific-committee-consumer-safety-sccs_en",
  },
  "imidazolidinyl urea": {
    display: "Imidazolidinyl Urea",
    category: "FORMALDEHYDE_RELEASER",
    severity: "HIGH_RISK",
    hint: "Releases formaldehyde at low levels; restricted in EU.",
    hint_se: "Frigör små mängder formaldehyd; begränsat användande i EU.",
    citation: "SCCS/1612/19.",
    citationUrl: "https://health.ec.europa.eu/scientific-committees/scientific-committee-consumer-safety-sccs_en",
  },
  "quaternium 15": {
    display: "Quaternium-15",
    category: "FORMALDEHYDE_RELEASER",
    severity: "HIGH_RISK",
    hint: "Strongest formaldehyde releaser used in cosmetics; high contact dermatitis risk.",
    hint_se: "Den starkaste formaldehydfrigöraren i kosmetika; hög risk för kontakteksem.",
    citation: "de Groot AC, 2010. Contact Dermatitis.",
    citationUrl: "https://pubmed.ncbi.nlm.nih.gov/20136890/",
  },
  "bronopol": {
    display: "2-Bromo-2-Nitropropane-1,3-Diol (Bronopol)",
    category: "FORMALDEHYDE_RELEASER",
    severity: "HIGH_RISK",
    hint: "Formaldehyde releaser; can also form carcinogenic nitrosamines.",
    hint_se: "Frigör formaldehyd och kan även bilda cancerframkallande nitrosaminer.",
    citation: "SCCNFP/0556/02.",
    citationUrl: "https://health.ec.europa.eu/scientific-committees/scientific-committee-consumer-safety-sccs_en",
  },
  "sodium hydroxymethylglycinate": {
    display: "Sodium Hydroxymethylglycinate",
    category: "FORMALDEHYDE_RELEASER",
    severity: "HIGH_RISK",
    profileOverrides: { sensitive: "HIGH_RISK", young: "HIGH_RISK" },
    hint: "Releases formaldehyde under typical use conditions; documented contact allergen.",
    hint_se: "Frigör formaldehyd vid normal användning; dokumenterad kontaktallergen.",
    citation: "de Groot AC, White IR, Flyvholm MA, et al. Contact Dermatitis.",
    citationUrl: "https://pubmed.ncbi.nlm.nih.gov/?term=sodium+hydroxymethylglycinate+formaldehyde",
  },
  "methenamine": {
    display: "Methenamine",
    category: "FORMALDEHYDE_RELEASER",
    severity: "HIGH_RISK",
    hint: "Hydrolyses to release formaldehyde; restricted under EU Annex V.",
    hint_se: "Bryts ned till formaldehyd vid kontakt med hud; begränsat i EU enligt bilaga V.",
    citation: "EU Regulation 1223/2009 Annex V, entry 31.",
    citationUrl: "https://eur-lex.europa.eu/eli/reg/2009/1223/oj",
  },

  // ─── Endocrine disruptors / parabens ────────────────────────────────────
  "propylparaben": {
    display: "Propylparaben",
    category: "ENDOCRINE_DISRUPTOR",
    severity: "CAUTION",
    profileOverrides: { young: "HIGH_RISK", pregnant: "HIGH_RISK" },
    hint: "Weak xeno-estrogen; restricted in EU leave-on products to 0.14% (single) or 0.8% (total parabens).",
    hint_se: "Svagt östrogenliknande ämne; begränsat i EU till 0,14 % per ämne eller 0,8 % totalt för parabener i leave-on-produkter.",
    citation: "SCCS/1514/13.",
    citationUrl: "https://health.ec.europa.eu/scientific-committees/scientific-committee-consumer-safety-sccs_en",
  },
  "butylparaben": {
    display: "Butylparaben",
    category: "ENDOCRINE_DISRUPTOR",
    severity: "CAUTION",
    profileOverrides: { young: "HIGH_RISK", pregnant: "HIGH_RISK" },
    hint: "Weak xeno-estrogen; same EU restrictions as propylparaben.",
    hint_se: "Svagt östrogenliknande ämne; samma EU-begränsningar som propylparaben.",
    citation: "SCCS/1514/13.",
    citationUrl: "https://health.ec.europa.eu/scientific-committees/scientific-committee-consumer-safety-sccs_en",
  },
  "isobutylparaben": {
    display: "Isobutylparaben",
    category: "ENDOCRINE_DISRUPTOR",
    severity: "HIGH_RISK",
    hint: "Banned in EU cosmetics since 2015 (Regulation 358/2014).",
    hint_se: "Förbjudet i EU-kosmetika sedan 2015 (förordning 358/2014).",
    citation: "EU Regulation 358/2014.",
    citationUrl: "https://eur-lex.europa.eu/eli/reg/2014/358/oj",
  },
  "isopropylparaben": {
    display: "Isopropylparaben",
    category: "ENDOCRINE_DISRUPTOR",
    severity: "HIGH_RISK",
    hint: "Banned in EU cosmetics since 2015.",
    hint_se: "Förbjudet i EU-kosmetika sedan 2015.",
    citation: "EU Regulation 358/2014.",
    citationUrl: "https://eur-lex.europa.eu/eli/reg/2014/358/oj",
  },
  "methylparaben": {
    display: "Methylparaben",
    category: "ENDOCRINE_DISRUPTOR",
    severity: "CAUTION",
    profileOverrides: { young: "CAUTION", pregnant: "CAUTION" },
    hint: "Generally considered the lowest-concern paraben and permitted in EU up to 0.4% (single) — but still cumulates with other parabens against the 0.8% total cap. Avoidance recommended for infants and during pregnancy.",
    hint_se: "Anses som den minst oroande parabenen och tillåten i EU upp till 0,4 % — men räknas in i den totala parabengränsen på 0,8 %. Rekommenderas att undvikas för spädbarn och under graviditet.",
    citation: "SCCS/1514/13.",
    citationUrl: "https://health.ec.europa.eu/scientific-committees/scientific-committee-consumer-safety-sccs_en",
  },
  "ethylparaben": {
    display: "Ethylparaben",
    category: "ENDOCRINE_DISRUPTOR",
    severity: "CAUTION",
    profileOverrides: { young: "CAUTION", pregnant: "CAUTION" },
    hint: "Lower-concern paraben permitted in EU up to 0.4% (single) but counted toward the 0.8% total parabens cap.",
    hint_se: "Mindre oroande paraben, tillåten i EU upp till 0,4 % men räknas in i totalgränsen på 0,8 % för parabener.",
    citation: "SCCS/1514/13.",
    citationUrl: "https://health.ec.europa.eu/scientific-committees/scientific-committee-consumer-safety-sccs_en",
  },
  "benzophenone 3": {
    display: "Benzophenone-3 (Oxybenzone)",
    category: "ENDOCRINE_DISRUPTOR",
    severity: "CAUTION",
    profileOverrides: { young: "HIGH_RISK", pregnant: "HIGH_RISK" },
    hint: "UV filter with documented endocrine activity; high systemic absorption; banned in some reef-safe regulations.",
    hint_se: "UV-filter med dokumenterad hormonpåverkan; tas upp i hög grad genom huden; förbjudet i flera revsäkra regelverk.",
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
    hint_se: "Kemiskt UV-filter med signaler om sköldkörtelpåverkan i djurstudier; tas upp i hög grad genom huden.",
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
    hint_se: "Kemiskt UV-filter; SCCS sänkte säkerhetsgränsen till 7,34 % år 2021 på grund av hudupptag och hormonpåverkan.",
    citation: "SCCS/1622/20.",
    citationUrl: "https://health.ec.europa.eu/scientific-committees/scientific-committee-consumer-safety-sccs_en",
  },
  "octocrylene": {
    display: "Octocrylene",
    category: "ENDOCRINE_DISRUPTOR",
    severity: "CAUTION",
    hint: "Chemical UV filter; degrades over time into benzophenone (a probable carcinogen). Watch product expiry.",
    hint_se: "Kemiskt UV-filter; bryts ned med tiden till bensofenon (ett ämne som misstänks vara cancerframkallande). Håll koll på utgångsdatum.",
    citation: "Downs CA et al., 2021. Chem Res Toxicol.",
    citationUrl: "https://pubmed.ncbi.nlm.nih.gov/33682414/",
  },
  "triclosan": {
    display: "Triclosan",
    category: "ENDOCRINE_DISRUPTOR",
    severity: "HIGH_RISK",
    hint: "Antimicrobial with thyroid disruption and antimicrobial resistance concerns; restricted in EU to 0.3%.",
    hint_se: "Antibakteriellt ämne med oro för sköldkörtelpåverkan och antibiotikaresistens; begränsat i EU till 0,3 %.",
    citation: "FDA Final Rule 2017; SCCS/1414/11.",
    citationUrl: "https://www.federalregister.gov/documents/2016/09/06/2016-21337/",
  },
  "triclocarban": {
    display: "Triclocarban",
    category: "ENDOCRINE_DISRUPTOR",
    severity: "HIGH_RISK",
    profileOverrides: { pregnant: "HIGH_RISK", young: "HIGH_RISK" },
    hint: "Antimicrobial banned by the FDA in OTC consumer wash products in 2016 over endocrine and resistance concerns.",
    hint_se: "Antibakteriellt ämne som FDA förbjöd i konsumenttvål 2016 på grund av oro för hormonpåverkan och antibiotikaresistens.",
    citation: "FDA Final Rule 2016, 21 CFR Part 310.",
    citationUrl: "https://www.federalregister.gov/documents/2016/09/06/2016-21337/",
  },
  "4 methylbenzylidene camphor": {
    display: "4-Methylbenzylidene Camphor (4-MBC)",
    category: "ENDOCRINE_DISRUPTOR",
    severity: "HIGH_RISK",
    profileOverrides: { pregnant: "HIGH_RISK", young: "HIGH_RISK" },
    hint: "UV filter with documented estrogenic activity; banned in EU cosmetics from 2025 under Regulation (EU) 2022/1531.",
    hint_se: "UV-filter med dokumenterad östrogen aktivitet; förbjudet i EU-kosmetika från 2025 enligt förordning (EU) 2022/1531.",
    citation: "EU Regulation 2022/1531; Schlumpf M et al., 2001. Environ Health Perspect.",
    citationUrl: "https://eur-lex.europa.eu/eli/reg/2022/1531/oj",
    aliases: ["4-mbc", "enzacamene"],
  },
  "cyclopentasiloxane": {
    display: "Cyclopentasiloxane (D5)",
    category: "ENDOCRINE_DISRUPTOR",
    severity: "CAUTION",
    profileOverrides: { pregnant: "CAUTION" },
    hint: "Volatile silicone classified by ECHA as very persistent and very bioaccumulative (vPvB); EU restricted to <0.1% in rinse-off products from 2020 and in further leave-on categories from 2027.",
    hint_se: "Flyktig silikon som ECHA klassat som mycket långlivad och bioackumulerande (vPvB); EU begränsade den i avsköljbara produkter till under 0,1 % från 2020 och utvidgar förbudet till fler leave-on-produkter från 2027.",
    citation: "ECHA, 2018; EU Regulation 2018/35; EU Regulation 2024/1328.",
    citationUrl: "https://echa.europa.eu/substance-information/-/substanceinfo/100.012.825",
    aliases: ["d5"],
  },
  "cyclotetrasiloxane": {
    display: "Cyclotetrasiloxane (D4)",
    category: "ENDOCRINE_DISRUPTOR",
    severity: "HIGH_RISK",
    profileOverrides: { pregnant: "HIGH_RISK", young: "HIGH_RISK" },
    hint: "EU SVHC: classified as a reproductive toxicant (Repr. 2) and persistent/bioaccumulative; restricted to <0.1% in cosmetics under REACH Annex XVII.",
    hint_se: "EU SVHC: klassat som reproduktionsstörande (Repr. 2) och långlivat/bioackumulerande; begränsat till under 0,1 % i kosmetika enligt REACH bilaga XVII.",
    citation: "ECHA SVHC list; REACH Annex XVII entry 70.",
    citationUrl: "https://echa.europa.eu/substance-information/-/substanceinfo/100.005.281",
    aliases: ["d4"],
  },

  // ─── Triethanolamine (nitrosamine concern) ──────────────────────────────
  "triethanolamine": {
    display: "Triethanolamine (TEA)",
    category: "CAUTION",
    severity: "CAUTION",
    profileOverrides: { sensitive: "CAUTION", young: "HIGH_RISK", pregnant: "HIGH_RISK" },
    hint: "Can react with nitrosating preservatives to form carcinogenic nitrosamines; restricted under EU Annex III.",
    hint_se: "Kan reagera med vissa konserveringsmedel och bilda cancerframkallande nitrosaminer; begränsat enligt EU:s bilaga III.",
    citation: "SCCS/1463/12.",
    citationUrl: "https://health.ec.europa.eu/scientific-committees/scientific-committee-consumer-safety-sccs_en",
  },
  "diethanolamine": {
    display: "Diethanolamine (DEA)",
    category: "CAUTION",
    severity: "HIGH_RISK",
    hint: "Banned in EU cosmetics due to nitrosamine formation risk.",
    hint_se: "Förbjudet i EU-kosmetika på grund av risken att bilda nitrosaminer.",
    citation: "EU Cosmetics Regulation 1223/2009 Annex II.",
    citationUrl: "https://eur-lex.europa.eu/eli/reg/2009/1223/oj",
  },
  "monoethanolamine": {
    display: "Monoethanolamine (MEA)",
    category: "CAUTION",
    severity: "HIGH_RISK",
    profileOverrides: { sensitive: "HIGH_RISK", young: "HIGH_RISK", pregnant: "HIGH_RISK" },
    hint: "Secondary amine that can react with nitrosating agents to form nitrosamines; commonly used as a pH adjuster in hair dyes and considered a respiratory and skin irritant.",
    hint_se: "Sekundär amin som kan reagera med nitroseringsmedel och bilda nitrosaminer; vanlig som pH-justerare i hårfärg och betraktas som hud- och luftvägsirriterande.",
    citation: "SCCS/1572/16; FDA Cosmetic Ingredients overview.",
    citationUrl: "https://health.ec.europa.eu/scientific-committees/scientific-committee-consumer-safety-sccs_en",
    aliases: ["ethanolamine"],
  },
  "cocamide dea": {
    display: "Cocamide DEA",
    category: "CAUTION",
    severity: "HIGH_RISK",
    profileOverrides: { sensitive: "HIGH_RISK", pregnant: "HIGH_RISK", young: "HIGH_RISK" },
    hint: "DEA-based surfactant that can release diethanolamine and form carcinogenic nitrosamines under typical formulation conditions; classified by IARC as possibly carcinogenic to humans (Group 2B).",
    hint_se: "DEA-baserad tensid som kan frigöra dietanolamin och bilda cancerframkallande nitrosaminer i vanliga produktformuleringar; IARC har klassificerat kokamid-DEA som möjligen cancerframkallande för människa (grupp 2B).",
    citation: "IARC Monographs Vol. 101, 2013.",
    citationUrl: "https://publications.iarc.fr/Book-And-Report-Series/Iarc-Monographs-On-The-Identification-Of-Carcinogenic-Hazards-To-Humans/Some-Chemicals-Present-In-Industrial-And-Consumer-Products-Food-And-Drinking-Water-2013",
  },
  "lauramide dea": {
    display: "Lauramide DEA",
    category: "CAUTION",
    severity: "HIGH_RISK",
    profileOverrides: { sensitive: "HIGH_RISK", pregnant: "HIGH_RISK", young: "HIGH_RISK" },
    hint: "Same family as Cocamide DEA — releases diethanolamine and can form nitrosamines in formulations containing nitrosating agents.",
    hint_se: "Samma familj som kokamid-DEA — frigör dietanolamin och kan bilda nitrosaminer i recept med nitroseringsmedel.",
    citation: "IARC Monographs Vol. 101, 2013.",
    citationUrl: "https://publications.iarc.fr/Book-And-Report-Series/Iarc-Monographs-On-The-Identification-Of-Carcinogenic-Hazards-To-Humans/Some-Chemicals-Present-In-Industrial-And-Consumer-Products-Food-And-Drinking-Water-2013",
  },

  // ─── Photosensitisers / AHAs ────────────────────────────────────────────
  "glycolic acid": {
    display: "Glycolic Acid",
    category: "PHOTOSENSITISER",
    severity: "CAUTION",
    profileOverrides: { sensitive: "CAUTION", mature: "CAUTION" },
    hint: "AHA exfoliant; thins stratum corneum and increases UV sensitivity. Daily SPF 30+ required.",
    hint_se: "AHA-exfoliant; gör hornlagret tunnare och ökar känsligheten för UV-ljus. Daglig SPF 30+ krävs.",
    citation: "Kornhauser A, Coelho SG, Hearing VJ, 2010. Int J Dermatol.",
    citationUrl: "https://pubmed.ncbi.nlm.nih.gov/20486451/",
    concentrationNote: "Concern scales with concentration above ~5%.",
  },
  "lactic acid": {
    display: "Lactic Acid",
    category: "PHOTOSENSITISER",
    severity: "CAUTION",
    hint: "AHA exfoliant; same SPF requirement as glycolic acid.",
    hint_se: "AHA-exfoliant; samma krav på dagligt solskydd som glykolsyra.",
    citation: "Kornhauser A et al., 2010. Int J Dermatol.",
    citationUrl: "https://pubmed.ncbi.nlm.nih.gov/20486451/",
    concentrationNote: "Concern scales with concentration above ~5%.",
  },
  "mandelic acid": {
    display: "Mandelic Acid",
    category: "PHOTOSENSITISER",
    severity: "CAUTION",
    hint: "AHA exfoliant; gentler than glycolic but still photosensitising.",
    hint_se: "AHA-exfoliant; mildare än glykolsyra men gör fortfarande huden mer ljuskänslig.",
    citation: "Sarkar R et al., 2017. J Cutan Aesthet Surg.",
    citationUrl: "https://pubmed.ncbi.nlm.nih.gov/28584455/",
  },
  "salicylic acid": {
    display: "Salicylic Acid",
    category: "PHOTOSENSITISER",
    severity: "CAUTION",
    profileOverrides: { pregnant: "HIGH_RISK" },
    hint: "BHA exfoliant; mild photosensitiser. Pregnancy: avoid concentrations above 2%.",
    hint_se: "BHA-exfoliant; mild ljuskänslighetsfaktor. Under graviditet: undvik koncentrationer över 2 %.",
    citation: "Bozzo P et al., 2011. Can Fam Physician.",
    citationUrl: "https://pubmed.ncbi.nlm.nih.gov/21523855/",
  },
  "citric acid": {
    display: "Citric Acid",
    category: "PHOTOSENSITISER",
    severity: "CAUTION",
    hint: "AHA at active concentrations (>3%); pH adjuster at trace amounts. Apply concentration check before flagging.",
    hint_se: "Räknas som AHA vid aktiva halter (>3 %), men är bara pH-justerare i små mängder. Kontrollera placering i innehållsförteckningen innan du flaggar.",
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
    hint_se: "A-vitaminderivat; gör hornlagret tunnare, ökar ljuskänsligheten och avråds helt under graviditet.",
    citation: "Mukherjee S et al., 2006. Clin Interv Aging.",
    citationUrl: "https://pubmed.ncbi.nlm.nih.gov/18046911/",
  },
  "retinyl palmitate": {
    display: "Retinyl Palmitate",
    category: "PHOTOSENSITISER",
    severity: "CAUTION",
    profileOverrides: { pregnant: "HIGH_RISK" },
    hint: "Vitamin A ester; converts to retinol on skin. Same pregnancy contraindication as retinol; also raises photo-stability concerns when used in daytime sun-exposed products.",
    hint_se: "A-vitaminester som omvandlas till retinol i huden. Samma rekommendation att undvikas under graviditet som retinol; ger även frågetecken kring fotostabilitet i dagprodukter med solexponering.",
    citation: "NTP Technical Report on Retinyl Palmitate, 2012.",
    citationUrl: "https://ntp.niehs.nih.gov/publications/reports/tr/500s/tr568",
  },
  "retinyl acetate": {
    display: "Retinyl Acetate",
    category: "PHOTOSENSITISER",
    severity: "CAUTION",
    profileOverrides: { pregnant: "HIGH_RISK" },
    hint: "Vitamin A ester; same retinoid family — contraindicated in pregnancy.",
    hint_se: "A-vitaminester i samma retinoidfamilj — avråds under graviditet.",
    citation: "Bozzo P et al., 2011. Can Fam Physician.",
    citationUrl: "https://pubmed.ncbi.nlm.nih.gov/21523855/",
  },
  "retinaldehyde": {
    display: "Retinaldehyde",
    category: "PHOTOSENSITISER",
    severity: "CAUTION",
    profileOverrides: { pregnant: "HIGH_RISK" },
    hint: "Vitamin A derivative; same pregnancy contraindication as retinol.",
    hint_se: "A-vitaminderivat med samma graviditetsrekommendation som retinol — undvik.",
    citation: "Bozzo P et al., 2011. Can Fam Physician.",
    citationUrl: "https://pubmed.ncbi.nlm.nih.gov/21523855/",
  },
  "tretinoin": {
    display: "Tretinoin (Retinoic Acid)",
    category: "PHOTOSENSITISER",
    severity: "HIGH_RISK",
    hint: "Prescription retinoid; absolutely contraindicated in pregnancy (teratogen).",
    hint_se: "Receptbelagd retinoid; helt kontraindicerad under graviditet (fosterskadande).",
    citation: "Loureiro KD et al., 2005. Am J Med Genet A.",
    citationUrl: "https://pubmed.ncbi.nlm.nih.gov/16216923/",
  },
  "adapalene": {
    display: "Adapalene",
    category: "PHOTOSENSITISER",
    severity: "CAUTION",
    profileOverrides: { pregnant: "HIGH_RISK" },
    hint: "Synthetic retinoid; pregnancy category C — should be avoided.",
    hint_se: "Syntetisk retinoid; graviditetskategori C — bör undvikas.",
    citation: "ACOG Committee Opinion 2024.",
    citationUrl: "https://www.acog.org/clinical/clinical-guidance",
  },
  "bergamot oil": {
    display: "Bergamot Oil (Citrus Bergamia)",
    category: "PHOTOSENSITISER",
    severity: "HIGH_RISK",
    profileOverrides: { sensitive: "HIGH_RISK" },
    hint: "Contains bergapten (5-methoxypsoralen), a furocoumarin that causes phototoxic reactions (berloque dermatitis) when applied skin is exposed to UV. EU restricts non-bergapten-free bergamot oil in leave-on cosmetics.",
    hint_se: "Innehåller bergapten (5-metoxypsoralen), en furokumarin som ger fototoxiska reaktioner (berloque-dermatit) när huden utsätts för UV-ljus. EU begränsar bergamottolja som inte är bergaptenfri i leave-on-produkter.",
    citation: "SCCNFP/0392/00; IFRA Standard 51st Amendment.",
    citationUrl: "https://health.ec.europa.eu/scientific-committees/scientific-committee-consumer-safety-sccs_en",
    aliases: ["citrus bergamia peel oil", "citrus aurantium bergamia"],
  },
  "lime oil": {
    display: "Lime Oil (Citrus Aurantifolia, expressed)",
    category: "PHOTOSENSITISER",
    severity: "HIGH_RISK",
    profileOverrides: { sensitive: "HIGH_RISK" },
    hint: "Cold-pressed lime oil contains furocoumarins and is strongly phototoxic; can cause severe burns and pigmentation when exposed to UV after application. Steam-distilled lime is generally not phototoxic but is rarely specified on labels.",
    hint_se: "Kallpressad limeolja innehåller furokumariner och är starkt fototoxisk; kan ge svåra brännskador och pigmentförändringar när huden utsätts för UV efter applicering. Ångdestillerad limeolja är vanligtvis inte fototoxisk, men det specificeras sällan på etiketten.",
    citation: "IFRA Standard 51st Amendment; Kejlová K et al., Toxicol In Vitro 2010.",
    citationUrl: "https://pubmed.ncbi.nlm.nih.gov/?term=lime+oil+phototoxicity+furocoumarin",
    aliases: ["citrus aurantifolia peel oil", "expressed lime oil"],
  },
  "hypericum perforatum extract": {
    display: "St John's Wort Extract (Hypericum Perforatum)",
    category: "PHOTOSENSITISER",
    severity: "CAUTION",
    profileOverrides: { sensitive: "HIGH_RISK", pregnant: "HIGH_RISK" },
    hint: "Contains hypericin, a known photosensitiser that can produce phototoxic skin reactions on UV exposure; also documented to interact systemically with many medications when used orally.",
    hint_se: "Innehåller hypericin, ett känt fotosensibiliserande ämne som kan ge fototoxiska hudreaktioner vid UV-exponering; har även dokumenterade läkemedelsinteraktioner när det tas oralt.",
    citation: "Schempp CM et al., Lancet 2000.",
    citationUrl: "https://pubmed.ncbi.nlm.nih.gov/10741979/",
    aliases: ["st johns wort extract", "hypericum perforatum oil"],
  },

  // ─── Urea (high-concentration keratolytic) ──────────────────────────────
  "urea": {
    display: "Urea",
    category: "CAUTION",
    severity: "CAUTION",
    hint: "Hydrating at low concentrations (<10%); keratolytic exfoliant at high concentrations (>10%). Apply concentration check.",
    hint_se: "Återfuktande i låga halter (<10 %), men keratolytisk (exfolierande) i högre halter (>10 %). Bedöm placering i innehållsförteckningen.",
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
    hint_se: "Kraftig tensid; väldokumenterat att den stör hornlagret och kan ge irritation.",
    citation: "Bondi CAM et al., 2015. Environ Health Insights.",
    citationUrl: "https://pubmed.ncbi.nlm.nih.gov/26617461/",
  },
  "sodium laureth sulfate": {
    display: "Sodium Laureth Sulfate (SLES)",
    category: "CAUTION",
    severity: "CAUTION",
    profileOverrides: { sensitive: "CAUTION" },
    hint: "Milder than SLS but can still strip the barrier with repeated daily use; ethoxylation by-product 1,4-dioxane is a separate manufacturing concern.",
    hint_se: "Mildare än SLS men kan ändå svaga hudbarriären vid daglig användning; ger dessutom en separat oro kring föroreningen 1,4-dioxan från tillverkningsprocessen.",
    citation: "Robinson VC et al., 2010. Int J Toxicol.",
    citationUrl: "https://pubmed.ncbi.nlm.nih.gov/21164074/",
  },
  "cocamidopropyl betaine": {
    display: "Cocamidopropyl Betaine",
    category: "CAUTION",
    severity: "CAUTION",
    profileOverrides: { sensitive: "HIGH_RISK", young: "HIGH_RISK" },
    hint: "Mild amphoteric surfactant whose impurities (DMAPA, amidoamine) are documented contact allergens; named American Contact Dermatitis Society 'Allergen of the Year' in 2004.",
    hint_se: "Mild amfoter tensid där föroreningar (DMAPA, amidoamin) är dokumenterade kontaktallergener; utsedd till 'Årets allergen' av American Contact Dermatitis Society 2004.",
    citation: "Fowler JF, Fowler LM, Hunter JE. Am J Contact Dermat 2004.",
    citationUrl: "https://pubmed.ncbi.nlm.nih.gov/?term=cocamidopropyl+betaine+allergen+of+the+year",
  },
  "propylene glycol": {
    display: "Propylene Glycol",
    category: "CAUTION",
    severity: "CAUTION",
    profileOverrides: { sensitive: "HIGH_RISK" },
    hint: "Common humectant and solvent that the American Contact Dermatitis Society named 'Allergen of the Year' in 2018; can cause irritant and allergic contact dermatitis especially on damaged or eczema-prone skin.",
    hint_se: "Vanlig fukthållare och lösningsmedel som American Contact Dermatitis Society utsåg till 'Årets allergen' 2018; kan ge irritation och kontaktallergi, särskilt på skadad eller eksembenägen hud.",
    citation: "Jacob SE, Scheman A, McGowan MA. Dermatitis 2018.",
    citationUrl: "https://pubmed.ncbi.nlm.nih.gov/?term=propylene+glycol+allergen+of+the+year+2018",
  },

  // ─── Drying alcohols ────────────────────────────────────────────────────
  "alcohol denat": {
    display: "Alcohol Denat.",
    category: "CAUTION",
    severity: "CAUTION",
    profileOverrides: { sensitive: "HIGH_RISK", mature: "HIGH_RISK" },
    hint: "Drying when listed in the first half of the INCI list; can compromise barrier with repeat use.",
    hint_se: "Uttorkande när den ligger i den första halvan av innehållsförteckningen; kan svaga hudbarriären vid upprepad användning.",
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
    hint_se: "Samma uttorkande effekt som alcohol denat.",
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
    hint_se: "Odeklarerad blandning av upp till ca 3 000 möjliga doftämnen; den vanligaste orsaken till kontakteksem från hudvård.",
    citation: "Schnuch A et al., 2007. Contact Dermatitis.",
    citationUrl: "https://pubmed.ncbi.nlm.nih.gov/17244089/",
  },
  "fragrance": {
    display: "Fragrance",
    category: "FRAGRANCE",
    severity: "CAUTION",
    profileOverrides: { sensitive: "HIGH_RISK", young: "HIGH_RISK" },
    hint: "Same as parfum; #1 cause of cosmetic contact dermatitis.",
    hint_se: "Samma som parfum; den vanligaste orsaken till kontakteksem från kosmetika.",
    citation: "Schnuch A et al., 2007. Contact Dermatitis.",
    citationUrl: "https://pubmed.ncbi.nlm.nih.gov/17244089/",
  },
  "limonene": {
    display: "Limonene",
    category: "KNOWN_ALLERGEN",
    severity: "CAUTION",
    profileOverrides: { sensitive: "HIGH_RISK" },
    hint: "EU-listed fragrance allergen; oxidises into more potent sensitisers on storage.",
    hint_se: "Doftallergen på EU:s lista; oxiderar vid lagring och blir då en starkare allergen.",
    citation: "EU Regulation 1223/2009 Annex III, entry 67.",
    citationUrl: "https://eur-lex.europa.eu/eli/reg/2009/1223/oj",
  },
  "linalool": {
    display: "Linalool",
    category: "KNOWN_ALLERGEN",
    severity: "CAUTION",
    profileOverrides: { sensitive: "HIGH_RISK" },
    hint: "EU-listed fragrance allergen; oxidation products are common contact allergens.",
    hint_se: "Doftallergen på EU:s lista; oxidationsprodukter är vanliga kontaktallergener.",
    citation: "EU Regulation 1223/2009 Annex III, entry 78.",
    citationUrl: "https://eur-lex.europa.eu/eli/reg/2009/1223/oj",
  },
  "geraniol": {
    display: "Geraniol",
    category: "KNOWN_ALLERGEN",
    severity: "CAUTION",
    profileOverrides: { sensitive: "HIGH_RISK" },
    hint: "EU-listed fragrance allergen.",
    hint_se: "Doftallergen som måste deklareras enligt EU:s kosmetikaförordning.",
    citation: "EU Regulation 1223/2009 Annex III.",
    citationUrl: "https://eur-lex.europa.eu/eli/reg/2009/1223/oj",
  },
  "citronellol": {
    display: "Citronellol",
    category: "KNOWN_ALLERGEN",
    severity: "CAUTION",
    profileOverrides: { sensitive: "HIGH_RISK" },
    hint: "EU-listed fragrance allergen.",
    hint_se: "Doftallergen som måste deklareras enligt EU:s kosmetikaförordning.",
    citation: "EU Regulation 1223/2009 Annex III.",
    citationUrl: "https://eur-lex.europa.eu/eli/reg/2009/1223/oj",
  },
  "eugenol": {
    display: "Eugenol",
    category: "KNOWN_ALLERGEN",
    severity: "CAUTION",
    profileOverrides: { sensitive: "HIGH_RISK" },
    hint: "EU-listed fragrance allergen; potent sensitiser at high concentrations.",
    hint_se: "Doftallergen på EU:s lista; en stark sensibilisator vid höga halter.",
    citation: "EU Regulation 1223/2009 Annex III.",
    citationUrl: "https://eur-lex.europa.eu/eli/reg/2009/1223/oj",
  },
  "cinnamal": {
    display: "Cinnamal",
    category: "KNOWN_ALLERGEN",
    severity: "CAUTION",
    profileOverrides: { sensitive: "HIGH_RISK" },
    hint: "EU-listed fragrance allergen; one of the more common positive patch-test reactions.",
    hint_se: "Doftallergen på EU:s lista; en av de vanligaste positiva reaktionerna i lapptester.",
    citation: "EU Regulation 1223/2009 Annex III.",
    citationUrl: "https://eur-lex.europa.eu/eli/reg/2009/1223/oj",
  },
  "isoeugenol": {
    display: "Isoeugenol",
    category: "KNOWN_ALLERGEN",
    severity: "CAUTION",
    profileOverrides: { sensitive: "HIGH_RISK" },
    hint: "EU-listed fragrance allergen; restricted to 0.02% in leave-on products.",
    hint_se: "Doftallergen på EU:s lista; begränsad till 0,02 % i leave-on-produkter.",
    citation: "EU Regulation 1223/2009 Annex III.",
    citationUrl: "https://eur-lex.europa.eu/eli/reg/2009/1223/oj",
  },
  "hydroxycitronellal": {
    display: "Hydroxycitronellal",
    category: "KNOWN_ALLERGEN",
    severity: "CAUTION",
    profileOverrides: { sensitive: "HIGH_RISK" },
    hint: "EU-listed fragrance allergen.",
    hint_se: "Doftallergen som måste deklareras enligt EU:s kosmetikaförordning.",
    citation: "EU Regulation 1223/2009 Annex III.",
    citationUrl: "https://eur-lex.europa.eu/eli/reg/2009/1223/oj",
  },
  "coumarin": {
    display: "Coumarin",
    category: "KNOWN_ALLERGEN",
    severity: "CAUTION",
    profileOverrides: { sensitive: "HIGH_RISK" },
    hint: "EU-listed fragrance allergen; one of the 26 fragrance materials that must be declared on cosmetics labels above the threshold.",
    hint_se: "Doftallergen på EU:s lista; ett av de 26 doftämnen som måste deklareras på kosmetikaetiketter över tröskelvärdet.",
    citation: "EU Regulation 1223/2009 Annex III.",
    citationUrl: "https://eur-lex.europa.eu/eli/reg/2009/1223/oj",
  },
  "cinnamyl alcohol": {
    display: "Cinnamyl Alcohol",
    category: "KNOWN_ALLERGEN",
    severity: "CAUTION",
    profileOverrides: { sensitive: "HIGH_RISK" },
    hint: "EU-listed fragrance allergen; metabolised to cinnamal in skin and shares its sensitisation potential.",
    hint_se: "Doftallergen på EU:s lista; omvandlas i huden till cinnamal och delar dess allergiframkallande egenskaper.",
    citation: "EU Regulation 1223/2009 Annex III.",
    citationUrl: "https://eur-lex.europa.eu/eli/reg/2009/1223/oj",
  },
  "amyl cinnamal": {
    display: "Amyl Cinnamal",
    category: "KNOWN_ALLERGEN",
    severity: "CAUTION",
    profileOverrides: { sensitive: "HIGH_RISK" },
    hint: "EU-listed fragrance allergen on the original list of 26 declarable substances.",
    hint_se: "Doftallergen på EU:s ursprungliga lista över 26 deklarationspliktiga doftämnen.",
    citation: "EU Regulation 1223/2009 Annex III.",
    citationUrl: "https://eur-lex.europa.eu/eli/reg/2009/1223/oj",
  },
  "benzyl salicylate": {
    display: "Benzyl Salicylate",
    category: "KNOWN_ALLERGEN",
    severity: "CAUTION",
    profileOverrides: { sensitive: "HIGH_RISK" },
    hint: "EU-listed fragrance allergen; SCCS has flagged it as a likely endocrine disruptor and an updated opinion is in progress.",
    hint_se: "Doftallergen på EU:s lista; SCCS har även flaggat ämnet som möjlig hormonstörare och utvärderar det vidare.",
    citation: "EU Regulation 1223/2009 Annex III; SCCS/1654/23.",
    citationUrl: "https://health.ec.europa.eu/scientific-committees/scientific-committee-consumer-safety-sccs_en",
  },
  "benzyl benzoate": {
    display: "Benzyl Benzoate",
    category: "KNOWN_ALLERGEN",
    severity: "CAUTION",
    profileOverrides: { sensitive: "HIGH_RISK" },
    hint: "EU-listed fragrance allergen and one of the 26 declarable substances under the cosmetics regulation.",
    hint_se: "Doftallergen på EU:s lista över 26 deklarationspliktiga ämnen i kosmetikaförordningen.",
    citation: "EU Regulation 1223/2009 Annex III.",
    citationUrl: "https://eur-lex.europa.eu/eli/reg/2009/1223/oj",
  },
  "farnesol": {
    display: "Farnesol",
    category: "KNOWN_ALLERGEN",
    severity: "CAUTION",
    profileOverrides: { sensitive: "HIGH_RISK" },
    hint: "EU-listed fragrance allergen on the declarable list.",
    hint_se: "Doftallergen som måste deklareras enligt EU:s kosmetikaförordning.",
    citation: "EU Regulation 1223/2009 Annex III.",
    citationUrl: "https://eur-lex.europa.eu/eli/reg/2009/1223/oj",
  },
  "methylisothiazolinone": {
    display: "Methylisothiazolinone (MI)",
    category: "HARSH_PRESERVATIVE",
    severity: "HIGH_RISK",
    hint: "Top-five contact allergen of the past decade; banned from EU leave-on products.",
    hint_se: "En av de fem vanligaste kontaktallergenerna det senaste decenniet; förbjuden i EU:s leave-on-produkter.",
    citation: "SCCS/1521/13.",
    citationUrl: "https://health.ec.europa.eu/scientific-committees/scientific-committee-consumer-safety-sccs_en",
  },
  "methylchloroisothiazolinone": {
    display: "Methylchloroisothiazolinone (MCI)",
    category: "HARSH_PRESERVATIVE",
    severity: "HIGH_RISK",
    hint: "Strong sensitiser; banned from EU leave-on products; rinse-off restricted to 0.0015%.",
    hint_se: "Stark sensibilisator; förbjuden i EU:s leave-on-produkter och begränsad till 0,0015 % i avsköljbara produkter.",
    citation: "SCCS/1521/13.",
    citationUrl: "https://health.ec.europa.eu/scientific-committees/scientific-committee-consumer-safety-sccs_en",
  },
  "iodopropynyl butylcarbamate": {
    display: "Iodopropynyl Butylcarbamate (IPBC)",
    category: "HARSH_PRESERVATIVE",
    severity: "CAUTION",
    profileOverrides: { sensitive: "HIGH_RISK", young: "HIGH_RISK", pregnant: "HIGH_RISK" },
    hint: "Iodine-containing preservative; documented contact allergen and EU restricts use in leave-on products and prohibits in products for children under 3.",
    hint_se: "Jodinnehållande konserveringsmedel; dokumenterad kontaktallergen och EU begränsar användningen i leave-on-produkter samt förbjuder den i produkter för barn under 3 år.",
    citation: "SCCS/1495/12; EU Regulation 1223/2009 Annex V, entry 56.",
    citationUrl: "https://health.ec.europa.eu/scientific-committees/scientific-committee-consumer-safety-sccs_en",
    aliases: ["ipbc"],
  },
  "benzisothiazolinone": {
    display: "Benzisothiazolinone (BIT)",
    category: "HARSH_PRESERVATIVE",
    severity: "HIGH_RISK",
    profileOverrides: { sensitive: "HIGH_RISK", young: "HIGH_RISK" },
    hint: "Isothiazolinone-class preservative — same family as MI/MCI; well-documented sensitiser and not authorised for use in EU leave-on or rinse-off cosmetics.",
    hint_se: "Konserveringsmedel av isotiazolinontyp — samma familj som MI/MCI; väldokumenterad sensibilisator och inte godkänt för användning i EU-kosmetika varken som leave-on eller avsköljt.",
    citation: "SCCS/1450/11.",
    citationUrl: "https://health.ec.europa.eu/scientific-committees/scientific-committee-consumer-safety-sccs_en",
    aliases: ["bit"],
  },

  // ─── Phenoxyethanol (concentration-dependent) ───────────────────────────
  "phenoxyethanol": {
    display: "Phenoxyethanol",
    category: "HARSH_PRESERVATIVE",
    severity: "CAUTION",
    profileOverrides: { sensitive: "CAUTION" },
    hint: "Generally safe under the EU 1% cap; flag only when likely to be near the maximum concentration.",
    hint_se: "Generellt säkert under EU:s tak på 1 %; flagga bara om halten sannolikt ligger nära maxgränsen.",
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
    hint_se: "Inhalationsrisk endast i sprayformat; topikal användning på intakt hud bedöms av SCCS som säker.",
    citation: "SCCS/1617/20.",
    citationUrl: "https://health.ec.europa.eu/scientific-committees/scientific-committee-consumer-safety-sccs_en",
  },
  "zinc oxide nano": {
    display: "Zinc Oxide (nano)",
    category: "NANOPARTICLE",
    severity: "CAUTION",
    hint: "Inhalation risk in spray formats only; topical application is considered safe by SCCS.",
    hint_se: "Inhalationsrisk endast i sprayer; topikal användning bedöms av SCCS som säker.",
    citation: "SCCS/1518/13.",
    citationUrl: "https://health.ec.europa.eu/scientific-committees/scientific-committee-consumer-safety-sccs_en",
  },
  "carbon black nano": {
    display: "Carbon Black (nano)",
    category: "NANOPARTICLE",
    severity: "CAUTION",
    profileOverrides: { sensitive: "CAUTION" },
    hint: "IARC classifies carbon black as possibly carcinogenic to humans (Group 2B) on the basis of inhalation exposure. SCCS considers nano carbon black safe in cosmetics up to 10% when not used in spray applications.",
    hint_se: "IARC klassar kimrök som möjligen cancerframkallande för människa (grupp 2B) baserat på inhalationsexponering. SCCS bedömer nano-kimrök som säker i kosmetika upp till 10 % så länge den inte används i sprayer.",
    citation: "SCCS/1515/13; IARC Monographs Vol. 93, 2010.",
    citationUrl: "https://publications.iarc.fr/Book-And-Report-Series/Iarc-Monographs-On-The-Identification-Of-Carcinogenic-Hazards-To-Humans/Carbon-Black-Titanium-Dioxide-And-Talc-2010",
    aliases: ["ci 77266 nano"],
  },

  // ─── Hydroquinone (skin lightener) ──────────────────────────────────────
  "hydroquinone": {
    display: "Hydroquinone",
    category: "CAUTION",
    severity: "HIGH_RISK",
    hint: "Banned from EU cosmetics (allowed only in nail systems and prescription medical products); ochronosis risk.",
    hint_se: "Förbjudet i EU-kosmetika (tillåtet endast i nagelsystem och receptbelagda läkemedel); risk för ochronos vid långvarig användning.",
    citation: "EU Regulation 1223/2009 Annex II, entry 1339.",
    citationUrl: "https://eur-lex.europa.eu/eli/reg/2009/1223/oj",
  },
  "kojic acid": {
    display: "Kojic Acid",
    category: "CAUTION",
    severity: "CAUTION",
    profileOverrides: { sensitive: "HIGH_RISK", pregnant: "CAUTION" },
    hint: "Tyrosinase-inhibitor brightener; SCCS considers it safe at up to 1% in face/hand products but flags contact dermatitis risk and broader sensitisation concerns.",
    hint_se: "Pigmenthämmare; SCCS bedömer den som säker upp till 1 % i ansikts- och handprodukter men varnar för risken för kontakteksem och allergi.",
    citation: "SCCS/1637/21.",
    citationUrl: "https://health.ec.europa.eu/scientific-committees/scientific-committee-consumer-safety-sccs_en",
  },
  "resorcinol": {
    display: "Resorcinol",
    category: "CAUTION",
    severity: "CAUTION",
    profileOverrides: { pregnant: "HIGH_RISK", young: "HIGH_RISK", sensitive: "HIGH_RISK" },
    hint: "Phenolic compound used in hair colour and some anti-acne products; SCCS lists it as a suspected endocrine disruptor (thyroid) and EU restricts use to specified concentrations and product categories.",
    hint_se: "Fenolisk substans som används i hårfärg och vissa aknemedel; SCCS listar den som misstänkt hormonstörare (sköldkörtel) och EU begränsar användningen till specifika halter och produkttyper.",
    citation: "SCCS/1619/20.",
    citationUrl: "https://health.ec.europa.eu/scientific-committees/scientific-committee-consumer-safety-sccs_en",
  },

  // ─── Ethanolamines / acrylamide ─────────────────────────────────────────
  "polyacrylamide": {
    display: "Polyacrylamide",
    category: "CAUTION",
    severity: "CAUTION",
    hint: "Residual acrylamide monomer is a known carcinogen; well-manufactured products keep it under 0.1 ppm.",
    hint_se: "Restmonomeren akrylamid är ett känt cancerframkallande ämne; bra tillverkning håller halten under 0,1 ppm.",
    citation: "SCCNFP/0716/03.",
    citationUrl: "https://health.ec.europa.eu/scientific-committees/scientific-committee-consumer-safety-sccs_en",
  },

  // ─── Coal tar derivatives ───────────────────────────────────────────────
  "coal tar": {
    display: "Coal Tar",
    category: "CAUTION",
    severity: "HIGH_RISK",
    hint: "IARC Group 1 human carcinogen; banned from EU cosmetics.",
    hint_se: "IARC grupp 1 — bevisat cancerframkallande för människa; förbjudet i EU-kosmetika.",
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
    hint_se: "Syntetisk antioxidant; svaga signaler om hormonpåverkan i djurstudier. Allmänt accepterad som säker vid typiska halter på 0,1 % men listas i EWG:s grupp med högre oro.",
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
    hint_se: "Syntetisk antioxidant; klassad av amerikanska NTP som 'rimligen förväntad att vara cancerframkallande för människa'. Obs: detta är antioxidanten BHA, inte beta-hydroxy syra (salicylsyra).",
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
    hint_se: "Kosmetisk talk kan vara kontaminerad med asbest beroende på brytningskälla; seriösa leverantörer testar för asbestfri kvalitet. Undvik lös puder på ansiktet.",
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
