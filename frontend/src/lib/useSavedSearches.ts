import { useCallback, useEffect, useState } from "react"

const STORAGE_KEY = "carepath:saved-searches"
const EVENT = "carepath:saved-searches:changed"
const MAX = 10

export interface SavedSearch {
  id: string
  name: string
  query: string
  saved_at: string
}

function read(): SavedSearch[] {
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

function write(list: SavedSearch[]) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list.slice(0, MAX)))
  window.dispatchEvent(new Event(EVENT))
}

export function useSavedSearches() {
  const [list, setList] = useState<SavedSearch[]>(() => read())

  useEffect(() => {
    const sync = () => setList(read())
    window.addEventListener(EVENT, sync)
    window.addEventListener("storage", sync)
    return () => {
      window.removeEventListener(EVENT, sync)
      window.removeEventListener("storage", sync)
    }
  }, [])

  const save = useCallback((name: string, query: string) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const current = read().filter((s) => s.query !== query)
    write([{ id, name, query, saved_at: new Date().toISOString() }, ...current])
    return id
  }, [])

  const remove = useCallback((id: string) => {
    write(read().filter((s) => s.id !== id))
  }, [])

  const hasQuery = useCallback(
    (query: string) => list.some((s) => s.query === query),
    [list]
  )

  return { list, save, remove, hasQuery, max: MAX }
}
