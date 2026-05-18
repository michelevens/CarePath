import { LegalPageLayout, LegalSection } from "@/components/LegalPageLayout"

const TOC = [
  { id: "commitment", label: "Our commitment" },
  { id: "standards", label: "Standards we follow" },
  { id: "features", label: "Built-in features" },
  { id: "known-gaps", label: "Known gaps" },
  { id: "report", label: "Reporting issues" },
]

export function LegalAccessibilityPage() {
  return (
    <LegalPageLayout
      title="Accessibility Statement"
      intro="CarePath is built for a population that frequently includes older adults and assistive-technology users. We treat accessibility as a product requirement, not a checkbox."
      lastUpdated="2026-05-18"
      canonical="/legal/accessibility"
      toc={TOC}
    >
      <p className="lead">
        We are committed to making the Services usable by everyone, including
        people who use screen readers, keyboard-only navigation, voice control,
        or display magnification.
      </p>

      <LegalSection id="commitment" title="Our commitment">
        <p>
          We design and test against modern accessibility standards from day
          one. Accessibility issues are treated as bugs, not enhancements, and
          are triaged with the same urgency as functional defects.
        </p>
      </LegalSection>

      <LegalSection id="standards" title="Standards we follow">
        <p>
          We target conformance with{" "}
          <strong>WCAG 2.1 Level AA</strong> and the relevant sections of the
          Americans with Disabilities Act (ADA), Section 508 of the
          Rehabilitation Act, and the European Accessibility Act.
        </p>
        <p>
          Conformance is an ongoing process; we audit core flows (search,
          facility detail, tour request, account creation) on every release
          and re-audit the full surface area at least quarterly.
        </p>
      </LegalSection>

      <LegalSection id="features" title="Built-in features">
        <ul>
          <li>
            <strong>Keyboard navigation</strong> — all interactive elements are
            reachable and operable via Tab / Shift+Tab / Enter / Space.
          </li>
          <li>
            <strong>Screen-reader support</strong> — semantic HTML, ARIA roles
            where native elements aren't sufficient, and descriptive
            aria-labels for icon-only buttons.
          </li>
          <li>
            <strong>Color contrast</strong> — primary text-on-background pairs
            meet the WCAG 4.5:1 ratio (AA for normal text).
          </li>
          <li>
            <strong>Reduced motion</strong> — animations respect the user's{" "}
            <code>prefers-reduced-motion</code> setting.
          </li>
          <li>
            <strong>Resizable text</strong> — the layout reflows cleanly up to
            200% browser zoom without horizontal scrolling on the core flows.
          </li>
          <li>
            <strong>Touch targets</strong> — interactive elements on mobile
            meet the 44×44 pt minimum from Apple's HIG and Google's Material
            guidance.
          </li>
        </ul>
      </LegalSection>

      <LegalSection id="known-gaps" title="Known gaps we're working on">
        <p>
          We track open accessibility issues in our public GitHub issues with
          the <code>a11y</code> label. The current short list:
        </p>
        <ul>
          <li>
            The interactive map (facility detail page) does not yet expose
            individual facility pins to screen readers; the list view on the
            same page is the screen-reader-equivalent path.
          </li>
          <li>
            Some long-form articles use embedded diagrams without text
            equivalents; we are backfilling alt text.
          </li>
          <li>
            The drag-and-drop admissions kanban (facility-admin portal) does
            not yet have a keyboard-only equivalent — facility staff can
            update stages via the dropdown in the row detail in the
            meantime.
          </li>
        </ul>
      </LegalSection>

      <LegalSection id="report" title="Reporting an issue">
        <p>
          Found something that isn't working with your assistive technology?
          We want to hear about it. Email{" "}
          <a href="mailto:accessibility@carepath.io" className="underline">
            accessibility@carepath.io
          </a>{" "}
          with a description of the issue, the page you were on, and the
          assistive technology you were using. We aim to acknowledge reports
          within two business days and resolve critical issues within ten
          business days.
        </p>
      </LegalSection>
    </LegalPageLayout>
  )
}
