import type { TranslateFn } from "@/lib/i18n";

export interface PricingFeature {
  label: string;
  included: boolean;
}

export function getFreeFeatures(t: TranslateFn): PricingFeature[] {
  return [
    { label: t("pricing.feat.safetyAnalysis"), included: true },
    { label: t("pricing.feat.compare2SideBySide"), included: true },
    { label: t("pricing.feat.barcode"), included: true },
    { label: t("pricing.feat.findDerm"), included: true },
    { label: t("pricing.feat.shelfLimited"), included: true },
    { label: t("pricing.feat.shelfUnlimited"), included: false },
    { label: t("pricing.feat.routineCheck"), included: false },
    { label: t("pricing.feat.aiChat"), included: false },
    { label: t("pricing.feat.pdf"), included: false },
  ];
}

export function getPremiumFeatures(t: TranslateFn): string[] {
  return [
    t("pricing.feat.everythingFree"),
    t("pricing.feat.shelfUnlimited"),
    t("pricing.feat.routineCheck"),
    t("pricing.feat.aiChatWith"),
    t("pricing.feat.pdf"),
  ];
}
