import type { GuideContent } from "@/components/CarePathGuideTemplate"

/**
 * Per-guide content for the canonical CarePathGuideTemplate. Keep
 * slugs in sync with laravel-backend/app/Services/GuideCatalog.php
 * (the backend is the source of truth for which guides exist and
 * what they download; this file is the source of truth for how
 * they're showcased).
 *
 * Adding a new guide:
 *   1. Add the row in GuideCatalog.php (backend).
 *   2. Add a GuideContent entry here with matching slug.
 *   3. The /guides/:slug route auto-renders it via CarePathGuideTemplate.
 */

const SECTION_DEFAULT = {
  sectionEyebrow: "CarePath Resources",
  sectionLede:
    "Trusted information, local resources, and clear next steps for families planning care.",
}

const CONTACT_DEFAULT = {
  phone: "(800) 555-0179",
  email: "hello@carepath.io",
  website: "carepath.io",
}

export const GUIDES_BY_SLUG: Record<string, GuideContent> = {
  /* ─────────────── Tour Day ─────────────── */
  "tour-day-question-sheet": {
    ...SECTION_DEFAULT,
    sectionTitle: "Tour Day — Be Prepared",
    coverEyebrow: "Free Guide · 4 pages",
    coverTitle: "47 Questions to Ask on Tour",
    coverSubtitle:
      "The questions that separate a great facility from a glossy brochure. Print one per facility you tour.",
    valueProps: [
      "Walk in with confidence",
      "Spot the red flags fast",
      "Compare facilities on the same yardstick",
    ],
    heroPanel: {
      eyebrow: "Touring",
      title: "What to Notice When You Visit",
      body: "Smell, staff-to-resident ratio, posted activity calendar, and how a tour guide answers the hard questions.",
    },
    toc: [
      "Before you arrive",
      "First 60 seconds",
      "Care services & staffing",
      "Food, activities & life",
      "Cost, contracts & move-in",
      "Red flags & follow-ups",
    ],
    tocFooter: "Walk every tour with the same scorecard.",
    preview: {
      eyebrow: "Article preview",
      title: "First 60 Seconds Matter Most",
      body: "Your first minute inside tells you more than any brochure. Here's exactly what to look for, listen for, and smell for.",
      bullets: [
        "How residents look (engaged, dressed, calm)",
        "Are staff visible and unhurried?",
        "Smell + air quality",
        "Posted activity calendar (real or stale)",
      ],
      tip: "Bring a notepad. Memory of three tours blurs by day two.",
    },
    downloadHref: "/guides?download=tour-day-question-sheet",
    contact: CONTACT_DEFAULT,
  },

  /* ─────────────── Medicare ─────────────── */
  "medicare-ltc-cheat-sheet": {
    ...SECTION_DEFAULT,
    sectionTitle: "Medicare & Long-Term Care",
    coverEyebrow: "Free Guide · 4 pages",
    coverTitle: "Medicare for Long-Term Care",
    coverSubtitle:
      "The day-count rules, the gaps, and the things families always get wrong. Plain English.",
    valueProps: [
      "Know exactly what Medicare covers",
      "Plan for the day Medicare stops paying",
      "Avoid the most common billing surprises",
    ],
    heroPanel: {
      eyebrow: "Medicare",
      title: "20 / 80 / 100 Day Rule",
      body: "Days 1–20 fully covered. Days 21–100 with a daily copay. After day 100, you're on your own.",
    },
    toc: [
      "What Medicare actually pays for",
      "The 100-day SNF benefit",
      "What it does not cover",
      "Medigap & Advantage interaction",
      "When the bill arrives",
    ],
    tocFooter: "All numbers are 2024 federal benchmarks.",
    preview: {
      eyebrow: "Article preview",
      title: "Medicare Doesn't Cover Custodial Care",
      body: "Most families assume Medicare pays for long-term assisted living or memory care. It doesn't — and discovering this at month 4 is the most expensive surprise in senior care.",
      bullets: [
        "Skilled nursing — up to 100 days post-hospital",
        "Hospice — yes, when terminal diagnosis confirmed",
        "Custodial care — no, ever",
        "Assisted living rent — no, ever",
      ],
      tip: "Plan the day-101 transition before you need it.",
    },
    downloadHref: "/guides?download=medicare-ltc-cheat-sheet",
    contact: CONTACT_DEFAULT,
  },

  /* ─────────────── Medicaid Look-Back ─────────────── */
  "medicaid-lookback-checklist": {
    ...SECTION_DEFAULT,
    sectionTitle: "Medicaid Planning",
    coverEyebrow: "Free Guide · 4 pages",
    coverTitle: "The 5-Year Medicaid Look-Back",
    coverSubtitle:
      "Asset transfers that trigger penalties, exemptions that survive review, and how to avoid surprises.",
    valueProps: [
      "Know what counts as a transfer",
      "Use exemptions you didn't know existed",
      "Avoid penalty-period delays",
    ],
    heroPanel: {
      eyebrow: "Medicaid",
      title: "60 Months of Scrutiny",
      body: "Medicaid reviews every transfer in the prior 60 months. Mistakes show up at the worst possible time.",
    },
    toc: [
      "What the look-back actually checks",
      "Transfers that always trigger penalty",
      "Exempt transfers (you have more than you think)",
      "Asset protection that works",
      "Filing the application",
    ],
    tocFooter: "Rules vary by state; we flag where.",
    preview: {
      eyebrow: "Article preview",
      title: "Gifts to Grandchildren Are the #1 Trap",
      body: "Loving holiday gifts to the grandkids in 2023? Medicaid sees them in 2026 and applies a penalty — meaning months of self-pay before benefits start.",
      bullets: [
        "$15k+ annual gift — flagged",
        "Family loan paid off — flagged",
        "Helping a child with college tuition — flagged",
        "Transfer to a disabled adult child — exempt",
      ],
      tip: "Document every transfer with a stated purpose, before the 5-year clock starts.",
    },
    downloadHref: "/guides?download=medicaid-lookback-checklist",
    contact: CONTACT_DEFAULT,
  },

  /* ─────────────── VA Aid & Attendance ─────────────── */
  "va-aid-attendance-kit": {
    ...SECTION_DEFAULT,
    sectionTitle: "Veterans Benefits",
    coverEyebrow: "Free Kit · 6 pages",
    coverTitle: "VA Aid & Attendance Application Kit",
    coverSubtitle:
      "Up to $2,727/mo (single veteran) or $3,232/mo (veteran + spouse) for long-term care — and most eligible families never apply.",
    valueProps: [
      "Confirm eligibility in minutes",
      "Gather every required document",
      "Submit the right way the first time",
    ],
    heroPanel: {
      eyebrow: "VA Benefits",
      title: "Most Families Leave Money On the Table",
      body: "Roughly 1 in 3 wartime veterans qualify for Aid & Attendance. Less than half ever claim it.",
    },
    toc: [
      "Who qualifies (and who doesn't)",
      "Required documents checklist",
      "Income & asset limits",
      "Filing the 21-2680 form",
      "What to do if you're denied",
      "Survivor benefits for spouses",
    ],
    tocFooter: "Up to $3,232/mo monthly when veteran + spouse qualify.",
    preview: {
      eyebrow: "Article preview",
      title: "Eligibility in Three Questions",
      body: "Before you spend hours on paperwork, three quick checks tell you if Aid & Attendance is on the table.",
      bullets: [
        "Active service during a qualifying war period?",
        "Discharged other than dishonorably?",
        "Need help with at least 2 daily activities?",
      ],
      tip: "Spouses of qualifying veterans can apply for survivor benefits too — many families don't know this.",
    },
    downloadHref: "/guides?download=va-aid-attendance-kit",
    contact: CONTACT_DEFAULT,
  },

  /* ─────────────── What is Assisted Living ─────────────── */
  "what-is-assisted-living": {
    ...SECTION_DEFAULT,
    sectionTitle: "Understanding Care Types",
    coverEyebrow: "Free Guide · 4 pages",
    coverTitle: "What is Assisted Living?",
    coverSubtitle:
      "How assisted living differs from independent living, memory care, and skilled nursing — and how to tell if it's the right level.",
    valueProps: [
      "Compare care levels at a glance",
      "Match needs to the right setting",
      "Avoid paying for care you don't need",
    ],
    heroPanel: {
      eyebrow: "Care Types",
      title: "Pick the Right Level First",
      body: "Independent living, assisted living, memory care, SNF — choosing the wrong level wastes thousands of dollars per month.",
    },
    toc: [
      "What 'assisted living' actually means",
      "Daily activities (ADLs) explained",
      "Assisted living vs. memory care",
      "Assisted living vs. skilled nursing",
      "When to step up to a higher level",
    ],
    preview: {
      eyebrow: "Article preview",
      title: "The 'ADL Test' Decides for You",
      body: "Six activities of daily living tell you whether independent living, assisted living, or memory care fits — without a sales advisor's opinion.",
      bullets: [
        "Bathing, dressing, toileting",
        "Transferring (bed/chair)",
        "Eating",
        "Continence",
      ],
      tip: "Needing help with 2+ ADLs is the classic assisted-living threshold.",
    },
    downloadHref: "/guides?download=what-is-assisted-living",
    contact: CONTACT_DEFAULT,
  },

  /* ─────────────── Choosing Assisted Living ─────────────── */
  "choosing-assisted-living": {
    ...SECTION_DEFAULT,
    sectionTitle: "Decision Frameworks",
    coverEyebrow: "Free Guide · 6 pages",
    coverTitle: "How to Choose the Right Assisted Living",
    coverSubtitle:
      "The 9-step framework experienced placement advisors use, written in plain English so families can use it themselves.",
    valueProps: [
      "A structured 9-step decision flow",
      "Red flags every family should know",
      "Cost comparison done right",
    ],
    heroPanel: {
      eyebrow: "Decision Framework",
      title: "A Path Through the 47 Options",
      body: "Most metros have 30+ assisted living communities. This is the structured framework to narrow them to your top 3.",
    },
    toc: [
      "Step 1: Match level of care",
      "Step 2: Set the budget honestly",
      "Step 3: Geography & family access",
      "Step 4: Verify Medicaid acceptance",
      "Step 5: Tour with a scorecard",
      "Step 6: Read the contract red flags",
    ],
    tocFooter: "9-step framework adapted from placement-advisor practice.",
    preview: {
      eyebrow: "Article preview",
      title: "Contract Red Flags Every Family Misses",
      body: "Tour notes get filed away. Contracts get signed under pressure. These are the four contract clauses families consistently regret six months in.",
      bullets: [
        "Automatic level-of-care upgrades",
        "30-day rate-change notices",
        "Non-refundable community fees",
        "Discharge clauses for 'difficult' residents",
      ],
      tip: "Have a third party (family lawyer, advisor) read the contract before you sign anything.",
    },
    downloadHref: "/guides?download=choosing-assisted-living",
    contact: CONTACT_DEFAULT,
  },
}

export function guideContentFor(slug: string): GuideContent | null {
  return GUIDES_BY_SLUG[slug] ?? null
}
