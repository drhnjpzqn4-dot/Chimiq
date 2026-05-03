import { normalizeIngredientName } from "./analysis-cache.js";

/**
 * Curated database of clinically-documented ingredient combinations that are
 * problematic when used together. Symmetric to safe-ingredients.ts (always
 * fine) and risky-ingredients.ts (concerning on their own) — this module
 * covers the case where TWO ingredients become risky in combination even when
 * either is fine on its own.
 *
 * Used by /api/analyze to inject a "MANDATORY CONFLICTS" block into the user
 * message so Claude has a deterministic baseline of conflicts it must surface.
 * Claude is still free to add additional documented conflicts it identifies.
 */

export type ConflictSeverity = "HIGH_RISK" | "CAUTION";
export type SkinProfile = "sensitive" | "young" | "mature" | "pregnant";

export interface ConflictPair {
  /** Stable id for logging/tests, e.g. "retinoid-aha". */
  id: string;
  /** Human-readable pair name, e.g. "Retinoid + AHA". */
  display: string;
  /** Default severity when both sides are present. */
  severity: ConflictSeverity;
  /** Per-skin-profile severity overrides. */
  profileOverrides?: Partial<Record<SkinProfile, ConflictSeverity>>;
  /** 1-2 sentence hint the model uses as a starting point for its explanation. */
  hint: string;
  /** Swedish translation of the hint. */
  hint_se: string;
  /** Suggested citation. */
  citation: string;
  citationUrl: string;
  /**
   * Members of side A. Each entry will be normalised via
   * `normalizeIngredientName` at module load.
   */
  sideA: string[];
  /** Members of side B. */
  sideB: string[];
  /**
   * If true, also detect this conflict when both sides appear in the SAME
   * product (over-formulation). Default false (cross-product only).
   */
  applyWithinProduct?: boolean;
}

/**
 * Raw curated conflict database. Each entry's `sideA` / `sideB` lists are
 * normalised at module load and stored in `NORMALIZED_CONFLICTS`.
 */
const RAW_CONFLICTS: ConflictPair[] = [
  // ─── Retinoid + AHA ─────────────────────────────────────────────────────
  {
    id: "retinoid-aha",
    display: "Retinoid + AHA",
    severity: "HIGH_RISK",
    profileOverrides: { sensitive: "HIGH_RISK", mature: "HIGH_RISK", pregnant: "HIGH_RISK" },
    hint: "Layering an alpha-hydroxy acid with a retinoid causes acute barrier disruption: the AHA strips the stratum corneum at low pH while the retinoid drives accelerated turnover, producing erythema, peeling, and prolonged sensitivity. Use on alternating nights at most, or move one to morning use with strict SPF.",
    hint_se: "Att lägga en alfa-hydroxisyra (AHA) ovanpå en retinoid stör hudbarriären akut: AHA:n löser upp hornlagret vid lågt pH samtidigt som retinoiden driver upp cellnybildningen, vilket ger rodnad, fjällning och långvarig känslighet. Använd högst varannan kväll, eller flytta en av dem till morgonen med strikt SPF.",
    citation: "Mukherjee S et al., 2006. Clinical Interventions in Aging.",
    citationUrl: "https://pubmed.ncbi.nlm.nih.gov/18046911/",
    sideA: ["retinol", "retinaldehyde", "retinyl palmitate", "retinyl acetate", "tretinoin", "adapalene", "trifarotene", "isotretinoin"],
    sideB: ["glycolic acid", "lactic acid", "mandelic acid", "tartaric acid", "malic acid"],
  },
  // ─── Retinoid + BHA (salicylic) ─────────────────────────────────────────
  {
    id: "retinoid-bha",
    display: "Retinoid + BHA (Salicylic Acid)",
    severity: "HIGH_RISK",
    profileOverrides: { sensitive: "HIGH_RISK", pregnant: "HIGH_RISK" },
    hint: "Combining a retinoid with salicylic acid in the same routine compounds exfoliation: salicylic acid penetrates the sebaceous follicle while the retinoid accelerates cell turnover, producing flaking, redness, and barrier breakdown. Pregnancy adds an additional retinoid contraindication.",
    hint_se: "Att kombinera en retinoid med salicylsyra i samma rutin förstärker exfolieringen: salicylsyran tränger ner i talgkörteln medan retinoiden snabbar upp cellnybildningen, vilket ger fjällning, rodnad och nedbruten hudbarriär. Under graviditet är retinoiden dessutom helt kontraindicerad.",
    citation: "Kornhauser A et al., 2010. Clinical, Cosmetic and Investigational Dermatology.",
    citationUrl: "https://pubmed.ncbi.nlm.nih.gov/21437068/",
    sideA: ["retinol", "retinaldehyde", "retinyl palmitate", "retinyl acetate", "tretinoin", "adapalene", "trifarotene", "isotretinoin"],
    sideB: ["salicylic acid"],
  },
  // ─── Retinoid + Benzoyl Peroxide ────────────────────────────────────────
  {
    id: "retinoid-bpo",
    display: "Retinoid + Benzoyl Peroxide",
    severity: "HIGH_RISK",
    hint: "Benzoyl peroxide oxidises tretinoin and retinol when applied together, deactivating up to 50%+ of the retinoid and producing extra free-radical irritation. The exception is fixed-combination prescription products (e.g. adapalene+BPO Epiduo) which are formulated for stability — but mixing two separate over-the-counter products is not the same.",
    hint_se: "Bensoylperoxid oxiderar tretinoin och retinol när de appliceras tillsammans, vilket inaktiverar 50 % eller mer av retinoiden och ger extra fri-radikalirritation. Undantaget är receptbelagda fasta kombinationer (t.ex. adapalen+BPO Epiduo) som är formulerade för stabilitet — att blanda två separata receptfria produkter är inte samma sak.",
    citation: "Martin B et al., 1998. British Journal of Dermatology.",
    citationUrl: "https://pubmed.ncbi.nlm.nih.gov/9602853/",
    sideA: ["retinol", "retinaldehyde", "retinyl palmitate", "retinyl acetate", "tretinoin", "isotretinoin"],
    sideB: ["benzoyl peroxide"],
  },
  // ─── Vitamin C + Copper Peptides ────────────────────────────────────────
  {
    id: "vitc-copper-peptide",
    display: "Vitamin C + Copper Peptides",
    severity: "CAUTION",
    hint: "Ascorbic acid reduces copper from Cu2+ to Cu+ and chelates the peptide, deactivating both ingredients. You waste two of the most expensive actives in your routine. Alternate them (one AM, one PM) or use on different days.",
    hint_se: "Askorbinsyra reducerar koppar från Cu2+ till Cu+ och kelaterar peptiden, vilket inaktiverar bägge aktiva ingredienser. Du slösar bort två av de dyraste ingredienserna i din rutin. Använd dem turvis (en på morgonen, en på kvällen) eller olika dagar.",
    citation: "Pickart L et al., 2015. Biomed Res Int.",
    citationUrl: "https://pubmed.ncbi.nlm.nih.gov/26106608/",
    sideA: ["ascorbic acid", "l ascorbic acid", "sodium ascorbyl phosphate", "magnesium ascorbyl phosphate", "ascorbyl glucoside", "tetrahexyldecyl ascorbate", "3 o ethyl ascorbic acid", "ascorbyl palmitate"],
    sideB: ["copper tripeptide 1", "copper peptide", "copper peptides", "ghk cu", "copper pca"],
  },
  // ─── AHA/BHA + Copper Peptides ──────────────────────────────────────────
  {
    id: "exfoliant-copper-peptide",
    display: "Exfoliant Acid + Copper Peptides",
    severity: "CAUTION",
    hint: "Copper peptides require near-neutral pH (5-7) to remain stable. AHA and BHA exfoliants formulate at pH 3-4, which disassembles the peptide-copper complex and destroys efficacy. Apply at separate times of day if you want to use both.",
    hint_se: "Kopparpeptider kräver nära-neutralt pH (5–7) för att förbli stabila. AHA- och BHA-syror formuleras vid pH 3–4, vilket bryter upp peptid-koppar-komplexet och förstör effekten. Applicera dem vid olika tider på dygnet om du vill använda båda.",
    citation: "Pickart L, 2008. Journal of Biomaterials Science, Polymer Edition.",
    citationUrl: "https://pubmed.ncbi.nlm.nih.gov/18534063/",
    sideA: ["glycolic acid", "lactic acid", "mandelic acid", "salicylic acid", "tartaric acid", "malic acid"],
    sideB: ["copper tripeptide 1", "copper peptide", "copper peptides", "ghk cu", "copper pca"],
  },
  // ─── L-Ascorbic Acid + AHA/BHA ──────────────────────────────────────────
  {
    id: "vitc-acid-stack",
    display: "Vitamin C (L-AA) + Exfoliant Acid",
    severity: "CAUTION",
    profileOverrides: { sensitive: "HIGH_RISK" },
    hint: "Pure L-ascorbic acid is already formulated at pH ~3.5. Stacking it with a separate AHA or BHA product compounds the low-pH irritation and can cause stinging, redness, and barrier disruption — especially on sensitive skin. Use them at opposite ends of the day.",
    hint_se: "Ren L-askorbinsyra är redan formulerad vid pH ca 3,5. Att stapla den med en separat AHA- eller BHA-produkt förstärker den låga pH-irritationen och kan ge sveda, rodnad och nedbruten hudbarriär — särskilt på känslig hud. Använd dem i motsatta ändar av dygnet.",
    citation: "Pinnell SR et al., 2001. Dermatologic Surgery.",
    citationUrl: "https://pubmed.ncbi.nlm.nih.gov/11231246/",
    sideA: ["ascorbic acid", "l ascorbic acid"],
    sideB: ["glycolic acid", "lactic acid", "mandelic acid", "salicylic acid", "tartaric acid", "malic acid"],
  },
  // ─── Hydroquinone + Benzoyl Peroxide ────────────────────────────────────
  {
    id: "hydroquinone-bpo",
    display: "Hydroquinone + Benzoyl Peroxide",
    severity: "HIGH_RISK",
    hint: "When applied together, benzoyl peroxide oxidises hydroquinone and forms a temporary brown-black stain on the skin (and on clothing/towels). The combination also dramatically increases irritation. Use them at separate times if both are clinically indicated.",
    hint_se: "När de appliceras tillsammans oxiderar bensoylperoxid hydrokinonet och bildar en tillfällig brunsvart fläck på huden (och på kläder/handdukar). Kombinationen ökar också irritationen kraftigt. Använd dem vid olika tider om båda är kliniskt motiverade.",
    citation: "Briganti S et al., 2003. Pigment Cell Research.",
    citationUrl: "https://pubmed.ncbi.nlm.nih.gov/12950732/",
    sideA: ["hydroquinone"],
    sideB: ["benzoyl peroxide"],
  },
  // ─── Hydroquinone + Retinoid (over-aggressive) ──────────────────────────
  {
    id: "hydroquinone-retinoid",
    display: "Hydroquinone + Retinoid",
    severity: "CAUTION",
    profileOverrides: { sensitive: "HIGH_RISK", mature: "HIGH_RISK", pregnant: "HIGH_RISK" },
    hint: "This pairing IS used therapeutically (Kligman formula) for melasma — but only short-term and under dermatological supervision. Outside that context, daily use causes severe irritation, paradoxical post-inflammatory hyperpigmentation, and ochronosis risk with prolonged hydroquinone exposure. Pregnancy contraindicates retinoids absolutely.",
    hint_se: "Den här kombinationen ANVÄNDS terapeutiskt (Kligmans formel) mot melasma — men bara kortvarigt och under hudläkares uppsikt. Utanför det sammanhanget ger daglig användning kraftig irritation, paradoxal hyperpigmentering efter inflammation och risk för ochronos vid långvarig hydrokinonexponering. Under graviditet är retinoider helt kontraindicerade.",
    citation: "Kligman AM, Willis I, 1975. Archives of Dermatology.",
    citationUrl: "https://pubmed.ncbi.nlm.nih.gov/1138562/",
    sideA: ["hydroquinone"],
    sideB: ["retinol", "retinaldehyde", "tretinoin", "adapalene", "isotretinoin"],
  },
  // ─── Formaldehyde Releaser + Ethanolamine (nitrosamine formation) ───────
  {
    id: "formaldehyde-ethanolamine",
    display: "Formaldehyde Releaser + Ethanolamine",
    severity: "HIGH_RISK",
    profileOverrides: { sensitive: "HIGH_RISK", young: "HIGH_RISK", pregnant: "HIGH_RISK" },
    hint: "Formaldehyde donors (DMDM hydantoin, diazolidinyl/imidazolidinyl urea, quaternium-15, bronopol) react with secondary amines (DEA, TEA, MEA, cocamide DEA, lauramide DEA) to form nitrosamines — including N-nitrosodiethanolamine (NDELA), an IARC Group 2B probable carcinogen that absorbs through skin. This combination should be avoided.",
    hint_se: "Formaldehydfrigörare (DMDM-hydantoin, diazolidinyl/imidazolidinylurea, quaternium-15, bronopol) reagerar med sekundära aminer (DEA, TEA, MEA, kokamid-DEA, lauramid-DEA) och bildar nitrosaminer — bland annat N-nitrosodietanolamin (NDELA), ett ämne som IARC klassar som möjligen cancerframkallande (grupp 2B) och som tas upp genom huden. Den här kombinationen bör undvikas.",
    citation: "FDA, 2024. Guidance: Nitrosamines in Cosmetics.",
    citationUrl: "https://www.fda.gov/cosmetics/cosmetic-ingredients/nitrosamines-cosmetics",
    sideA: ["dmdm hydantoin", "diazolidinyl urea", "imidazolidinyl urea", "quaternium 15", "bronopol", "2 bromo 2 nitropropane 1 3 diol"],
    sideB: ["triethanolamine", "diethanolamine", "monoethanolamine", "cocamide dea", "lauramide dea", "linoleamide dea", "oleamide dea", "tea"],
    applyWithinProduct: true,
  },
  // ─── Avobenzone + Benzoyl Peroxide ──────────────────────────────────────
  {
    id: "avobenzone-bpo",
    display: "Avobenzone + Benzoyl Peroxide",
    severity: "CAUTION",
    hint: "Benzoyl peroxide rapidly degrades avobenzone, dropping UVA protection within minutes of co-application. If you need both, use a sunscreen that uses photo-stabilised filters (e.g. Tinosorb, mineral-only) or apply BPO at night and sunscreen in the morning — never on the same skin at the same time.",
    hint_se: "Bensoylperoxid bryter snabbt ned avobenzon, vilket sänker UVA-skyddet inom minuter efter samtidig applicering. Behöver du båda — välj ett solskydd med fotostabiliserade filter (t.ex. Tinosorb eller enbart mineralfilter), eller använd BPO på kvällen och solskydd på morgonen — aldrig på samma hud samtidigt.",
    citation: "Hanson KM et al., 2006. Free Radical Biology and Medicine.",
    citationUrl: "https://pubmed.ncbi.nlm.nih.gov/16386645/",
    sideA: ["butyl methoxydibenzoylmethane", "avobenzone"],
    sideB: ["benzoyl peroxide"],
  },
  // ─── Iron Oxides + Vitamin C ────────────────────────────────────────────
  {
    id: "iron-vitc",
    display: "Iron Oxide Pigments + Vitamin C",
    severity: "CAUTION",
    hint: "Iron ions catalyse the oxidation of L-ascorbic acid: the Vitamin C browns to dehydroascorbic acid and the iron-pigmented makeup darkens. Cosmetic effect is visible within hours. Use Vitamin C in the AM serum step, then let it absorb fully before applying iron-pigmented foundation — or switch to a stable Vitamin C ester.",
    hint_se: "Järnjoner katalyserar oxidationen av L-askorbinsyra: C-vitaminet brunnar till dehydroaskorbinsyra och järnpigmenterad makeup mörknar. Effekten syns inom några timmar. Använd C-vitamin i serumsteget på morgonen och låt det absorberas helt innan du lägger på järnpigmenterad foundation — eller byt till en stabil C-vitaminester.",
    citation: "Caritá AC et al., 2020. Free Radical Biology and Medicine.",
    citationUrl: "https://pubmed.ncbi.nlm.nih.gov/31740339/",
    sideA: ["iron oxides", "ci 77491", "ci 77492", "ci 77499"],
    sideB: ["ascorbic acid", "l ascorbic acid"],
  },
  // ─── Salicylic Acid + Retinoid (within product over-formulation) ────────
  {
    id: "salicylic-retinoid-intra",
    display: "Salicylic Acid + Retinoid (same product)",
    severity: "HIGH_RISK",
    profileOverrides: { sensitive: "HIGH_RISK", pregnant: "HIGH_RISK" },
    hint: "Some 'anti-acne' products combine salicylic acid with adapalene or retinol in the same formula. While clinically possible under supervision, this stack delivers two strong exfoliants in one application and frequently triggers irritant contact dermatitis in real-world use.",
    hint_se: "Vissa 'aknemedel' kombinerar salicylsyra med adapalen eller retinol i samma formel. Det är kliniskt möjligt under uppsikt, men kombinationen levererar två starka exfolianter i en applikation och utlöser ofta irritativt kontakteksem i verkligheten.",
    citation: "Latter G et al., 2019. Pharmaceutics.",
    citationUrl: "https://pubmed.ncbi.nlm.nih.gov/31652645/",
    sideA: ["salicylic acid"],
    sideB: ["retinol", "retinaldehyde", "tretinoin", "adapalene"],
    applyWithinProduct: true,
  },
  // ─── Vitamin C (L-AA) + Niacinamide ─────────────────────────────────────
  {
    id: "niacinamide-vitc-laa",
    display: "Niacinamide + Vitamin C (L-AA)",
    severity: "CAUTION",
    profileOverrides: { sensitive: "CAUTION" },
    hint: "Layering pure L-ascorbic acid (low pH ~3.5) directly with high-dose niacinamide can produce a transient nicotinic acid flush in some users — temporary redness and warmth that fades within 30 minutes. The historic 'cancels each other out' claim has been largely debunked at modern formulation pH, but the flush itself is real on reactive skin. Apply with several minutes between products, or use them in different routines if you flush easily.",
    hint_se: "Att lägga ren L-askorbinsyra (lågt pH ca 3,5) direkt på niacinamid i hög halt kan ge en kortvarig 'niacinflush' hos vissa — tillfällig rodnad och värme som klingar av inom 30 minuter. Den gamla idén att de 'tar ut varandra' har till stor del avfärdats vid moderna formuleringar, men flushen är verklig på reaktiv hud. Vänta några minuter mellan produkterna eller använd dem i olika rutiner om du rodnar lätt.",
    citation: "Drealos ZD, 2008. Cosmeceuticals (2nd ed.); Wohlrab J, Kreft D, 2014. Skin Pharmacol Physiol.",
    citationUrl: "https://pubmed.ncbi.nlm.nih.gov/24993939/",
    sideA: ["niacinamide"],
    sideB: ["ascorbic acid", "l ascorbic acid"],
  },
  // ─── Retinoid + Vitamin C (L-AA) ────────────────────────────────────────
  {
    id: "retinoid-vitc-laa",
    display: "Retinoid + Vitamin C (L-AA)",
    severity: "CAUTION",
    profileOverrides: { sensitive: "HIGH_RISK", mature: "CAUTION" },
    hint: "Pure L-ascorbic acid is stable at pH ~3.5; retinoids work best around pH 5.5-6. Layering them shifts both away from their optimal pH, reduces the activity of each, and stacks irritation on the same skin. Standard advice: Vitamin C in the AM with SPF, retinoid at night.",
    hint_se: "Ren L-askorbinsyra är stabil vid pH ca 3,5; retinoider fungerar bäst vid pH 5,5–6. Att lägga dem ovanpå varandra flyttar bägge från sitt optimala pH, sänker effekten av båda och staplar irritation på samma hud. Standardtipset: C-vitamin på morgonen med SPF, retinoid på kvällen.",
    citation: "Pinnell SR et al., 2001. Dermatologic Surgery; Mukherjee S et al., 2006. Clin Interv Aging.",
    citationUrl: "https://pubmed.ncbi.nlm.nih.gov/11231246/",
    sideA: ["retinol", "retinaldehyde", "retinyl palmitate", "retinyl acetate", "tretinoin", "adapalene"],
    sideB: ["ascorbic acid", "l ascorbic acid"],
  },
  // ─── AHA + BHA stacked exfoliants ───────────────────────────────────────
  {
    id: "aha-bha-stack",
    display: "AHA + BHA (Layered Exfoliants)",
    severity: "CAUTION",
    profileOverrides: { sensitive: "HIGH_RISK", young: "HIGH_RISK", mature: "CAUTION" },
    hint: "Layering an alpha-hydroxy acid (glycolic, lactic, mandelic) with a beta-hydroxy acid (salicylic) in the same routine doubles the exfoliation load on the stratum corneum and frequently causes redness, stinging, and barrier disruption. Use them on alternating nights instead.",
    hint_se: "Att lägga en alfa-hydroxisyra (glykol-, mjölk-, mandelsyra) ovanpå en beta-hydroxisyra (salicylsyra) i samma rutin dubblar exfolieringen av hornlagret och ger ofta rodnad, sveda och nedbruten hudbarriär. Använd dem varannan kväll i stället.",
    citation: "Kornhauser A, Coelho SG, Hearing VJ. 2010. Clinical, Cosmetic and Investigational Dermatology.",
    citationUrl: "https://pubmed.ncbi.nlm.nih.gov/21437068/",
    sideA: ["glycolic acid", "lactic acid", "mandelic acid", "tartaric acid", "malic acid"],
    sideB: ["salicylic acid"],
  },
  // ─── Double retinoid (two strong actives stacked) ──────────────────────
  {
    id: "double-retinoid",
    display: "Double Retinoid (two retinoids stacked)",
    severity: "HIGH_RISK",
    profileOverrides: { sensitive: "HIGH_RISK", young: "HIGH_RISK", mature: "HIGH_RISK", pregnant: "HIGH_RISK" },
    hint: "Stacking two separate retinoid products (e.g. tretinoin + adapalene, or retinol serum + retinal cream) does not improve results — receptor saturation is reached at single-product doses. It does, however, multiply irritation, peeling, and barrier damage. Pick one retinoid and use it consistently.",
    hint_se: "Att stapla två separata retinoidprodukter (t.ex. tretinoin + adapalen, eller retinolserum + retinalkräm) ger inga bättre resultat — receptormättnaden uppnås redan med en enskild produkt. Däremot mångdubblas irritation, fjällning och barriärskada. Välj en retinoid och använd den konsekvent.",
    citation: "Mukherjee S et al., 2006. Clinical Interventions in Aging.",
    citationUrl: "https://pubmed.ncbi.nlm.nih.gov/18046911/",
    sideA: ["retinol", "retinaldehyde", "retinyl palmitate", "retinyl acetate"],
    sideB: ["tretinoin", "adapalene", "trifarotene", "isotretinoin"],
    applyWithinProduct: true,
  },
  // ─── Niacinamide + Copper Peptides ──────────────────────────────────────
  {
    id: "niacinamide-copper-peptide",
    display: "Niacinamide + Copper Peptides",
    severity: "CAUTION",
    hint: "Niacinamide can chelate copper ions, weakening the GHK-Cu peptide complex and reducing its activity. The interaction is concentration-dependent and only meaningful when both are used at active levels in the same routine. Apply at separate times of day to keep both efficacious.",
    hint_se: "Niacinamid kan kelatera kopparjoner och försvaga GHK-Cu-peptidkomplexet, vilket sänker dess effekt. Interaktionen är koncentrationsberoende och betydelsefull bara när båda används i aktiva halter i samma rutin. Använd dem vid olika tider på dygnet för att bibehålla effekten av båda.",
    citation: "Pickart L, Margolina A. 2018. Int J Mol Sci.",
    citationUrl: "https://pubmed.ncbi.nlm.nih.gov/30021979/",
    sideA: ["niacinamide"],
    sideB: ["copper tripeptide 1", "copper peptide", "copper peptides", "ghk cu", "copper pca"],
  },
  // ─── Vitamin C + Zinc Oxide pigments ────────────────────────────────────
  {
    id: "vitc-zinc-oxide",
    display: "Vitamin C (L-AA) + Zinc Oxide",
    severity: "CAUTION",
    hint: "Zinc oxide is amphoteric and can catalyse the oxidation of L-ascorbic acid, browning the Vitamin C and reducing the effective dose of both ingredients. Apply Vitamin C first, let it absorb fully (5+ minutes), then apply mineral SPF — or pick a stable Vitamin C ester (sodium ascorbyl phosphate, ascorbyl glucoside, MAP).",
    hint_se: "Zinkoxid är amfotert och kan katalysera oxidationen av L-askorbinsyra, vilket brunnar C-vitaminet och sänker den verksamma dosen av båda ingredienser. Applicera C-vitaminet först, låt det absorberas helt (minst 5 minuter), och lägg sedan på mineralsolskyddet — eller välj en stabil C-vitaminester (natriumaskorbylfosfat, askorbylglukosid, MAP).",
    citation: "Caritá AC et al., 2020. Free Radical Biology and Medicine.",
    citationUrl: "https://pubmed.ncbi.nlm.nih.gov/31740339/",
    sideA: ["zinc oxide", "zinc oxide nano"],
    sideB: ["ascorbic acid", "l ascorbic acid"],
  },
  // ─── Essential Oils + Retinoid ──────────────────────────────────────────
  {
    id: "essential-oil-retinoid",
    display: "Essential Oils + Retinoid",
    severity: "CAUTION",
    profileOverrides: { sensitive: "HIGH_RISK", young: "HIGH_RISK", pregnant: "HIGH_RISK" },
    hint: "Many essential oils (citrus, lavender, peppermint, ylang-ylang) are documented contact allergens and irritants. On retinised skin — already thinner stratum corneum — irritation and sensitisation reactions are amplified. If you are using a retinoid, prefer fragrance-free formulas in the rest of your routine.",
    hint_se: "Många eteriska oljor (citrus, lavendel, pepparmynta, ylang-ylang) är dokumenterade kontaktallergener och irriterande ämnen. På retinoidbehandlad hud — där hornlagret redan är tunnare — förstärks irritation och sensibilisering. Använder du en retinoid är det bäst att välja parfymfria formler i resten av rutinen.",
    citation: "de Groot AC, Schmidt E. 2016. Contact Dermatitis.",
    citationUrl: "https://pubmed.ncbi.nlm.nih.gov/?term=essential+oils+contact+dermatitis+retinoid",
    sideA: ["retinol", "retinaldehyde", "retinyl palmitate", "tretinoin", "adapalene"],
    sideB: ["lavandula angustifolia oil", "citrus aurantium dulcis peel oil", "mentha piperita oil", "cananga odorata flower oil", "eucalyptus globulus leaf oil", "rosmarinus officinalis leaf oil", "melaleuca alternifolia leaf oil", "cinnamomum cassia leaf oil"],
  },
  // ─── Fragrance + Retinoid ───────────────────────────────────────────────
  {
    id: "fragrance-retinoid",
    display: "Fragrance + Retinoid",
    severity: "CAUTION",
    profileOverrides: { sensitive: "HIGH_RISK", young: "HIGH_RISK" },
    hint: "Retinoids thin the stratum corneum, which lets fragrance allergens penetrate more deeply and react more strongly. Stacking fragrance with a retinoid is a leading cause of cosmetic contact dermatitis in real-world use. If you use a retinoid, switch the rest of your routine to fragrance-free.",
    hint_se: "Retinoider gör hornlagret tunnare, vilket gör att doftallergener tränger in djupare och reagerar starkare. Att kombinera parfym med en retinoid är en av de vanligaste orsakerna till kontakteksem i hudvård. Använder du en retinoid — byt resten av rutinen till parfymfritt.",
    citation: "Schnuch A et al., 2007. Contact Dermatitis.",
    citationUrl: "https://pubmed.ncbi.nlm.nih.gov/17244089/",
    sideA: ["retinol", "retinaldehyde", "retinyl palmitate", "tretinoin", "adapalene"],
    sideB: ["parfum", "fragrance"],
  },
  // ─── BPO + AHA ──────────────────────────────────────────────────────────
  {
    id: "bpo-aha",
    display: "Benzoyl Peroxide + AHA",
    severity: "CAUTION",
    profileOverrides: { sensitive: "HIGH_RISK", young: "HIGH_RISK" },
    hint: "Benzoyl peroxide oxidises the skin while AHAs strip the stratum corneum. Used together they multiply dryness, peeling, and post-inflammatory hyperpigmentation in darker skin tones. Use BPO and AHAs on different days, or BPO in the AM and AHA in the PM with strict moisturiser/SPF support.",
    hint_se: "Bensoylperoxid oxiderar huden samtidigt som AHA löser upp hornlagret. Tillsammans mångdubblar de torrhet, fjällning och risken för hyperpigmentering efter inflammation, särskilt i mörkare hudtoner. Använd BPO och AHA olika dagar, eller BPO på morgonen och AHA på kvällen med strikt återfuktning och SPF.",
    citation: "Webster GF, 2002. Cutis.",
    citationUrl: "https://pubmed.ncbi.nlm.nih.gov/?term=benzoyl+peroxide+alpha+hydroxy+acid+irritation",
    sideA: ["benzoyl peroxide"],
    sideB: ["glycolic acid", "lactic acid", "mandelic acid"],
  },
  // ─── Hydroquinone + AHA ─────────────────────────────────────────────────
  {
    id: "hydroquinone-aha",
    display: "Hydroquinone + AHA",
    severity: "CAUTION",
    profileOverrides: { sensitive: "HIGH_RISK", mature: "CAUTION", pregnant: "HIGH_RISK" },
    hint: "Both ingredients independently irritate the stratum corneum; layered together they frequently produce contact dermatitis and paradoxical post-inflammatory hyperpigmentation, especially on Fitzpatrick IV-VI skin. Hydroquinone is also banned in EU cosmetics. If a dermatologist has prescribed both, use them at separate times of day with a strong moisturiser between.",
    hint_se: "Båda ingredienserna irriterar hornlagret var för sig; tillsammans utlöser de ofta kontakteksem och paradoxal hyperpigmentering efter inflammation, särskilt på Fitzpatrick IV–VI. Hydrokinon är dessutom förbjudet i EU-kosmetika. Om en hudläkare har skrivit ut båda — använd dem vid olika tider på dygnet med en kraftig fuktkräm emellan.",
    citation: "Briganti S, Camera E, Picardo M. 2003. Pigment Cell Research.",
    citationUrl: "https://pubmed.ncbi.nlm.nih.gov/12950732/",
    sideA: ["hydroquinone"],
    sideB: ["glycolic acid", "lactic acid", "mandelic acid"],
  },
  // ─── Fragrance + Exfoliant Acid ─────────────────────────────────────────
  {
    id: "fragrance-acid",
    display: "Fragrance + Exfoliant Acid",
    severity: "CAUTION",
    profileOverrides: { sensitive: "HIGH_RISK", young: "HIGH_RISK" },
    hint: "AHAs and BHAs disrupt the stratum corneum, which lets fragrance allergens penetrate more deeply and sensitise more easily. Fragrance is the #1 cause of cosmetic contact dermatitis on intact skin — on exfoliated skin the risk multiplies. Pair acids with fragrance-free moisturisers and serums.",
    hint_se: "AHA och BHA bryter ner hornlagret, vilket gör att doftallergener tränger djupare in och sensibiliserar lättare. Parfym är den vanligaste orsaken till kontakteksem på intakt hud — på exfolierad hud mångdubblas risken. Para syror med parfymfria fuktkrämer och serum.",
    citation: "Schnuch A et al., 2007. Contact Dermatitis.",
    citationUrl: "https://pubmed.ncbi.nlm.nih.gov/17244089/",
    sideA: ["glycolic acid", "lactic acid", "mandelic acid", "salicylic acid"],
    sideB: ["parfum", "fragrance"],
  },
  // ─── Drying Alcohol + Retinoid ──────────────────────────────────────────
  {
    id: "drying-alcohol-retinoid",
    display: "Drying Alcohol + Retinoid",
    severity: "CAUTION",
    profileOverrides: { sensitive: "HIGH_RISK", mature: "HIGH_RISK", young: "HIGH_RISK" },
    hint: "Volatile alcohol (alcohol denat., SD alcohol 40) at high concentration accelerates trans-epidermal water loss and disrupts the stratum corneum. Stacking it with a retinoid — which is already thinning the stratum corneum — produces a barrier 'double-hit' that drives prolonged dryness and flaking.",
    hint_se: "Flyktig alkohol (alcohol denat., SD alkohol 40) i hög halt ökar förlusten av vatten genom huden och stör hornlagret. Att stapla den med en retinoid — som redan tunnar ut hornlagret — ger en 'dubbel träff' mot barriären som driver långvarig torrhet och fjällning.",
    citation: "Lodén M, Maibach HI. 2000. Dry Skin and Moisturizers.",
    citationUrl: "https://www.routledge.com/Dry-Skin-and-Moisturizers/Loden-Maibach/p/book/9780849375200",
    sideA: ["alcohol denat", "sd alcohol 40"],
    sideB: ["retinol", "retinaldehyde", "tretinoin", "adapalene"],
  },
  // ─── SLS + Retinoid ─────────────────────────────────────────────────────
  {
    id: "sls-retinoid",
    display: "Sodium Lauryl Sulfate + Retinoid",
    severity: "CAUTION",
    profileOverrides: { sensitive: "HIGH_RISK", mature: "HIGH_RISK", young: "HIGH_RISK" },
    hint: "An SLS-based cleanser already strips the stratum corneum lipids; adding a retinoid on top accelerates barrier breakdown, increases trans-epidermal water loss, and amplifies retinoid stinging on application. Switch to a non-sulfate cream or gentle glucoside cleanser when starting a retinoid.",
    hint_se: "En rengöring baserad på SLS sliter redan på hornlagrets lipider; att lägga en retinoid ovanpå snabbar upp barriärnedbrytningen, ökar vattenförlusten och förstärker retinoidens svedande känsla vid applicering. Byt till en icke-sulfatbaserad kräm eller mild glukosidrengöring när du börjar med retinoid.",
    citation: "Bondi CAM et al., 2015. Environ Health Insights.",
    citationUrl: "https://pubmed.ncbi.nlm.nih.gov/26617461/",
    sideA: ["sodium lauryl sulfate"],
    sideB: ["retinol", "retinaldehyde", "tretinoin", "adapalene"],
  },
  // ─── Fragrance + BPO ────────────────────────────────────────────────────
  {
    id: "fragrance-bpo",
    display: "Fragrance + Benzoyl Peroxide",
    severity: "CAUTION",
    profileOverrides: { sensitive: "HIGH_RISK", young: "HIGH_RISK" },
    hint: "Benzoyl peroxide is itself an oxidiser and irritant; layering perfume on top adds a known contact allergen to already-irritated skin, raising the chance of sensitisation. If you are using BPO for acne, choose fragrance-free moisturisers and SPF.",
    hint_se: "Bensoylperoxid är i sig oxiderande och irriterande; att lägga parfym ovanpå tillför en känd kontaktallergen till redan irriterad hud, vilket ökar risken för sensibilisering. Använder du BPO mot akne — välj parfymfria fuktkrämer och solskydd.",
    citation: "Schnuch A et al., 2007. Contact Dermatitis.",
    citationUrl: "https://pubmed.ncbi.nlm.nih.gov/17244089/",
    sideA: ["benzoyl peroxide"],
    sideB: ["parfum", "fragrance"],
  },
  // ─── Essential Oils + Exfoliant Acid ────────────────────────────────────
  {
    id: "essential-oil-acid",
    display: "Essential Oils + Exfoliant Acid",
    severity: "CAUTION",
    profileOverrides: { sensitive: "HIGH_RISK", young: "HIGH_RISK" },
    hint: "AHAs and BHAs lower the stratum corneum's barrier function. Essential oils carry well-documented allergens (limonene, linalool, eugenol, citrus furocoumarins) that penetrate exfoliated skin more easily and can trigger contact dermatitis or phototoxicity. Pair acids with fragrance-free, essential-oil-free formulas.",
    hint_se: "AHA och BHA sänker hornlagrets barriärfunktion. Eteriska oljor bär på väldokumenterade allergener (limonen, linalool, eugenol, citrusfurokumariner) som lättare tränger in i exfolierad hud och kan utlösa kontakteksem eller fototoxiska reaktioner. Para syror med parfym- och eterisk-olja-fria formler.",
    citation: "de Groot AC, Schmidt E. 2016. Contact Dermatitis.",
    citationUrl: "https://pubmed.ncbi.nlm.nih.gov/?term=essential+oils+contact+dermatitis",
    sideA: ["glycolic acid", "lactic acid", "mandelic acid", "salicylic acid"],
    sideB: ["lavandula angustifolia oil", "citrus aurantium dulcis peel oil", "mentha piperita oil", "cananga odorata flower oil", "eucalyptus globulus leaf oil", "rosmarinus officinalis leaf oil", "melaleuca alternifolia leaf oil"],
  },
  // ─── Essential Oils + BPO ───────────────────────────────────────────────
  {
    id: "essential-oil-bpo",
    display: "Essential Oils + Benzoyl Peroxide",
    severity: "CAUTION",
    profileOverrides: { sensitive: "HIGH_RISK", young: "HIGH_RISK" },
    hint: "Benzoyl peroxide already irritates and oxidises skin lipids; adding fragrance components from essential oils — known allergens such as limonene, linalool, citral — to that environment significantly raises the chance of irritant or allergic contact dermatitis. Keep essential-oil-heavy products out of an active BPO routine.",
    hint_se: "Bensoylperoxid irriterar redan och oxiderar hudens lipider; att tillföra doftämnen från eteriska oljor — kända allergener som limonen, linalool och citral — i den miljön ökar markant risken för irritativt eller allergiskt kontakteksem. Håll produkter med mycket eteriska oljor borta från en aktiv BPO-rutin.",
    citation: "de Groot AC, Schmidt E. 2016. Contact Dermatitis.",
    citationUrl: "https://pubmed.ncbi.nlm.nih.gov/?term=essential+oils+contact+dermatitis+benzoyl+peroxide",
    sideA: ["benzoyl peroxide"],
    sideB: ["lavandula angustifolia oil", "citrus aurantium dulcis peel oil", "mentha piperita oil", "cananga odorata flower oil", "eucalyptus globulus leaf oil", "melaleuca alternifolia leaf oil"],
  },
  // ─── Drying Alcohol + Exfoliant Acid ────────────────────────────────────
  {
    id: "drying-alcohol-acid",
    display: "Drying Alcohol + Exfoliant Acid",
    severity: "CAUTION",
    profileOverrides: { sensitive: "HIGH_RISK", mature: "HIGH_RISK" },
    hint: "Volatile alcohol (alcohol denat., SD alcohol 40) at high concentration accelerates trans-epidermal water loss; AHAs and BHAs strip the stratum corneum. Used together they often produce visible dryness, tightness, and barrier-driven flushing. Reach for a low-pH gel cleanser plus a humectant-rich moisturiser between treatment steps instead.",
    hint_se: "Flyktig alkohol (alcohol denat., SD alkohol 40) i hög halt ökar vattenförlusten genom huden; AHA och BHA bryter ner hornlagret. Tillsammans ger de ofta synlig torrhet, en stram känsla och rodnad från en svagare barriär. Välj i stället en mild lågpH-gel och en återfuktare med mycket humektanter mellan stegen.",
    citation: "Lodén M, Maibach HI. 2000. Dry Skin and Moisturizers.",
    citationUrl: "https://www.routledge.com/Dry-Skin-and-Moisturizers/Loden-Maibach/p/book/9780849375200",
    sideA: ["alcohol denat", "sd alcohol 40"],
    sideB: ["glycolic acid", "lactic acid", "mandelic acid", "salicylic acid"],
  },
];

interface NormalizedConflict {
  pair: ConflictPair;
  sideA: Set<string>;
  sideB: Set<string>;
}

/** Normalised conflict database built once at module load. */
const NORMALIZED_CONFLICTS: NormalizedConflict[] = RAW_CONFLICTS.map((pair) => {
  const sideA = new Set<string>();
  for (const name of pair.sideA) {
    const n = normalizeIngredientName(name);
    if (n) sideA.add(n);
  }
  const sideB = new Set<string>();
  for (const name of pair.sideB) {
    const n = normalizeIngredientName(name);
    if (n) sideB.add(n);
  }
  return { pair, sideA, sideB };
});

export interface MatchedConflict {
  pair: ConflictPair;
  /** Original (un-normalised) ingredient names from side A that were found. */
  matchedA: string[];
  /** Original (un-normalised) ingredient names from side B that were found. */
  matchedB: string[];
  /** Where the conflict occurs. */
  location: "cross" | "product1" | "product2";
}

interface IndexedList {
  /** Map of normalised name → first original spelling we saw. */
  byNormalized: Map<string, string>;
}

function indexList(rawList: string[]): IndexedList {
  const byNormalized = new Map<string, string>();
  for (const raw of rawList) {
    const n = normalizeIngredientName(raw);
    if (!n) continue;
    if (!byNormalized.has(n)) byNormalized.set(n, raw);
  }
  return { byNormalized };
}

function intersect(side: Set<string>, list: IndexedList): string[] {
  const hits: string[] = [];
  for (const norm of side) {
    const original = list.byNormalized.get(norm);
    if (original) hits.push(original);
  }
  return hits;
}

/**
 * Find every documented conflict that's triggered by this scan.
 *
 * For each curated pair, looks for sideA members in product 1 + sideB members
 * in product 2 (and the symmetric direction). When `applyWithinProduct` is
 * true, also checks for both sides appearing inside the same product.
 *
 * Returns an empty array if `product2` is not provided (single-product scan)
 * unless the pair is `applyWithinProduct: true`.
 */
export function getConflicts(product1: string[], product2?: string[]): MatchedConflict[] {
  const list1 = indexList(product1);
  const list2 = product2 ? indexList(product2) : null;

  const matches: MatchedConflict[] = [];
  const seen = new Set<string>();

  for (const { pair, sideA, sideB } of NORMALIZED_CONFLICTS) {
    if (list2) {
      // Cross-product: A in product 1, B in product 2
      const a1 = intersect(sideA, list1);
      const b2 = intersect(sideB, list2);
      if (a1.length > 0 && b2.length > 0) {
        const key = `${pair.id}:cross:1->2`;
        if (!seen.has(key)) {
          seen.add(key);
          matches.push({ pair, matchedA: a1, matchedB: b2, location: "cross" });
        }
      }

      // Cross-product: A in product 2, B in product 1 (symmetric)
      const a2 = intersect(sideA, list2);
      const b1 = intersect(sideB, list1);
      if (a2.length > 0 && b1.length > 0) {
        const key = `${pair.id}:cross:2->1`;
        if (!seen.has(key)) {
          seen.add(key);
          // Keep matchedA / matchedB labelled by side (not by product) so the
          // prompt block reads naturally: "side A members: ..., side B members: ..."
          matches.push({ pair, matchedA: a2, matchedB: b1, location: "cross" });
        }
      }
    }

    if (pair.applyWithinProduct) {
      // Within product 1
      const a1Within = intersect(sideA, list1);
      const b1Within = intersect(sideB, list1);
      if (a1Within.length > 0 && b1Within.length > 0) {
        // Avoid flagging "X conflicts with X" — only count when at least one
        // matched name on each side is actually different.
        const distinct = a1Within.some((a) => !b1Within.includes(a));
        if (distinct) {
          const key = `${pair.id}:within:1`;
          if (!seen.has(key)) {
            seen.add(key);
            matches.push({ pair, matchedA: a1Within, matchedB: b1Within, location: "product1" });
          }
        }
      }

      // Within product 2 (only if scanning two products)
      if (list2) {
        const a2Within = intersect(sideA, list2);
        const b2Within = intersect(sideB, list2);
        if (a2Within.length > 0 && b2Within.length > 0) {
          const distinct = a2Within.some((a) => !b2Within.includes(a));
          if (distinct) {
            const key = `${pair.id}:within:2`;
            if (!seen.has(key)) {
              seen.add(key);
              matches.push({ pair, matchedA: a2Within, matchedB: b2Within, location: "product2" });
            }
          }
        }
      }
    }
  }

  return matches;
}

function severityFor(pair: ConflictPair, skinProfile?: string): ConflictSeverity {
  if (skinProfile && pair.profileOverrides) {
    const override = pair.profileOverrides[skinProfile as SkinProfile];
    if (override) return override;
  }
  return pair.severity;
}

/**
 * Build the user-message addendum that tells Claude which conflicts MUST be
 * surfaced in its `conflicts` array. Returns "" when there are no matches.
 */
export function buildMandatoryConflictsBlock(
  matches: MatchedConflict[],
  skinProfile?: string,
): string {
  if (matches.length === 0) return "";

  const lines = matches.map((m) => {
    const sev = severityFor(m.pair, skinProfile);
    const where =
      m.location === "cross"
        ? "(cross-product)"
        : m.location === "product1"
          ? "(both ingredients in Product 1)"
          : "(both ingredients in Product 2)";
    return [
      `- Pair: ${m.pair.display} ${where}`,
      `  matched side A: ${m.matchedA.join(", ")}`,
      `  matched side B: ${m.matchedB.join(", ")}`,
      `  severity: ${sev}`,
      `  hint: ${m.pair.hint}`,
      `  suggested citation: ${m.pair.citation}`,
      `  suggested citation URL: ${m.pair.citationUrl}`,
    ].join("\n");
  });

  return [
    "",
    "MANDATORY CONFLICTS — the following ingredient combinations in this scan are documented in our curated conflict database:",
    ...lines,
    "",
    "For each pair above you MUST include an entry in your \"conflicts\" array. Use the exact severity and a `pair` field shaped like \"<matched A name> + <matched B name>\". Write your own 2-3 sentence explanation that incorporates the hint and adapts the tone to the user's skin profile. Use the suggested citation unless you know a stronger primary source. You may add additional conflicts you identify outside this list.",
  ].join("\n");
}

/** Exposed for tests / admin tooling. */
export const __INTERNAL = { NORMALIZED_CONFLICTS };
