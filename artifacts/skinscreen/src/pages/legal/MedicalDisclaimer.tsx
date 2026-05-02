// Operating entity: Seafari AB (Tegnérgatan 13A, 11140 Stockholm, Sweden).
// Contact: legal@chimiq.com.
//
// Maintenance notes:
//   - If a licensed dermatologist or pharmacist reviews the methodology
//     behind the scan results, mention that here.
//   - Update LAST_UPDATED below whenever the disclaimer materially
//     changes, and bump TERMS_VERSION in src/lib/legal-consent.ts to
//     re-prompt existing users for consent.

import { useTranslation } from "@/lib/i18n";
import { LegalLayout } from "./LegalLayout";

const LAST_UPDATED = "April 30, 2026";

export default function MedicalDisclaimer() {
  const { t } = useTranslation();
  return (
    <LegalLayout title={t("legal.disclaimerTitle")} lastUpdated={LAST_UPDATED}>
      <p>
        <strong>Chimiq is not a medical device.</strong> The
        Service is intended for general wellness and education only.
        It is <strong>not</strong> intended to diagnose, treat, cure,
        or prevent any disease or skin condition.
      </p>

      <h2>1. Always consult a qualified professional</h2>
      <p>
        Information presented in the Service — including ingredient
        analyses, conflict warnings, severity scores, and AI chat
        responses — is generated automatically and may be incomplete,
        out of date, or wrong. <strong>Always consult a licensed
        dermatologist, pharmacist, or other qualified healthcare
        provider</strong> before:
      </p>
      <ul>
        <li>Starting, stopping, or combining skincare products if you have a known skin condition.</li>
        <li>Using any product during pregnancy or breastfeeding.</li>
        <li>Using a product on a child.</li>
        <li>Acting on any information you read in the Service if it conflicts with advice from a real medical professional.</li>
      </ul>

      <h2>2. AI limitations</h2>
      <p>
        Conflict detection and ingredient analysis are produced by
        third-party large language models. These models can make
        confident-sounding mistakes. Do not treat AI output as a
        substitute for a doctor, a clinical trial, or peer-reviewed
        research.
      </p>

      <h2>3. No emergency use</h2>
      <p>
        <strong>If you are having an allergic reaction, chemical
        burn, or any other medical emergency, stop using the product,
        rinse the affected area with water, and call your local
        emergency number or poison control immediately.</strong> Do
        not use the Service for emergency advice.
      </p>

      <h2>4. Individual variation</h2>
      <p>
        Skin reacts differently from person to person. A product
        flagged as safe by Chimiq may still cause a reaction in
        you, and a product flagged with concerns may be fine for you.
        Patch-test new products and stop use if you experience
        irritation.
      </p>

      <h2>5. Product information accuracy</h2>
      <p>
        Ingredient lists are sourced from public databases (e.g.
        CosIng, PubChem) and from community contributions. We do not
        guarantee that the ingredient list shown for any specific
        product matches what is currently on the shelf. Always check
        the actual product packaging.
      </p>

      <h2>6. No professional relationship</h2>
      <p>
        Using the Service does not create a doctor-patient,
        pharmacist-patient, or any other professional relationship
        between you and <strong>Seafari AB</strong> or
        anyone associated with the Service.
      </p>

      <h2>7. Reporting an adverse event</h2>
      <p>
        If you believe a product caused you harm, please report it to
        the relevant authority for cosmetic products in your country
        (e.g. the U.S. FDA's MedWatch, the UK MHRA's Yellow Card
        Scheme, the EU's CPNP). You may also email us at{" "}
        <strong>legal@chimiq.com</strong> so we can review the
        product entry, but this is not a substitute for reporting to
        regulators.
      </p>

      <h2>8. Limitation of liability</h2>
      <p>
        See section 10 of our Terms of Service. To the maximum extent
        permitted by law, <strong>Seafari AB</strong> is
        not liable for any harm arising from reliance on the Service.
      </p>

      <h2>9. Contact</h2>
      <p>
        <strong>Seafari AB</strong>
        <br />
        <strong>Tegnérgatan 13A, 11140 Stockholm, Sweden</strong>
        <br />
        <strong>legal@chimiq.com</strong>
      </p>
    </LegalLayout>
  );
}
