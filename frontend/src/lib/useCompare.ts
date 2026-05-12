import { useCallback, useEffect, useState } from "react"

const STORAGE_KEY = "carepath:compare"
const MAX = 4

interface CompareEntry {
  id: string
  slug: string
  name: string
}

function read(): CompareEntry[] {
  if (typeof window === "undefined") return []
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.slice(0, MAX) : []
  } catch {
    return []
  }
}

function write(list: CompareEntry[]) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
  window.dispatchEvent(new Event("carepath:compare:changed"))
}

export function useCompare() {
  const [list, setList] = useState<CompareEntry[]>(() => read())

  useEffect(() => {
    const sync = () => setList(read())
    window.addEventListener("carepath:compare:changed", sync)
    window.addEventListener("storage", sync)
    return () => {
      window.removeEventListener("carepath:compare:changed", sync)
      window.removeEventListener("storage", sync)
    }
  }, [])

  const has = useCallback((id: string) => list.some((e) => e.id === id), [list])

  const add = useCallback(
    (entry: CompareEntry) => {
      const current = read()
      if (current.some((e) => e.id === entry.id)) return
      if (current.length >= MAX) return
      write([...current, entry])
    },
    []
  )

  const remove = useCallback((id: string) => {
    write(read().filter((e) => e.id !== id))
  }, [])

  const toggle = useCallback((entry: CompareEntry) => {
    const current = read()
    if (current.some((e) => e.id === entry.id)) {
      write(current.filter((e) => e.id !== entry.id))
    } else if (current.length < MAX) {
      write([...current, entry])
    }
  }, [])

  const clear = useCallback(() => {
    write([])
  }, [])

  return { list, has, add, remove, toggle, clear, max: MAX }
}
