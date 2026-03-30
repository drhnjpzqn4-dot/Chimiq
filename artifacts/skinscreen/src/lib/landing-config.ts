export interface LandingConfig {
  variant: "general" | "teen" | "mature";
  hero: {
    headline: string;
    headlineItalic: string;
    subhead: string;
  };
  theGoal: {
    headline: string;
    body: string;
  };
  socialProofStyle: "mixed" | "reddit" | "tiktok";
  scannerSubhead: string;
}

export const generalConfig: LandingConfig = {
  variant: "general",
  hero: {
    headline: "40 products. 400 ingredients.",
    headlineItalic: "Do you know what they do to each other?",
    subhead:
      "SkinScreen scans your skincare and finds dangerous combinations — before they find your skin.",
  },
  theGoal: {
    headline: "Healthy skin needs less, not more.",
    body: "With the right products and the right combinations, you need a 3-step routine — not 12. Healthy skin means fewer breakouts to cover. Fewer concealers. Less spending. And fewer potentially harmful substances on the thinnest, most absorbent organ in your body. SkinScreen helps you buy once, buy right, and stop the spiral.",
  },
  socialProofStyle: "mixed",
  scannerSubhead:
    "Paste two ingredient lists and see SkinScreen detect conflicts in seconds — dermatologist-informed, research-backed.",
};

export const variantAConfig: LandingConfig = {
  variant: "teen",
  hero: {
    headline: "Your skin was fine",
    headlineItalic: "before you started their routine.",
    subhead:
      "TikTok recommended 12 products. Your skin barrier only ever needed 3. SkinScreen shows you what the algorithm won't.",
  },
  theGoal: {
    headline: "You were sold a problem that didn't exist.",
    body: "Influencers profit from your next purchase. They don't profit from your healthy skin. A 3-step routine with the right products — a cleanser, moisturiser, and SPF — is all most skin needs. SkinScreen helps you cut through the noise, stop the spiral, and take back control of your skin.",
  },
  socialProofStyle: "tiktok",
  scannerSubhead:
    "Paste your routine's ingredient lists and find out if the products you were sold are working — or working against you.",
};

export const variantBConfig: LandingConfig = {
  variant: "mature",
  hero: {
    headline: "The beauty industry profits from your insecurity.",
    headlineItalic: "Your skin deserves better than that.",
    subhead:
      "Underneath the serums, retinols and collagen creams, some combinations quietly do damage. SkinScreen shows you what's really happening.",
  },
  theGoal: {
    headline: "Less is more. The science agrees.",
    body: "Decades of marketing have convinced us that more products means healthier skin. The research says the opposite. A simplified, conflict-free routine protects your barrier, reduces inflammation, and actually lets your actives work. SkinScreen helps you strip back, buy right, and let your skin do what it knows how to do.",
  },
  socialProofStyle: "reddit",
  scannerSubhead:
    "Paste your skincare ingredient lists and find out whether your anti-ageing routine is working with your skin — or quietly working against it.",
};
