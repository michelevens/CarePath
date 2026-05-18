import { useEffect, useState } from "react"
import { Check, Loader2, MapPin } from "lucide-react"
import { api } from "@/lib/api"
import { cn } from "@/lib/utils"

/**
 * Geolocation → ZIP (preferred) or raw coords (fallback) so the user
 * gets results either way.
 *
 * Flow:
 *   1. Get browser geolocation.
 *   2. Try POST /marketplace/reverse-zip → ZIP + city + state.
 *      Caller routes the family to a ZIP-based search.
 *   3. If reverse-zip can't find a ZIP (rural / new dev / Nominatim
 *      hiccup), fall back to onCoords({lat, lon}) so the caller can
 *      do a bbox-based "near you" search — no ZIP required to return
 *      actual facility results.
 *
 * UX rules:
 *   - Label stays "Search near me" / "Near me"; errors render as a
 *     separate auto-dismissing note so the affordance never disappears.
 *   - HTTPS warning short-circuits insecure origins immediately.
 *   - Distinct PositionError messages per code (denied / unavailable
 *     / timeout) so the hint is actually useful.
 */
export function NearMeButton({
  onZip,
  onCoords,
  variant = "hero",
  className,
}: {
  /** Called when reverse-zip returns a postal code. The second
   * argument carries the original geolocation so the caller can pass
   * lat/lon to the search backend — bypassing the round-trip from
   * zip → centroid (which often misses for outer suburbs / new ZIPs). */
  onZip: (zip: string, coords: { lat: number; lon: number }) => void
  /** Called when ZIP lookup misses but we still have coords. The caller
   * should run a bbox-based search around the point. When omitted, a
   * "no ZIP" error is shown instead. */
  onCoords?: (coords: { lat: number; lon: number }) => void
  variant?: "hero" | "compact"
  className?: string
}) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    if (!error && !success) return
    const t = setTimeout(() => {
      setError(null)
      setSuccess(false)
    }, error ? 6000 : 2500)
    return () => clearTimeout(t)
  }, [error, success])

  const onClick = () => {
    if (busy) return
    setSuccess(false)

    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setError("Not supported in this browser")
      return
    }
    if (typeof window !== "undefined" && window.location.protocol === "http:" && window.location.hostname !== "localhost") {
      setError("Needs HTTPS — type your ZIP instead")
      return
    }

    setBusy(true)
    setError(null)
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude
        const lon = pos.coords.longitude

        // Try ZIP lookup first. Either route handles the result;
        // failure here is non-fatal because we have coords.
        let zip: string | null = null
        try {
          const r = await api.get<{ data: { zip: string } | null }>(
            "/marketplace/reverse-zip",
            { params: { lat, lon } },
          )
          zip = r.data?.data?.zip ?? null
        } catch {
          // Silent — fall through to coords fallback below.
        }

        if (zip) {
          onZip(zip, { lat, lon })
          setSuccess(true)
        } else if (onCoords) {
          // ZIP lookup missed but we still know roughly where the user
          // is — run a "near you" search via the coords instead.
          onCoords({ lat, lon })
          setSuccess(true)
        } else {
          setError("Couldn't find a nearby ZIP — try typing one")
        }
        setBusy(false)
      },
      (err) => {
        setBusy(false)
        switch (err.code) {
          case err.PERMISSION_DENIED:
            setError("Location denied — type ZIP instead")
            break
          case err.POSITION_UNAVAILABLE:
            setError("Couldn't determine your location")
            break
          case err.TIMEOUT:
            setError("Location request timed out")
            break
          default:
            setError("Couldn't get your location")
        }
      },
      { timeout: 8000, maximumAge: 60_000 },
    )
  }

  const baseLabel = variant === "hero" ? "Search near me" : "Near me"
  const showLabel = success ? "Got it" : baseLabel
  const Icon = success ? Check : busy ? Loader2 : MapPin
  const iconClass = busy ? "animate-spin" : ""

  if (variant === "compact") {
    return (
      <span className={cn("inline-flex flex-col items-end gap-0.5", className)}>
        <button
          type="button"
          onClick={onClick}
          disabled={busy}
          className={cn(
            "inline-flex items-center gap-1 text-xs hover:underline disabled:opacity-50",
            success ? "text-emerald-700" : "text-violet-700",
          )}
          title="Use my browser location"
        >
          <Icon className={cn("h-3 w-3", iconClass)} />
          {showLabel}
        </button>
        {error && (
          <span className="text-[10px] text-amber-700" role="status">
            {error}
          </span>
        )}
      </span>
    )
  }

  return (
    <span className={cn("inline-flex flex-col items-center gap-1", className)}>
      <button
        type="button"
        onClick={onClick}
        disabled={busy}
        className={cn(
          "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold shadow-sm transition-colors disabled:opacity-60",
          success
            ? "border-emerald-300 bg-emerald-50 text-emerald-800"
            : "border-violet-200 bg-white text-violet-700 hover:border-violet-500 hover:bg-violet-50",
        )}
        title="Find facilities near my current location"
      >
        <Icon className={cn("h-4 w-4", iconClass)} />
        {showLabel}
      </button>
      {error && (
        <span className="text-xs text-amber-700" role="status">
          {error}
        </span>
      )}
    </span>
  )
}
