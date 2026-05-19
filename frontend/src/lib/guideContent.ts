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
  /* ─────────────── F-tag survey reports ─────────────── */
  "reading-f-tag-survey-reports": {
    ...SECTION_DEFAULT,
    sectionTitle: "Decode the Inspection",
    coverEyebrow: "Free Guide · 5 pages",
    coverTitle: "How to Read an F-Tag Survey Report",
    coverSubtitle:
      "Every Medicare-certified nursing home is inspected annually. The report is the single best signal of how the facility actually runs.",
    valueProps: [
      "Decode the A-L scope/severity matrix",
      "The 10 F-tags that matter most",
      "The 5 findings that should make you walk away",
    ],
    heroPanel: {
      eyebrow: "Quality",
      title: "Read the Report",
      body: "Most families never open it. Five minutes with this guide separates 'one bad year' from 'do not place your loved one here.'",
    },
    toc: [
      "The 5-section anatomy",
      "The Scope + Severity matrix",
      "The 10 F-tags families should know",
      "Interpret a real report in 5 minutes",
      "What the star rating actually weighs",
      "The 5 reasons to walk away",
    ],
    tocFooter: "The public, free document every other site quietly hopes you won't read.",
    preview: {
      eyebrow: "Chapter preview",
      title: "The Scope + Severity Matrix",
      body: "Every F-tag finding gets a letter A through L. The letter encodes severity (rows) and scope (columns).",
      bullets: [
        "J / K / L = Immediate Jeopardy. Even one is a hard pause.",
        "G / H / I = Actual Harm. Anything more than 1-2 means real care problems.",
        "D / E / F = Potential for harm. Common in virtually every facility.",
        "A / B / C = Minor. Not disqualifying.",
      ],
      tip: "Skip the prose. Find the summary page and count by category.",
    },
    downloadHref: "/guides?download=reading-f-tag-survey-reports",
    contact: CONTACT_DEFAULT,
  },

  /* ─────────────── Memory care vs day program vs in-home ─────────────── */
  "memory-care-vs-day-program-vs-in-home": {
    ...SECTION_DEFAULT,
    sectionTitle: "Three Options, Not Two",
    coverEyebrow: "Free Guide · 5 pages",
    coverTitle: "Memory Care vs Day Program vs In-Home",
    coverSubtitle:
      "The biggest mistake families make is treating this as a binary home-vs-facility choice. The reality is a 5-step progression.",
    valueProps: [
      "Side-by-side cost + coverage table",
      "When each option is right (and when it stops working)",
      "The 5-stage progression most families follow",
    ],
    heroPanel: {
      eyebrow: "Dementia",
      title: "It's Not Home vs Facility",
      body: "Adult day programs and in-home aides are the in-between steps that buy years of better quality of life.",
    },
    toc: [
      "Three options side by side",
      "In-home aide",
      "Adult day program",
      "Memory care",
      "The honest cost comparison",
      "The 5-stage progression",
    ],
    tocFooter: "Don't skip the in-between steps just because they're less visible.",
    preview: {
      eyebrow: "Chapter preview",
      title: "The Honest Cost Comparison",
      body: "For a loved one needing 8 hours/day of supervision — adult day programs are dramatically cheaper per supervision-hour than in-home aides.",
      bullets: [
        "In-home aide (8hr × 5d at $35/hr): $6,067/mo",
        "Adult day program (5 days): $2,000/mo",
        "Memory care (residential 24/7): $7,500/mo",
        "Day programs almost always win on both cost AND quality of life",
      ],
      tip: "Medicaid HCBS waivers cover day programs in most states. Most families don't ask.",
    },
    downloadHref: "/guides?download=memory-care-vs-day-program-vs-in-home",
    contact: CONTACT_DEFAULT,
  },

  /* ─────────────── LTC insurance claim playbook ─────────────── */
  "ltc-insurance-claim-playbook": {
    ...SECTION_DEFAULT,
    sectionTitle: "Activate Your LTC Policy",
    coverEyebrow: "Free Guide · 5 pages",
    coverTitle: "LTC Insurance — How to Actually File the Claim",
    coverSubtitle:
      "The 5-step playbook for activating a policy most families never collect on. Worth $50-150k.",
    valueProps: [
      "Find the policy + read the 4 numbers that matter",
      "Coach the physician on benefit-eligibility wording",
      "Avoid the 4 mistakes that kill claims",
    ],
    heroPanel: {
      eyebrow: "Financial",
      title: "Activate the Policy",
      body: "20+ years of premiums. $50-150k in coverage. Most families never file. The barrier is paperwork, not the policy.",
    },
    toc: [
      "Find the policy first",
      "The 4 numbers that matter",
      "The eligibility threshold",
      "The 5-step claim process",
      "The 4 mistakes that kill claims",
      "If you are denied",
    ],
    tocFooter: "Initial denials reverse on appeal 60-70% of the time with better documentation.",
    preview: {
      eyebrow: "Chapter preview",
      title: "Why Families Get Denied Initially",
      body: "Insurers want documented evidence, not the family's word. The physician must assess and document ADL deficits in clear, insurer-speak.",
      bullets: [
        "Vague: 'Mom needs help bathing because of arthritis' → denied",
        "Specific: 'Mom requires hands-on assistance with bathing due to inability to safely transfer in and out of the tub; cannot complete the task independently' → approved",
        "Cognitive impairment requires diagnosis + MMSE/MoCA score + specific safety risks of being alone",
        "Use 'cannot' and 'daily,' not 'has difficulty' and 'sometimes'",
      ],
      tip: "Bring a 1-page summary of care needs in clear ADL language to the physician's appointment. They've usually never seen the form before.",
    },
    downloadHref: "/guides?download=ltc-insurance-claim-playbook",
    contact: CONTACT_DEFAULT,
  },

  /* ─────────────── Sundowning + behavior crisis ─────────────── */
  "sundowning-behavior-crisis": {
    ...SECTION_DEFAULT,
    sectionTitle: "Crisis-Moment Triage",
    coverEyebrow: "Free Guide · 5 pages",
    coverTitle: "Sundowning & Behavior-Crisis Decision Tree",
    coverSubtitle:
      "ER vs on-call vs hold the line. The in-the-moment triage for the toughest 30 minutes of dementia caregiving.",
    valueProps: [
      "60-second triage: when to call 911 vs the on-call doctor",
      "Why ER is often the wrong call (and when it is the right one)",
      "The 30-day log that finds the trigger",
    ],
    heroPanel: {
      eyebrow: "Crisis Mode",
      title: "It's 9pm and Dad Just Tried to Leave",
      body: "Almost every behavioral crisis has a cause. Your job in the next 30 minutes is to keep everyone safe, not fix the underlying issue.",
    },
    toc: [
      "The 60-second triage",
      "Why ER is often the wrong call",
      "Sundowning — the common pattern",
      "The 6 interventions that work",
      "Memory care readiness signals",
      "The 30-day 'what changed' log",
    ],
    tocFooter: "Behavioral changes always have a reason. The log is how you find it.",
    preview: {
      eyebrow: "Chapter preview",
      title: "The 60-Second Triage",
      body: "Three buckets: 911 / ER, call the on-call line, or de-escalate and document.",
      bullets: [
        "911 if: threat of harm, suicidal statements, sudden onset confusion, loss of consciousness",
        "On-call if: severe agitation but safe, new hallucinations (often UTI), recent med change, refusing food >24h",
        "De-escalate if: agitated but talking, repeated accusations, predictable sundown wandering",
        "ER is often wrong — bright, loud, bewildering — delirium gets WORSE there",
      ],
      tip: "Geriatric psych units are dramatically better than general ERs for behavioral-only episodes in dementia patients.",
    },
    downloadHref: "/guides?download=sundowning-behavior-crisis",
    contact: CONTACT_DEFAULT,
  },

  /* ─────────────── When Mom Can't Live Alone ─────────────── */
  "when-mom-cant-live-alone": {
    ...SECTION_DEFAULT,
    sectionTitle: "The Hardest Conversation",
    coverEyebrow: "Free Guide · 5 pages",
    coverTitle: "When Mom Can't Live Alone Anymore",
    coverSubtitle:
      "The 9 trigger signs, what each one means, and what to do the week you finally notice.",
    valueProps: [
      "The 9 signs in order of severity",
      "The 1-2-4 rule",
      "What to do the week you decide to act",
    ],
    heroPanel: {
      eyebrow: "Transition",
      title: "The Signs Were There",
      body: "The signs are almost always there a year before the family is ready to admit them. Read them honestly.",
    },
    toc: [
      "The 9 trigger signs",
      "How many is too many?",
      "The 4 things to do this week",
      "The conversation no one wants to have",
    ],
    tocFooter: "Acting six months early vs six months late is the entire game.",
    preview: {
      eyebrow: "Chapter preview",
      title: "The 9 Signs in Order of Severity",
      body: "Unexplained weight loss is the body's quietest cry for help. Medication mistakes are the #1 preventable cause of ER visits for elders living alone.",
      bullets: [
        "Unexplained weight loss",
        "Medication mistakes",
        "Hygiene decline",
        "Any fall (even 'small')",
        "Repeated stories + lost names",
        "Bills going unpaid",
      ],
      tip: "One sign = watch. Two-three = serious conversation. Four+ = decision week.",
    },
    downloadHref: "/guides?download=when-mom-cant-live-alone",
    contact: CONTACT_DEFAULT,
  },

  /* ─────────────── 30-day move-in survival ─────────────── */
  "30-day-move-in-survival-guide": {
    ...SECTION_DEFAULT,
    sectionTitle: "The First 30 Days After Move-In",
    coverEyebrow: "Free Guide · 5 pages",
    coverTitle: "The 30-Day Move-In Survival Guide",
    coverSubtitle:
      "What to expect, what to watch for, what to escalate — week by week from the first night in the new room.",
    valueProps: [
      "Know normal disorientation vs real problems",
      "The 30-day care-plan meeting checklist",
      "The 4-step escalation ladder",
    ],
    heroPanel: {
      eyebrow: "Transition",
      title: "Worse Before Better",
      body: "The first two weeks will feel worse before they feel better. Knowing what's normal vs what's a real problem is the whole point.",
    },
    toc: [
      "Move-in day: bring this, do this",
      "Days 1-7: the disorientation phase",
      "Days 7-14: the adjustment phase",
      "Days 14-30: the new normal",
      "The 4-step escalation ladder",
    ],
    tocFooter: "By day 60 you'll know if this is the right place — and you'll have the data to act either way.",
    preview: {
      eyebrow: "Chapter preview",
      title: "Days 1-7: The Disorientation Phase",
      body: "Your loved one will want to 'go home' — sometimes constantly. Hold the line; this is normal.",
      bullets: [
        "Sleep more (adjustment fatigue) or less (anxiety)",
        "Eat less initially (new food, new pace, new tablemates)",
        "Transition delirium is real and clears in 1-2 weeks",
        "Non-linear: one bad day, then better, then bad again",
      ],
      tip: "Visit daily but keep it short (30-60 min). Eating together once helps anchor.",
    },
    downloadHref: "/guides?download=30-day-move-in-survival-guide",
    contact: CONTACT_DEFAULT,
  },

  /* ─────────────── 48-hour discharge playbook ─────────────── */
  "hospital-to-snf-48-hour-playbook": {
    ...SECTION_DEFAULT,
    sectionTitle: "Discharge Crisis — The Next 48 Hours",
    coverEyebrow: "Free Guide · 6 pages",
    coverTitle: "The 48-Hour Hospital-to-SNF Discharge Playbook",
    coverSubtitle:
      "Mom is being discharged tomorrow and needs rehab. You've never done this before. Here's the next 48 hours, hour by hour.",
    valueProps: [
      "Get a real list (not the hospital's alphabetical one)",
      "Tour 3 facilities in a single afternoon",
      "Track the 100-day Medicare clock + appeal premature discharges",
    ],
    heroPanel: {
      eyebrow: "Crisis Mode",
      title: "48 Hours, Hour by Hour",
      body: "The hospital social worker just told you. You have two days. This is the hour-by-hour play.",
    },
    toc: [
      "Hour 0-4: Get the right list",
      "Hour 4-24: Tour the top 3",
      "Hour 24-36: Pick + advocate",
      "Hour 36-48: The arrival itself",
      "The day-after audit",
      "The 100-day Medicare clock",
    ],
    tocFooter: "The questions that separate the rehab facilities that will get them home from the ones that won't.",
    preview: {
      eyebrow: "Chapter preview",
      title: "Hour 4-24: Tour the Top 3",
      body: "You will not have time to tour ten places. Pick three. Visit all three the same day if humanly possible.",
      bullets: [
        "Watch the call lights — anything over 4 minutes is a red flag",
        "Ask for the rehab unit specifically, not the LTC wing",
        "Meet the therapy team — how many minutes per day will my mom get?",
        "Ask the hardest question: 'What's your 30-day readmission rate?'",
      ],
      tip: "Smell the air at 11am AND 3pm. Persistent urine smell = understaffing.",
    },
    downloadHref: "/guides?download=hospital-to-snf-48-hour-playbook",
    contact: CONTACT_DEFAULT,
  },

  /* ─────────────── LTC cost reality check ─────────────── */
  "ltc-cost-reality-check": {
    ...SECTION_DEFAULT,
    sectionTitle: "The Honest Cost Picture",
    coverEyebrow: "Free Guide · 6 pages",
    coverTitle: "The 5-Year LTC Cost Reality Check",
    coverSubtitle:
      "Real numbers, real states, real crossover-to-Medicaid math. The version no one will sugar-coat.",
    valueProps: [
      "2026 cost numbers by care type and state",
      "Who pays for what — the four sources",
      "The 60-second runway test",
    ],
    heroPanel: {
      eyebrow: "Financial",
      title: "What It Actually Costs",
      body: "The single biggest reason families delay placement is fear of cost. Here's the math, honestly.",
    },
    toc: [
      "What the four care types actually cost",
      "Where you live matters more",
      "Who pays for what — the four sources",
      "The crossover-to-Medicaid math",
      "Cost-saving moves families miss",
      "The 60-second cost reality test",
    ],
    tocFooter: "Expensive is one thing. Expensive AND unplanned is the disaster.",
    preview: {
      eyebrow: "Chapter preview",
      title: "Where You Live Matters More Than Which Type You Pick",
      body: "Moving 100 miles can save $30,000-50,000 per year. AL in Mississippi runs $3,800/mo; the same in Massachusetts runs $7,200.",
      bullets: [
        "National median assisted living: $5,511/mo",
        "Premium markets (Bay Area, NYC, Boston): $6,500-7,200/mo",
        "Sun Belt budget states (FL, GA, TX): $4,500/mo",
        "Mississippi / Alabama / Louisiana: $3,800/mo",
      ],
      tip: "Families with flexibility on location cross state lines. FL, AZ, TX, NC are the most common destinations.",
    },
    downloadHref: "/guides?download=ltc-cost-reality-check",
    contact: CONTACT_DEFAULT,
  },

  /* ─────────────── Group homes / AFHs ─────────────── */
  "group-home-evaluation-guide": {
    ...SECTION_DEFAULT,
    sectionTitle: "Small-Setting Care, Done Right",
    coverEyebrow: "Free Guide · 5 pages",
    coverTitle: "Group Homes & Adult Family Homes",
    coverSubtitle:
      "How to evaluate a 4-10 bed residential care option without being fooled by either the charm of the setting or the lack of polish.",
    valueProps: [
      "Decode the state-by-state alphabet — group home, AFH, RCFE, PCH, ICF/IID",
      "Ask the staffing questions small homes try to dodge",
      "Find the Medicaid waiver path most families miss",
    ],
    heroPanel: {
      eyebrow: "Small-Setting Care",
      title: "Six Beds, One Table",
      body: "A 6-bed adult family home is a different product from a 200-bed tower. The decision criteria are different too.",
    },
    toc: [
      "The small-setting alphabet soup",
      "When a small setting is the right answer",
      "The staffing math",
      "Money + the Medicaid path",
      "Tour-day reality check",
      "Red flags + state-side homework",
    ],
    tocFooter: "Done right, the closest thing to aging at home with real support.",
    preview: {
      eyebrow: "Chapter preview",
      title: "The Staffing Math You Have to Ask About",
      body: "Small homes win on intimacy and lose on staffing redundancy. The third night shift in a row when one caregiver is sick is where the model gets tested.",
      bullets: [
        "Day-shift, night-shift, and weekend caregiver-to-resident ratios",
        "Who covers when a caregiver calls out sick (family? agency? unfilled?)",
        "Owner-operator on-site presence — radically changes the home's culture",
        "Training and licensure level of the caregivers",
      ],
      tip: "Show up unannounced for a second visit. Legitimate operators welcome it.",
    },
    downloadHref: "/guides?download=group-home-evaluation-guide",
    contact: CONTACT_DEFAULT,
  },

  /* ─────────────── State Medicaid waiver map ─────────────── */
  "state-medicaid-waiver-map": {
    ...SECTION_DEFAULT,
    sectionTitle: "Find Your State's Medicaid Waiver",
    coverEyebrow: "Free Guide · 6 pages",
    coverTitle: "The State Medicaid Waiver Map",
    coverSubtitle:
      "Every state's HCBS / ALW waiver, the waitlist reality, and how to apply before you need services.",
    valueProps: [
      "Find your state in 30 seconds",
      "Avoid the most common Medicaid mistake — waiting to apply",
      "Know what HCBS covers and what it doesn't",
    ],
    heroPanel: {
      eyebrow: "Medicaid",
      title: "The Waiver Behind the Waitlist",
      body: "Medicaid pays for nursing homes everywhere. Paying for assisted living, group homes, and in-home care runs through a different door — and each state runs its own.",
    },
    toc: [
      "What HCBS waivers actually cover",
      "The 50-state landscape, grouped",
      "Who qualifies — the three filters",
      "How to apply (universal steps)",
      "Where to look up your state",
      "The action checklist",
    ],
    tocFooter: "File now even if you don't need services yet — your application date is your priority.",
    preview: {
      eyebrow: "Chapter preview",
      title: "Waivers With Significant Waiting Lists",
      body: "Florida, Texas, Georgia, Tennessee — multi-year waitlists are the norm. The earlier you apply, the earlier you're served.",
      bullets: [
        "Florida SMMC-LTC: 5-15 year waitlist for non-Medicaid-pending applicants",
        "Texas STAR+PLUS HCBS: 6-10 year interest list typical",
        "Florida iBudget (IDD): 22,000+ on the waitlist",
        "Vermont Choices for Care: uniquely runs as managed-care entitlement, no waitlist",
      ],
      tip: "Call your state's Aging & Disability Resource Center this week. Free, neutral, the right place to start.",
    },
    downloadHref: "/guides?download=state-medicaid-waiver-map",
    contact: CONTACT_DEFAULT,
  },

  /* ─────────────── POA / healthcare proxy ─────────────── */
  "power-of-attorney-healthcare-proxy": {
    ...SECTION_DEFAULT,
    sectionTitle: "Get the Paperwork in Place",
    coverEyebrow: "Free Guide · 5 pages",
    coverTitle: "Power of Attorney & Healthcare Proxy",
    coverSubtitle:
      "The four documents every family caregiver needs in place before they're needed.",
    valueProps: [
      "Pick the right POA type — durable, springing, immediate",
      "Avoid the bank-rejects-the-POA disaster",
      "Know what to do when capacity is already gone",
    ],
    heroPanel: {
      eyebrow: "Legal",
      title: "Four Documents, 90 Minutes",
      body: "Get these signed while capacity is intact. The alternative is guardianship — slow, expensive, adversarial.",
    },
    toc: [
      "The four documents",
      "Choosing the right agent",
      "Executing the documents correctly",
      "State portability",
      "When no documents exist + capacity is gone",
      "The action checklist",
    ],
    tocFooter: "A $300 elder-law consultation prevents the worst version of every story that follows.",
    preview: {
      eyebrow: "Chapter preview",
      title: "Durable, Springing, or Immediate?",
      body: "All POAs need to be durable (survives loss of capacity). The springing-vs-immediate choice is the one most families get wrong.",
      bullets: [
        "Durable means the POA survives the principal losing capacity — always make it durable",
        "Springing means it activates upon a triggering event (typically a physician's certification)",
        "Banks frequently refuse springing POAs until shown formal capacity findings",
        "Immediate is the simpler path and what most elder-law attorneys recommend",
      ],
      tip: "Get at least 3 notarized originals. Banks often keep the original they're shown.",
    },
    downloadHref: "/guides?download=power-of-attorney-healthcare-proxy",
    contact: CONTACT_DEFAULT,
  },

  /* ─────────────── Why List on CarePath (operator-gated) ─────────────── */
  "why-list-on-carepath": {
    sectionEyebrow: "For Facility Operators",
    sectionTitle: "Why List on CarePath",
    sectionLede:
      "A 2026 playbook for SNF, ALF, memory care, CCRC, and group-home owners. Real tour requests, no placement-fee auction, free claim.",
    coverEyebrow: "Operator Playbook · 4 pages",
    coverTitle: "Why Claim Pays For Itself",
    coverSubtitle:
      "The lead-auction math, the listing zones families actually read, and the 30-second claim path.",
    valueProps: [
      "Zero placement-fee per move-in",
      "Real photos + your own pricing",
      "Free tier covers full listing edit + analytics",
    ],
    heroPanel: {
      eyebrow: "Operators",
      title: "Claimed vs Unclaimed",
      body: "Eight zones on every facility page. Five sit empty on an unclaimed listing. Claim turns them on — and converts 2-3× more tour requests.",
    },
    toc: [
      "The lead-auction math you don't have to play",
      "What families see when you claim",
      "What the free tier gets you",
      "The Pro tier (optional)",
      "The CMS Five-Star reality",
      "How to claim (under two minutes)",
    ],
    tocFooter: "Free to claim, free to edit, free forever for the basics.",
    preview: {
      eyebrow: "Chapter preview",
      title: "The Lead-Auction Math",
      body: "APFM and Caring.com charge 70-100% of a single month's resident rent per move-in. On a $5,500/mo suite, that's $3,800-5,500 per family. CarePath does not run a placement-fee auction.",
      bullets: [
        "$0 per move-in fee — keep your top-line revenue",
        "Tour requests routed to YOUR admissions inbox, never resold",
        "Verified-manager badge — trust signal families look for",
        "Public CMS rating you can respond to with context",
      ],
      tip: "Your first edit after approval should be 3-5 real photos. Single biggest tour-conversion lift.",
    },
    // Operator-gated guide — the download requires an authenticated user
    // with at least one FacilityClaim. Frontend detects requires_claim
    // from the API and routes the CTA to /facility/{slug} (or the
    // claim-success modal) instead of the lead-capture dialog.
    downloadHref: "/guides?download=why-list-on-carepath",
    contact: CONTACT_DEFAULT,
  },
}

export function guideContentFor(slug: string): GuideContent | null {
  return GUIDES_BY_SLUG[slug] ?? null
}
