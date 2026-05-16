/**
 * Canonical facility type definitions. Mirrors Facility::TYPES on the
 * backend — keep the two in sync when adding a new type.
 *
 * The order here is the order the UI surfaces them in (search filter
 * chips, city-landing breakdowns, etc.) — clinical / regulated types
 * first, then community / lower-acuity, then specialty.
 */

export const FACILITY_TYPES = [
  "snf",
  "assisted_living",
  "memory_care",
  "ccrc",
  "independent_living",
  "group_home",
  "adult_family_home",
  "icf_iid",
] as const

export type FacilityType = (typeof FACILITY_TYPES)[number]

export const TYPE_LABEL: Record<string, string> = {
  snf: "Skilled Nursing",
  assisted_living: "Assisted Living",
  memory_care: "Memory Care",
  ccrc: "Continuing Care",
  independent_living: "Independent Living",
  group_home: "Group Home",
  adult_family_home: "Adult Family Home",
  icf_iid: "ICF/IID",
}

/**
 * Short single-word label used where horizontal space is tight (filter
 * chips, mobile chrome). Falls back to the full label.
 */
export const TYPE_LABEL_SHORT: Record<string, string> = {
  snf: "Nursing",
  assisted_living: "Assisted",
  memory_care: "Memory",
  ccrc: "CCRC",
  independent_living: "Independent",
  group_home: "Group",
  adult_family_home: "AFH",
  icf_iid: "ICF/IID",
}

export function typeLabel(type: string | null | undefined): string {
  if (!type) return ""
  return TYPE_LABEL[type] ?? type
}
