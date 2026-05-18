import { LegalPageLayout, LegalSection } from "@/components/LegalPageLayout"

const TOC = [
  { id: "cms", label: "CMS Nursing Home Compare" },
  { id: "state-licensing", label: "State licensing boards" },
  { id: "osm", label: "OpenStreetMap" },
  { id: "manager", label: "Manager-curated listings" },
  { id: "user", label: "User-contributed (reviews, claims)" },
  { id: "ai", label: "AI-generated content" },
  { id: "corrections", label: "Reporting corrections" },
]

export function LegalDataPage() {
  return (
    <LegalPageLayout
      title="Data Sources"
      intro="Where every piece of information on a CarePath facility page comes from, how often we refresh it, and what license each source is under."
      lastUpdated="2026-05-18"
      canonical="/legal/data"
      toc={TOC}
    >
      <p className="lead">
        Transparency is the point of CarePath. Here's exactly where each data
        point you see on a facility page came from.
      </p>

      <LegalSection id="cms" title="CMS Nursing Home Compare">
        <p>
          <strong>Coverage:</strong> All Medicare- and Medicaid-certified
          skilled nursing facilities (SNFs) in the United States.
        </p>
        <p>
          <strong>Fields we use:</strong> Facility name, address, CMS
          Certification Number (CCN), CMS Five-Star ratings (overall, health
          inspection, staffing, quality measures), total beds, ownership type,
          last inspection date, F-tag deficiencies, special focus facility
          status.
        </p>
        <p>
          <strong>Source:</strong> The federal{" "}
          <a
            href="https://data.cms.gov/provider-data/dataset/4pq5-n9py"
            target="_blank"
            rel="noreferrer"
            className="underline"
          >
            Provider Data Catalog
          </a>{" "}
          published by the Centers for Medicare &amp; Medicaid Services.
        </p>
        <p>
          <strong>License:</strong> Public domain (US Government work).
        </p>
        <p>
          <strong>Refresh cadence:</strong> Monthly. The CMS publishing
          schedule is approximately the last week of each month; we ingest
          within 48 hours.
        </p>
      </LegalSection>

      <LegalSection id="state-licensing" title="State licensing boards">
        <p>
          <strong>Coverage:</strong> Assisted-living, memory care, group home,
          and adult-family-home facilities licensed by state departments of
          health, social services, or aging. Coverage varies by state — some
          publish a regularly-refreshed CSV, others require Public Records
          Requests.
        </p>
        <p>
          <strong>Fields we use:</strong> Facility name, license number,
          license category and subtype, address, capacity, license status,
          last renewal date.
        </p>
        <p>
          <strong>Source:</strong> Each state's licensing portal. Major ones:
          California CCLD (community care licensing), Florida AHCA, Texas HHSC,
          New York DOH, Washington DSHS.
        </p>
        <p>
          <strong>License:</strong> Public records under each state's open-
          records / sunshine law. We retain a record of the source URL and
          download date per ingest.
        </p>
        <p>
          <strong>Refresh cadence:</strong> Monthly for portals that publish
          machine-readable feeds; quarterly for Public-Records-Request states.
        </p>
      </LegalSection>

      <LegalSection id="osm" title="OpenStreetMap">
        <p>
          <strong>Coverage:</strong> Long-term-care facilities tagged in
          OpenStreetMap with relevant{" "}
          <code>amenity=*</code>, <code>social_facility=*</code>, or{" "}
          <code>healthcare=*</code> tags. Used as a supplemental source for
          smaller / unlicensed-but-public-facing settings.
        </p>
        <p>
          <strong>Fields we use:</strong> Name, location (lat/lon), address
          where present, contact phone, website.
        </p>
        <p>
          <strong>Source + license:</strong> OpenStreetMap contributors, under
          the{" "}
          <a
            href="https://opendatacommons.org/licenses/odbl/"
            target="_blank"
            rel="noreferrer"
            className="underline"
          >
            Open Database License (ODbL)
          </a>
          . Map tiles on facility pages are also © OpenStreetMap contributors;
          attribution appears below each map.
        </p>
        <p>
          <strong>Refresh cadence:</strong> Weekly via Overpass API for the
          covered tag set.
        </p>
      </LegalSection>

      <LegalSection id="manager" title="Manager-curated listings">
        <p>
          <strong>Coverage:</strong> Any field a verified facility manager
          edits on their public listing — tagline, "About this community"
          body, amenities, photos, public phone/email, starting monthly price.
        </p>
        <p>
          <strong>How verification works:</strong> A facility administrator
          submits a claim from the facility's public page. The CarePath team
          reviews the claim within 1–2 business days, typically via email-
          domain match and a quick phone confirmation. Approved claimants
          gain edit access scoped to their facility.
        </p>
        <p>
          <strong>Trust signal on the listing:</strong> Listings with at least
          one verified manager show a "Verified by manager" badge near the
          name.
        </p>
      </LegalSection>

      <LegalSection id="user" title="User-contributed content (reviews, claims, tour notes)">
        <p>
          Reviews are submitted by users, moderated for policy compliance,
          and published with a "verified resident" badge where the reviewer
          can demonstrate a stay at the facility. We do not edit the substance
          of a review or accept payment to suppress or boost reviews.
        </p>
        <p>
          Claim submissions are stored as part of the audit log and reviewed
          by the SuperAdmin team.
        </p>
      </LegalSection>

      <LegalSection id="ai" title="AI-generated content">
        <p>
          A few surfaces use a large language model (Anthropic Claude) to
          summarize information or assist with search. These are clearly
          labeled where they appear:
        </p>
        <ul>
          <li>
            <strong>"Ask AI" widget</strong> — answers general questions about
            long-term care using a combination of our editorial content and
            the model's general knowledge. Always verify medical or legal
            specifics with a qualified professional.
          </li>
          <li>
            <strong>AI search bar</strong> — interprets natural-language
            queries ("memory care under $5,000 near Tampa that takes Medicaid")
            into structured search filters. The results themselves come from
            our facility database.
          </li>
        </ul>
        <p>
          We do not use AI to generate facility-page editorial content
          (descriptions, taglines) without explicit manager approval.
        </p>
      </LegalSection>

      <LegalSection id="corrections" title="Reporting corrections">
        <p>
          See something wrong on a facility page? You have three options:
        </p>
        <ul>
          <li>
            <strong>If you manage the facility</strong> — claim the listing
            and edit the public page directly from your admin portal.
          </li>
          <li>
            <strong>If you're a family member, advisor, or visitor</strong> —
            use the "Suggest an edit" link in the footer of every facility
            page (or email{" "}
            <a href="mailto:corrections@carepath.io" className="underline">
              corrections@carepath.io
            </a>
            ). Substantive changes are reviewed against an authoritative
            source (CMS, state board, manager confirmation) before going
            live.
          </li>
          <li>
            <strong>If you're a state licensing board or government agency</strong>{" "}
            — email{" "}
            <a href="mailto:data@carepath.io" className="underline">
              data@carepath.io
            </a>{" "}
            and we'll respond within five business days.
          </li>
        </ul>
      </LegalSection>
    </LegalPageLayout>
  )
}
