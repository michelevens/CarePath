import { useCallback, useEffect, useState } from "react"
import { api } from "@/lib/api"

const STORAGE_KEY = "carepath:saved-searches"
const EVENT = "carepath:saved-searches:changed"
const MAX = 10

export interface SavedSearch {
  /** UUID from backend when persisted, else a local id. */
  id: string
  name: string
  /** URL-encoded query string from SearchPage. */
  query: string
  saved_at: string
  /** True when this row is alerting (push) — only meaningful for
   * backend-persisted rows. */
  alerts_push?: boolean
  /** True when this row lives server-side and we can toggle alerts. */
  persisted?: boolean
}

interface BackendRow {
  id: string
  name: string
  params: Record<string, string | number | boolean | string[]>
  alerts_push: boolean
  alerts_email: boolean
  created_at: string | null
}

function readLocal(): SavedSearch[] {
  if (typeof window === "undefined") return []
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeLocal(list: SavedSearch[]) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list.slice(0, MAX)))
  window.dispatchEvent(new Event(EVENT))
}

/**
 * Convert a backend SavedSearch row into the front-end shape. The
 * params object is re-serialized into a URLSearchParams query so it
 * slots into existing UI without changes.
 */
function backendToLocal(b: BackendRow): SavedSearch {
  const p = new URLSearchParams()
  for (const [k, v] of Object.entries(b.params ?? {})) {
    if (Array.isArray(v)) {
      v.forEach((x) => p.append(k, String(x)))
    } else if (v !== undefined && v !== null) {
      p.set(k, String(v))
    }
  }
  return {
    id: b.id,
    name: b.name,
    query: p.toString(),
    saved_at: b.created_at ?? new Date().toISOString(),
    alerts_push: b.alerts_push,
    persisted: true,
  }
}

/**
 * Convert a query string back to the params object the backend
 * expects. Arrays come back as repeated keys (axios-friendly).
 */
function queryToParams(query: string): Record<string, string | string[]> {
  const out: Record<string, string | string[]> = {}
  const sp = new URLSearchParams(query)
  for (const k of new Set(sp.keys())) {
    const all = sp.getAll(k)
    out[k] = all.length === 1 ? all[0] : all
  }
  return out
}

export function useSavedSearches() {
  const [list, setList] = useState<SavedSearch[]>(() => readLocal())
  const [synced, setSynced] = useState(false)

  // Cross-tab + same-tab sync
  useEffect(() => {
    const sync = () => setList(readLocal())
    window.addEventListener(EVENT, sync)
    window.addEventListener("storage", sync)
    return () => {
      window.removeEventListener(EVENT, sync)
      window.removeEventListener("storage", sync)
    }
  }, [])

  // On first mount, hydrate from backend when authenticated. Falls
  // back to localStorage silently on 401 (logged-out users still get
  // the local-only experience).
  useEffect(() => {
    if (synced) return
    let alive = true
    api
      .get<{ data: BackendRow[] }>("/me/saved-searches")
      .then((r) => {
        if (!alive) return
        const backend = (r.data?.data ?? []).map(backendToLocal)
        const local = readLocal().filter((l) => !l.persisted)
        writeLocal([...backend, ...local])
        setSynced(true)
      })
      .catch(() => {
        if (alive) setSynced(true)
      })
    return () => {
      alive = false
    }
  }, [synced])

  const save = useCallback(async (name: string, query: string) => {
    // Optimistic local row first so the UI doesn't flicker.
    const tempId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const current = readLocal().filter((s) => s.query !== query)
    const optimistic: SavedSearch = {
      id: tempId,
      name,
      query,
      saved_at: new Date().toISOString(),
      alerts_push: true,
      persisted: false,
    }
    writeLocal([optimistic, ...current])

    // Persist server-side when authenticated.
    try {
      const r = await api.post<{ data: BackendRow }>("/me/saved-searches", {
        name,
        params: queryToParams(query),
        alerts_push: true,
      })
      const real = backendToLocal(r.data.data)
      const next = readLocal().map((s) => (s.id === tempId ? real : s))
      writeLocal(next)
      return real.id
    } catch {
      // 401 or network — local-only row stays.
      return tempId
    }
  }, [])

  const remove = useCallback(async (id: string) => {
    const item = readLocal().find((s) => s.id === id)
    writeLocal(readLocal().filter((s) => s.id !== id))
    if (item?.persisted) {
      try {
        await api.delete(`/me/saved-searches/${id}`)
      } catch {
        // Silent — user already saw the item disappear locally.
      }
    }
  }, [])

  const toggleAlerts = useCallback(async (id: string, on: boolean) => {
    const item = readLocal().find((s) => s.id === id)
    if (!item?.persisted) return
    const next = readLocal().map((s) => (s.id === id ? { ...s, alerts_push: on } : s))
    writeLocal(next)
    try {
      await api.put(`/me/saved-searches/${id}`, { alerts_push: on })
    } catch {
      // Revert on failure.
      const reverted = readLocal().map((s) => (s.id === id ? { ...s, alerts_push: !on } : s))
      writeLocal(reverted)
    }
  }, [])

  const hasQuery = useCallback(
    (query: string) => list.some((s) => s.query === query),
    [list]
  )

  return { list, save, remove, toggleAlerts, hasQuery, max: MAX }
}
