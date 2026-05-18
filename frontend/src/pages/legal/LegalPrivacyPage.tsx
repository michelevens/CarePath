import { LegalPageLayout, LegalSection } from "@/components/LegalPageLayout"

const TOC = [
  { id: "info-we-collect", label: "Information we collect" },
  { id: "how-we-use", label: "How we use it" },
  { id: "how-we-share", label: "How we share it" },
  { id: "your-rights", label: "Your rights" },
  { id: "cookies", label: "Cookies" },
  { id: "security", label: "Security" },
  { id: "retention", label: "Retention" },
  { id: "children", label: "Children" },
  { id: "changes", label: "Changes" },
]

export function LegalPrivacyPage() {
  return (
    <LegalPageLayout
      title="Privacy Policy"
      intro="What CarePath collects, why we collect it, who we share it with, and how to control it. We do not sell your data to third-party lead-buyers — full stop."
      lastUpdated="2026-05-18"
      canonical="/legal/privacy"
      toc={TOC}
    >
      <p className="lead">
        CarePath helps families find long-term care facilities (assisted living,
        memory care, skilled nursing, continuing care). This Privacy Policy
        describes how CarePath, Inc. ("CarePath," "we," "us") handles
        information when you use carepath.io and our related products
        (collectively, the "Services").
      </p>

      <LegalSection id="info-we-collect" title="Information we collect">
        <p>We collect information in three ways:</p>
        <ul>
          <li>
            <strong>You give it to us</strong> — when you create an account,
            search for facilities, request a tour, claim a facility listing,
            submit a review, download a guide, or send us a message.
          </li>
          <li>
            <strong>Your device tells us</strong> — when you use the site we
            collect technical information such as device type, browser, IP
            address, approximate location, pages visited, and referrer.
          </li>
          <li>
            <strong>Public records and data partners</strong> — facility
            information is aggregated from CMS Nursing Home Compare, state
            licensing boards, OpenStreetMap, and facility-curated listings.
            See our{" "}
            <a href="/legal/data" className="underline">
              Data Sources page
            </a>{" "}
            for the full list and update cadence.
          </li>
        </ul>
        <p>
          Specifically, the categories of personal information we may collect
          include name, email, phone number, postal address, ZIP code,
          approximate geolocation, search history within the Services, and
          information you choose to share in tour requests or messages
          (including health-relevant context like level of care needed).
        </p>
      </LegalSection>

      <LegalSection id="how-we-use" title="How we use information">
        <ul>
          <li>To match you with relevant facilities and route tour requests.</li>
          <li>To send you the email guides, newsletters, and account-related notices you signed up for.</li>
          <li>To operate, maintain, and improve the Services (analytics, debugging, A/B testing of UX changes).</li>
          <li>To comply with applicable law and respond to lawful requests.</li>
          <li>To detect and prevent fraud, abuse, or security incidents.</li>
        </ul>
        <p>
          We do <strong>not</strong> use your information to run a lead-auction.
          A tour request you submit on a facility's page is delivered to that
          facility's admissions team — it is not resold or broadcast to other
          providers.
        </p>
      </LegalSection>

      <LegalSection id="how-we-share" title="How we share information">
        <p>Limited sharing in defined categories:</p>
        <ul>
          <li>
            <strong>With the facility you contact.</strong> When you submit a
            tour request or a message addressed to a specific facility, we
            forward your contact details to that facility only.
          </li>
          <li>
            <strong>With placement advisors you choose to work with.</strong> If
            you explicitly engage an advisor on the platform, we share the
            information needed to support that engagement.
          </li>
          <li>
            <strong>Service providers.</strong> Vendors that host our
            infrastructure (Railway), send transactional email (Resend), store
            files (Cloudflare R2), process payments (Stripe), and run our
            analytics — all under contractual confidentiality obligations and
            limited to the data they need to do their job.
          </li>
          <li>
            <strong>Legal requirements.</strong> If compelled by valid legal
            process or to protect our users.
          </li>
          <li>
            <strong>Business transfers.</strong> In connection with a merger,
            acquisition, or sale of assets, with notice to you.
          </li>
        </ul>
      </LegalSection>

      <LegalSection id="your-rights" title="Your rights and choices">
        <p>You can:</p>
        <ul>
          <li>Access, correct, export, or delete your personal information.</li>
          <li>Opt out of marketing emails (every email has an unsubscribe link).</li>
          <li>Disable location-based features in your browser settings.</li>
          <li>
            Object to or restrict certain processing, where applicable under
            GDPR, CPRA, or similar laws.
          </li>
        </ul>
        <p>
          To exercise any of these rights, email{" "}
          <a href="mailto:privacy@carepath.io" className="underline">
            privacy@carepath.io
          </a>
          . We will respond within 30 days (or sooner where the law requires).
        </p>
        <p>
          California, Colorado, Connecticut, Virginia, and other US-state
          residents have additional rights under their state privacy laws. EEA
          and UK residents have rights under the GDPR. Reach out to the address
          above to exercise them; we will not discriminate against you for
          doing so.
        </p>
      </LegalSection>

      <LegalSection id="cookies" title="Cookies">
        <p>
          We use a small number of cookies and similar technologies. See our{" "}
          <a href="/legal/cookies" className="underline">
            Cookie Policy
          </a>{" "}
          for the full list and how to manage them.
        </p>
      </LegalSection>

      <LegalSection id="security" title="Security">
        <p>
          We protect personal information with industry-standard measures:
          encrypted transport (TLS), encrypted-at-rest databases, scoped access
          controls, audit logging of sensitive data writes, and regular
          dependency updates. No system is perfectly secure; if you believe
          your account has been compromised, contact{" "}
          <a href="mailto:security@carepath.io" className="underline">
            security@carepath.io
          </a>
          .
        </p>
      </LegalSection>

      <LegalSection id="retention" title="Data retention">
        <p>
          We retain personal information for as long as your account is active
          and as needed to provide the Services, comply with legal obligations,
          resolve disputes, and enforce agreements. Account data is deleted on
          request (see "Your rights" above) within 30 days, except where law
          requires longer retention (e.g., audit logs of financial
          transactions).
        </p>
      </LegalSection>

      <LegalSection id="children" title="Children">
        <p>
          CarePath is intended for adults seeking long-term care for themselves
          or family members. We do not knowingly collect personal information
          from anyone under 18. If you believe a minor has provided us
          information, email{" "}
          <a href="mailto:privacy@carepath.io" className="underline">
            privacy@carepath.io
          </a>{" "}
          and we will delete it.
        </p>
      </LegalSection>

      <LegalSection id="changes" title="Changes to this policy">
        <p>
          We may update this Privacy Policy as the Services evolve. Material
          changes will be announced via in-product notice or email at least 14
          days before they take effect, with the new "Last updated" date at the
          top of this page.
        </p>
      </LegalSection>
    </LegalPageLayout>
  )
}
