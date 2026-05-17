import { useState, type FormEvent, type KeyboardEvent } from "react"
import { Loader2, Sparkles, Wand2 } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { api } from "@/lib/api"

interface AiSearchResponse {
  data: {
    filters: Record<string, string | number | boolean | string[]>
    explain: string
    stubbed: boolean
  }
}

interface Props {
  /** Optional ZIP/state hint so the AI doesn't have to guess location
   * if the user is already in a regional context. */
  contextZip?: string
  contextState?: string
  /** Placeholder text — landing page wants something inviting; in-page
   * search wants something terse. */
  placeholder?: string
  /** When true, render a fuller hero style; default is compact inline. */
  hero?: boolean
}

/**
 * Free-text search bar that translates English into the structured
 * filter params SearchPage already understands. Hits POST
 * /api/marketplace/ai-search (rate-limited), then navigates to
 * /search?... with the parsed filters set.
 *
 * APFM/Caring/Seniorly route this kind of query to a phone advisor;
 * we run it self-serve.
 */
export function AiSearchBar({ contextZip, contextState, placeholder, hero }: Props) {
  const navigate = useNavigate()
  const [q, setQ] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async (e?: FormEvent) => {
    e?.preventDefault()
    const text = q.trim()
    if (text.length < 3 || busy) return
    setBusy(true)
    setError(null)
    try {
      const r = await api.post<AiSearchResponse>("/marketplace/ai-search", {
        q: text,
        context: { origin_zip: contextZip, origin_state: contextState },
      })
      const filters = r.data?.data?.filters ?? {}
      const params = filtersToQuery(filters)
      navigate(`/search?${params.toString()}${params.toString() ? "&" : ""}from=ai`)
    } catch (err: unknown) {
      const e = err as { response?: { status?: number; data?: { message?: string } } }
      setError(
        e.response?.status === 429
          ? "Too many AI requests right now — try again in a moment."
          : "Couldn't parse that. Try simpler terms."
      )
    } finally {
      setBusy(false)
    }
  }

  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") submit()
  }

  const examples = [
    "Memory care near 33756 that accepts Medicaid under $6k",
    "Assisted living in Phoenix with private rooms and a chef",
    "Skilled nursing facility for rehab in Tampa",
  ]

  if (hero) {
    return (
      <div className="w-full">
        <form
          onSubmit={submit}
          className="flex items-center gap-2 rounded-2xl border-2 border-violet-200 bg-white p-2 shadow-sm focus-within:border-violet-500 focus-within:shadow-md"
        >
          <Sparkles className="ml-2 h-5 w-5 shrink-0 text-violet-600" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={onKey}
            placeholder={placeholder ?? "Describe what you're looking for in plain English…"}
            className="flex-1 bg-transparent px-2 py-2 text-base outline-none"
            maxLength={1000}
            disabled={busy}
          />
          <button
            type="submit"
            disabled={busy || q.trim().length < 3}
            className="inline-flex items-center gap-1.5 rounded-xl bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-50"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
            {busy ? "Translating…" : "Search"}
          </button>
        </form>
        <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
          <span>Try:</span>
          {examples.map((ex) => (
            <button
              key={ex}
              type="button"
              onClick={() => setQ(ex)}
              className="rounded-full border border-violet-200 bg-white px-2 py-0.5 text-violet-700 transition-colors hover:bg-violet-50"
            >
              "{ex}"
            </button>
          ))}
        </div>
        {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
      </div>
    )
  }

  return (
    <form
      onSubmit={submit}
      className="flex items-center gap-1.5 rounded-md border bg-card px-2 py-1 focus-within:border-violet-400"
    >
      <Sparkles className="h-3.5 w-3.5 shrink-0 text-violet-600" />
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onKeyDown={onKey}
        placeholder={placeholder ?? "Ask in plain English…"}
        className="flex-1 bg-transparent px-1 py-1 text-sm outline-none"
        maxLength={1000}
        disabled={busy}
      />
      <button
        type="submit"
        disabled={busy || q.trim().length < 3}
        className="inline-flex items-center gap-1 rounded bg-violet-600 px-2 py-1 text-xs font-medium text-white disabled:opacity-50"
        title="Translate to filters"
      >
        {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Wand2 className="h-3 w-3" />}
        Search
      </button>
      {error && <span className="ml-1 text-xs text-red-600">{error}</span>}
    </form>
  )
}

/**
 * Convert the AI-parsed filter dict into URLSearchParams keyed for
 * SearchPage's existing URL state schema (q, state, city, zip, radius,
 * type, medicaid, min_star, max_price). Plus the match preferences if
 * relevant ones came back.
 */
function filtersToQuery(f: Record<string, string | number | boolean | string[]>): URLSearchParams {
  const p = new URLSearchParams()
  if (typeof f.q === "string") p.set("q", f.q)
  if (typeof f.state === "string") p.set("state", f.state)
  if (typeof f.city === "string") p.set("city", f.city)
  if (typeof f.zip === "string") p.set("zip", f.zip)
  if (typeof f.radius_miles === "number") p.set("radius", String(f.radius_miles))
  if (typeof f.care_type === "string") p.set("type", f.care_type)
  if (f.medicaid_only === true) p.set("medicaid", "1")
  if (typeof f.min_five_star === "number") p.set("min_star", String(f.min_five_star))
  if (typeof f.max_price_cents === "number") {
    p.set("max_price", String(Math.round(f.max_price_cents / 100)))
  }
  return p
}
