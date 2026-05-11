import { useState, useEffect, type FormEvent } from "react"
import { Plus, Loader2, Pencil, Trash2 } from "lucide-react"
import { api } from "@/lib/api"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

export type FieldType = "text" | "textarea" | "email" | "url" | "number" | "select" | "checkbox"

export interface FieldConfig {
  name: string
  label: string
  type: FieldType
  required?: boolean
  options?: Array<{ value: string; label: string }>
  placeholder?: string
  helpText?: string
  showInTable?: boolean
}

export interface MasterDataConfig {
  type: string
  title: string
  subtitle?: string
  fields: FieldConfig[]
}

interface Row extends Record<string, unknown> {
  id: string
}

export function MasterDataTab({ config }: { config: MasterDataConfig }) {
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState<Row | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)

  useEffect(() => {
    let alive = true
    setLoading(true)
    api
      .get<{ data: Row[] }>(`/superadmin/master-data/${config.type}`)
      .then((r) => {
        if (alive) setRows(r.data.data)
      })
      .catch((err) => {
        if (alive) setError(err.response?.data?.message ?? "Failed to load")
      })
      .finally(() => {
        if (alive) setLoading(false)
      })
    return () => {
      alive = false
    }
  }, [config.type])

  const tableFields = config.fields.filter((f) => f.showInTable !== false)

  const openCreate = () => {
    setEditing({ id: "" })
    setDialogOpen(true)
  }
  const openEdit = (row: Row) => {
    setEditing(row)
    setDialogOpen(true)
  }
  const close = () => {
    setDialogOpen(false)
    setEditing(null)
  }

  const onSaved = (saved: Row) => {
    setRows((prev) => {
      const idx = prev.findIndex((r) => r.id === saved.id)
      if (idx >= 0) {
        const next = prev.slice()
        next[idx] = saved
        return next
      }
      return [saved, ...prev]
    })
    close()
  }

  const onDelete = async (row: Row) => {
    if (!confirm(`Delete "${row.name ?? row.code ?? "this row"}"?`)) return
    try {
      await api.delete(`/superadmin/master-data/${config.type}/${row.id}`)
      setRows((prev) => prev.filter((r) => r.id !== row.id))
    } catch (err) {
      const msg = (err as { response?: { data?: { message?: string } } }).response?.data?.message
      alert(msg ?? "Delete failed")
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">{config.title}</h2>
          {config.subtitle && (
            <p className="text-sm text-muted-foreground">{config.subtitle}</p>
          )}
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" />
          Add
        </Button>
      </div>

      {loading && (
        <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading…
        </div>
      )}

      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      {!loading && !error && (
        <div className="overflow-hidden rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted/40">
              <tr>
                {tableFields.map((f) => (
                  <th
                    key={f.name}
                    className="px-4 py-2 text-left font-medium text-muted-foreground"
                  >
                    {f.label}
                  </th>
                ))}
                <th className="w-24"></th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={tableFields.length + 1}
                    className="px-4 py-8 text-center text-muted-foreground"
                  >
                    No rows yet. Click "Add" to create the first one.
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.id} className="border-t hover:bg-muted/30">
                    {tableFields.map((f) => (
                      <td key={f.name} className="px-4 py-2.5 align-top">
                        {renderCell(row[f.name], f)}
                      </td>
                    ))}
                    <td className="px-2 py-2 text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEdit(row)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onDelete(row)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={(o) => !o && close()}>
        <DialogContent>
          {editing && (
            <RowForm
              config={config}
              initial={editing}
              onSaved={onSaved}
              onCancel={close}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

function renderCell(value: unknown, field: FieldConfig) {
  if (field.type === "checkbox") {
    return value ? "✓" : "—"
  }
  if (field.type === "select" && field.options) {
    return field.options.find((o) => o.value === value)?.label ?? String(value ?? "")
  }
  return value ? String(value) : <span className="text-muted-foreground">—</span>
}

function RowForm({
  config,
  initial,
  onSaved,
  onCancel,
}: {
  config: MasterDataConfig
  initial: Row
  onSaved: (row: Row) => void
  onCancel: () => void
}) {
  const isEdit = Boolean(initial.id)
  const [values, setValues] = useState<Record<string, unknown>>(() => {
    const initialValues: Record<string, unknown> = {}
    config.fields.forEach((f) => {
      initialValues[f.name] =
        initial[f.name] ?? (f.type === "checkbox" ? true : "")
    })
    return initialValues
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)

  const set = (name: string, v: unknown) => setValues((p) => ({ ...p, [name]: v }))

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setErrors({})
    setSubmitting(true)
    try {
      const url = isEdit
        ? `/superadmin/master-data/${config.type}/${initial.id}`
        : `/superadmin/master-data/${config.type}`
      const method = isEdit ? "put" : "post"
      const res = await api[method]<{ data: Row }>(url, values)
      onSaved(res.data.data)
    } catch (err) {
      const apiErrors = (err as { response?: { data?: { errors?: Record<string, string[]> } } })
        .response?.data?.errors
      if (apiErrors) {
        const flat: Record<string, string> = {}
        for (const [k, v] of Object.entries(apiErrors)) flat[k] = v[0]
        setErrors(flat)
      } else {
        setErrors({ _root: "Save failed" })
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={onSubmit}>
      <DialogHeader>
        <DialogTitle>
          {isEdit ? `Edit ${config.title.replace(/s$/, "")}` : `Add ${config.title.replace(/s$/, "")}`}
        </DialogTitle>
        <DialogDescription>
          {isEdit ? "Update the fields below." : "Fill in the fields below."}
        </DialogDescription>
      </DialogHeader>
      <div className="mt-4 space-y-3">
        {config.fields.map((f) => (
          <div key={f.name}>
            <label className="text-sm font-medium">{f.label}</label>
            {renderInput(f, values[f.name], (v) => set(f.name, v))}
            {errors[f.name] ? (
              <p className="mt-1 text-xs text-destructive">{errors[f.name]}</p>
            ) : f.helpText ? (
              <p className="mt-1 text-xs text-muted-foreground">{f.helpText}</p>
            ) : null}
          </div>
        ))}
        {errors._root && (
          <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {errors._root}
          </div>
        )}
      </div>
      <DialogFooter className="mt-4">
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={submitting}>
          {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
          {isEdit ? "Save" : "Create"}
        </Button>
      </DialogFooter>
    </form>
  )
}

function renderInput(
  field: FieldConfig,
  value: unknown,
  onChange: (v: unknown) => void
) {
  const base = "mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm outline-hidden focus:ring-2 focus:ring-ring"

  if (field.type === "textarea") {
    return (
      <textarea
        value={(value as string) ?? ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder={field.placeholder}
        rows={3}
        className={base}
      />
    )
  }
  if (field.type === "select") {
    return (
      <select
        value={(value as string) ?? ""}
        onChange={(e) => onChange(e.target.value)}
        className={base}
      >
        <option value="">Select…</option>
        {field.options?.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    )
  }
  if (field.type === "checkbox") {
    return (
      <div className="mt-1 flex items-center gap-2">
        <input
          type="checkbox"
          checked={Boolean(value)}
          onChange={(e) => onChange(e.target.checked)}
          className="h-4 w-4"
        />
        <span className="text-sm text-muted-foreground">Enabled</span>
      </div>
    )
  }
  if (field.type === "number") {
    return (
      <input
        type="number"
        value={(value as string) ?? ""}
        onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
        placeholder={field.placeholder}
        className={base}
      />
    )
  }
  return (
    <input
      type={field.type}
      value={(value as string) ?? ""}
      onChange={(e) => onChange(e.target.value)}
      placeholder={field.placeholder}
      required={field.required}
      className={base}
    />
  )
}
