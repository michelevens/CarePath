import { useCallback, useEffect, useState } from "react"

const STORAGE_KEY = "carepath:saved"
const EVENT = "carepath:saved:changed"

export interface SavedFacility {
  id: string
  slug: string
  name: string
  city: string
  state: string
  saved_at: string
}

function read(): SavedFacility[] {
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

function write(list: SavedFacility[]) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
  window.dispatchEvent(new Event(EVENT))
}

export function useSaved() {
  const [list, setList] = useState<SavedFacility[]>(() => read())

  useEffect(() => {
    const sync = () => setList(read())
    window.addEventListener(EVENT, sync)
    window.addEventListener("storage", sync)
    return () => {
      window.removeEventListener(EVENT, sync)
      window.removeEventListener("storage", sync)
    }
  }, [])

  const has = useCallback((id: string) => list.some((e) => e.id === id), [list])

  const toggle = useCallback((entry: Omit<SavedFacility, "saved_at">) => {
    const current = read()
    if (current.some((e) => e.id === entry.id)) {
      write(current.filter((e) => e.id !== entry.id))
    } else {
      write([{ ...entry, saved_at: new Date().toISOString() }, ...current])
    }
  }, [])

  const remove = useCallback((id: string) => {
    write(read().filter((e) => e.id !== id))
  }, [])

  const clear = useCallback(() => write([]), [])

  return { list, has, toggle, remove, clear }
}
