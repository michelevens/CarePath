import { Link } from "react-router-dom"
import {
  Check,
  Download,
  Globe,
  Mail,
  Phone,
  type LucideIcon,
} from "lucide-react"

/**
 * The canonical CarePath guide template — used for EVERY downloadable
 * guide we publish (Long-Term Care, Medicaid Spend-Down, VA Aid &
 * Attendance, 5-Year Cost Projection, etc.). Drop it on a /guides/*
 * page or a landing-page promo block.
 *
 * Visual system (navy / teal / sage on warm cream):
 *   - navy   #1E3A5F  — primary text, headings, dark CTAs
 *   - teal   #2A7F7F  — eyebrow text, numbered chips, accents
 *   - sage   #8FAF9F  — secondary accents, bullets, gradient pair
 *   - cream  #F4F4F2  — section bg, tip boxes
 *   - white  #FFFFFF  — card surfaces
 *
 * Typography:
 *   - Playfair Display (serif) for headlines
 *   - Lato for body
 *   Both are loaded via Google Fonts in index.html alongside Inter.
 *
 * Per CLAUDE.md we don't use arbitrary Tailwind values for custom
 * colors — every brand color goes through inline `style`.
 *
 * Usage:
 *   <CarePathGuideTemplate guide={longTermCareGuide} />
 *
 * If you don't pass a guide, the Long-Term Care guide renders as the
 * default — keeps the original landing-page hook working.
 */

const PALETTE = {
  navy: "#1E3A5F",
  teal: "#2A7F7F",
  sage: "#8FAF9F",
  cream: "#F4F4F2",
} as const

const SERIF = '"Playfair Display", Georgia, serif'
const BODY = '"Lato", "Inter", system-ui, sans-serif'

export interface GuideContent {
  /** Section eyebrow above the page H2 — e.g. "CarePath Resources". */
  sectionEyebrow: string
  /** Section H2 — e.g. "Downloadable Long-Term Care Guides". */
  sectionTitle: string
  /** Section lede paragraph. */
  sectionLede: string

  /** Guide cover */
  coverEyebrow: string         // e.g. "Free Guide"
  coverTitle: string           // e.g. "Your Guide to Long-Term Care"
  coverSubtitle: string        // pitch line under the title
  valueProps: string[]         // 3 short benefits, rendered with checkmarks
  heroPanel: {
    eyebrow: string            // e.g. "Care Planning"
    title: string              // e.g. "Local Support Starts Here"
    body?: string              // optional supporting line
  }

  /** Table of contents (chapter titles, in order). */
  toc: string[]
  tocFooter?: string           // small reassurance line under the chapters

  /** Article preview card. */
  preview: {
    eyebrow: string            // e.g. "Article Preview"
    title: string              // e.g. "Exploring Your Care Options"
    body: string               // 1–2 sentence summary
    bullets?: string[]         // optional bullet list of topics covered
    tip?: string               // optional callout box at the bottom
  }

  /** Where the "Download Free Guide" button goes. */
  downloadHref: string

  /** Footer contact strip — navy bar matching the mockup's bottom band.
   * Any subset can be set; the strip hides entirely if none are. */
  contact?: {
    phone?: string
    email?: string
    website?: string
  }
}

/* ─────────────────────────── Default content ─────────────────────────── */

export const LONG_TERM_CARE_GUIDE: GuideContent = {
  sectionEyebrow: "CarePath Resources",
  sectionTitle: "Downloadable Long-Term Care Guides",
  sectionLede:
    "Trusted information, local resources, and clear next steps for families planning care.",

  coverEyebrow: "Free Guide",
  coverTitle: "Your Guide to Long-Term Care",
  coverSubtitle:
    "Helping families navigate care options with clarity and confidence.",
  valueProps: [
    "Understand your options",
    "Plan with confidence",
    "Find local support",
  ],
  heroPanel: {
    eyebrow: "Care Planning",
    title: "Local Support Starts Here",
    body: "Trusted, verified facilities in your area — pricing transparent, no lead-selling.",
  },

  toc: [
    "Getting started",
    "Types of care",
    "Paying for long-term care",
    "Government programs",
    "Planning ahead",
  ],
  tocFooter: "We're here to help every step of the way.",

  preview: {
    eyebrow: "Article preview",
    title: "Exploring Your Care Options",
    body: "Compare in-home care, assisted living, nursing homes, adult day services, and local care resources side-by-side.",
    bullets: [
      "In-home care",
      "Assisted living",
      "Nursing homes",
      "Adult day services",
    ],
    tip: "The right care looks different for everyone. Start with needs, budget, and location.",
  },

  downloadHref: "/guides",
  contact: {
    phone: "(800) 555-0179",
    email: "hello@carepath.io",
    website: "carepath.io",
  },
}

/* ─────────────────────────── Component ─────────────────────────── */

interface Props {
  guide?: GuideContent
  /** Optional Lucide icon to use instead of the download glyph on the
   * primary CTA — handy when a guide isn't actually downloadable but
   * routes to an interactive tool. */
  ctaIcon?: LucideIcon
  /** Override the CTA label — defaults to "Download Free Guide". */
  ctaLabel?: string
}

export function CarePathGuideTemplate({
  guide = LONG_TERM_CARE_GUIDE,
  ctaIcon: CtaIcon = Download,
  ctaLabel = "Download Free Guide",
}: Props) {
  return (
    <section
      className="px-6 py-16"
      style={{ backgroundColor: PALETTE.cream, fontFamily: BODY }}
    >
      <div className="mx-auto max-w-7xl">
        {/* Section header */}
        <div className="mb-10 text-center">
          <p
            className="text-sm font-semibold uppercase tracking-wide"
            style={{ color: PALETTE.teal }}
          >
            {guide.sectionEyebrow}
          </p>
          <h2
            className="mt-3 text-4xl font-bold md:text-5xl"
            style={{ color: PALETTE.navy, fontFamily: SERIF }}
          >
            {guide.sectionTitle}
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-gray-600">
            {guide.sectionLede}
          </p>
        </div>

        {/* Main two-column layout — collapses on mobile */}
        <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
          {/* LEFT: guide cover card */}
          <article className="rounded-3xl bg-white p-6 shadow-xl sm:p-8">
            <header className="mb-8 flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3
                  className="text-2xl font-bold"
                  style={{ color: PALETTE.navy, fontFamily: SERIF }}
                >
                  CarePath
                </h3>
                <p className="text-sm" style={{ color: PALETTE.teal }}>
                  Long-Term Care Directory
                </p>
              </div>

              <Link
                to={guide.downloadHref}
                className="inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-semibold text-white shadow-md transition-colors"
                style={{ backgroundColor: PALETTE.navy }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.backgroundColor = PALETTE.teal)
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.backgroundColor = PALETTE.navy)
                }
              >
                <CtaIcon className="h-4 w-4" />
                {ctaLabel}
              </Link>
            </header>

            <div className="grid gap-8 md:grid-cols-2">
              {/* Cover copy */}
              <div>
                <p
                  className="mb-3 text-sm font-semibold uppercase tracking-wide"
                  style={{ color: PALETTE.teal }}
                >
                  {guide.coverEyebrow}
                </p>
                <h1
                  className="text-4xl font-bold leading-tight sm:text-5xl"
                  style={{ color: PALETTE.navy, fontFamily: SERIF }}
                >
                  {guide.coverTitle}
                </h1>
                <p className="mt-5 text-lg text-gray-600">
                  {guide.coverSubtitle}
                </p>

                <ul className="mt-8 space-y-3">
                  {guide.valueProps.map((item) => (
                    <li key={item} className="flex items-center gap-3">
                      <span
                        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-white"
                        style={{ backgroundColor: PALETTE.teal }}
                      >
                        <Check className="h-3.5 w-3.5" />
                      </span>
                      <span className="text-gray-700">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Hero panel */}
              <div
                className="overflow-hidden rounded-3xl p-6 text-white"
                style={{
                  backgroundImage: `linear-gradient(135deg, ${PALETTE.sage}, ${PALETTE.teal})`,
                }}
              >
                <div
                  className="flex h-full min-h-[280px] flex-col justify-end rounded-2xl p-6"
                  style={{ backgroundColor: "rgba(255,255,255,0.15)" }}
                >
                  <p className="text-sm uppercase tracking-wide">
                    {guide.heroPanel.eyebrow}
                  </p>
                  <h4
                    className="mt-2 text-3xl font-bold"
                    style={{ fontFamily: SERIF }}
                  >
                    {guide.heroPanel.title}
                  </h4>
                  {guide.heroPanel.body && (
                    <p className="mt-3 text-sm text-white/85">
                      {guide.heroPanel.body}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </article>

          {/* RIGHT column: ToC + article preview */}
          <div className="grid gap-8">
            {/* Table of Contents */}
            <aside className="rounded-3xl bg-white p-6 shadow-xl">
              <div className="flex items-baseline justify-between">
                <h4
                  className="text-2xl font-bold"
                  style={{ color: PALETTE.navy, fontFamily: SERIF }}
                >
                  Table of Contents
                </h4>
                <span
                  className="text-xs font-semibold uppercase tracking-wide"
                  style={{ color: PALETTE.teal }}
                >
                  {guide.toc.length} chapter{guide.toc.length === 1 ? "" : "s"}
                </span>
              </div>
              <ol className="mt-6 space-y-4">
                {guide.toc.map((item, index) => (
                  <li key={item} className="flex items-center gap-4">
                    <span
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white"
                      style={{ backgroundColor: PALETTE.teal }}
                    >
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <span className="flex-1 text-gray-700">{item}</span>
                    <span
                      className="hidden text-xs text-gray-400 sm:inline"
                      aria-hidden="true"
                    >
                      ··········
                    </span>
                  </li>
                ))}
              </ol>

              {guide.tocFooter && (
                <div
                  className="mt-6 rounded-2xl p-4 text-sm"
                  style={{ backgroundColor: PALETTE.cream, color: PALETTE.navy }}
                >
                  <span className="font-semibold">{guide.tocFooter}</span>
                </div>
              )}
            </aside>

            {/* Article preview */}
            <aside className="rounded-3xl bg-white p-6 shadow-xl">
              <p
                className="text-sm font-semibold uppercase tracking-wide"
                style={{ color: PALETTE.teal }}
              >
                {guide.preview.eyebrow}
              </p>
              <h4
                className="mt-2 text-2xl font-bold"
                style={{ color: PALETTE.navy, fontFamily: SERIF }}
              >
                {guide.preview.title}
              </h4>
              <p className="mt-4 text-gray-600">{guide.preview.body}</p>

              {guide.preview.bullets && guide.preview.bullets.length > 0 && (
                <ul className="mt-5 space-y-2 text-sm text-gray-700">
                  {guide.preview.bullets.map((label) => (
                    <li key={label} className="flex items-center gap-2">
                      <span
                        className="h-1.5 w-1.5 rounded-full"
                        style={{ backgroundColor: PALETTE.sage }}
                      />
                      {label}
                    </li>
                  ))}
                </ul>
              )}

              {guide.preview.tip && (
                <div
                  className="mt-6 rounded-2xl p-4 text-sm"
                  style={{
                    backgroundColor: PALETTE.cream,
                    color: PALETTE.navy,
                    borderLeft: `4px solid ${PALETTE.teal}`,
                  }}
                >
                  <span className="font-semibold">Tip:</span>{" "}
                  <span className="text-gray-700">{guide.preview.tip}</span>
                </div>
              )}
            </aside>
          </div>
        </div>

        {/* Contact strip — navy bar with phone / email / website,
            matching the mockup's bottom band. Hides entirely if no
            contact info is supplied. */}
        {guide.contact && (guide.contact.phone || guide.contact.email || guide.contact.website) && (
          <ContactStrip contact={guide.contact} />
        )}
      </div>
    </section>
  )
}

function ContactStrip({
  contact,
}: {
  contact: NonNullable<GuideContent["contact"]>
}) {
  const items: Array<{ icon: LucideIcon; label: string; href: string }> = []
  if (contact.website) {
    items.push({
      icon: Globe,
      label: contact.website,
      href: contact.website.startsWith("http") ? contact.website : `https://${contact.website}`,
    })
  }
  if (contact.phone) {
    items.push({
      icon: Phone,
      label: contact.phone,
      href: `tel:${contact.phone.replace(/[^+\d]/g, "")}`,
    })
  }
  if (contact.email) {
    items.push({ icon: Mail, label: contact.email, href: `mailto:${contact.email}` })
  }

  return (
    <div
      className="mt-8 overflow-hidden rounded-3xl shadow-xl"
      style={{ backgroundColor: PALETTE.navy }}
    >
      <div className="grid divide-white/10 text-white sm:grid-cols-3 sm:divide-x">
        {items.map((item) => (
          <a
            key={item.label}
            href={item.href}
            target={item.href.startsWith("http") ? "_blank" : undefined}
            rel={item.href.startsWith("http") ? "noreferrer" : undefined}
            className="flex items-center justify-center gap-3 px-6 py-5 transition-colors hover:bg-white/5"
          >
            <span
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
              style={{ backgroundColor: PALETTE.teal }}
            >
              <item.icon className="h-4 w-4" />
            </span>
            <span className="text-sm font-medium">{item.label}</span>
          </a>
        ))}
      </div>
    </div>
  )
}
