import { LegalPageLayout, LegalSection } from "@/components/LegalPageLayout"

const TOC = [
  { id: "accept", label: "Accepting these terms" },
  { id: "not-medical-advice", label: "Not medical advice" },
  { id: "accounts", label: "Accounts" },
  { id: "listings", label: "Facility listings" },
  { id: "managers", label: "Facility managers" },
  { id: "user-content", label: "User-submitted content" },
  { id: "acceptable-use", label: "Acceptable use" },
  { id: "ip", label: "Intellectual property" },
  { id: "fees", label: "Fees and subscriptions" },
  { id: "termination", label: "Termination" },
  { id: "disclaimers", label: "Disclaimers" },
  { id: "liability", label: "Limitation of liability" },
  { id: "governing-law", label: "Governing law" },
  { id: "changes", label: "Changes" },
]

export function LegalTermsPage() {
  return (
    <LegalPageLayout
      title="Terms of Service"
      intro="The rules of the road for using CarePath. We've tried to write these in plain English; please read them before creating an account."
      lastUpdated="2026-05-18"
      canonical="/legal/terms"
      toc={TOC}
    >
      <p className="lead">
        These Terms of Service ("Terms") are an agreement between you and
        CarePath, Inc. governing your use of carepath.io and our related
        services (the "Services"). By using the Services, you agree to these
        Terms.
      </p>

      <LegalSection id="accept" title="Accepting these terms">
        <p>
          If you are using the Services on behalf of an organization (a
          facility, network operator, hospital, or advisor agency), you confirm
          you have authority to bind that organization to these Terms. If you
          don't agree to these Terms, please don't use the Services.
        </p>
      </LegalSection>

      <LegalSection id="not-medical-advice" title="Not medical or legal advice">
        <p>
          CarePath is an informational and matchmaking service. Content on the
          Services — including articles, guides, CMS ratings, cost
          projections, eligibility quizzes, and AI-generated chat responses —
          is for general information only and is not medical, legal, tax, or
          financial advice. Always consult qualified professionals (a
          physician, an attorney, a Medicaid planner, your tax advisor) before
          making decisions about your or your loved one's care.
        </p>
      </LegalSection>

      <LegalSection id="accounts" title="Accounts">
        <p>
          You're responsible for keeping your password secure and for all
          activity under your account. Notify us at{" "}
          <a href="mailto:support@carepath.io" className="underline">
            support@carepath.io
          </a>{" "}
          immediately of any unauthorized access. You must be at least 18 to
          create an account.
        </p>
      </LegalSection>

      <LegalSection id="listings" title="Facility listings">
        <p>
          We aggregate facility information from multiple sources (see{" "}
          <a href="/legal/data" className="underline">
            Data Sources
          </a>
          ). We use reasonable efforts to keep this information accurate, but
          we make no warranty that any specific data point — pricing,
          availability, CMS rating, certification status — is current at the
          moment you view it. Always verify critical information directly with
          the facility before making decisions.
        </p>
      </LegalSection>

      <LegalSection id="managers" title="Facility managers">
        <p>
          Verified facility managers (users with an approved facility claim)
          may edit their listing's tagline, description, photos, amenities,
          contact info, and pricing range. By submitting content as a
          manager, you represent that:
        </p>
        <ul>
          <li>You have authority to act on behalf of the facility.</li>
          <li>The information is truthful and not misleading.</li>
          <li>You hold or have permission to use any images or text you upload.</li>
          <li>The facility complies with all applicable federal, state, and local laws.</li>
        </ul>
        <p>
          Sponsored placements are clearly labeled as such on every surface
          where they appear. Sponsored placement does not guarantee inclusion
          in search results, change a facility's CMS rating, or influence
          editorial content.
        </p>
      </LegalSection>

      <LegalSection id="user-content" title="User-submitted content">
        <p>
          When you submit a review, comment, or other content, you grant
          CarePath a non-exclusive, worldwide, royalty-free license to host,
          display, reproduce, and distribute that content on the Services. We
          may moderate, edit, or remove user content that violates these Terms
          or our community guidelines.
        </p>
      </LegalSection>

      <LegalSection id="acceptable-use" title="Acceptable use">
        <p>You agree not to:</p>
        <ul>
          <li>Submit fake reviews, fake claims, or misleading information.</li>
          <li>Scrape, crawl, or otherwise harvest data at a rate that burdens our infrastructure.</li>
          <li>Use the Services to send spam or unsolicited commercial messages.</li>
          <li>Reverse-engineer, disassemble, or attempt to bypass our security controls.</li>
          <li>Use the Services in a way that violates any law or third-party right.</li>
          <li>Sell or transfer your account to anyone else.</li>
        </ul>
      </LegalSection>

      <LegalSection id="ip" title="Intellectual property">
        <p>
          The Services and all content we create (excluding user-submitted
          content) are owned by CarePath and protected by intellectual
          property laws. We grant you a limited, revocable, non-exclusive
          license to use the Services for their intended purpose.
        </p>
        <p>
          The "CarePath" name and logo are trademarks of CarePath, Inc. Other
          trademarks belong to their respective owners and their use here does
          not imply endorsement.
        </p>
      </LegalSection>

      <LegalSection id="fees" title="Fees and subscriptions">
        <p>
          Family-side searching and most tools are free. Some products (Pro
          facility subscriptions, advisor subscriptions, sponsored placements)
          carry fees disclosed at sign-up. Subscriptions auto-renew until you
          cancel; you may cancel at any time and the cancellation takes effect
          at the end of the then-current billing period.
        </p>
      </LegalSection>

      <LegalSection id="termination" title="Termination">
        <p>
          You may stop using the Services and delete your account at any time.
          We may suspend or terminate accounts that violate these Terms, with
          notice where practical. Sections that by their nature should survive
          (intellectual property, disclaimers, limitation of liability,
          governing law) will survive termination.
        </p>
      </LegalSection>

      <LegalSection id="disclaimers" title="Disclaimers">
        <p>
          The Services are provided <strong>"as is" and "as available"</strong>.
          To the maximum extent permitted by law, CarePath disclaims all
          warranties, express or implied, including warranties of
          merchantability, fitness for a particular purpose, and
          non-infringement. We do not warrant that the Services will be
          uninterrupted, error-free, or that defects will be corrected.
        </p>
      </LegalSection>

      <LegalSection id="liability" title="Limitation of liability">
        <p>
          To the maximum extent permitted by law, in no event will CarePath be
          liable to you for any indirect, incidental, special, consequential,
          or punitive damages, or for lost profits or revenues, arising out
          of or related to your use of the Services. Our aggregate liability
          for any claim arising under these Terms will not exceed the greater
          of $100 or the amounts you paid us in the 12 months before the
          event giving rise to the claim.
        </p>
      </LegalSection>

      <LegalSection id="governing-law" title="Governing law and disputes">
        <p>
          These Terms are governed by the laws of the State of Delaware,
          without regard to conflict-of-laws principles. Disputes will be
          resolved in the state or federal courts located in Delaware, and you
          consent to personal jurisdiction there.
        </p>
      </LegalSection>

      <LegalSection id="changes" title="Changes to these terms">
        <p>
          We may update these Terms as the Services evolve. Material changes
          will be announced via in-product notice or email at least 14 days
          before they take effect. Continued use of the Services after the
          effective date constitutes acceptance.
        </p>
      </LegalSection>
    </LegalPageLayout>
  )
}
