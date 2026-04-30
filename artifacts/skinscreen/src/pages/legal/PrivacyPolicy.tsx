// TODO (BEFORE PUBLISHING):
//   1. Replace [Your Business Name], [Your Business Address], and
//      [your-business-email] throughout this file with the real legal
//      entity that operates SkinScreen.
//   2. If you operate from the EU/EEA/UK, have a lawyer confirm the GDPR
//      lawful-basis section is accurate for your processing activities.
//   3. If you operate or sell to California users, confirm the CCPA section
//      reflects how you actually handle "Do Not Sell" requests.
//   4. Update the LAST_UPDATED date below whenever the policy materially
//      changes.

import { useTranslation } from "@/lib/i18n";
import { LegalLayout } from "./LegalLayout";

const LAST_UPDATED = "April 30, 2026";

export default function PrivacyPolicy() {
  const { t } = useTranslation();
  return (
    <LegalLayout title={t("legal.privacyTitle")} lastUpdated={LAST_UPDATED}>
      <p>
        This Privacy Policy explains how <strong>[Your Business Name]</strong>{" "}
        ("we", "us", or "our") collects, uses, and protects information when
        you use the SkinScreen web app, mobile app, and related services
        (together, the "Service"). By using the Service you agree to this
        policy.
      </p>

      <h2>1. Information we collect</h2>
      <h3>1.1 Account information</h3>
      <p>
        When you sign in we receive your email address, display name,
        profile picture (if provided by your identity provider), and a
        unique account identifier from our authentication provider
        (Replit OIDC). We do not receive or store your password.
      </p>
      <h3>1.2 Health-adjacent data you provide</h3>
      <ul>
        <li>
          <strong>Skin profile</strong> — your self-described skin type,
          concerns, and preferences.
        </li>
        <li>
          <strong>Scan history</strong> — product names, ingredient lists
          you submit or photograph, and the analyses we generate from
          them.
        </li>
        <li>
          <strong>Shelf and routines</strong> — products you save, the
          order you apply them in, and any notes you attach.
        </li>
        <li>
          <strong>Contributions</strong> — products, ingredient lists,
          recipes, ratings, and tips you submit to the community.
        </li>
      </ul>
      <h3>1.3 Payment information</h3>
      <p>
        Premium subscriptions are processed by Stripe, Inc. We do{" "}
        <strong>not</strong> store your card number, CVV, or full bank
        details. We receive only a customer ID, subscription status,
        plan, currency, and the last four digits of your payment method
        from Stripe.
      </p>
      <h3>1.4 Technical data</h3>
      <p>
        We collect standard server logs (IP address, user agent, request
        path, timestamps) for security, abuse prevention, and debugging.
        We do not run third-party advertising trackers.
      </p>

      <h2>2. How we use your information</h2>
      <ul>
        <li>To provide the core Service (run scans, persist your shelf, deliver Premium features).</li>
        <li>To improve scan accuracy and product coverage (aggregated, de-identified usage signals).</li>
        <li>To process payments and manage subscriptions through Stripe.</li>
        <li>To respond when you contact us.</li>
        <li>To detect and prevent fraud, abuse, and security incidents.</li>
        <li>To comply with legal obligations.</li>
      </ul>

      <h2>3. Lawful basis (GDPR)</h2>
      <p>
        If you are in the EEA or UK, our lawful bases are: (a)
        performance of the contract you enter into when you use the
        Service; (b) your consent (which you give at signup and can
        withdraw at any time); (c) our legitimate interest in keeping
        the Service secure and improving it; and (d) compliance with
        legal obligations.
      </p>

      <h2>4. Sharing</h2>
      <p>We do not sell your personal data. We share data only with:</p>
      <ul>
        <li>
          <strong>Service providers</strong> we use to run the Service,
          under contracts that limit them to processing data on our
          behalf — currently Replit (hosting, auth), Stripe (payments),
          Anthropic (AI ingredient analysis), and Google Cloud (object
          storage for product images).
        </li>
        <li>
          <strong>The community</strong>, when you choose to publish a
          contribution, recipe, tip, or rating. We display your display
          name and avatar with public contributions.
        </li>
        <li>
          <strong>Authorities</strong>, where we are legally compelled
          to.
        </li>
      </ul>

      <h2>5. International transfers</h2>
      <p>
        Our service providers are based in the United States and the
        European Union. Where we transfer personal data outside your
        region, we rely on the providers' Standard Contractual Clauses
        and equivalent safeguards.
      </p>

      <h2>6. Retention</h2>
      <ul>
        <li>Account and shelf data: until you delete your account.</li>
        <li>Scan history: kept for as long as your account exists, so you can revisit results.</li>
        <li>Server logs: typically 30 days.</li>
        <li>Payment records: kept for the period required by tax law (currently 7 years in most jurisdictions).</li>
      </ul>

      <h2>7. Your rights</h2>
      <p>
        Depending on where you live, you may have the right to access,
        correct, export, or delete your personal data, to object to
        certain processing, and to lodge a complaint with your
        supervisory authority. Email us at{" "}
        <strong>[your-business-email]</strong> to exercise these rights.
        We will respond within 30 days.
      </p>

      <h2>8. California (CCPA / CPRA)</h2>
      <p>
        We do not sell or "share" your personal information for
        cross-context behavioral advertising. California residents have
        the right to know, delete, correct, and limit use of sensitive
        personal information. To exercise these rights, email us at{" "}
        <strong>[your-business-email]</strong>.
      </p>

      <h2>9. Children</h2>
      <p>
        SkinScreen is not directed at children under 13 (or under 16 in
        the EEA/UK). We do not knowingly collect personal data from
        children. If you believe a child has provided us data, contact
        us and we will delete it.
      </p>

      <h2>10. Security</h2>
      <p>
        We use TLS in transit, encrypted databases at rest, and apply
        the principle of least privilege to internal access. No
        system is perfectly secure; please tell us at{" "}
        <strong>[your-business-email]</strong> if you find a
        vulnerability.
      </p>

      <h2>11. Changes</h2>
      <p>
        We may update this policy. Material changes will be notified
        in-app or by email at least 14 days before they take effect.
      </p>

      <h2>12. Contact</h2>
      <p>
        <strong>[Your Business Name]</strong>
        <br />
        <strong>[Your Business Address]</strong>
        <br />
        <strong>[your-business-email]</strong>
      </p>
    </LegalLayout>
  );
}
