/**
 * Canonical service-type taxonomy. Single source of truth for every
 * UI that needs to describe what each facility type is for.
 *
 * The set must match the `type` enum validated in
 * laravel-backend/app/Http/Controllers/MarketplaceController.php (the
 * `type` filter validation rule).
 *
 * Beyond labels, each entry carries metadata used by the
 * ServiceTypeHelper "which one do I need?" wizard:
 *   - short_description: shown beneath the label in pickers
 *   - signals: plain-language symptoms/needs that point to this type
 *   - typical_cost_band: helps families self-disqualify
 *   - typical_payer: who pays
 */

export type ServiceType =
  | "independent_living"
  | "assisted_living"
  | "memory_care"
  | "ccrc"
  | "snf"
  | "group_home"
  | "adult_family_home"
  | "icf_iid"

export interface ServiceTypeMeta {
  value: ServiceType
  label: string
  short_description: string
  signals: string[]
  typical_cost_band: string
  typical_payer: string
}

export const SERVICE_TYPES: ServiceTypeMeta[] = [
  {
    value: "independent_living",
    label: "Independent Living",
    short_description:
      "Active community with meals & social — minimal hands-on help.",
    signals: [
      "Can do daily tasks themselves",
      "Wants social activities, dining, no yard work",
      "Driving may or may not be a question",
    ],
    typical_cost_band: "$2,500 – $5,500/mo",
    typical_payer: "Private pay (rarely Medicaid)",
  },
  {
    value: "assisted_living",
    label: "Assisted Living",
    short_description:
      "Help with bathing, dressing, medications — meals, social, light medical.",
    signals: [
      "Needs help with 2+ daily activities (bathing, dressing, meds)",
      "Falls, mild forgetfulness, or trouble cooking",
      "Doesn't need 24/7 nursing care",
    ],
    typical_cost_band: "$4,500 – $7,500/mo",
    typical_payer: "Private pay, LTC insurance, some Medicaid waivers",
  },
  {
    value: "memory_care",
    label: "Memory Care",
    short_description:
      "Specialized dementia / Alzheimer's care in a secured environment.",
    signals: [
      "Diagnosed with Alzheimer's or dementia",
      "Wandering risk or sundowning behavior",
      "Family can no longer keep them safe at home",
    ],
    typical_cost_band: "$6,000 – $9,500/mo",
    typical_payer: "Private pay, LTC insurance, some Medicaid waivers",
  },
  {
    value: "ccrc",
    label: "Continuing Care (CCRC)",
    short_description:
      "One campus, all levels — move once, age in place through SNF.",
    signals: [
      "Wants to plan ahead and avoid future moves",
      "Healthy now but planning 5–10 years out",
      "Couple where partners have different needs",
    ],
    typical_cost_band: "Entry $100k+ then $3,000–$6,000/mo",
    typical_payer: "Private pay (entry fee + monthly)",
  },
  {
    value: "snf",
    label: "Skilled Nursing (SNF)",
    short_description:
      "24/7 licensed nursing — post-hospital rehab or long-term complex care.",
    signals: [
      "Just discharged from hospital and needs rehab",
      "Complex medical needs (wounds, IV, ventilator)",
      "Around-the-clock licensed nursing required",
    ],
    typical_cost_band: "$8,000 – $14,000/mo",
    typical_payer: "Medicare (short-term), Medicaid (long-term), private",
  },
  {
    value: "group_home",
    label: "Group Home / Residential Care",
    short_description:
      "Small home (6–10 residents), home-style setting with personal care.",
    signals: [
      "Wants a small, home-like setting over a large facility",
      "Prefers a quieter, more personalized environment",
    ],
    typical_cost_band: "$3,500 – $6,000/mo",
    typical_payer: "Private pay, some Medicaid",
  },
  {
    value: "adult_family_home",
    label: "Adult Family Home",
    short_description:
      "Single-family home converted to care for up to ~6 adults.",
    signals: [
      "Very small, family-style setting preferred",
      "State-licensed AFH (common in WA, OR)",
    ],
    typical_cost_band: "$3,500 – $7,000/mo",
    typical_payer: "Private pay, Medicaid in some states",
  },
  {
    value: "icf_iid",
    label: "ICF/IID",
    short_description:
      "Intermediate care for individuals with intellectual / developmental disabilities.",
    signals: [
      "Adult with intellectual or developmental disability",
      "Needs 24-hour active treatment & habilitation",
    ],
    typical_cost_band: "Varies (state-funded)",
    typical_payer: "Medicaid (primary)",
  },
]

export const SERVICE_TYPE_LABEL: Record<ServiceType, string> = Object.fromEntries(
  SERVICE_TYPES.map((s) => [s.value, s.label])
) as Record<ServiceType, string>

export function metaFor(value: string): ServiceTypeMeta | undefined {
  return SERVICE_TYPES.find((s) => s.value === value)
}

/**
 * Quick wizard step shape used by ServiceTypeHelper. Each question is
 * a yes/no/unsure that biases toward one or more service types. After
 * all questions, the highest-scoring type wins.
 */
export interface WizardQuestion {
  id: string
  prompt: string
  yes_boosts: ServiceType[]
  no_boosts?: ServiceType[]
}

export const WIZARD_QUESTIONS: WizardQuestion[] = [
  {
    id: "needs_help_adls",
    prompt:
      "Does the person need help with daily tasks like bathing, dressing, or taking medications?",
    yes_boosts: ["assisted_living", "memory_care", "snf"],
    no_boosts: ["independent_living"],
  },
  {
    id: "has_dementia",
    prompt:
      "Have they been diagnosed with dementia or Alzheimer's, or are they at risk of wandering?",
    yes_boosts: ["memory_care"],
  },
  {
    id: "needs_247_nursing",
    prompt:
      "Do they need 24/7 licensed nursing (e.g. after a hospital stay, with wounds, IVs, or ventilator)?",
    yes_boosts: ["snf"],
  },
  {
    id: "planning_long_term",
    prompt:
      "Are they planning ahead for the next 5–10 years and want to avoid moving again later?",
    yes_boosts: ["ccrc"],
  },
  {
    id: "prefers_small_home",
    prompt:
      "Do they prefer a small, home-style setting (6–10 residents) rather than a large facility?",
    yes_boosts: ["group_home", "adult_family_home"],
  },
]
