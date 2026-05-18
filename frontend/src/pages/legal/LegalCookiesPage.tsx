import { LegalPageLayout, LegalSection } from "@/components/LegalPageLayout"

const TOC = [
  { id: "what", label: "What is a cookie" },
  { id: "categories", label: "What we use" },
  { id: "third-party", label: "Third-party cookies" },
  { id: "manage", label: "Managing cookies" },
]

export function LegalCookiesPage() {
  return (
    <LegalPageLayout
      title="Cookie Policy"
      intro="The small files we store on your device, what they're for, and how to turn them off."
      lastUpdated="2026-05-18"
      canonical="/legal/cookies"
      toc={TOC}
    >
      <p className="lead">
        Cookies and similar technologies (local storage, session storage) help
        the Services work. We use the minimum set required — no advertising
        trackers, no third-party retargeting pixels.
      </p>

      <LegalSection id="what" title="What is a cookie">
        <p>
          A cookie is a small text file your browser saves when you visit a
          site. When you come back, the site can read the cookie. We also use
          your browser's local storage and session storage in the same way for
          some functional features (saving search filters, remembering an
          unfinished form).
        </p>
      </LegalSection>

      <LegalSection id="categories" title="What we use">
        <p>
          We group what we set into three categories. None of them require
          opt-in in jurisdictions that allow legitimate-interest processing,
          but we list them all here so you know what's running.
        </p>
        <h3>Strictly necessary</h3>
        <ul>
          <li>
            <code>laravel_session</code>, <code>XSRF-TOKEN</code> — auth +
            cross-site-request-forgery protection. The Services cannot work
            without these.
          </li>
          <li>
            <code>carepath:auth</code> (local storage) — keeps you signed in
            across browser tabs.
          </li>
        </ul>
        <h3>Functional</h3>
        <ul>
          <li>
            <code>carepath:recent-searches</code>, <code>carepath:saved-search-prefs</code>
            (local storage) — remember your last few searches so you can
            jump back into them.
          </li>
          <li>
            <code>carepath:chunk-reload-at</code> (session storage) — throttles
            our auto-recovery from stale JS bundles after a deploy.
          </li>
          <li>
            <code>carepath:onboarding-state</code> (local storage) — remembers
            where you are in the family-onboarding flow.
          </li>
        </ul>
        <h3>Analytics</h3>
        <p>
          We currently do <strong>not</strong> use third-party analytics
          cookies (Google Analytics, Mixpanel, Segment, etc.). If we add any in
          the future, we will update this page and provide a clear opt-out at
          least 14 days before they go live.
        </p>
      </LegalSection>

      <LegalSection id="third-party" title="Third-party cookies">
        <p>
          A handful of embedded services we depend on may set their own
          cookies when their content loads:
        </p>
        <ul>
          <li>
            <strong>Stripe</strong> — checkout and subscription pages embed
            Stripe Elements, which sets cookies for fraud prevention. See
            Stripe's{" "}
            <a
              href="https://stripe.com/privacy"
              target="_blank"
              rel="noreferrer"
              className="underline"
            >
              privacy policy
            </a>
            .
          </li>
          <li>
            <strong>OpenStreetMap tile servers</strong> — the facility map
            loads tiles from openstreetmap.org. OSM may log basic request
            metadata.
          </li>
        </ul>
      </LegalSection>

      <LegalSection id="manage" title="Managing cookies">
        <p>
          Your browser lets you block or delete cookies at any time. Look
          under Settings → Privacy in Chrome, Firefox, Safari, or Edge.
          Blocking the "strictly necessary" cookies will sign you out and
          break some features.
        </p>
        <p>
          To clear CarePath's own local-storage entries, open your browser's
          developer tools (F12), go to the Application tab → Local Storage →
          carepath.io, and delete any rows starting with <code>carepath:</code>.
        </p>
      </LegalSection>
    </LegalPageLayout>
  )
}
