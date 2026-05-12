import { useState, type FormEvent } from "react"
import { Database, Loader2, RefreshCcw } from "lucide-react"
import { api } from "@/lib/api"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
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
    title: "Credentials",
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
  {
    type: "diagnosis-codes",
    title: "Diagnoses",
    subtitle: "ICD-10 diagnosis codes for resident charts and assessments.",
    fields: [
      { name: "code", label: "Code", type: "text", required: true, placeholder: "E11.9" },
      { name: "description", label: "Description", type: "text", required: true },
      { name: "category", label: "Category", type: "text", placeholder: "endocrine" },
      { name: "is_chronic", label: "Chronic", type: "checkbox" },
      { name: "is_active", label: "Active", type: "checkbox" },
    ],
  },
  {
    type: "service-codes",
    title: "Service codes",
    subtitle: "HCPCS / CPT billing codes — what we bill the payer.",
    fields: [
      { name: "code", label: "Code", type: "text", required: true, placeholder: "G0299" },
      { name: "description", label: "Description", type: "text", required: true },
      {
        name: "unit_type",
        label: "Unit type",
        type: "select",
        required: true,
        options: [
          { value: "per_15_min", label: "Per 15 minutes" },
          { value: "per_visit", label: "Per visit" },
          { value: "per_day", label: "Per day" },
          { value: "per_hour", label: "Per hour" },
        ],
      },
      { name: "default_unit_amount_cents", label: "Default $/unit (cents)", type: "number", showInTable: false },
      { name: "is_active", label: "Active", type: "checkbox" },
    ],
  },
  {
    type: "service-types",
    title: "Service types",
    subtitle: "Operational service categories — what staff actually do.",
    fields: [
      { name: "code", label: "Code", type: "text", required: true, placeholder: "NURSING_RN" },
      { name: "name", label: "Name", type: "text", required: true },
      { name: "requires_credential_code", label: "Required credential", type: "text", placeholder: "RN" },
      { name: "description", label: "Description", type: "textarea", showInTable: false },
      { name: "is_active", label: "Active", type: "checkbox" },
    ],
  },
  {
    type: "doc-presets",
    title: "Documents",
    subtitle: "Document templates: admission packet, plan of care, advance directive, etc.",
    fields: [
      { name: "code", label: "Code", type: "text", required: true, placeholder: "PLAN_OF_CARE" },
      { name: "name", label: "Name", type: "text", required: true },
      {
        name: "category",
        label: "Category",
        type: "select",
        options: [
          { value: "admission", label: "Admission" },
          { value: "care_planning", label: "Care planning" },
          { value: "regulatory", label: "Regulatory" },
          { value: "discharge", label: "Discharge" },
        ],
      },
      { name: "requires_signature", label: "Needs signature", type: "checkbox" },
      { name: "description", label: "Description", type: "textarea", showInTable: false },
      { name: "is_active", label: "Active", type: "checkbox" },
    ],
  },
]

interface SyncResult {
  facilities: number
  inserted_total: number
  per_facility: Array<{ facility_id: string; name: string; inserted: number }>
}

export function MasterDataPage() {
  const [activeType, setActiveType] = useState(CONFIGS[0].type)
  const active = CONFIGS.find((c) => c.type === activeType)!

  const [syncing, setSyncing] = useState(false)
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null)
  const [syncError, setSyncError] = useState<string | null>(null)

  const [cmsOpen, setCmsOpen] = useState(false)

  const runSync = async () => {
    setSyncing(true)
    setSyncResult(null)
    setSyncError(null)
    try {
      const res = await api.post<SyncResult>("/superadmin/master-data/sync")
      setSyncResult(res.data)
    } catch (err) {
      setSyncError(
        (err as { response?: { data?: { message?: string } } }).response?.data?.message ??
          "Sync failed."
      )
    } finally {
      setSyncing(false)
    }
  }

  return (
    <div className="space-y-6 p-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Master data</h1>
          <p className="text-sm text-muted-foreground">
            Platform-wide reference data. Use Sync to push newly-added master
            rows into every active facility.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setCmsOpen(true)}>
            <Database className="h-4 w-4" />
            Ingest real CMS data
          </Button>
          <Button variant="outline" onClick={runSync} disabled={syncing}>
            {syncing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCcw className="h-4 w-4" />
            )}
            Sync to facilities
          </Button>
        </div>
      </div>

      <CmsIngestDialog open={cmsOpen} onClose={() => setCmsOpen(false)} />

      {syncResult && (
        <div className="rounded-md border bg-card px-4 py-3 text-sm">
          <div className="font-medium">
            Synced {syncResult.facilities} facilities · {syncResult.inserted_total}{" "}
            new snapshot{syncResult.inserted_total === 1 ? "" : "s"} inserted
          </div>
          {syncResult.inserted_total > 0 && (
            <ul className="mt-1 text-xs text-muted-foreground">
              {syncResult.per_facility
                .filter((f) => f.inserted > 0)
                .map((f) => (
                  <li key={f.facility_id}>
                    {f.name} — {f.inserted}
                  </li>
                ))}
            </ul>
          )}
        </div>
      )}

      {syncError && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {syncError}
        </div>
      )}

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

interface CmsResult {
  fetched: number
  upserted: number
  skipped: number
}

function CmsIngestDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [state, setState] = useState("AZ")
  const [max, setMax] = useState("500")
  const [running, setRunning] = useState(false)
  const [result, setResult] = useState<CmsResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setRunning(true)
    setError(null)
    setResult(null)
    try {
      const res = await api.post<CmsResult>("/superadmin/cms/ingest", {
        state: state.toUpperCase() || undefined,
        max: max ? Number(max) : undefined,
      })
      setResult(res.data)
    } catch (err) {
      setError(
        (err as { response?: { data?: { message?: string } } }).response?.data?.message ??
          "Ingest failed."
      )
    } finally {
      setRunning(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !running && onClose()}>
      <DialogContent>
        <form onSubmit={submit}>
          <DialogHeader>
            <DialogTitle>Ingest real CMS nursing home data</DialogTitle>
            <DialogDescription>
              Pulls live data from the CMS Nursing Home Compare dataset
              (data.cms.gov). Idempotent on CCN. Bounded by state to keep
              the request synchronous.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4 space-y-3">
            <div>
              <label className="text-sm font-medium">State</label>
              <input
                value={state}
                onChange={(e) => setState(e.target.value.toUpperCase())}
                maxLength={2}
                placeholder="AZ"
                className="mt-1 w-24 rounded-md border bg-background px-3 py-2 text-sm uppercase outline-hidden focus:ring-2 focus:ring-ring"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                2-letter code. Leave blank to pull all states (large dataset, may time out).
              </p>
            </div>
            <div>
              <label className="text-sm font-medium">Max facilities</label>
              <input
                value={max}
                onChange={(e) => setMax(e.target.value.replace(/\D/g, ""))}
                className="mt-1 w-32 rounded-md border bg-background px-3 py-2 text-sm outline-hidden focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>

          {error && (
            <div className="mt-3 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          )}

          {result && (
            <div className="mt-3 rounded-md border bg-card px-3 py-2 text-sm">
              <span className="font-medium">{result.upserted}</span>{" "}
              facilities upserted ({result.fetched} fetched, {result.skipped} skipped)
            </div>
          )}

          <DialogFooter className="mt-4">
            <Button type="button" variant="ghost" onClick={onClose} disabled={running}>
              Close
            </Button>
            <Button type="submit" disabled={running}>
              {running && <Loader2 className="h-4 w-4 animate-spin" />}
              Run ingest
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
