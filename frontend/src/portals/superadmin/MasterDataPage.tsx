import { useState } from "react"
import { cn } from "@/lib/utils"
import { MasterDataTab, type MasterDataConfig } from "@/components/MasterDataTab"

const CONFIGS: MasterDataConfig[] = [
  {
    type: "states",
    title: "States",
    subtitle: "US states + territories. Used to scope facility licensure and regulator info.",
    fields: [
      { name: "code", label: "Code", type: "text", required: true, placeholder: "AZ" },
      { name: "name", label: "Name", type: "text", required: true },
      { name: "ombudsman_phone", label: "Ombudsman phone", type: "text", showInTable: false },
      { name: "ombudsman_email", label: "Ombudsman email", type: "email", showInTable: false },
      { name: "regulator_name", label: "Regulator name", type: "text", showInTable: false },
      { name: "regulator_url", label: "Regulator URL", type: "url", showInTable: false },
      { name: "notes", label: "Notes", type: "textarea", showInTable: false },
      { name: "is_active", label: "Active", type: "checkbox" },
    ],
  },
  {
    type: "payers",
    title: "Payers",
    subtitle: "Payment sources — Medicare, Medicaid, LTC insurance carriers, VA, private pay.",
    fields: [
      { name: "name", label: "Name", type: "text", required: true },
      {
        name: "type",
        label: "Type",
        type: "select",
        required: true,
        options: [
          { value: "medicare_a", label: "Medicare Part A" },
          { value: "medicare_b", label: "Medicare Part B" },
          { value: "medicare_advantage", label: "Medicare Advantage" },
          { value: "medicaid", label: "Medicaid" },
          { value: "ltc_insurance", label: "LTC Insurance" },
          { value: "private_pay", label: "Private Pay" },
          { value: "va", label: "VA" },
          { value: "other", label: "Other" },
        ],
      },
      { name: "code", label: "Code", type: "text" },
      { name: "notes", label: "Notes", type: "textarea", showInTable: false },
      { name: "is_active", label: "Active", type: "checkbox" },
    ],
  },
  {
    type: "levels-of-care",
    title: "Levels of care",
    subtitle: "Care intensity tiers from independent living through hospice.",
    fields: [
      {
        name: "code",
        label: "Code",
        type: "text",
        required: true,
        helpText: "Short identifier, e.g. assisted, skilled, memory.",
      },
      { name: "name", label: "Name", type: "text", required: true },
      { name: "description", label: "Description", type: "textarea", showInTable: false },
      { name: "sort_order", label: "Sort order", type: "number", showInTable: false },
      { name: "is_active", label: "Active", type: "checkbox" },
    ],
  },
  {
    type: "cms-f-tags",
    title: "CMS F-tags",
    subtitle: "Federal nursing-home survey deficiency codes. Universal — same for every facility.",
    fields: [
      { name: "code", label: "Code", type: "text", required: true, placeholder: "F600" },
      { name: "title", label: "Title", type: "text", required: true },
      { name: "category", label: "Category", type: "text" },
      { name: "severity_max", label: "Max severity", type: "text", showInTable: false },
      { name: "description", label: "Description", type: "textarea", showInTable: false },
      { name: "is_active", label: "Active", type: "checkbox" },
    ],
  },
  {
    type: "credential-templates",
    title: "Credential templates",
    subtitle: "Licensure types staff may hold (RN, LPN, CNA, etc.) with renewal cycles.",
    fields: [
      { name: "code", label: "Code", type: "text", required: true, placeholder: "RN" },
      { name: "name", label: "Name", type: "text", required: true },
      {
        name: "renewal_months",
        label: "Renewal (months)",
        type: "number",
        placeholder: "24",
      },
      { name: "requires_state_license", label: "State license", type: "checkbox" },
      { name: "description", label: "Description", type: "textarea", showInTable: false },
      { name: "is_active", label: "Active", type: "checkbox" },
    ],
  },
]

export function MasterDataPage() {
  const [activeType, setActiveType] = useState(CONFIGS[0].type)
  const active = CONFIGS.find((c) => c.type === activeType)!

  return (
    <div className="space-y-6 p-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Master data</h1>
        <p className="text-sm text-muted-foreground">
          Platform-wide reference data. Changes here flow into all facilities
          on next provisioning sync.
        </p>
      </div>

      <div className="flex gap-1 border-b">
        {CONFIGS.map((c) => (
          <button
            key={c.type}
            onClick={() => setActiveType(c.type)}
            className={cn(
              "border-b-2 px-4 py-2 text-sm transition-colors",
              c.type === activeType
                ? "border-foreground font-medium text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            {c.title}
          </button>
        ))}
      </div>

      <MasterDataTab config={active} />
    </div>
  )
}
