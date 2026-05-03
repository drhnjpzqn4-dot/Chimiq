import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type Locale = "en" | "sv" | "fr";

export const LOCALES: { code: Locale; label: string }[] = [
  { code: "en", label: "English" },
  { code: "sv", label: "Svenska" },
  { code: "fr", label: "Français" },
];

const STORAGE_KEY = "skinscreen.locale";

type Dict = Record<string, string>;

const en: Dict = {
  // ───── Tabs ─────
  "tabs.scan": "Scan",
  "tabs.browse": "Browse",
  "tabs.discover": "Discover",
  "tabs.profile": "Profile",

  // ───── Common ─────
  "common.signIn": "Sign in",
  "common.logOut": "Log out",
  "common.back": "Back",
  "common.share": "Share",
  "common.linkCopied": "Link copied",
  "common.loading": "Loading…",

  // ───── Severity / frequency labels (used across Discover) ─────
  "severity.HIGH": "High risk",
  "severity.MEDIUM": "Watch out",
  "severity.LOW": "Heads up",
  "frequency.VERY_COMMON": "Very common",
  "frequency.COMMON": "Common",
  "frequency.EMERGING": "Rising concern",

  // ───── In-app: scan ─────
  "scan.title": "Scan a product",
  "scan.subtitle": "Snap a label, paste ingredients, or compare two products.",

  // ───── In-app: shelf ─────
  "shelf.titleGreeting": "Hi, {name}",
  "shelf.subtitle": "Your shelf — track your routine and check it for conflicts.",

  // ───── In-app: discover ─────
  "discover.title": "Discover",
  "discover.subtitle": "Tips, expert care, and ways to learn safer skincare.",
  "discover.shareTip": "Share a tip",
  "discover.tipPlaceholder": "What's one routine tip you'd recommend?",
  "discover.tipAriaLabel": "Your tip",
  "discover.post": "Post",
  "discover.rewards": "Rewards",
  "discover.topTips": "Top tips",
  "discover.last30Days": "Last 30 days",
  "discover.emptyTips":
    "No tips yet. Be the first to share one — the most upvoted tip each week wins a free month of Premium.",
  "discover.aiAskAnything": "Ask anything",
  "discover.aiTitle": "Chat with the Chimiq AI",
  "discover.aiSubtitle":
    "Get evidence-based answers about your shelf, ingredient interactions, and routine timing.",
  "discover.aiHint": "Tap the chat bubble to start",
  "discover.leaderboardTitle": "Leaderboard",
  "discover.leaderboardSubtitle": "See top contributors and Best Tip of the Week.",
  "discover.tipBy": "by",
  "discover.upvoteTip": "Upvote tip",
  "discover.removeVote": "Remove vote",
  "discover.tipMinError": "Tips need at least {min} characters.",
  "discover.tipPostError": "Could not post tip.",
  "discover.tipNetworkError": "Network error. Try again.",
  "discover.footnote": "DIY recipes, top mistakes, and more inside the app.",

  // ───── In-app: profile ─────
  "profile.title": "Profile",
  "profile.subtitle": "Your account, plan, and contributions.",
  "profile.language": "Language",

  // ───── Standalone PWA welcome (Home.tsx) ─────
  "homeStandalone.kicker": "AI ingredient scanner",
  "homeStandalone.body":
    "Snap any skincare label. We'll flag conflicts and suggest safer alternatives in seconds.",
  "homeStandalone.cta": "Sign in & start scanning",
  "homeStandalone.priceNote": "Free to start · Premium 49 SEK/mo",

  // ───── 404 page ─────
  "notFound.title": "404 Page Not Found",
  "notFound.body": "Did you forget to add the page to the router?",

  // ───── Marketing landing: top nav ─────
  "nav.howItWorks": "How it works",
  "nav.tryItNow": "Try it now",
  "nav.discover": "Discover",
  "nav.earnFreePremium": "Earn free premium",
  "nav.myShelf": "My Shelf",
  "nav.signInGetStarted": "Sign in / Get started free",
  "nav.tryItNowArrow": "Try it now →",
  "nav.seeHowItWorks": "See how it works",
  "auth.signIn": "Sign in",
  "auth.logOut": "Log out",

  // ───── Hero (variant-aware copy lives in landing-config keys) ─────
  "hero.badge": "AI Ingredient Safety Scanner",
  "hero.conflict": "⚠ Conflict",

  // Variant: general
  "landing.general.heroHeadline": "40 products. 400 ingredients.",
  "landing.general.heroHeadlineItalic": "Do you know what they do to each other?",
  "landing.general.heroSubhead":
    "Chimiq scans your skincare and finds dangerous combinations — before they find your skin.",
  "landing.general.heroCta": "Get early access",
  "landing.general.goalHeadline": "Healthy skin needs less, not more.",
  "landing.general.goalBody":
    "With the right products and the right combinations, you need a 3-step routine — not 12. Healthy skin means fewer breakouts to cover. Fewer concealers. Less spending. And fewer potentially harmful substances on the thinnest, most absorbent organ in your body. Chimiq helps you buy once, buy right, and stop the spiral.",
  "landing.general.scannerSubhead":
    "Paste two ingredient lists and see Chimiq detect conflicts in seconds — dermatologist-informed, research-backed.",
  "landing.general.scannerCtaSingle": "Scan Ingredients",
  "landing.general.scannerCtaCompare": "Check Compatibility",

  // Variant: teen (HomeA)
  "landing.teen.heroHeadline": "Your skin was fine",
  "landing.teen.heroHeadlineItalic": "before you started their routine.",
  "landing.teen.heroSubhead":
    "TikTok recommended 12 products. Your skin barrier only ever needed 3. Chimiq shows you what the algorithm won't.",
  "landing.teen.heroCta": "Show me what's in my routine",
  "landing.teen.goalHeadline": "You were sold a problem that didn't exist.",
  "landing.teen.goalBody":
    "Influencers profit from your next purchase. They don't profit from your healthy skin. A 3-step routine with the right products — a cleanser, moisturiser, and SPF — is all most skin needs. Chimiq helps you cut through the noise, stop the spiral, and take back control of your skin.",
  "landing.teen.scannerSubhead":
    "Paste your routine's ingredient lists and find out if the products you were sold are working — or working against you.",
  "landing.teen.scannerCtaSingle": "See what this is doing to my skin",
  "landing.teen.scannerCtaCompare": "Are these products fighting each other?",

  // Variant: mature (HomeB)
  "landing.mature.heroHeadline": "The beauty industry profits from your insecurity.",
  "landing.mature.heroHeadlineItalic": "Your skin deserves better than that.",
  "landing.mature.heroSubhead":
    "Underneath the serums, retinols and collagen creams, some combinations quietly do damage. Chimiq shows you what's really happening.",
  "landing.mature.heroCta": "Tell me what's really in my products",
  "landing.mature.goalHeadline": "Less is more. The science agrees.",
  "landing.mature.goalBody":
    "Decades of marketing have convinced us that more products means healthier skin. The research says the opposite. A simplified, conflict-free routine protects your barrier, reduces inflammation, and actually lets your actives work. Chimiq helps you strip back, buy right, and let your skin do what it knows how to do.",
  "landing.mature.scannerSubhead":
    "Paste your skincare ingredient lists and find out whether your anti-ageing routine is working with your skin — or quietly working against it.",
  "landing.mature.scannerCtaSingle": "Analyse this product",
  "landing.mature.scannerCtaCompare": "Check for conflicts",

  // Hero — common headline (used when no variant override)
  "landing.heroLine1": "Scan ingredients.",
  "landing.heroLine2": "Build your shelf.",
  "landing.heroItalic": "Catch conflicts.",
  "landing.heroBody":
    "Sign in, save the products you use, and let our AI flag dangerous skincare combinations before they damage your skin.",

  // ───── How it works ─────
  "howItWorks.title": "How Chimiq works",
  "howItWorks.subtitle": "Three steps. Seconds. No guesswork.",
  "howItWorks.scanTitle": "Scan or paste",
  "howItWorks.scanBody":
    "Photograph your ingredient list, scan the barcode, or choose from popular products.",
  "howItWorks.routineTitle": "Build your routine",
  "howItWorks.routineBody":
    "Add multiple products to check how they interact — not just what's in them.",
  "howItWorks.risksTitle": "See the risks",
  "howItWorks.risksBody":
    "Get instant conflict detection with clear red, yellow, and green ratings — and what to do instead.",

  // ───── Scanner section ─────
  "scannerSection.kicker": "Try It Now",
  "scannerSection.brand": "CHIMIQ SCANNER",

  // ───── Danger combinations ─────
  "dangerZone.title": "What you don't know can hurt your skin.",
  "dangerZone.subtitle":
    "These are real, documented ingredient conflicts — the kind your dermatologist knows, but the beauty industry doesn't advertise.",
  "dangerZone.severityHigh": "HIGH RISK",
  "dangerZone.severityCaution": "CAUTION",
  "dangerZone.combo1Pair": "Retinol + AHA/BHA",
  "dangerZone.combo2Pair": "Retinol + Benzoyl Peroxide",
  "dangerZone.combo3Pair": "AHAs + No Sunscreen",
  "dangerZone.combo4Pair": "Vitamin C + Niacinamide",
  "dangerZone.combo5Pair": "Kojic Acid + Vitamin C",
  "dangerCard.source": "Source:",
  "dangerZone.combo1Risk":
    "Both are chemical exfoliants. Together they cause severe skin irritation, redness, and can damage the skin barrier — especially at night when skin is most vulnerable.",
  "dangerZone.combo2Risk":
    "Benzoyl peroxide oxidises retinol, rendering it inactive. You're paying for two products that cancel each other out — and drying out your skin in the process.",
  "dangerZone.combo3Risk":
    "Glycolic acid and lactic acid increase UV sensitivity by up to 50%. Using them without SPF dramatically raises your risk of sun damage, hyperpigmentation, and skin cancer.",
  "dangerZone.combo4Risk":
    "Widely debated. Some studies show they can form niacin when combined at high temperatures, potentially causing flushing. Safest to use at separate times of day.",
  "dangerZone.combo5Risk":
    "Both compete for the same oxidation pathway, reducing each other's brightening effect. Combined, they can also increase skin sensitivity and cause unexpected irritation.",

  // ───── Disaster mix ─────
  "disasterMix.badge": "Disaster Mix",
  "disasterMix.titleLine1": "The routine that sells millions —",
  "disasterMix.titleItalic": "and quietly damages skin.",
  "disasterMix.subtitle":
    "These three products are consistently bought together. They're sold in the same store, recommended in the same \"beginner skincare\" guides. They are also a clinically documented disaster combination.",
  "disasterMix.theRoutine": "The routine",
  "disasterMix.rolePmSerum": "PM serum",
  "disasterMix.roleAmPm": "AM/PM treatment",
  "disasterMix.rolePmExfoliant": "PM exfoliant",
  "disasterMix.whatHappens": "What happens when you use them together",
  "disasterMix.bp1Title": "Benzoyl Peroxide oxidises Retinol — instantly",
  "disasterMix.bp1Body":
    "These two actives deactivate each other on contact. The retinol becomes useless — but both products continue stripping and drying your skin. You get the damage without the benefits.",
  "disasterMix.bp2Title": "Retinol + Salicylic Acid + AHA = triple exfoliation",
  "disasterMix.bp2Body":
    "Three exfoliants in one routine causes severe barrier disruption. The result: redness, peeling, increased UV sensitivity, and a cycle of buying more products to fix the damage these caused.",
  "disasterMix.cta": "Is your routine doing this to your skin?",
  "disasterMix.ctaButton": "Scan your routine",

  // ───── My Shelf section ─────
  "myShelfMkt.kickerYour": "Your routine",
  "myShelfMkt.kickerSoon": "Coming soon",
  "myShelfMkt.titleLine1": "Your personal",
  "myShelfMkt.titleItalic": "skincare shelf.",
  "myShelfMkt.body":
    "Stop testing combinations on your face. My Shelf lets you build your full routine digitally — and checks any new product against everything you already use, before you buy it.",
  "myShelfMkt.feature1": "Organise your morning & evening routines in one place",
  "myShelfMkt.feature2":
    "Scan a new product or scan its barcode in-store — instantly see if it conflicts with your shelf",
  "myShelfMkt.feature3": "Get safety alerts when a new conflict is discovered in your routine",
  "myShelfMkt.feature4":
    "Download a personalised PDF safety report to share with your dermatologist",
  "myShelfMkt.feature5":
    "Ask our AI dermatologist anything about your ingredients — backed by peer-reviewed research",
  "myShelfMkt.signInToStart": "Sign in to start your shelf",
  "myShelfMkt.signedInAs": "Signed in as {name}",
  "myShelfMkt.shelfWaitingTitle": "Your shelf is waiting",
  "myShelfMkt.shelfWaitingBody": "Sign in to start building your personal skincare routine.",
  "myShelfMkt.signInToGetStarted": "Sign in to get started",

  // ───── Earn premium section ─────
  "earnPremium.kicker": "Help the community · Earn free premium",
  "earnPremium.titleLine1": "Build the database.",
  "earnPremium.titleItalic": "Earn free premium.",
  "earnPremium.subtitle":
    "Every product you contribute helps thousands of people avoid skin-damaging combinations.",
  "earnPremium.privateTitle": "Your private skincare shelf",
  "earnPremium.privateBody":
    "Save every product you use. Chimiq checks your full routine for conflicts and flags risks before they damage your skin.",
  "earnPremium.privateBullet1": "Private to you — never shared",
  "earnPremium.privateBullet2": "AI-powered conflict analysis backed by peer-reviewed research",
  "earnPremium.privateBullet3": "Scan any new product before you buy it",
  "earnPremium.contribTitlePart1": "Add 30 new products =",
  "earnPremium.contribTitlePart2": "1 month premium free",
  "earnPremium.contribBody":
    "Help us crowdsource the world's largest skincare ingredient database. Each new product needs:",
  "earnPremium.contribBullet1Bold": "Product name",
  "earnPremium.contribBullet1Rest": "& brand",
  "earnPremium.contribBullet2Bold": "Barcode",
  "earnPremium.contribBullet2Rest": "(so others can find it)",
  "earnPremium.contribBullet3Bold": "Photo",
  "earnPremium.contribBullet3Rest": "of the packaging",
  "earnPremium.contribBullet4Bold": "Full ingredient list",
  "earnPremium.contribBullet4Rest": "",
  "earnPremium.signInToContribute": "Sign in to contribute",
  "earnPremium.startContributing": "Start contributing",

  // ───── Footer ─────
  "footer.thanks": "Thanks — we'll be in touch.",
  "footer.getInTouch": "Get in touch",
  "footer.namePlaceholder": "Your name",
  "footer.emailPlaceholder": "your@email.com",
  "footer.messagePlaceholder": "What's on your mind?",
  "footer.send": "Send message",
  "footer.copyright": "© {year} Chimiq. Smarter skincare starts here.",
  "footer.skincare": "Skincare",
  "footer.hair": "Hair",
  "footer.household": "Household",
  "footer.comingSoon": "(coming soon)",
  "footer.aboutChimiq":
    "Chimiq is the first Chimiq product. We scan ingredient lists across categories — because what you put on your skin, hair, and home matters.",
  "footer.contactSubject": "Chimiq enquiry",
  "howItWorks.demoPair": "Retinol + Glycolic Acid",
  "howItWorks.demoSubtitle": "Degrades retinol efficacy",

  // ───── Toast ─────
  "toast.welcomePremium": "Welcome to Premium!",
  "toast.welcomePremiumDesc":
    "Your plan has been upgraded. Enjoy unlimited shelf products, AI Chat, and more.",

  // ───── Pricing (full page) ─────
  "pricing.backToChimiq": "Back to Chimiq",
  "pricing.headline": "Simple, honest pricing",
  "pricing.subhead":
    "Start free. Upgrade when you need the full power of your personal dermatology assistant.",
  "pricing.kicker": "Pricing",
  "pricing.sectionHeadline": "Free to start. Upgrade when ready.",
  "pricing.sectionSub":
    "Most people never need more than the free tier. But if your shelf keeps growing, Premium has you covered.",
  "pricing.free": "Free",
  "pricing.zeroPrice": "$0",
  "pricing.perMonth": "/month",
  "pricing.noCard": "No card required. Always free.",
  "pricing.currentPlan": "Your current plan",
  "pricing.includedWithPremium": "Included with Premium",
  "pricing.included": "Included",
  "pricing.premium": "Premium",
  "pricing.bestValue": "Best value",
  "pricing.mostPopular": "Most popular",
  "pricing.monthly": "Monthly",
  "pricing.yearly": "Yearly",
  "pricing.save98": "Save 98 SEK",
  "pricing.year": "year",
  "pricing.month": "month",
  "pricing.yearlyHint": "≈ 41 SEK/mo, billed yearly. Cancel anytime.",
  "pricing.monthlyHint": "Billed monthly. Cancel anytime.",
  "pricing.yearlyHintShort": "≈ 41 SEK/mo · cancel anytime",
  "pricing.cancelAnytime": "Cancel anytime",
  "pricing.youreOnPremium": "You're on Premium",
  "pricing.redirecting": "Redirecting…",
  "pricing.getPremiumYr": "Get Premium — 490 SEK/yr",
  "pricing.getPremiumMo": "Get Premium — 49 SEK/mo",
  "pricing.securePayment": "Secure payment via Stripe · Cancel anytime",
  "pricing.secureFooter":
    "Secure payments via Stripe · No subscription lock-in · Cancel in one click",
  "pricing.errorGeneric": "Something went wrong. Please try again.",
  "pricing.errorConnect": "Failed to connect to payment service. Please try again.",
  "pricing.errorGenericShort": "Something went wrong.",
  "pricing.errorConnectShort": "Failed to connect to payment service.",

  // Free feature labels (Pricing.tsx & PricingSection.tsx use overlapping sets)
  "pricing.feat.safetyAnalysis": "Ingredient safety analysis",
  "pricing.feat.compare2": "Compare 2 products at once",
  "pricing.feat.compare2SideBySide": "Compare 2 products (side-by-side)",
  "pricing.feat.findDerm": "Find a Dermatologist",
  "pricing.feat.barcode": "Barcode scanner",
  "pricing.feat.shelfLimited": "My Shelf (up to 2 products)",
  "pricing.feat.shelfUnlimited": "Unlimited shelf products",
  "pricing.feat.routineCheck": "Full routine cross-check",
  "pricing.feat.aiChatWith": "AI Chat with Chimiq",
  "pricing.feat.aiChat": "AI Chat",
  "pricing.feat.pdf": "PDF Safety Report",
  "pricing.feat.everythingFree": "Everything in Free",

  // Pricing highlights
  "pricing.highlight1Title": "Unlimited Shelf",
  "pricing.highlight1Desc": "Track your entire skincare routine — no limits.",
  "pricing.highlight2Title": "AI Chat",
  "pricing.highlight2Desc": "Ask anything about your routine. Get expert-backed answers.",
  "pricing.highlight3Title": "PDF Reports",
  "pricing.highlight3Desc":
    "Download and share your full routine analysis with your dermatologist.",

  // PricingSection-specific
  "pricingSection.kicker": "Pricing",
  "pricingSection.title": "Free to start. Upgrade when ready.",
  "pricingSection.subtitle":
    "Most people never need more than the free tier. But if your shelf keeps growing, Premium has you covered.",

  // ───── Discover (marketing page) ─────
  "discoverPage.backHome": "Back home",
  "discoverPage.kicker": "Discover",
  "discoverPage.title": "The skincare truths nobody told you.",
  "discoverPage.subtitle":
    "Two evergreen guides — the mistakes that quietly damage skin, and the worries we hear most. Plain language, real solutions, no influencer fluff.",
  "discoverPage.mistakesH2": "Top 10 skincare mistakes",
  "discoverPage.mistakesSub": "The most common — and most damaging — habits in modern routines.",
  "discoverPage.worriesH2": "Top 10 skin worries",
  "discoverPage.worriesSub": "The concerns we hear most — and what actually helps.",
  "discoverPage.readMore": "Read more",

  // ───── Discover detail (mistake / worry) ─────
  "discoverDetail.topMistakes": "Top 10 mistakes",
  "discoverDetail.topWorries": "Top 10 worries",
  "discoverDetail.theProblem": "The problem",
  "discoverDetail.whyItMatters": "Why it matters",
  "discoverDetail.source": "Source:",
  "discoverDetail.theFixSteps": "The fix — in {n} steps",
  "discoverDetail.notFoundTitle": "We couldn't find that.",
  "discoverDetail.notFoundBody": "The page you're looking for might have moved.",
  "discoverDetail.backToTopMistakes": "Back to top mistakes",
  "discoverDetail.backToTopWorries": "Back to top worries",
  "discoverDetail.discoverNav": "Discover",
  "discoverDetail.share": "Share",
  "discoverDetail.linkCopied": "Link copied",

  // ───── Recipes (list) ─────
  "recipes.title": "DIY recipes",
  "recipes.subtitle":
    "Community-shared at-home formulas, scanned by our AI and reviewed by Chimiq admins.",
  "recipes.share": "Share",
  "recipes.filters": "Filters",
  "recipes.clearFilters": "Clear filters",
  "recipes.category": "Category",
  "recipes.skinType": "Skin type",
  "recipes.riskLevel": "Risk level",
  "recipes.errorLoad": "Could not load recipes.",
  "recipes.empty": "No recipes match these filters yet. Try clearing them or be the first to share one.",
  "recipes.ingredient_one": "{n} ingredient",
  "recipes.ingredient_other": "{n} ingredients",
  "recipes.badgeSafe": "Safe",
  "recipes.badgeCaution": "Caution",
  "recipes.badgeHighRisk": "High risk",
  "recipes.cat.all": "all",
  "recipes.cat.cleanser": "cleanser",
  "recipes.cat.toner": "toner",
  "recipes.cat.serum": "serum",
  "recipes.cat.moisturizer": "moisturiser",
  "recipes.cat.mask": "mask",
  "recipes.cat.exfoliant": "exfoliant",
  "recipes.cat.oil": "oil",
  "recipes.cat.balm": "balm",
  "recipes.cat.mist": "mist",
  "recipes.cat.scrub": "scrub",
  "recipes.cat.other": "other",
  "recipes.skin.all": "all",
  "recipes.skin.dry": "dry",
  "recipes.skin.oily": "oily",
  "recipes.skin.combination": "combination",
  "recipes.skin.sensitive": "sensitive",
  "recipes.skin.normal": "normal",
  "recipes.risk.all": "all",
  "recipes.risk.safe": "safe",
  "recipes.risk.caution": "caution",
  "recipes.risk.high_risk": "high risk",

  // ───── Recipe detail ─────
  "recipeDetail.headerLoading": "Recipe",
  "recipeDetail.allRecipes": "All recipes",
  "recipeDetail.errorLoad": "Could not load recipe.",
  "recipeDetail.errorFallback": "Recipe not found.",
  "recipeDetail.aiSafetyScan": "AI safety scan: {label}",
  "recipeDetail.flagged": "Flagged ingredients",
  "recipeDetail.saferSwaps": "Safer swaps",
  "recipeDetail.replacePrefix": "Replace",
  "recipeDetail.replaceWith": "with",
  "recipeDetail.ingredients": "Ingredients",
  "recipeDetail.method": "Method",
  "recipeDetail.editorsNote": "Editor's note",
  "recipeDetail.disclaimer":
    "DIY recipes are user contributions. Patch-test on a small area before applying to your face, and stop use immediately if irritation occurs.",
  "recipeDetail.riskSafe": "Looks safe",
  "recipeDetail.riskCaution": "Use with caution",
  "recipeDetail.riskHigh": "High risk",

  // ───── Browse (in-app) ─────
  "browse.title": "Browse products",
  "browse.subtitle": "Crowd-sourced ingredient database — search, filter, contribute.",
  "browse.searchPlaceholder": "Search by product or brand…",
  "browse.cat.all": "All",
  "browse.cat.cleanser": "Cleanser",
  "browse.cat.toner": "Toner",
  "browse.cat.serum": "Serum",
  "browse.cat.moisturizer": "Moisturiser",
  "browse.cat.sunscreen": "SPF",
  "browse.cat.exfoliant": "Exfoliant",
  "browse.cat.mask": "Mask",
  "browse.cat.other": "Skincare",
  "browse.loadingDb": "Loading the database…",
  "browse.matches_one": "{count} match for \"{q}\"",
  "browse.matches_other": "{count} matches for \"{q}\"",
  "browse.categoryProducts": "{count} {category} products",
  "browse.totalProducts": "{count} products in the database",
  "browse.addProduct": "Add product",
  "browse.errorLoad": "Could not load products. Check your connection and try again.",
  "browse.noProductsFound": "No products found",
  "browse.dbEmpty": "Database is empty",
  "browse.beFirst": "Be the first to add this one — earn credit toward 1 month of free Premium.",
  "browse.addAProduct": "Add a product",
  "browse.openProduct": "Open {brand} {name}",
  "browse.verifiedSafe": "Verified safe",
  "browse.added": "Added {time}",
  "browse.timeJustNow": "just now",
  "browse.timeHoursAgo": "{n}h ago",
  "browse.timeDaysAgo": "{n}d ago",
  "browse.timeMonthsAgo": "{n}mo ago",
  "browse.timeYearsAgo": "{n}y ago",

  // ───── Browse detail ─────
  "browseDetail.headerTitle": "Product details",
  "browseDetail.backToBrowse": "Back to browse",
  "browseDetail.errorNotFound": "We couldn't find that product.",
  "browseDetail.errorLoad": "Could not load product. Check your connection and try again.",
  "browseDetail.barcodeLabel": "Barcode {code}",
  "browseDetail.scanCta": "Scan this product for my skin",
  "browseDetail.scanHint": "We'll re-run the analysis with your skin profile.",
  "browseDetail.fullIngredients": "Full ingredient list",

  // ───── Leaderboard ─────
  "leaderboard.title": "Leaderboard",
  "leaderboard.subtitle": "Top contributors to the Chimiq ingredient database.",
  "leaderboard.backToDiscover": "Back to Discover",
  "leaderboard.howRewardsWork": "How rewards work",
  "leaderboard.bestTipBadge": "Best Tip of the Week",
  "leaderboard.bestTipMeta_one":
    "by {name} · {count} vote · won 30 days of Premium",
  "leaderboard.bestTipMeta_other":
    "by {name} · {count} votes · won 30 days of Premium",
  "leaderboard.bestTipEmpty":
    "Last week's winner will be revealed Monday — keep voting on your favourite tips!",
  "leaderboard.thisMonth": "This month",
  "leaderboard.allTime": "All time",
  "leaderboard.emptyMonth": "No contributions yet this month. Be the first to scan a missing product!",
  "leaderboard.emptyAllTime": "No contributions yet. Be the first to scan a missing product!",
  "leaderboard.products": "products",
  "leaderboard.footnote": "Each accepted contribution counts. 30 = one free month of Premium.",
  "leaderboard.periodAria": "Leaderboard period",

  // ───── Problems (top mistakes / worries) ─────
  "problems.title": "Common problems",
  "problems.subtitle": "Top 10 mistakes and worries — at a glance.",
  "problems.backToScanner": "Back to scanner",
  "problems.tabMistakes": "Top mistakes",
  "problems.tabWorries": "Top worries",
  "problems.whatToDo": "What to do",
  "problems.scanProductNow": "Scan a product now",
  "problems.swipeMore": "Swipe to see more →",
  "problems.categoryAria": "Common problems category",

  // ───── Recipe submit ─────
  "recipeSubmit.headerLoading": "Submit a recipe",
  "recipeSubmit.headerSuccess": "Recipe submitted",
  "recipeSubmit.shareTitle": "Share a DIY recipe",
  "recipeSubmit.shareSubtitle":
    "Help others discover safe, tried-and-true at-home formulas. Our AI will scan it for safety before an admin reviews.",
  "recipeSubmit.verifyEmailTitle": "Verify your email first",
  "recipeSubmit.verifyEmailBody":
    "To keep our DIY recipe library safe, we ask contributors to verify their email with their sign-in provider before submitting.",
  "recipeSubmit.backToProfile": "Back to profile",
  "recipeSubmit.errorTitleShort": "Please give your recipe a title (3+ characters).",
  "recipeSubmit.errorMin2": "List at least 2 ingredients.",
  "recipeSubmit.errorMethodShort":
    "Please describe how to make and apply this recipe (at least 10 characters).",
  "recipeSubmit.errorSkinType": "Select at least one skin type.",
  "recipeSubmit.errorSubmit": "Failed to submit recipe.",
  "recipeSubmit.errorNetwork": "Network error. Please try again.",
  "recipeSubmit.thanksHeadline": "Thanks — your recipe is in the review queue.",
  "recipeSubmit.thanksBodyWithVerdict":
    "An admin will review the AI safety scan and your recipe before publishing it. You'll see it in your contributions once approved.",
  "recipeSubmit.thanksBodyNoVerdict":
    "An admin will review your recipe before publishing it. You'll see it in your contributions once approved.",
  "recipeSubmit.scannerOffline":
    "Our AI safety scanner is temporarily unavailable, but your recipe is saved. An admin will still review it manually.",
  "recipeSubmit.scannerCouldnt":
    "Our AI safety scanner couldn't return a verdict this time, but your recipe is saved. An admin will review it manually.",
  "recipeSubmit.submitAnother": "Submit another",
  "recipeSubmit.recipeTitleLabel": "Recipe title",
  "recipeSubmit.recipeTitlePlaceholder": "e.g. Soothing oat & honey mask",
  "recipeSubmit.categoryLabel": "Category",
  "recipeSubmit.skinTypesLabel": "Skin types",
  "recipeSubmit.ingredientsLabel": "Ingredients ({count})",
  "recipeSubmit.add": "Add",
  "recipeSubmit.ingredientPlaceholder": "Ingredient",
  "recipeSubmit.amountPlaceholder": "Amount",
  "recipeSubmit.notesPlaceholder": "Notes (optional)",
  "recipeSubmit.removeIngredient": "Remove ingredient",
  "recipeSubmit.methodLabel": "Method (optional)",
  "recipeSubmit.methodPlaceholder": "Describe how to mix and apply…",
  "recipeSubmit.whatNext": "What happens next",
  "recipeSubmit.whatNextBody":
    "Our AI will scan your recipe for safety concerns. Then a Chimiq admin will review and approve it before it appears in the public library.",
  "recipeSubmit.scanAndSave": "Scanning & saving…",
  "recipeSubmit.submitForReview": "Submit for review",
  "recipeSubmit.editTitle": "Edit your recipe",
  "recipeSubmit.editSubtitle":
    "Update your recipe and resubmit for review. The AI safety scan will run again.",
  "recipeSubmit.adminNoteLabel": "Reviewer note",
  "recipeSubmit.resubmitForReview": "Resubmit for review",
  "recipeSubmit.editNotFound": "We couldn't find that recipe under your account.",
  "recipeSubmit.editNotEditable":
    "This recipe can no longer be edited (already approved or rejected).",
  "recipeSubmit.editLoadFailed": "Couldn't load your recipe. Please try again.",

  // ───── Rewards ─────
  "rewards.headline": "How rewards work",
  "rewards.sub": "Three simple ways to earn free Premium and recognition in Chimiq.",
  "rewards.contribTitle": "Contribute products",
  "rewards.contribBody":
    "Scan products that aren't in our database yet. Every accepted contribution counts toward your total. Reach 30 accepted contributions and get one full month of Premium — free.",
  "rewards.tipsTitle": "Share helpful tips",
  "rewards.tipsBody":
    "Post short skincare tips in the Tips feed. The community votes their favourites up. Each Monday, the most-voted tip from the previous week wins Best Tip of the Week and earns the author one month of Premium plus the Verified Tipster badge.",
  "rewards.badgesTitle": "Earn badges",
  "rewards.badge1Title": "First Scan",
  "rewards.badge1Body": "Submit your first accepted contribution.",
  "rewards.badge2Title": "10 Products",
  "rewards.badge2Body": "Reach 10 accepted contributions.",
  "rewards.badge3Title": "30 Products",
  "rewards.badge3Body": "Reach 30 — and earn a free month.",
  "rewards.badge4Title": "100 Products",
  "rewards.badge4Body": "Reach 100. Database hero.",
  "rewards.badge5Title": "Top 10 This Month",
  "rewards.badge5Body": "Finish a month inside the top 10.",
  "rewards.badge6Title": "Verified Tipster",
  "rewards.badge6Body": "Win Best Tip of the Week.",
  "rewards.rulesTitle": "House rules",
  "rewards.rule1": "One vote per tip. You cannot vote on your own tips.",
  "rewards.rule2": "5 tips per day max — focus on quality.",
  "rewards.rule3":
    "Duplicate or already-known products do not count toward the 30-contribution milestone.",
  "rewards.rule4": "Premium grants stack on top of any time you already have left.",

  // ───── Legal consent gate ─────
  "consent.title": "Before you continue",
  "consent.intro":
    "Chimiq is a wellness tool, not a substitute for medical advice. Please confirm you've read our terms before signing in.",
  "consent.checkboxPrefix": "I agree to the ",
  "consent.linkTerms": "Terms of Service",
  "consent.linkPrivacy": "Privacy Policy",
  "consent.checkboxAnd": ", and ",
  "consent.linkDisclaimer": "Medical Disclaimer",
  "consent.checkboxSuffix": ".",
  "consent.continue": "Agree & continue",
  "consent.cancel": "Cancel",

  // ───── Footer legal links ─────
  "footer.legalHeading": "Legal",
  "footer.legalPrivacy": "Privacy Policy",
  "footer.legalTerms": "Terms of Service",
  "footer.legalDisclaimer": "Medical Disclaimer",

  // ───── Legal pages (shared chrome) ─────
  "legal.lastUpdated": "Last updated: {date}",
  "legal.contactPlaceholder": "Contact: legal@chimiq.com",
  "legal.backToApp": "Back",
  "legal.privacyTitle": "Privacy Policy",
  "legal.termsTitle": "Terms of Service",
  "legal.disclaimerTitle": "Medical & Health Disclaimer",

  // ───── Profile -> Your DIY recipes (#69 / #70 / #78) ─────
  "myRecipes.heading": "Your DIY recipes",
  "myRecipes.unseenAria": "{count} new updates",
  "myRecipes.status.approved": "Approved",
  "myRecipes.status.rejected": "Rejected",
  "myRecipes.status.changesRequested": "Changes requested",
  "myRecipes.status.underReview": "Under review",
  "myRecipes.reviewerNote": "Reviewer note:",
  "myRecipes.editAndResubmit": "Edit and resubmit",
  "myRecipes.viewPublic": "View public page",
  "myRecipes.editWhilePending": "Edit while pending",
};

const sv: Dict = {
  // ───── Tabs ─────
  "tabs.scan": "Skanna",
  "tabs.browse": "Bläddra",
  "tabs.discover": "Upptäck",
  "tabs.profile": "Profil",

  // ───── Common ─────
  "common.signIn": "Logga in",
  "common.logOut": "Logga ut",
  "common.back": "Tillbaka",
  "common.share": "Dela",
  "common.linkCopied": "Länk kopierad",
  "common.loading": "Laddar…",

  // ───── Severity / frequency ─────
  "severity.HIGH": "Hög risk",
  "severity.MEDIUM": "Var försiktig",
  "severity.LOW": "Bra att veta",
  "frequency.VERY_COMMON": "Mycket vanligt",
  "frequency.COMMON": "Vanligt",
  "frequency.EMERGING": "Växande oro",

  // ───── In-app: scan ─────
  "scan.title": "Skanna en produkt",
  "scan.subtitle":
    "Fota en etikett, klistra in ingredienser eller jämför två produkter.",

  // ───── In-app: shelf ─────
  "shelf.titleGreeting": "Hej, {name}",
  "shelf.subtitle": "Din hylla — håll koll på din rutin och kolla efter konflikter.",

  // ───── In-app: discover ─────
  "discover.title": "Upptäck",
  "discover.subtitle": "Tips, expertråd och sätt att lära dig säkrare hudvård.",
  "discover.shareTip": "Dela ett tips",
  "discover.tipPlaceholder": "Vilket rutintips skulle du rekommendera?",
  "discover.tipAriaLabel": "Ditt tips",
  "discover.post": "Publicera",
  "discover.rewards": "Belöningar",
  "discover.topTips": "Toppentips",
  "discover.last30Days": "Senaste 30 dagarna",
  "discover.emptyTips":
    "Inga tips ännu. Bli först med att dela ett — veckans mest uppröstade tips vinner en gratis månad med Premium.",
  "discover.aiAskAnything": "Fråga vad som helst",
  "discover.aiTitle": "Chatta med Chimiqs AI",
  "discover.aiSubtitle":
    "Få evidensbaserade svar om din hylla, ingrediensinteraktioner och rutintider.",
  "discover.aiHint": "Tryck på chattbubblan för att börja",
  "discover.leaderboardTitle": "Topplista",
  "discover.leaderboardSubtitle": "Se de bästa bidragsgivarna och Veckans bästa tips.",
  "discover.tipBy": "av",
  "discover.upvoteTip": "Rösta upp tipset",
  "discover.removeVote": "Ta bort röst",
  "discover.tipMinError": "Tips måste vara minst {min} tecken.",
  "discover.tipPostError": "Kunde inte publicera tipset.",
  "discover.tipNetworkError": "Nätverksfel. Försök igen.",
  "discover.footnote": "DIY-recept, vanliga misstag och mer i appen.",

  // ───── Profile ─────
  "profile.title": "Profil",
  "profile.subtitle": "Ditt konto, ditt abonnemang och dina bidrag.",
  "profile.language": "Språk",

  // ───── Standalone PWA welcome ─────
  "homeStandalone.kicker": "AI-ingrediensskanner",
  "homeStandalone.body":
    "Fota vilken hudvårdsetikett som helst. Vi flaggar konflikter och föreslår säkrare alternativ på sekunder.",
  "homeStandalone.cta": "Logga in & börja skanna",
  "homeStandalone.priceNote": "Gratis att börja · Premium 49 kr/mån",

  // ───── 404 ─────
  "notFound.title": "404 Sidan hittades inte",
  "notFound.body": "Glömde du att lägga till sidan i routern?",

  // ───── Marketing landing: nav ─────
  "nav.howItWorks": "Så funkar det",
  "nav.tryItNow": "Testa nu",
  "nav.discover": "Upptäck",
  "nav.earnFreePremium": "Tjäna gratis premium",
  "nav.myShelf": "Min hylla",
  "nav.signInGetStarted": "Logga in / Kom igång gratis",
  "nav.tryItNowArrow": "Testa nu →",
  "nav.seeHowItWorks": "Se hur det fungerar",
  "auth.signIn": "Logga in",
  "auth.logOut": "Logga ut",

  // ───── Hero ─────
  "hero.badge": "AI-skanner för ingredienssäkerhet",
  "hero.conflict": "⚠ Konflikt",

  // Variant: general
  "landing.general.heroHeadline": "40 produkter. 400 ingredienser.",
  "landing.general.heroHeadlineItalic": "Vet du vad de gör med varandra?",
  "landing.general.heroSubhead":
    "Chimiq skannar din hudvård och hittar farliga kombinationer — innan de hittar din hud.",
  "landing.general.heroCta": "Få tidig tillgång",
  "landing.general.goalHeadline": "Frisk hud behöver mindre, inte mer.",
  "landing.general.goalBody":
    "Med rätt produkter och rätt kombinationer behöver du en rutin med 3 steg — inte 12. Frisk hud betyder färre utbrott att täcka. Färre concealers. Mindre slöseri. Och färre potentiellt skadliga ämnen på det tunnaste och mest absorberande organet du har. Chimiq hjälper dig köpa en gång, köpa rätt och bryta spiralen.",
  "landing.general.scannerSubhead":
    "Klistra in två innehållsförteckningar och se Chimiq hitta konflikter på sekunder — dermatolog-baserat och forskningsstött.",
  "landing.general.scannerCtaSingle": "Skanna ingredienser",
  "landing.general.scannerCtaCompare": "Kontrollera kompatibilitet",

  // Variant: teen
  "landing.teen.heroHeadline": "Din hud mådde bra",
  "landing.teen.heroHeadlineItalic": "innan du började på deras rutin.",
  "landing.teen.heroSubhead":
    "TikTok rekommenderade 12 produkter. Din hudbarriär behövde aldrig mer än 3. Chimiq visar dig det algoritmen inte vill visa.",
  "landing.teen.heroCta": "Visa vad jag har i min rutin",
  "landing.teen.goalHeadline": "Du fick köpa lösningen på ett problem som inte fanns.",
  "landing.teen.goalBody":
    "Influencers tjänar på ditt nästa köp. De tjänar inte på att din hud mår bra. En rutin på tre steg med rätt produkter — rengöring, fuktkräm och solskydd — är allt de flesta hudtyper behöver. Chimiq hjälper dig sortera ut bruset, bryta spiralen och ta tillbaka kontrollen över din hud.",
  "landing.teen.scannerSubhead":
    "Klistra in din rutins innehållsförteckningar och ta reda på om produkterna du köpt jobbar med — eller mot — din hud.",
  "landing.teen.scannerCtaSingle": "Visa vad det gör med min hud",
  "landing.teen.scannerCtaCompare": "Slåss de här produkterna mot varandra?",

  // Variant: mature
  "landing.mature.heroHeadline": "Skönhetsindustrin tjänar på din osäkerhet.",
  "landing.mature.heroHeadlineItalic": "Din hud förtjänar bättre än så.",
  "landing.mature.heroSubhead":
    "Bakom serum, retinol och kollagenkrämer finns kombinationer som tyst gör skada. Chimiq visar vad som faktiskt händer.",
  "landing.mature.heroCta": "Berätta vad som verkligen finns i mina produkter",
  "landing.mature.goalHeadline": "Mindre är mer. Forskningen håller med.",
  "landing.mature.goalBody":
    "Decennier av marknadsföring har övertygat oss om att fler produkter ger friskare hud. Forskningen säger motsatsen. En förenklad, konfliktfri rutin skyddar din barriär, minskar inflammation och låter dina aktiva ingredienser faktiskt verka. Chimiq hjälper dig skala bort, köpa rätt och låta huden göra det den redan kan.",
  "landing.mature.scannerSubhead":
    "Klistra in dina innehållsförteckningar och ta reda på om din anti-age-rutin jobbar med din hud — eller tyst emot den.",
  "landing.mature.scannerCtaSingle": "Analysera den här produkten",
  "landing.mature.scannerCtaCompare": "Kolla efter konflikter",

  // Hero common
  "landing.heroLine1": "Skanna ingredienser.",
  "landing.heroLine2": "Bygg din hylla.",
  "landing.heroItalic": "Hitta konflikterna.",
  "landing.heroBody":
    "Logga in, spara produkterna du använder och låt vår AI flagga farliga hudvårdskombinationer innan de skadar din hud.",

  // ───── How it works ─────
  "howItWorks.title": "Så funkar Chimiq",
  "howItWorks.subtitle": "Tre steg. Sekunder. Inga gissningar.",
  "howItWorks.scanTitle": "Skanna eller klistra in",
  "howItWorks.scanBody":
    "Fota din innehållsförteckning, skanna streckkoden eller välj från populära produkter.",
  "howItWorks.routineTitle": "Bygg din rutin",
  "howItWorks.routineBody":
    "Lägg till flera produkter och se hur de samverkar — inte bara vad de innehåller.",
  "howItWorks.risksTitle": "Se riskerna",
  "howItWorks.risksBody":
    "Få direkt konfliktdetektion med tydliga röda, gula och gröna betyg — och vad du bör göra istället.",

  // ───── Scanner section ─────
  "scannerSection.kicker": "Testa nu",
  "scannerSection.brand": "CHIMIQ SCANNER",

  // ───── Danger combinations ─────
  "dangerZone.title": "Det du inte vet kan skada din hud.",
  "dangerZone.subtitle":
    "Det här är riktiga, dokumenterade ingredienskonflikter — sådant din dermatolog känner till, men som skönhetsindustrin inte gärna pratar om.",
  "dangerZone.severityHigh": "HÖG RISK",
  "dangerZone.severityCaution": "VARNING",
  "dangerZone.combo1Pair": "Retinol + AHA/BHA",
  "dangerZone.combo2Pair": "Retinol + bensoylperoxid",
  "dangerZone.combo3Pair": "AHA-syror utan solskydd",
  "dangerZone.combo4Pair": "C-vitamin + niacinamid",
  "dangerZone.combo5Pair": "Kojinsyra + C-vitamin",
  "dangerCard.source": "Källa:",
  "dangerZone.combo1Risk":
    "Båda är kemiska peelingmedel. Tillsammans orsakar de svår hudirritation, rodnad och kan skada hudbarriären — särskilt på natten när huden är som mest sårbar.",
  "dangerZone.combo2Risk":
    "Bensoylperoxid oxiderar retinol och gör det inaktivt. Du betalar för två produkter som tar ut varandra — och torkar ut din hud på köpet.",
  "dangerZone.combo3Risk":
    "Glykolsyra och mjölksyra ökar UV-känsligheten med upp till 50 %. Att använda dem utan solskydd ökar markant risken för solskador, hyperpigmentering och hudcancer.",
  "dangerZone.combo4Risk":
    "Omdebatterat. Vissa studier visar att de kan bilda niacin när de blandas vid hög temperatur, vilket kan orsaka rodnad. Säkrast att använda vid olika tider på dygnet.",
  "dangerZone.combo5Risk":
    "Båda konkurrerar om samma oxidationsväg, vilket minskar varandras ljusgörande effekt. Tillsammans kan de också öka känsligheten och ge oväntad irritation.",

  // ───── Disaster mix ─────
  "disasterMix.badge": "Katastrofmix",
  "disasterMix.titleLine1": "Rutinen som säljer i miljoner —",
  "disasterMix.titleItalic": "och tyst skadar huden.",
  "disasterMix.subtitle":
    "De här tre produkterna köps konsekvent ihop. De säljs i samma butik och rekommenderas i samma ”nybörjarguider till hudvård”. De är också en kliniskt dokumenterad katastrofkombination.",
  "disasterMix.theRoutine": "Rutinen",
  "disasterMix.rolePmSerum": "Kvällsserum",
  "disasterMix.roleAmPm": "Behandling morgon/kväll",
  "disasterMix.rolePmExfoliant": "Kvällspeeling",
  "disasterMix.whatHappens": "Det här händer när du använder dem ihop",
  "disasterMix.bp1Title": "Bensoylperoxid oxiderar retinol — direkt",
  "disasterMix.bp1Body":
    "De två aktiva ingredienserna inaktiverar varandra vid kontakt. Retinolen blir verkningslös — men båda produkterna fortsätter att strippa och torka ut din hud. Du får skadan utan effekten.",
  "disasterMix.bp2Title": "Retinol + salicylsyra + AHA = trippel peeling",
  "disasterMix.bp2Body":
    "Tre peelingmedel i samma rutin orsakar allvarlig barriärstörning. Resultatet: rodnad, fjällning, ökad UV-känslighet och en spiral av nya köp för att laga skadorna de orsakat.",
  "disasterMix.cta": "Gör din rutin det här mot din hud?",
  "disasterMix.ctaButton": "Skanna din rutin",

  // ───── My Shelf section ─────
  "myShelfMkt.kickerYour": "Din rutin",
  "myShelfMkt.kickerSoon": "Kommer snart",
  "myShelfMkt.titleLine1": "Din personliga",
  "myShelfMkt.titleItalic": "hudvårdshylla.",
  "myShelfMkt.body":
    "Sluta testa kombinationer i ansiktet. Min hylla låter dig bygga hela din rutin digitalt — och kollar varje ny produkt mot allt du redan använder, innan du köper den.",
  "myShelfMkt.feature1": "Organisera dina morgon- och kvällsrutiner på ett ställe",
  "myShelfMkt.feature2":
    "Skanna en ny produkt eller dess streckkod i butiken — se direkt om den krockar med din hylla",
  "myShelfMkt.feature3": "Få säkerhetslarm när nya konflikter upptäcks i din rutin",
  "myShelfMkt.feature4":
    "Ladda ner en personlig PDF-säkerhetsrapport att dela med din dermatolog",
  "myShelfMkt.feature5":
    "Fråga vår AI-dermatolog vad som helst om dina ingredienser — med stöd av peer-reviewad forskning",
  "myShelfMkt.signInToStart": "Logga in för att starta din hylla",
  "myShelfMkt.signedInAs": "Inloggad som {name}",
  "myShelfMkt.shelfWaitingTitle": "Din hylla väntar",
  "myShelfMkt.shelfWaitingBody": "Logga in för att börja bygga din personliga hudvårdsrutin.",
  "myShelfMkt.signInToGetStarted": "Logga in för att komma igång",

  // ───── Earn premium ─────
  "earnPremium.kicker": "Hjälp gemenskapen · Tjäna gratis premium",
  "earnPremium.titleLine1": "Bygg databasen.",
  "earnPremium.titleItalic": "Tjäna gratis premium.",
  "earnPremium.subtitle":
    "Varje produkt du bidrar med hjälper tusentals människor undvika hudskadliga kombinationer.",
  "earnPremium.privateTitle": "Din privata hudvårdshylla",
  "earnPremium.privateBody":
    "Spara varje produkt du använder. Chimiq kontrollerar hela din rutin för konflikter och flaggar risker innan de skadar din hud.",
  "earnPremium.privateBullet1": "Privat för dig — delas aldrig",
  "earnPremium.privateBullet2":
    "AI-driven konfliktanalys baserad på peer-reviewad forskning",
  "earnPremium.privateBullet3": "Skanna varje ny produkt innan du köper den",
  "earnPremium.contribTitlePart1": "Lägg till 30 nya produkter =",
  "earnPremium.contribTitlePart2": "1 månad premium gratis",
  "earnPremium.contribBody":
    "Hjälp oss crowdsourca världens största databas över hudvårdsingredienser. Varje ny produkt behöver:",
  "earnPremium.contribBullet1Bold": "Produktnamn",
  "earnPremium.contribBullet1Rest": "& varumärke",
  "earnPremium.contribBullet2Bold": "Streckkod",
  "earnPremium.contribBullet2Rest": "(så andra kan hitta den)",
  "earnPremium.contribBullet3Bold": "Foto",
  "earnPremium.contribBullet3Rest": "av förpackningen",
  "earnPremium.contribBullet4Bold": "Fullständig innehållsförteckning",
  "earnPremium.contribBullet4Rest": "",
  "earnPremium.signInToContribute": "Logga in för att bidra",
  "earnPremium.startContributing": "Börja bidra",

  // ───── Footer ─────
  "footer.thanks": "Tack — vi hör av oss.",
  "footer.getInTouch": "Kontakta oss",
  "footer.namePlaceholder": "Ditt namn",
  "footer.emailPlaceholder": "din@email.com",
  "footer.messagePlaceholder": "Vad har du på hjärtat?",
  "footer.send": "Skicka meddelande",
  "footer.copyright": "© {year} Chimiq. Smartare hudvård börjar här.",
  "footer.skincare": "Hudvård",
  "footer.hair": "Hår",
  "footer.household": "Hushåll",
  "footer.comingSoon": "(kommer snart)",
  "footer.aboutChimiq":
    "Chimiq är den första Chimiq-produkten. Vi skannar innehållsförteckningar i flera kategorier — för det du sätter på din hud, ditt hår och i ditt hem spelar roll.",
  "footer.contactSubject": "Förfrågan till Chimiq",
  "howItWorks.demoPair": "Retinol + glykolsyra",
  "howItWorks.demoSubtitle": "Försämrar retinolens effekt",

  // ───── Toast ─────
  "toast.welcomePremium": "Välkommen till Premium!",
  "toast.welcomePremiumDesc":
    "Ditt abonnemang har uppgraderats. Njut av obegränsade hyllprodukter, AI-chatt och mer.",

  // ───── Pricing page ─────
  "pricing.backToChimiq": "Tillbaka till Chimiq",
  "pricing.headline": "Enkel, ärlig prissättning",
  "pricing.subhead":
    "Börja gratis. Uppgradera när du vill ha hela kraften i din personliga dermatologi-assistent.",
  "pricing.kicker": "Priser",
  "pricing.sectionHeadline": "Gratis att börja. Uppgradera när du är redo.",
  "pricing.sectionSub":
    "De flesta klarar sig långt med gratisversionen. Men om hyllan växer har Premium dig täckt.",
  "pricing.free": "Gratis",
  "pricing.zeroPrice": "0 kr",
  "pricing.perMonth": "/månad",
  "pricing.noCard": "Inget kort krävs. Alltid gratis.",
  "pricing.currentPlan": "Ditt nuvarande abonnemang",
  "pricing.includedWithPremium": "Ingår i Premium",
  "pricing.included": "Ingår",
  "pricing.premium": "Premium",
  "pricing.bestValue": "Bästa värdet",
  "pricing.mostPopular": "Mest populärt",
  "pricing.monthly": "Månadsvis",
  "pricing.yearly": "Årsvis",
  "pricing.save98": "Spara 98 kr",
  "pricing.year": "år",
  "pricing.month": "månad",
  "pricing.yearlyHint": "≈ 41 kr/mån, faktureras årsvis. Avsluta när du vill.",
  "pricing.monthlyHint": "Faktureras månadsvis. Avsluta när du vill.",
  "pricing.yearlyHintShort": "≈ 41 kr/mån · avsluta när du vill",
  "pricing.cancelAnytime": "Avsluta när du vill",
  "pricing.youreOnPremium": "Du har Premium",
  "pricing.redirecting": "Skickar vidare…",
  "pricing.getPremiumYr": "Skaffa Premium — 490 kr/år",
  "pricing.getPremiumMo": "Skaffa Premium — 49 kr/mån",
  "pricing.securePayment": "Säker betalning via Stripe · Avsluta när du vill",
  "pricing.secureFooter":
    "Säkra betalningar via Stripe · Ingen abonnemangsbindning · Säg upp med ett klick",
  "pricing.errorGeneric": "Något gick fel. Försök igen.",
  "pricing.errorConnect": "Kunde inte ansluta till betaltjänsten. Försök igen.",
  "pricing.errorGenericShort": "Något gick fel.",
  "pricing.errorConnectShort": "Kunde inte ansluta till betaltjänsten.",

  "pricing.feat.safetyAnalysis": "Analys av ingredienssäkerhet",
  "pricing.feat.compare2": "Jämför 2 produkter samtidigt",
  "pricing.feat.compare2SideBySide": "Jämför 2 produkter (sida vid sida)",
  "pricing.feat.findDerm": "Hitta en dermatolog",
  "pricing.feat.barcode": "Streckkodsskanner",
  "pricing.feat.shelfLimited": "Min hylla (upp till 2 produkter)",
  "pricing.feat.shelfUnlimited": "Obegränsade hyllprodukter",
  "pricing.feat.routineCheck": "Korskontroll av hela rutinen",
  "pricing.feat.aiChatWith": "AI-chatt med Chimiq",
  "pricing.feat.aiChat": "AI-chatt",
  "pricing.feat.pdf": "PDF-säkerhetsrapport",
  "pricing.feat.everythingFree": "Allt i Gratis",

  "pricing.highlight1Title": "Obegränsad hylla",
  "pricing.highlight1Desc": "Spåra hela din hudvårdsrutin — utan gränser.",
  "pricing.highlight2Title": "AI-chatt",
  "pricing.highlight2Desc": "Fråga vad som helst om din rutin. Få svar med expertstöd.",
  "pricing.highlight3Title": "PDF-rapporter",
  "pricing.highlight3Desc":
    "Ladda ner och dela hela din rutinanalys med din dermatolog.",

  "pricingSection.kicker": "Pris",
  "pricingSection.title": "Gratis att börja. Uppgradera när du vill.",
  "pricingSection.subtitle":
    "De flesta behöver aldrig mer än gratisversionen. Men om hyllan växer har Premium dig täckt.",

  // ───── Discover page ─────
  "discoverPage.backHome": "Hem",
  "discoverPage.kicker": "Upptäck",
  "discoverPage.title": "Hudvårdens sanningar ingen berättat för dig.",
  "discoverPage.subtitle":
    "Två tidlösa guider — misstagen som tyst skadar huden och oron vi hör mest. Klart språk, riktiga lösningar, ingen influencer-fluff.",
  "discoverPage.mistakesH2": "Topp 10 hudvårdsmisstag",
  "discoverPage.mistakesSub":
    "De vanligaste — och mest skadliga — vanorna i moderna rutiner.",
  "discoverPage.worriesH2": "Topp 10 hudoroligheter",
  "discoverPage.worriesSub": "De bekymmer vi hör mest om — och vad som faktiskt hjälper.",
  "discoverPage.readMore": "Läs mer",

  // ───── Discover detail ─────
  "discoverDetail.topMistakes": "Topp 10 misstag",
  "discoverDetail.topWorries": "Topp 10 oroligheter",
  "discoverDetail.theProblem": "Problemet",
  "discoverDetail.whyItMatters": "Därför spelar det roll",
  "discoverDetail.source": "Källa:",
  "discoverDetail.theFixSteps": "Lösningen — i {n} steg",
  "discoverDetail.notFoundTitle": "Vi kunde inte hitta det.",
  "discoverDetail.notFoundBody": "Sidan du letar efter kan ha flyttats.",
  "discoverDetail.backToTopMistakes": "Tillbaka till topp-misstagen",
  "discoverDetail.backToTopWorries": "Tillbaka till topp-oroligheterna",
  "discoverDetail.discoverNav": "Upptäck",
  "discoverDetail.share": "Dela",
  "discoverDetail.linkCopied": "Länk kopierad",

  // ───── Recipes ─────
  "recipes.title": "DIY-recept",
  "recipes.subtitle":
    "Hemmagjorda formler från gemenskapen, skannade av vår AI och granskade av Chimiqs admins.",
  "recipes.share": "Dela",
  "recipes.filters": "Filter",
  "recipes.clearFilters": "Rensa filter",
  "recipes.category": "Kategori",
  "recipes.skinType": "Hudtyp",
  "recipes.riskLevel": "Risknivå",
  "recipes.errorLoad": "Kunde inte ladda recepten.",
  "recipes.empty":
    "Inga recept matchar de här filtren ännu. Prova att rensa dem eller bli först med att dela ett.",
  "recipes.ingredient_one": "{n} ingrediens",
  "recipes.ingredient_other": "{n} ingredienser",
  "recipes.badgeSafe": "Säker",
  "recipes.badgeCaution": "Varning",
  "recipes.badgeHighRisk": "Hög risk",
  "recipes.cat.all": "alla",
  "recipes.cat.cleanser": "rengöring",
  "recipes.cat.toner": "ansiktsvatten",
  "recipes.cat.serum": "serum",
  "recipes.cat.moisturizer": "fuktkräm",
  "recipes.cat.mask": "mask",
  "recipes.cat.exfoliant": "peeling",
  "recipes.cat.oil": "olja",
  "recipes.cat.balm": "balsam",
  "recipes.cat.mist": "ansiktsmist",
  "recipes.cat.scrub": "skrubb",
  "recipes.cat.other": "övrigt",
  "recipes.skin.all": "alla",
  "recipes.skin.dry": "torr",
  "recipes.skin.oily": "fet",
  "recipes.skin.combination": "blandhud",
  "recipes.skin.sensitive": "känslig",
  "recipes.skin.normal": "normal",
  "recipes.risk.all": "alla",
  "recipes.risk.safe": "säker",
  "recipes.risk.caution": "varning",
  "recipes.risk.high_risk": "hög risk",

  // ───── Recipe detail ─────
  "recipeDetail.headerLoading": "Recept",
  "recipeDetail.allRecipes": "Alla recept",
  "recipeDetail.errorLoad": "Kunde inte ladda receptet.",
  "recipeDetail.errorFallback": "Receptet hittades inte.",
  "recipeDetail.aiSafetyScan": "AI-säkerhetsskanning: {label}",
  "recipeDetail.flagged": "Flaggade ingredienser",
  "recipeDetail.saferSwaps": "Säkrare alternativ",
  "recipeDetail.replacePrefix": "Byt ut",
  "recipeDetail.replaceWith": "mot",
  "recipeDetail.ingredients": "Ingredienser",
  "recipeDetail.method": "Metod",
  "recipeDetail.editorsNote": "Redaktörens kommentar",
  "recipeDetail.disclaimer":
    "DIY-recepten är användarbidrag. Plåstertesta på en liten yta innan du applicerar i ansiktet och avbryt direkt om irritation uppstår.",
  "recipeDetail.riskSafe": "Ser säkert ut",
  "recipeDetail.riskCaution": "Använd försiktigt",
  "recipeDetail.riskHigh": "Hög risk",

  // ───── Browse ─────
  "browse.title": "Bläddra bland produkter",
  "browse.subtitle":
    "Crowdsourcad ingrediensdatabas — sök, filtrera, bidra.",
  "browse.searchPlaceholder": "Sök efter produkt eller varumärke…",
  "browse.cat.all": "Alla",
  "browse.cat.cleanser": "Rengöring",
  "browse.cat.toner": "Ansiktsvatten",
  "browse.cat.serum": "Serum",
  "browse.cat.moisturizer": "Fuktkräm",
  "browse.cat.sunscreen": "Solskydd",
  "browse.cat.exfoliant": "Peeling",
  "browse.cat.mask": "Mask",
  "browse.cat.other": "Hudvård",
  "browse.loadingDb": "Laddar databasen…",
  "browse.matches_one": "{count} träff för ”{q}”",
  "browse.matches_other": "{count} träffar för ”{q}”",
  "browse.categoryProducts": "{count} produkter i kategorin {category}",
  "browse.totalProducts": "{count} produkter i databasen",
  "browse.addProduct": "Lägg till produkt",
  "browse.errorLoad":
    "Kunde inte ladda produkter. Kontrollera anslutningen och försök igen.",
  "browse.noProductsFound": "Inga produkter hittades",
  "browse.dbEmpty": "Databasen är tom",
  "browse.beFirst":
    "Bli först med att lägga till denna — tjäna kredit mot en månads gratis Premium.",
  "browse.addAProduct": "Lägg till en produkt",
  "browse.openProduct": "Öppna {brand} {name}",
  "browse.verifiedSafe": "Verifierat säker",
  "browse.added": "Tillagd {time}",
  "browse.timeJustNow": "just nu",
  "browse.timeHoursAgo": "{n}h sedan",
  "browse.timeDaysAgo": "{n}d sedan",
  "browse.timeMonthsAgo": "{n}mån sedan",
  "browse.timeYearsAgo": "{n}år sedan",

  // ───── Browse detail ─────
  "browseDetail.headerTitle": "Produktdetaljer",
  "browseDetail.backToBrowse": "Tillbaka till bläddra",
  "browseDetail.errorNotFound": "Vi kunde inte hitta den produkten.",
  "browseDetail.errorLoad":
    "Kunde inte ladda produkten. Kontrollera anslutningen och försök igen.",
  "browseDetail.barcodeLabel": "Streckkod {code}",
  "browseDetail.scanCta": "Skanna produkten mot min hud",
  "browseDetail.scanHint": "Vi kör analysen igen med din hudprofil.",
  "browseDetail.fullIngredients": "Fullständig innehållsförteckning",

  // ───── Leaderboard ─────
  "leaderboard.title": "Topplista",
  "leaderboard.subtitle": "De främsta bidragsgivarna till Chimiqs ingrediensdatabas.",
  "leaderboard.backToDiscover": "Tillbaka till Upptäck",
  "leaderboard.howRewardsWork": "Så funkar belöningarna",
  "leaderboard.bestTipBadge": "Veckans bästa tips",
  "leaderboard.bestTipMeta_one":
    "av {name} · {count} röst · vann 30 dagar Premium",
  "leaderboard.bestTipMeta_other":
    "av {name} · {count} röster · vann 30 dagar Premium",
  "leaderboard.bestTipEmpty":
    "Förra veckans vinnare avslöjas på måndag — fortsätt rösta på dina favorittips!",
  "leaderboard.thisMonth": "Denna månad",
  "leaderboard.allTime": "Genom tiderna",
  "leaderboard.emptyMonth":
    "Inga bidrag denna månad ännu. Bli först med att skanna en saknad produkt!",
  "leaderboard.emptyAllTime":
    "Inga bidrag ännu. Bli först med att skanna en saknad produkt!",
  "leaderboard.products": "produkter",
  "leaderboard.footnote":
    "Varje godkänt bidrag räknas. 30 = en gratis månad Premium.",
  "leaderboard.periodAria": "Topplisteperiod",

  // ───── Problems ─────
  "problems.title": "Vanliga problem",
  "problems.subtitle": "Topp 10 misstag och oroligheter — på en överblick.",
  "problems.backToScanner": "Tillbaka till skannern",
  "problems.tabMistakes": "Topp-misstag",
  "problems.tabWorries": "Topp-oroligheter",
  "problems.whatToDo": "Det här gör du",
  "problems.scanProductNow": "Skanna en produkt nu",
  "problems.swipeMore": "Svep för att se mer →",
  "problems.categoryAria": "Kategori för vanliga problem",

  // ───── Recipe submit ─────
  "recipeSubmit.headerLoading": "Skicka in ett recept",
  "recipeSubmit.headerSuccess": "Recept inskickat",
  "recipeSubmit.shareTitle": "Dela ett DIY-recept",
  "recipeSubmit.shareSubtitle":
    "Hjälp andra hitta säkra, beprövade hemmaformler. Vår AI skannar säkerheten innan en admin granskar.",
  "recipeSubmit.verifyEmailTitle": "Verifiera din e-post först",
  "recipeSubmit.verifyEmailBody":
    "För att hålla vårt DIY-receptbibliotek säkert ber vi bidragsgivare att verifiera sin e-post hos sin inloggningsleverantör innan de skickar in.",
  "recipeSubmit.backToProfile": "Tillbaka till profilen",
  "recipeSubmit.errorTitleShort": "Ge ditt recept en titel (minst 3 tecken).",
  "recipeSubmit.errorMin2": "Ange minst 2 ingredienser.",
  "recipeSubmit.errorMethodShort":
    "Beskriv hur receptet tillverkas och appliceras (minst 10 tecken).",
  "recipeSubmit.errorSkinType": "Välj minst en hudtyp.",
  "recipeSubmit.errorSubmit": "Kunde inte skicka in receptet.",
  "recipeSubmit.errorNetwork": "Nätverksfel. Försök igen.",
  "recipeSubmit.thanksHeadline": "Tack — ditt recept ligger i granskningskön.",
  "recipeSubmit.thanksBodyWithVerdict":
    "En admin granskar AI-säkerhetsskanningen och ditt recept innan det publiceras. Du ser det bland dina bidrag när det är godkänt.",
  "recipeSubmit.thanksBodyNoVerdict":
    "En admin granskar ditt recept innan det publiceras. Du ser det bland dina bidrag när det är godkänt.",
  "recipeSubmit.scannerOffline":
    "Vår AI-säkerhetsskanner är tillfälligt otillgänglig, men ditt recept är sparat. En admin granskar det manuellt.",
  "recipeSubmit.scannerCouldnt":
    "Vår AI-säkerhetsskanner kunde inte ge ett utlåtande den här gången, men ditt recept är sparat. En admin granskar det manuellt.",
  "recipeSubmit.submitAnother": "Skicka in ett till",
  "recipeSubmit.recipeTitleLabel": "Recepttitel",
  "recipeSubmit.recipeTitlePlaceholder": "t.ex. Lugnande havre- och honungsmask",
  "recipeSubmit.categoryLabel": "Kategori",
  "recipeSubmit.skinTypesLabel": "Hudtyper",
  "recipeSubmit.ingredientsLabel": "Ingredienser ({count})",
  "recipeSubmit.add": "Lägg till",
  "recipeSubmit.ingredientPlaceholder": "Ingrediens",
  "recipeSubmit.amountPlaceholder": "Mängd",
  "recipeSubmit.notesPlaceholder": "Anteckningar (valfritt)",
  "recipeSubmit.removeIngredient": "Ta bort ingrediens",
  "recipeSubmit.methodLabel": "Metod (valfritt)",
  "recipeSubmit.methodPlaceholder": "Beskriv hur du blandar och applicerar…",
  "recipeSubmit.whatNext": "Vad händer härnäst",
  "recipeSubmit.whatNextBody":
    "Vår AI skannar receptet efter säkerhetsproblem. Sen granskar och godkänner en Chimiq-admin det innan det syns i det publika biblioteket.",
  "recipeSubmit.scanAndSave": "Skannar & sparar…",
  "recipeSubmit.submitForReview": "Skicka för granskning",
  "recipeSubmit.editTitle": "Redigera ditt recept",
  "recipeSubmit.editSubtitle":
    "Uppdatera receptet och skicka in det igen för granskning. AI-säkerhetsskanningen körs på nytt.",
  "recipeSubmit.adminNoteLabel": "Granskarens kommentar",
  "recipeSubmit.resubmitForReview": "Skicka in på nytt",
  "recipeSubmit.editNotFound": "Vi hittade inte det receptet på ditt konto.",
  "recipeSubmit.editNotEditable":
    "Det här receptet kan inte längre redigeras (redan godkänt eller avvisat).",
  "recipeSubmit.editLoadFailed": "Kunde inte ladda ditt recept. Försök igen.",

  // ───── Rewards ─────
  "rewards.headline": "Så funkar belöningarna",
  "rewards.sub": "Tre enkla sätt att tjäna gratis Premium och bli sedd i Chimiq.",
  "rewards.contribTitle": "Bidra med produkter",
  "rewards.contribBody":
    "Skanna produkter som inte finns i vår databas. Varje godkänt bidrag räknas. Vid 30 godkända bidrag får du en hel månad Premium — gratis.",
  "rewards.tipsTitle": "Dela bra tips",
  "rewards.tipsBody":
    "Posta korta hudvårdstips i Tips-flödet. Community röstar upp sina favoriter. Varje måndag vinner det mest uppröstade tipset från föregående vecka Veckans bästa tips — författaren får en månad Premium och Verifierad Tipsare-märket.",
  "rewards.badgesTitle": "Samla märken",
  "rewards.badge1Title": "Första skanningen",
  "rewards.badge1Body": "Skicka in ditt första godkända bidrag.",
  "rewards.badge2Title": "10 produkter",
  "rewards.badge2Body": "Nå 10 godkända bidrag.",
  "rewards.badge3Title": "30 produkter",
  "rewards.badge3Body": "Nå 30 — och få en månad gratis.",
  "rewards.badge4Title": "100 produkter",
  "rewards.badge4Body": "Nå 100. Databashjälten.",
  "rewards.badge5Title": "Topp 10 denna månad",
  "rewards.badge5Body": "Avsluta en månad i topp 10.",
  "rewards.badge6Title": "Verifierad Tipsare",
  "rewards.badge6Body": "Vinn Veckans bästa tips.",
  "rewards.rulesTitle": "Husregler",
  "rewards.rule1": "En röst per tips. Du kan inte rösta på egna tips.",
  "rewards.rule2": "Max 5 tips per dag — fokusera på kvalitet.",
  "rewards.rule3":
    "Dubbla eller redan kända produkter räknas inte mot 30-bidragsmålet.",
  "rewards.rule4": "Premium-månader läggs ovanpå tid du redan har kvar.",

  // ───── Legal consent gate ─────
  "consent.title": "Innan du fortsätter",
  "consent.intro":
    "Chimiq är ett välmåendeverktyg, inte en ersättning för medicinsk rådgivning. Bekräfta att du har läst våra villkor innan du loggar in.",
  "consent.checkboxPrefix": "Jag godkänner ",
  "consent.linkTerms": "användarvillkoren",
  "consent.linkPrivacy": "integritetspolicyn",
  "consent.checkboxAnd": " och ",
  "consent.linkDisclaimer": "den medicinska ansvarsfriskrivningen",
  "consent.checkboxSuffix": ".",
  "consent.continue": "Godkänn & fortsätt",
  "consent.cancel": "Avbryt",

  // ───── Footer legal links ─────
  "footer.legalHeading": "Juridik",
  "footer.legalPrivacy": "Integritetspolicy",
  "footer.legalTerms": "Användarvillkor",
  "footer.legalDisclaimer": "Medicinsk ansvarsfriskrivning",

  // ───── Legal pages (shared chrome) ─────
  "legal.lastUpdated": "Senast uppdaterad: {date}",
  "legal.contactPlaceholder": "Kontakt: legal@chimiq.com",
  "legal.backToApp": "Tillbaka",
  "legal.privacyTitle": "Integritetspolicy",
  "legal.termsTitle": "Användarvillkor",
  "legal.disclaimerTitle": "Medicinsk ansvarsfriskrivning",

  // ───── Profile -> Your DIY recipes (#69 / #70 / #78) ─────
  "myRecipes.heading": "Dina DIY-recept",
  "myRecipes.unseenAria": "{count} nya uppdateringar",
  "myRecipes.status.approved": "Godkänt",
  "myRecipes.status.rejected": "Avvisat",
  "myRecipes.status.changesRequested": "Ändringar begärda",
  "myRecipes.status.underReview": "Under granskning",
  "myRecipes.reviewerNote": "Granskarens kommentar:",
  "myRecipes.editAndResubmit": "Redigera och skicka igen",
  "myRecipes.viewPublic": "Visa publik sida",
  "myRecipes.editWhilePending": "Redigera under granskning",
};

const fr: Dict = {
  // ───── Tabs ─────
  "tabs.scan": "Scanner",
  "tabs.browse": "Parcourir",
  "tabs.discover": "Découvrir",
  "tabs.profile": "Profil",

  // ───── Common ─────
  "common.signIn": "Se connecter",
  "common.logOut": "Se déconnecter",
  "common.back": "Retour",
  "common.share": "Partager",
  "common.linkCopied": "Lien copié",
  "common.loading": "Chargement…",

  // ───── Severity / frequency ─────
  "severity.HIGH": "Risque élevé",
  "severity.MEDIUM": "Attention",
  "severity.LOW": "À savoir",
  "frequency.VERY_COMMON": "Très courant",
  "frequency.COMMON": "Courant",
  "frequency.EMERGING": "Préoccupation émergente",

  // ───── In-app ─────
  "scan.title": "Scanner un produit",
  "scan.subtitle":
    "Photographiez une étiquette, collez des ingrédients ou comparez deux produits.",

  "shelf.titleGreeting": "Bonjour, {name}",
  "shelf.subtitle":
    "Votre étagère — suivez votre routine et vérifiez les conflits.",

  "discover.title": "Découvrir",
  "discover.subtitle":
    "Conseils, soins d'experts et apprentissage d'une routine plus sûre.",
  "discover.shareTip": "Partager un conseil",
  "discover.tipPlaceholder": "Quel conseil de routine recommanderiez-vous ?",
  "discover.tipAriaLabel": "Votre conseil",
  "discover.post": "Publier",
  "discover.rewards": "Récompenses",
  "discover.topTips": "Meilleurs conseils",
  "discover.last30Days": "30 derniers jours",
  "discover.emptyTips":
    "Aucun conseil pour l'instant. Soyez le premier à en partager un — le conseil le plus voté chaque semaine gagne un mois gratuit de Premium.",
  "discover.aiAskAnything": "Posez une question",
  "discover.aiTitle": "Discutez avec l'IA Chimiq",
  "discover.aiSubtitle":
    "Obtenez des réponses fondées sur des preuves concernant votre étagère, les interactions entre ingrédients et le moment de votre routine.",
  "discover.aiHint": "Touchez la bulle de chat pour commencer",
  "discover.leaderboardTitle": "Classement",
  "discover.leaderboardSubtitle":
    "Voyez les meilleurs contributeurs et le meilleur conseil de la semaine.",
  "discover.tipBy": "par",
  "discover.upvoteTip": "Soutenir ce conseil",
  "discover.removeVote": "Retirer le vote",
  "discover.tipMinError": "Les conseils doivent contenir au moins {min} caractères.",
  "discover.tipPostError": "Impossible de publier le conseil.",
  "discover.tipNetworkError": "Erreur réseau. Réessayez.",
  "discover.footnote":
    "Recettes DIY, erreurs courantes et plus encore dans l'application.",

  "profile.title": "Profil",
  "profile.subtitle": "Votre compte, votre forfait et vos contributions.",
  "profile.language": "Langue",

  "homeStandalone.kicker": "Scanner d'ingrédients par IA",
  "homeStandalone.body":
    "Photographiez n'importe quelle étiquette de soin. Nous signalons les conflits et proposons des alternatives plus sûres en quelques secondes.",
  "homeStandalone.cta": "Se connecter & commencer à scanner",
  "homeStandalone.priceNote": "Gratuit pour démarrer · Premium 49 SEK/mois",

  "notFound.title": "404 Page introuvable",
  "notFound.body": "Avez-vous oublié d'ajouter la page au routeur ?",

  // Marketing nav
  "nav.howItWorks": "Comment ça marche",
  "nav.tryItNow": "Essayer maintenant",
  "nav.discover": "Découvrir",
  "nav.earnFreePremium": "Gagner du premium gratuit",
  "nav.myShelf": "Mon étagère",
  "nav.signInGetStarted": "Se connecter / Commencer gratuitement",
  "nav.tryItNowArrow": "Essayer maintenant →",
  "nav.seeHowItWorks": "Voir comment ça marche",
  "auth.signIn": "Se connecter",
  "auth.logOut": "Se déconnecter",

  "hero.badge": "Scanner d'ingrédients sécurisé par IA",
  "hero.conflict": "⚠ Conflit",

  // Variant: general
  "landing.general.heroHeadline": "40 produits. 400 ingrédients.",
  "landing.general.heroHeadlineItalic":
    "Savez-vous ce qu'ils se font les uns aux autres ?",
  "landing.general.heroSubhead":
    "Chimiq analyse vos soins et détecte les combinaisons dangereuses — avant qu'elles n'atteignent votre peau.",
  "landing.general.heroCta": "Accès anticipé",
  "landing.general.goalHeadline": "Une peau saine a besoin de moins, pas plus.",
  "landing.general.goalBody":
    "Avec les bons produits et les bonnes combinaisons, une routine en 3 étapes suffit — pas 12. Une peau saine, c'est moins d'imperfections à camoufler. Moins de fond de teint. Moins de dépenses. Et moins de substances potentiellement nocives sur l'organe le plus fin et le plus absorbant de votre corps. Chimiq vous aide à acheter une fois, à acheter juste, et à briser la spirale.",
  "landing.general.scannerSubhead":
    "Collez deux listes d'ingrédients et regardez Chimiq détecter les conflits en quelques secondes — fondé sur la dermatologie et la recherche.",
  "landing.general.scannerCtaSingle": "Scanner les ingrédients",
  "landing.general.scannerCtaCompare": "Vérifier la compatibilité",

  // Variant: teen
  "landing.teen.heroHeadline": "Votre peau allait bien",
  "landing.teen.heroHeadlineItalic": "avant que vous suiviez leur routine.",
  "landing.teen.heroSubhead":
    "TikTok a recommandé 12 produits. Votre barrière cutanée n'en a jamais eu besoin que de 3. Chimiq vous montre ce que l'algorithme tait.",
  "landing.teen.heroCta": "Montrez-moi ce qu'il y a dans ma routine",
  "landing.teen.goalHeadline":
    "On vous a vendu une solution à un problème inexistant.",
  "landing.teen.goalBody":
    "Les influenceurs profitent de votre prochain achat. Pas de votre peau saine. Une routine à trois étapes avec les bons produits — un nettoyant, un hydratant et un SPF — suffit à la plupart des peaux. Chimiq vous aide à couper le bruit, à briser la spirale et à reprendre le contrôle de votre peau.",
  "landing.teen.scannerSubhead":
    "Collez les listes d'ingrédients de votre routine et découvrez si les produits qu'on vous a vendus travaillent — ou jouent contre vous.",
  "landing.teen.scannerCtaSingle": "Voir l'effet sur ma peau",
  "landing.teen.scannerCtaCompare": "Ces produits se combattent-ils ?",

  // Variant: mature
  "landing.mature.heroHeadline":
    "L'industrie de la beauté profite de vos doutes.",
  "landing.mature.heroHeadlineItalic": "Votre peau mérite mieux.",
  "landing.mature.heroSubhead":
    "Sous les sérums, le rétinol et les crèmes au collagène, certaines combinaisons font des dégâts en silence. Chimiq vous montre ce qui se passe vraiment.",
  "landing.mature.heroCta": "Dites-moi ce qu'il y a vraiment dans mes produits",
  "landing.mature.goalHeadline": "Moins, c'est plus. La science est d'accord.",
  "landing.mature.goalBody":
    "Des décennies de marketing nous ont fait croire que plus de produits = peau plus saine. La recherche dit l'inverse. Une routine simplifiée et sans conflits protège votre barrière, réduit l'inflammation et permet à vos actifs de réellement agir. Chimiq vous aide à épurer, à acheter juste et à laisser votre peau faire son travail.",
  "landing.mature.scannerSubhead":
    "Collez vos listes d'ingrédients et découvrez si votre routine anti-âge travaille avec votre peau — ou silencieusement contre elle.",
  "landing.mature.scannerCtaSingle": "Analyser ce produit",
  "landing.mature.scannerCtaCompare": "Vérifier les conflits",

  "landing.heroLine1": "Scannez les ingrédients.",
  "landing.heroLine2": "Construisez votre étagère.",
  "landing.heroItalic": "Repérez les conflits.",
  "landing.heroBody":
    "Connectez-vous, enregistrez les produits que vous utilisez, et laissez notre IA signaler les combinaisons dangereuses avant qu'elles n'abîment votre peau.",

  // ───── How it works ─────
  "howItWorks.title": "Comment fonctionne Chimiq",
  "howItWorks.subtitle": "Trois étapes. Quelques secondes. Aucune incertitude.",
  "howItWorks.scanTitle": "Scanner ou coller",
  "howItWorks.scanBody":
    "Photographiez votre liste d'ingrédients, scannez le code-barres ou choisissez parmi les produits populaires.",
  "howItWorks.routineTitle": "Construisez votre routine",
  "howItWorks.routineBody":
    "Ajoutez plusieurs produits pour voir comment ils interagissent — pas seulement ce qu'ils contiennent.",
  "howItWorks.risksTitle": "Voyez les risques",
  "howItWorks.risksBody":
    "Détection instantanée des conflits avec des notes claires rouge, jaune et verte — et que faire à la place.",

  "scannerSection.kicker": "Essayer maintenant",
  "scannerSection.brand": "CHIMIQ SCANNER",

  "dangerZone.title": "Ce que vous ignorez peut abîmer votre peau.",
  "dangerZone.subtitle":
    "Voici de vrais conflits documentés — ceux que votre dermatologue connaît, mais que l'industrie de la beauté n'évoque pas.",
  "dangerZone.severityHigh": "RISQUE ÉLEVÉ",
  "dangerZone.severityCaution": "PRUDENCE",
  "dangerZone.combo1Pair": "Rétinol + AHA/BHA",
  "dangerZone.combo2Pair": "Rétinol + peroxyde de benzoyle",
  "dangerZone.combo3Pair": "AHA sans protection solaire",
  "dangerZone.combo4Pair": "Vitamine C + niacinamide",
  "dangerZone.combo5Pair": "Acide kojique + vitamine C",
  "dangerCard.source": "Source :",
  "dangerZone.combo1Risk":
    "Les deux sont des exfoliants chimiques. Ensemble, ils provoquent une irritation sévère, des rougeurs et peuvent endommager la barrière cutanée — surtout la nuit, quand la peau est la plus vulnérable.",
  "dangerZone.combo2Risk":
    "Le peroxyde de benzoyle oxyde le rétinol et le rend inactif. Vous payez deux produits qui s'annulent — et qui assèchent votre peau au passage.",
  "dangerZone.combo3Risk":
    "L'acide glycolique et l'acide lactique augmentent la sensibilité aux UV jusqu'à 50 %. Sans SPF, le risque de dommages solaires, d'hyperpigmentation et de cancer de la peau augmente nettement.",
  "dangerZone.combo4Risk":
    "Très débattu. Certaines études montrent qu'ils peuvent former de la niacine à haute température, provoquant des bouffées vasomotrices. Le plus sûr est de les utiliser à des moments différents de la journée.",
  "dangerZone.combo5Risk":
    "Les deux empruntent la même voie d'oxydation, réduisant leur effet éclaircissant respectif. Combinés, ils peuvent aussi accroître la sensibilité et provoquer des irritations inattendues.",

  "disasterMix.badge": "Mélange catastrophe",
  "disasterMix.titleLine1": "La routine qui se vend par millions —",
  "disasterMix.titleItalic": "et abîme la peau en silence.",
  "disasterMix.subtitle":
    "Ces trois produits sont systématiquement achetés ensemble. Vendus dans les mêmes magasins, recommandés dans les mêmes guides « débutants ». C'est aussi une combinaison cliniquement désastreuse.",
  "disasterMix.theRoutine": "La routine",
  "disasterMix.rolePmSerum": "Sérum du soir",
  "disasterMix.roleAmPm": "Traitement matin/soir",
  "disasterMix.rolePmExfoliant": "Exfoliant du soir",
  "disasterMix.whatHappens": "Ce qui se passe quand on les combine",
  "disasterMix.bp1Title": "Le peroxyde de benzoyle oxyde le rétinol — instantanément",
  "disasterMix.bp1Body":
    "Ces deux actifs se désactivent au contact. Le rétinol devient inutile — mais les deux produits continuent de décaper et d'assécher votre peau. Vous obtenez les dégâts sans les bénéfices.",
  "disasterMix.bp2Title": "Rétinol + acide salicylique + AHA = triple exfoliation",
  "disasterMix.bp2Body":
    "Trois exfoliants dans une seule routine provoquent une rupture sévère de la barrière. Résultat : rougeurs, desquamation, sensibilité accrue aux UV — et un cycle d'achats pour réparer les dégâts qu'ils ont causés.",
  "disasterMix.cta": "Votre routine fait-elle ça à votre peau ?",
  "disasterMix.ctaButton": "Scannez votre routine",

  "myShelfMkt.kickerYour": "Votre routine",
  "myShelfMkt.kickerSoon": "Bientôt disponible",
  "myShelfMkt.titleLine1": "Votre étagère",
  "myShelfMkt.titleItalic": "soin personnelle.",
  "myShelfMkt.body":
    "Arrêtez de tester les combinaisons sur votre visage. Mon étagère vous permet de construire toute votre routine numériquement — et vérifie chaque nouveau produit par rapport à tout ce que vous utilisez déjà, avant de l'acheter.",
  "myShelfMkt.feature1":
    "Organisez vos routines du matin et du soir au même endroit",
  "myShelfMkt.feature2":
    "Scannez un nouveau produit ou son code-barres en magasin — voyez instantanément s'il entre en conflit avec votre étagère",
  "myShelfMkt.feature3":
    "Recevez des alertes lorsque de nouveaux conflits sont découverts dans votre routine",
  "myShelfMkt.feature4":
    "Téléchargez un rapport PDF personnalisé à partager avec votre dermatologue",
  "myShelfMkt.feature5":
    "Demandez à notre IA dermatologue ce que vous voulez sur vos ingrédients — appuyé par la recherche",
  "myShelfMkt.signInToStart": "Se connecter pour démarrer son étagère",
  "myShelfMkt.signedInAs": "Connecté en tant que {name}",
  "myShelfMkt.shelfWaitingTitle": "Votre étagère vous attend",
  "myShelfMkt.shelfWaitingBody":
    "Connectez-vous pour commencer à construire votre routine personnelle.",
  "myShelfMkt.signInToGetStarted": "Se connecter pour commencer",

  "earnPremium.kicker": "Aidez la communauté · Gagnez du premium gratuit",
  "earnPremium.titleLine1": "Construisez la base.",
  "earnPremium.titleItalic": "Gagnez du premium gratuit.",
  "earnPremium.subtitle":
    "Chaque produit que vous ajoutez aide des milliers de personnes à éviter les combinaisons dangereuses.",
  "earnPremium.privateTitle": "Votre étagère soin privée",
  "earnPremium.privateBody":
    "Enregistrez chaque produit que vous utilisez. Chimiq vérifie toute votre routine et signale les risques avant qu'ils n'abîment votre peau.",
  "earnPremium.privateBullet1": "Privée — jamais partagée",
  "earnPremium.privateBullet2":
    "Analyse de conflits par IA appuyée par la recherche évaluée par les pairs",
  "earnPremium.privateBullet3": "Scannez tout nouveau produit avant de l'acheter",
  "earnPremium.contribTitlePart1": "Ajoutez 30 nouveaux produits =",
  "earnPremium.contribTitlePart2": "1 mois de premium offert",
  "earnPremium.contribBody":
    "Aidez-nous à crowdsourcer la plus grande base de données d'ingrédients de soin. Chaque nouveau produit nécessite :",
  "earnPremium.contribBullet1Bold": "Nom du produit",
  "earnPremium.contribBullet1Rest": "& marque",
  "earnPremium.contribBullet2Bold": "Code-barres",
  "earnPremium.contribBullet2Rest": "(pour que d'autres le retrouvent)",
  "earnPremium.contribBullet3Bold": "Photo",
  "earnPremium.contribBullet3Rest": "de l'emballage",
  "earnPremium.contribBullet4Bold": "Liste complète des ingrédients",
  "earnPremium.contribBullet4Rest": "",
  "earnPremium.signInToContribute": "Se connecter pour contribuer",
  "earnPremium.startContributing": "Commencer à contribuer",

  "footer.thanks": "Merci — nous vous recontacterons.",
  "footer.getInTouch": "Nous contacter",
  "footer.namePlaceholder": "Votre nom",
  "footer.emailPlaceholder": "votre@email.com",
  "footer.messagePlaceholder": "Qu'avez-vous en tête ?",
  "footer.send": "Envoyer le message",
  "footer.copyright": "© {year} Chimiq. Une routine plus intelligente commence ici.",
  "footer.skincare": "Soins",
  "footer.hair": "Cheveux",
  "footer.household": "Maison",
  "footer.comingSoon": "(bientôt)",
  "footer.aboutChimiq":
    "Chimiq est le premier produit Chimiq. Nous analysons les listes d'ingrédients dans plusieurs catégories — parce que ce que vous mettez sur votre peau, vos cheveux et chez vous compte.",
  "footer.contactSubject": "Demande Chimiq",
  "howItWorks.demoPair": "Rétinol + acide glycolique",
  "howItWorks.demoSubtitle": "Réduit l'efficacité du rétinol",

  "toast.welcomePremium": "Bienvenue dans Premium !",
  "toast.welcomePremiumDesc":
    "Votre forfait a été mis à niveau. Profitez d'une étagère illimitée, du chat IA et plus encore.",

  // ───── Pricing ─────
  "pricing.backToChimiq": "Retour à Chimiq",
  "pricing.headline": "Tarifs simples et honnêtes",
  "pricing.subhead":
    "Commencez gratuitement. Passez à la version supérieure quand vous voulez la pleine puissance de votre assistant dermatologie.",
  "pricing.kicker": "Tarifs",
  "pricing.sectionHeadline": "Gratuit pour commencer. Passez à Premium quand vous êtes prêt.",
  "pricing.sectionSub":
    "La plupart des gens n'ont jamais besoin de plus que la version gratuite. Mais si votre routine s'étoffe, Premium est là pour vous.",
  "pricing.free": "Gratuit",
  "pricing.zeroPrice": "0 $",
  "pricing.perMonth": "/mois",
  "pricing.noCard": "Aucune carte requise. Toujours gratuit.",
  "pricing.currentPlan": "Votre forfait actuel",
  "pricing.includedWithPremium": "Inclus dans Premium",
  "pricing.included": "Inclus",
  "pricing.premium": "Premium",
  "pricing.bestValue": "Meilleure offre",
  "pricing.mostPopular": "Le plus populaire",
  "pricing.monthly": "Mensuel",
  "pricing.yearly": "Annuel",
  "pricing.save98": "Économisez 98 SEK",
  "pricing.year": "an",
  "pricing.month": "mois",
  "pricing.yearlyHint": "≈ 41 SEK/mois, facturé annuellement. Annulable à tout moment.",
  "pricing.monthlyHint": "Facturé mensuellement. Annulable à tout moment.",
  "pricing.yearlyHintShort": "≈ 41 SEK/mois · annulable à tout moment",
  "pricing.cancelAnytime": "Annulable à tout moment",
  "pricing.youreOnPremium": "Vous êtes en Premium",
  "pricing.redirecting": "Redirection…",
  "pricing.getPremiumYr": "Passer à Premium — 490 SEK/an",
  "pricing.getPremiumMo": "Passer à Premium — 49 SEK/mois",
  "pricing.securePayment": "Paiement sécurisé via Stripe · Annulable à tout moment",
  "pricing.secureFooter":
    "Paiements sécurisés via Stripe · Aucun engagement · Annulable en un clic",
  "pricing.errorGeneric": "Une erreur s'est produite. Réessayez.",
  "pricing.errorConnect": "Impossible de se connecter au service de paiement. Réessayez.",
  "pricing.errorGenericShort": "Une erreur s'est produite.",
  "pricing.errorConnectShort": "Impossible de se connecter au service de paiement.",

  "pricing.feat.safetyAnalysis": "Analyse de sécurité des ingrédients",
  "pricing.feat.compare2": "Comparer 2 produits à la fois",
  "pricing.feat.compare2SideBySide": "Comparer 2 produits (côte à côte)",
  "pricing.feat.findDerm": "Trouver un dermatologue",
  "pricing.feat.barcode": "Scanner de code-barres",
  "pricing.feat.shelfLimited": "Mon étagère (jusqu'à 2 produits)",
  "pricing.feat.shelfUnlimited": "Étagère illimitée",
  "pricing.feat.routineCheck": "Vérification croisée de la routine complète",
  "pricing.feat.aiChatWith": "Chat IA avec Chimiq",
  "pricing.feat.aiChat": "Chat IA",
  "pricing.feat.pdf": "Rapport PDF de sécurité",
  "pricing.feat.everythingFree": "Tout du forfait Gratuit",

  "pricing.highlight1Title": "Étagère illimitée",
  "pricing.highlight1Desc": "Suivez toute votre routine — sans limite.",
  "pricing.highlight2Title": "Chat IA",
  "pricing.highlight2Desc":
    "Posez toutes vos questions sur votre routine. Réponses appuyées par des experts.",
  "pricing.highlight3Title": "Rapports PDF",
  "pricing.highlight3Desc":
    "Téléchargez et partagez l'analyse complète de votre routine avec votre dermatologue.",

  "pricingSection.kicker": "Tarifs",
  "pricingSection.title": "Gratuit pour démarrer. Passez au supérieur quand vous voulez.",
  "pricingSection.subtitle":
    "La plupart n'ont jamais besoin d'autre chose que la version gratuite. Mais si votre étagère grandit, Premium est là.",

  // ───── Discover page ─────
  "discoverPage.backHome": "Accueil",
  "discoverPage.kicker": "Découvrir",
  "discoverPage.title": "Les vérités du soin que personne ne vous a dites.",
  "discoverPage.subtitle":
    "Deux guides intemporels — les erreurs qui abîment la peau en silence et les inquiétudes que nous entendons le plus. Langage clair, vraies solutions, sans bla-bla d'influence.",
  "discoverPage.mistakesH2": "Top 10 des erreurs en soin",
  "discoverPage.mistakesSub":
    "Les habitudes les plus courantes — et les plus dommageables — des routines modernes.",
  "discoverPage.worriesH2": "Top 10 des inquiétudes cutanées",
  "discoverPage.worriesSub":
    "Les préoccupations qu'on entend le plus — et ce qui aide vraiment.",
  "discoverPage.readMore": "Lire la suite",

  "discoverDetail.topMistakes": "Top 10 des erreurs",
  "discoverDetail.topWorries": "Top 10 des inquiétudes",
  "discoverDetail.theProblem": "Le problème",
  "discoverDetail.whyItMatters": "Pourquoi c'est important",
  "discoverDetail.source": "Source :",
  "discoverDetail.theFixSteps": "La solution — en {n} étapes",
  "discoverDetail.notFoundTitle": "Nous n'avons pas pu trouver cela.",
  "discoverDetail.notFoundBody": "La page que vous cherchez a peut-être été déplacée.",
  "discoverDetail.backToTopMistakes": "Retour aux erreurs principales",
  "discoverDetail.backToTopWorries": "Retour aux inquiétudes principales",
  "discoverDetail.discoverNav": "Découvrir",
  "discoverDetail.share": "Partager",
  "discoverDetail.linkCopied": "Lien copié",

  // ───── Recipes ─────
  "recipes.title": "Recettes DIY",
  "recipes.subtitle":
    "Formules maison partagées par la communauté, scannées par notre IA et vérifiées par les admins Chimiq.",
  "recipes.share": "Partager",
  "recipes.filters": "Filtres",
  "recipes.clearFilters": "Effacer les filtres",
  "recipes.category": "Catégorie",
  "recipes.skinType": "Type de peau",
  "recipes.riskLevel": "Niveau de risque",
  "recipes.errorLoad": "Impossible de charger les recettes.",
  "recipes.empty":
    "Aucune recette ne correspond à ces filtres pour l'instant. Essayez de les effacer ou soyez le premier à en partager une.",
  "recipes.ingredient_one": "{n} ingrédient",
  "recipes.ingredient_other": "{n} ingrédients",
  "recipes.badgeSafe": "Sûr",
  "recipes.badgeCaution": "Prudence",
  "recipes.badgeHighRisk": "Risque élevé",
  "recipes.cat.all": "tous",
  "recipes.cat.cleanser": "nettoyant",
  "recipes.cat.toner": "tonique",
  "recipes.cat.serum": "sérum",
  "recipes.cat.moisturizer": "hydratant",
  "recipes.cat.mask": "masque",
  "recipes.cat.exfoliant": "exfoliant",
  "recipes.cat.oil": "huile",
  "recipes.cat.balm": "baume",
  "recipes.cat.mist": "brume",
  "recipes.cat.scrub": "gommage",
  "recipes.cat.other": "autre",
  "recipes.skin.all": "toutes",
  "recipes.skin.dry": "sèche",
  "recipes.skin.oily": "grasse",
  "recipes.skin.combination": "mixte",
  "recipes.skin.sensitive": "sensible",
  "recipes.skin.normal": "normale",
  "recipes.risk.all": "tous",
  "recipes.risk.safe": "sûr",
  "recipes.risk.caution": "prudence",
  "recipes.risk.high_risk": "risque élevé",

  "recipeDetail.headerLoading": "Recette",
  "recipeDetail.allRecipes": "Toutes les recettes",
  "recipeDetail.errorLoad": "Impossible de charger la recette.",
  "recipeDetail.errorFallback": "Recette introuvable.",
  "recipeDetail.aiSafetyScan": "Analyse de sécurité IA : {label}",
  "recipeDetail.flagged": "Ingrédients signalés",
  "recipeDetail.saferSwaps": "Alternatives plus sûres",
  "recipeDetail.replacePrefix": "Remplacer",
  "recipeDetail.replaceWith": "par",
  "recipeDetail.ingredients": "Ingrédients",
  "recipeDetail.method": "Mode d'emploi",
  "recipeDetail.editorsNote": "Note de l'éditeur",
  "recipeDetail.disclaimer":
    "Les recettes DIY sont des contributions d'utilisateurs. Faites un test cutané avant d'appliquer sur le visage et arrêtez immédiatement en cas d'irritation.",
  "recipeDetail.riskSafe": "Semble sûr",
  "recipeDetail.riskCaution": "À utiliser avec prudence",
  "recipeDetail.riskHigh": "Risque élevé",

  "browse.title": "Parcourir les produits",
  "browse.subtitle":
    "Base d'ingrédients participative — recherchez, filtrez, contribuez.",
  "browse.searchPlaceholder": "Rechercher par produit ou marque…",
  "browse.cat.all": "Tous",
  "browse.cat.cleanser": "Nettoyant",
  "browse.cat.toner": "Tonique",
  "browse.cat.serum": "Sérum",
  "browse.cat.moisturizer": "Hydratant",
  "browse.cat.sunscreen": "SPF",
  "browse.cat.exfoliant": "Exfoliant",
  "browse.cat.mask": "Masque",
  "browse.cat.other": "Soin",
  "browse.loadingDb": "Chargement de la base…",
  "browse.matches_one": "{count} résultat pour « {q} »",
  "browse.matches_other": "{count} résultats pour « {q} »",
  "browse.categoryProducts": "{count} produits {category}",
  "browse.totalProducts": "{count} produits dans la base",
  "browse.addProduct": "Ajouter un produit",
  "browse.errorLoad":
    "Impossible de charger les produits. Vérifiez votre connexion et réessayez.",
  "browse.noProductsFound": "Aucun produit trouvé",
  "browse.dbEmpty": "La base est vide",
  "browse.beFirst":
    "Soyez le premier à l'ajouter — gagnez un crédit pour 1 mois gratuit de Premium.",
  "browse.addAProduct": "Ajouter un produit",
  "browse.openProduct": "Ouvrir {brand} {name}",
  "browse.verifiedSafe": "Vérifié sûr",
  "browse.added": "Ajouté {time}",
  "browse.timeJustNow": "à l'instant",
  "browse.timeHoursAgo": "il y a {n} h",
  "browse.timeDaysAgo": "il y a {n} j",
  "browse.timeMonthsAgo": "il y a {n} mois",
  "browse.timeYearsAgo": "il y a {n} ans",

  "browseDetail.headerTitle": "Détails du produit",
  "browseDetail.backToBrowse": "Retour au parcours",
  "browseDetail.errorNotFound": "Nous n'avons pas pu trouver ce produit.",
  "browseDetail.errorLoad":
    "Impossible de charger le produit. Vérifiez votre connexion et réessayez.",
  "browseDetail.barcodeLabel": "Code-barres {code}",
  "browseDetail.scanCta": "Scanner ce produit pour ma peau",
  "browseDetail.scanHint": "Nous relancerons l'analyse avec votre profil.",
  "browseDetail.fullIngredients": "Liste complète des ingrédients",

  "leaderboard.title": "Classement",
  "leaderboard.subtitle": "Meilleurs contributeurs à la base d'ingrédients Chimiq.",
  "leaderboard.backToDiscover": "Retour à Découvrir",
  "leaderboard.howRewardsWork": "Comment fonctionnent les récompenses",
  "leaderboard.bestTipBadge": "Meilleur conseil de la semaine",
  "leaderboard.bestTipMeta_one":
    "par {name} · {count} vote · a remporté 30 jours de Premium",
  "leaderboard.bestTipMeta_other":
    "par {name} · {count} votes · a remporté 30 jours de Premium",
  "leaderboard.bestTipEmpty":
    "Le ou la gagnant·e de la semaine dernière sera révélé·e lundi — continuez à voter !",
  "leaderboard.thisMonth": "Ce mois-ci",
  "leaderboard.allTime": "Tout temps",
  "leaderboard.emptyMonth":
    "Aucune contribution ce mois-ci. Soyez le premier à scanner un produit manquant !",
  "leaderboard.emptyAllTime":
    "Aucune contribution pour l'instant. Soyez le premier à scanner un produit manquant !",
  "leaderboard.products": "produits",
  "leaderboard.footnote":
    "Chaque contribution acceptée compte. 30 = un mois gratuit de Premium.",
  "leaderboard.periodAria": "Période du classement",

  "problems.title": "Problèmes courants",
  "problems.subtitle": "Top 10 des erreurs et inquiétudes — d'un coup d'œil.",
  "problems.backToScanner": "Retour au scanner",
  "problems.tabMistakes": "Top erreurs",
  "problems.tabWorries": "Top inquiétudes",
  "problems.whatToDo": "Que faire",
  "problems.scanProductNow": "Scanner un produit maintenant",
  "problems.swipeMore": "Glissez pour en voir plus →",
  "problems.categoryAria": "Catégorie de problèmes courants",

  "recipeSubmit.headerLoading": "Soumettre une recette",
  "recipeSubmit.headerSuccess": "Recette soumise",
  "recipeSubmit.shareTitle": "Partager une recette DIY",
  "recipeSubmit.shareSubtitle":
    "Aidez les autres à découvrir des formules maison sûres et éprouvées. Notre IA en vérifie la sécurité avant la validation par un admin.",
  "recipeSubmit.verifyEmailTitle": "Vérifiez d'abord votre email",
  "recipeSubmit.verifyEmailBody":
    "Pour la sécurité de notre bibliothèque, nous demandons aux contributeurs de vérifier leur email auprès de leur fournisseur de connexion avant de soumettre.",
  "recipeSubmit.backToProfile": "Retour au profil",
  "recipeSubmit.errorTitleShort": "Donnez un titre à votre recette (au moins 3 caractères).",
  "recipeSubmit.errorMin2": "Indiquez au moins 2 ingrédients.",
  "recipeSubmit.errorMethodShort":
    "Décrivez comment préparer et appliquer cette recette (au moins 10 caractères).",
  "recipeSubmit.errorSkinType": "Sélectionnez au moins un type de peau.",
  "recipeSubmit.errorSubmit": "Échec de la soumission de la recette.",
  "recipeSubmit.errorNetwork": "Erreur réseau. Réessayez.",
  "recipeSubmit.thanksHeadline": "Merci — votre recette est en file d'attente de validation.",
  "recipeSubmit.thanksBodyWithVerdict":
    "Un admin examinera l'analyse de sécurité IA et votre recette avant publication. Vous la verrez dans vos contributions une fois approuvée.",
  "recipeSubmit.thanksBodyNoVerdict":
    "Un admin examinera votre recette avant publication. Vous la verrez dans vos contributions une fois approuvée.",
  "recipeSubmit.scannerOffline":
    "Notre scanner de sécurité IA est temporairement indisponible, mais votre recette est enregistrée. Un admin l'examinera manuellement.",
  "recipeSubmit.scannerCouldnt":
    "Notre scanner de sécurité IA n'a pas pu donner d'avis cette fois, mais votre recette est enregistrée. Un admin l'examinera manuellement.",
  "recipeSubmit.submitAnother": "Soumettre une autre",
  "recipeSubmit.recipeTitleLabel": "Titre de la recette",
  "recipeSubmit.recipeTitlePlaceholder": "ex. masque apaisant avoine & miel",
  "recipeSubmit.categoryLabel": "Catégorie",
  "recipeSubmit.skinTypesLabel": "Types de peau",
  "recipeSubmit.ingredientsLabel": "Ingrédients ({count})",
  "recipeSubmit.add": "Ajouter",
  "recipeSubmit.ingredientPlaceholder": "Ingrédient",
  "recipeSubmit.amountPlaceholder": "Quantité",
  "recipeSubmit.notesPlaceholder": "Notes (facultatif)",
  "recipeSubmit.removeIngredient": "Retirer l'ingrédient",
  "recipeSubmit.methodLabel": "Méthode (facultatif)",
  "recipeSubmit.methodPlaceholder": "Décrivez comment mélanger et appliquer…",
  "recipeSubmit.whatNext": "Et ensuite",
  "recipeSubmit.whatNextBody":
    "Notre IA analysera votre recette pour des problèmes de sécurité. Puis un admin Chimiq la vérifie et l'approuve avant qu'elle n'apparaisse dans la bibliothèque publique.",
  "recipeSubmit.scanAndSave": "Analyse & enregistrement…",
  "recipeSubmit.submitForReview": "Soumettre pour validation",
  "recipeSubmit.editTitle": "Modifier votre recette",
  "recipeSubmit.editSubtitle":
    "Mettez à jour votre recette et soumettez-la à nouveau. L'analyse de sécurité IA sera relancée.",
  "recipeSubmit.adminNoteLabel": "Note du modérateur",
  "recipeSubmit.resubmitForReview": "Soumettre à nouveau",
  "recipeSubmit.editNotFound": "Recette introuvable dans votre compte.",
  "recipeSubmit.editNotEditable":
    "Cette recette ne peut plus être modifiée (déjà approuvée ou rejetée).",
  "recipeSubmit.editLoadFailed": "Impossible de charger votre recette. Réessayez.",

  "rewards.headline": "Comment fonctionnent les récompenses",
  "rewards.sub": "Trois moyens simples de gagner du Premium gratuit et de la reconnaissance dans Chimiq.",
  "rewards.contribTitle": "Contribuer aux produits",
  "rewards.contribBody":
    "Scannez les produits qui ne sont pas encore dans notre base. Chaque contribution acceptée compte. Atteignez 30 contributions et obtenez un mois entier de Premium — gratuit.",
  "rewards.tipsTitle": "Partager des conseils utiles",
  "rewards.tipsBody":
    "Postez de courts conseils dans le fil. La communauté vote pour ses préférés. Chaque lundi, le conseil le plus voté de la semaine précédente devient le Meilleur Conseil de la Semaine — l'auteur·e gagne un mois de Premium et le badge Conseiller·ère vérifié·e.",
  "rewards.badgesTitle": "Gagner des badges",
  "rewards.badge1Title": "Premier scan",
  "rewards.badge1Body": "Soumettez votre première contribution acceptée.",
  "rewards.badge2Title": "10 produits",
  "rewards.badge2Body": "Atteignez 10 contributions acceptées.",
  "rewards.badge3Title": "30 produits",
  "rewards.badge3Body": "Atteignez 30 — et gagnez un mois gratuit.",
  "rewards.badge4Title": "100 produits",
  "rewards.badge4Body": "Atteignez 100. Héros de la base.",
  "rewards.badge5Title": "Top 10 ce mois-ci",
  "rewards.badge5Body": "Terminez un mois dans le top 10.",
  "rewards.badge6Title": "Conseiller·ère vérifié·e",
  "rewards.badge6Body": "Gagnez le Meilleur Conseil de la Semaine.",
  "rewards.rulesTitle": "Règles de la maison",
  "rewards.rule1": "Un vote par conseil. Vous ne pouvez pas voter pour vos propres conseils.",
  "rewards.rule2": "5 conseils par jour max — privilégiez la qualité.",
  "rewards.rule3":
    "Les produits en doublon ou déjà connus ne comptent pas dans le palier des 30 contributions.",
  "rewards.rule4": "Les mois Premium s'ajoutent au temps qu'il vous reste.",

  // ───── Legal consent gate ─────
  "consent.title": "Avant de continuer",
  "consent.intro":
    "Chimiq est un outil de bien-être, pas un substitut à un avis médical. Confirmez que vous avez lu nos conditions avant de vous connecter.",
  "consent.checkboxPrefix": "J'accepte les ",
  "consent.linkTerms": "Conditions d'utilisation",
  "consent.linkPrivacy": "la Politique de confidentialité",
  "consent.checkboxAnd": " et ",
  "consent.linkDisclaimer": "l'Avis médical",
  "consent.checkboxSuffix": ".",
  "consent.continue": "Accepter & continuer",
  "consent.cancel": "Annuler",

  // ───── Footer legal links ─────
  "footer.legalHeading": "Mentions légales",
  "footer.legalPrivacy": "Politique de confidentialité",
  "footer.legalTerms": "Conditions d'utilisation",
  "footer.legalDisclaimer": "Avis médical",

  // ───── Legal pages (shared chrome) ─────
  "legal.lastUpdated": "Dernière mise à jour : {date}",
  "legal.contactPlaceholder": "Contact : legal@chimiq.com",
  "legal.backToApp": "Retour",
  "legal.privacyTitle": "Politique de confidentialité",
  "legal.termsTitle": "Conditions d'utilisation",
  "legal.disclaimerTitle": "Avis médical et de santé",

  // ───── Profile -> Your DIY recipes (#69 / #70 / #78) ─────
  "myRecipes.heading": "Vos recettes DIY",
  "myRecipes.unseenAria": "{count} nouvelles mises à jour",
  "myRecipes.status.approved": "Approuvée",
  "myRecipes.status.rejected": "Rejetée",
  "myRecipes.status.changesRequested": "Modifications demandées",
  "myRecipes.status.underReview": "En cours d'examen",
  "myRecipes.reviewerNote": "Note du relecteur :",
  "myRecipes.editAndResubmit": "Modifier et renvoyer",
  "myRecipes.viewPublic": "Voir la page publique",
  "myRecipes.editWhilePending": "Modifier pendant l'examen",
};

const DICTS: Record<Locale, Dict> = { en, sv, fr };

interface I18nContextValue {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: keyof typeof en, vars?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

function isLocale(v: string | null | undefined): v is Locale {
  return v === "en" || v === "sv" || v === "fr";
}

function detectInitialLocale(): Locale {
  if (typeof window === "undefined") return "en";
  try {
    const params = new URLSearchParams(window.location.search);
    const fromUrl = params.get("lang");
    if (isLocale(fromUrl)) return fromUrl;
  } catch {
    // ignore
  }
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (isLocale(stored)) return stored;
  } catch {
    // ignore
  }
  const nav = window.navigator?.language?.toLowerCase() ?? "";
  if (nav.startsWith("sv")) return "sv";
  if (nav.startsWith("fr")) return "fr";
  return "en";
}

function format(str: string, vars?: Record<string, string | number>): string {
  if (!vars) return str;
  let out = str;
  for (const [k, v] of Object.entries(vars)) {
    out = out.replace(new RegExp(`\\{${k}\\}`, "g"), String(v));
  }
  return out;
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => detectInitialLocale());

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, locale);
    } catch {
      // ignore
    }
    if (typeof document !== "undefined") {
      document.documentElement.lang = locale;
    }
  }, [locale]);

  const setLocale = useCallback((l: Locale) => setLocaleState(l), []);

  const t = useCallback<I18nContextValue["t"]>(
    (key, vars) => {
      const dict = DICTS[locale] ?? en;
      const str = dict[key as string] ?? en[key as string] ?? (key as string);
      return format(str, vars);
    },
    [locale],
  );

  const value = useMemo(() => ({ locale, setLocale, t }), [locale, setLocale, t]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useTranslation(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    return {
      locale: "en",
      setLocale: () => {},
      t: (key, vars) => format(en[key as string] ?? (key as string), vars),
    };
  }
  return ctx;
}
