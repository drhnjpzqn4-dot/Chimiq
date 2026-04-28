export interface LandingConfig {
  variant: "general" | "teen" | "mature";
  hero: {
    headlineKey: string;
    headlineItalicKey: string;
    subheadKey: string;
    ctaLabelKey: string;
  };
  theGoal: {
    headlineKey: string;
    bodyKey: string;
  };
  socialProofStyle: "mixed" | "reddit" | "tiktok";
  scannerSubheadKey: string;
  scannerCtaLabelKey: {
    single: string;
    compare: string;
  };
}

export const generalConfig: LandingConfig = {
  variant: "general",
  hero: {
    headlineKey: "landing.general.heroHeadline",
    headlineItalicKey: "landing.general.heroHeadlineItalic",
    subheadKey: "landing.general.heroSubhead",
    ctaLabelKey: "landing.general.heroCta",
  },
  theGoal: {
    headlineKey: "landing.general.goalHeadline",
    bodyKey: "landing.general.goalBody",
  },
  socialProofStyle: "mixed",
  scannerSubheadKey: "landing.general.scannerSubhead",
  scannerCtaLabelKey: {
    single: "landing.general.scannerCtaSingle",
    compare: "landing.general.scannerCtaCompare",
  },
};

export const variantAConfig: LandingConfig = {
  variant: "teen",
  hero: {
    headlineKey: "landing.teen.heroHeadline",
    headlineItalicKey: "landing.teen.heroHeadlineItalic",
    subheadKey: "landing.teen.heroSubhead",
    ctaLabelKey: "landing.teen.heroCta",
  },
  theGoal: {
    headlineKey: "landing.teen.goalHeadline",
    bodyKey: "landing.teen.goalBody",
  },
  socialProofStyle: "tiktok",
  scannerSubheadKey: "landing.teen.scannerSubhead",
  scannerCtaLabelKey: {
    single: "landing.teen.scannerCtaSingle",
    compare: "landing.teen.scannerCtaCompare",
  },
};

export const variantBConfig: LandingConfig = {
  variant: "mature",
  hero: {
    headlineKey: "landing.mature.heroHeadline",
    headlineItalicKey: "landing.mature.heroHeadlineItalic",
    subheadKey: "landing.mature.heroSubhead",
    ctaLabelKey: "landing.mature.heroCta",
  },
  theGoal: {
    headlineKey: "landing.mature.goalHeadline",
    bodyKey: "landing.mature.goalBody",
  },
  socialProofStyle: "reddit",
  scannerSubheadKey: "landing.mature.scannerSubhead",
  scannerCtaLabelKey: {
    single: "landing.mature.scannerCtaSingle",
    compare: "landing.mature.scannerCtaCompare",
  },
};
