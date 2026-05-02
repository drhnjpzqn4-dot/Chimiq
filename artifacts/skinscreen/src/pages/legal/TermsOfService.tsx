// Operating entity: Seafari AB (Tegnérgatan 13A, 11140 Stockholm, Sweden).
// Contact: legal@chimiq.com. Governing law: Sweden.
//
// Maintenance notes:
//   - Have a Swedish lawyer periodically review the limitation-of-liability
//     and dispute-resolution clauses — wording below is a starting template,
//     not legal advice.
//   - When you make material changes, bump LAST_UPDATED below AND
//     TERMS_VERSION in src/lib/legal-consent.ts so existing users are
//     re-prompted for consent. Notify users in-app at least 14 days before
//     the change takes effect.

import { useTranslation } from "@/lib/i18n";
import { LegalLayout } from "./LegalLayout";

const LAST_UPDATED = "April 30, 2026";

export default function TermsOfService() {
  const { t } = useTranslation();
  return (
    <LegalLayout title={t("legal.termsTitle")} lastUpdated={LAST_UPDATED}>
      <p>
        These Terms of Service ("Terms") govern your use of the
        Chimiq web app, mobile app, and related services (the
        "Service") operated by <strong>Seafari AB</strong>{" "}
        ("we", "us", or "our"). By creating an account or using the
        Service you agree to these Terms.
      </p>

      <h2>1. Eligibility</h2>
      <p>
        You must be at least 13 years old (16 in the EEA/UK) to use the
        Service. If you are under the age of majority in your
        jurisdiction, you must have a parent or guardian's consent.
      </p>

      <h2>2. Your account</h2>
      <p>
        You are responsible for any activity under your account. Keep
        your sign-in credentials confidential. Tell us at{" "}
        <strong>legal@chimiq.com</strong> if you suspect
        unauthorized access.
      </p>

      <h2>3. Acceptable use</h2>
      <ul>
        <li>Do not submit illegal, infringing, abusive, or fraudulent content.</li>
        <li>Do not attempt to bypass rate limits, scan limits, or paywalls.</li>
        <li>Do not scrape, copy, or redistribute the product database, recipes, or AI analyses except as permitted by these Terms.</li>
        <li>Do not impersonate another person or misrepresent your affiliation.</li>
      </ul>

      <h2>4. Subscriptions and payments</h2>
      <p>
        Premium subscriptions renew automatically until cancelled. You
        can cancel at any time from your profile or via Stripe; the
        Premium features remain active until the end of the period you
        have paid for. Prices may change with at least 30 days' notice
        to active subscribers; price changes will not affect the
        current paid period.
      </p>
      <p>
        Refunds are handled on a case-by-case basis to the extent
        required by law in your jurisdiction. Email{" "}
        <strong>legal@chimiq.com</strong> with refund requests.
      </p>

      <h2>5. User contributions</h2>
      <p>
        When you submit a product, recipe, tip, photo, or rating, you
        grant <strong>Seafari AB</strong> a worldwide,
        non-exclusive, royalty-free licence to host, display,
        translate, and adapt that content as part of the Service. You
        keep ownership of your contributions. You represent that you
        have the right to submit the content and that it does not
        infringe anyone else's rights.
      </p>
      <p>
        We may remove any contribution at our discretion if it
        violates these Terms or is otherwise harmful.
      </p>

      <h2>6. AI-generated content</h2>
      <p>
        The Service uses third-party AI models (currently Anthropic
        Claude) to analyse ingredients and surface conflict warnings.
        AI output may contain errors. See the Medical & Health
        Disclaimer for important limitations.
      </p>

      <h2>7. Intellectual property</h2>
      <p>
        The Chimiq name (formerly SkinScreen), logo, brand, and source
        code are owned by <strong>Seafari AB</strong>. You may
        not use them without our written permission, except to refer
        to the Service in standard, factual ways (e.g. "I use
        Chimiq").
      </p>

      <h2>8. Termination</h2>
      <p>
        You may delete your account at any time from the profile
        screen or by contacting us. We may suspend or terminate
        accounts that violate these Terms, with notice where
        practicable.
      </p>

      <h2>9. Disclaimers</h2>
      <p>
        The Service is provided <strong>"as is"</strong> and{" "}
        <strong>"as available"</strong>, without warranties of any
        kind, express or implied, including merchantability, fitness
        for a particular purpose, non-infringement, or accuracy. See
        the Medical & Health Disclaimer for additional, important
        limitations on health-related claims.
      </p>

      <h2>10. Limitation of liability</h2>
      <p>
        To the maximum extent permitted by law,{" "}
        <strong>Seafari AB</strong> will not be liable for
        any indirect, incidental, consequential, special, or punitive
        damages, or for loss of profits, revenue, data, or goodwill,
        arising from your use of the Service. Our aggregate liability
        for direct damages is capped at the greater of (a) the amount
        you paid us in the 12 months before the claim or (b) USD 100.
      </p>
      <p>
        Nothing in these Terms limits liability that cannot be limited
        under applicable law (e.g. liability for gross negligence,
        wilful misconduct, or personal injury caused by us in
        jurisdictions that do not allow such exclusions).
      </p>

      <h2>11. Indemnity</h2>
      <p>
        You agree to indemnify and hold us harmless from any third-
        party claim arising from your contributions, your misuse of
        the Service, or your breach of these Terms.
      </p>

      <h2>12. Changes</h2>
      <p>
        We may update these Terms. Material changes take effect 14
        days after we notify you in-app or by email; continued use
        after the effective date is acceptance of the updated Terms.
      </p>

      <h2>13. Governing law</h2>
      <p>
        These Terms are governed by the laws of{" "}
        <strong>Sweden</strong>,
        without regard to conflict-of-laws principles. Disputes will
        be resolved in the competent courts of that jurisdiction
        (subject to mandatory consumer-protection rules in your home
        country).
      </p>

      <h2>14. Contact</h2>
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
