import { useEffect, useMemo, useRef } from "react"
import { MapContainer, Marker, Popup, TileLayer, useMap, useMapEvents } from "react-leaflet"
import L, { type LatLngBoundsExpression, type LatLngTuple } from "leaflet"
import "leaflet/dist/leaflet.css"
import { Link } from "react-router-dom"
import { Star } from "lucide-react"

interface MapFacility {
  id: string
  slug: string
  name: string
  city: string
  state: string
  latitude: number | null
  longitude: number | null
  price_from_cents: number | null
  cms_five_star_overall: number | null
  available_beds: number
}

interface Origin {
  lat: number
  lon: number
  zip: string
  city: string | null
  state: string | null
}

interface Props {
  facilities: MapFacility[]
  origin: Origin | null
  radiusMiles: number | null
  /** Fires whenever the user finishes panning or zooming. SearchPage
   * uses this to surface a "Search this area" button. */
  onBoundsChange?: (bbox: { minLat: number; minLon: number; maxLat: number; maxLon: number }) => void
}

const PRIMARY = "oklch(0.555 0.245 295)"
const FOREGROUND = "oklch(0.205 0.006 75)"

function facilityIcon(label: string, highlighted: boolean) {
  const bg = highlighted ? PRIMARY : "white"
  const fg = highlighted ? "white" : FOREGROUND
  const border = highlighted ? PRIMARY : "rgba(0,0,0,0.18)"
  return L.divIcon({
    className: "carepath-facility-pin",
    html: `<div style="
      display:inline-flex;align-items:center;gap:4px;
      padding:4px 8px 4px 6px;
      background:${bg};color:${fg};
      border:1px solid ${border};
      border-radius:9999px;
      font-family:Inter,system-ui,sans-serif;
      font-size:12px;font-weight:600;
      box-shadow:0 2px 6px rgba(0,0,0,0.14);
      white-space:nowrap;
      "><span style="
        display:inline-block;width:6px;height:6px;border-radius:9999px;
        background:${highlighted ? "white" : PRIMARY};
      "></span>${label}</div>`,
    iconSize: [60, 22],
    iconAnchor: [30, 11],
    popupAnchor: [0, -10],
  })
}

function originIcon() {
  return L.divIcon({
    className: "carepath-origin-pin",
    html: `<div style="
      width:18px;height:18px;border-radius:9999px;
      background:${PRIMARY};border:3px solid white;
      box-shadow:0 0 0 1px ${PRIMARY},0 2px 6px rgba(0,0,0,0.25);
      "></div>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  })
}

function FitBounds({ points }: { points: LatLngTuple[] }) {
  const map = useMap()
  useEffect(() => {
    if (points.length === 0) return
    if (points.length === 1) {
      map.setView(points[0], 12, { animate: true })
      return
    }
    const bounds: LatLngBoundsExpression = points
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 13 })
  }, [points, map])
  return null
}

/**
 * Reports the visible map bounds upward after every pan/zoom so the
 * page can offer a "Search this area" affordance (Seniorly-style).
 * Debounced inside the parent rather than here — Leaflet's moveend
 * already fires once per gesture.
 */
function BoundsReporter({
  onChange,
}: {
  onChange: NonNullable<Props["onBoundsChange"]>
}) {
  useMapEvents({
    moveend(e) {
      const b = e.target.getBounds()
      onChange({
        minLat: b.getSouth(),
        minLon: b.getWest(),
        maxLat: b.getNorth(),
        maxLon: b.getEast(),
      })
    },
  })
  return null
}

export function FacilityMap({ facilities, origin, radiusMiles, onBoundsChange }: Props) {
  const markers = useMemo(
    () =>
      facilities.filter(
        (f): f is MapFacility & { latitude: number; longitude: number } =>
          f.latitude !== null && f.longitude !== null
      ),
    [facilities]
  )

  // Points used to compute bounds: facilities + origin (so origin is always
  // in view even if no facilities matched its radius edge).
  const fitPoints: LatLngTuple[] = useMemo(() => {
    const pts: LatLngTuple[] = markers.map((m) => [m.latitude, m.longitude])
    if (origin) pts.push([origin.lat, origin.lon])
    return pts
  }, [markers, origin])

  // Default center: continental US-ish if we have nothing else.
  const initialCenter: LatLngTuple = origin
    ? [origin.lat, origin.lon]
    : markers[0]
    ? [markers[0].latitude, markers[0].longitude]
    : [39.5, -98.35]
  const initialZoom = origin ? 11 : markers.length > 0 ? 10 : 4

  const containerRef = useRef<HTMLDivElement>(null)

  return (
    <div ref={containerRef} className="relative h-full w-full overflow-hidden rounded-lg border bg-card">
      <MapContainer
        center={initialCenter}
        zoom={initialZoom}
        scrollWheelZoom
        className="h-full w-full"
        style={{ background: "var(--color-muted)" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <FitBounds points={fitPoints} />
        {onBoundsChange && <BoundsReporter onChange={onBoundsChange} />}

        {origin && (
          <Marker position={[origin.lat, origin.lon]} icon={originIcon()} zIndexOffset={1000}>
            <Popup>
              <div style={{ fontFamily: "Inter,system-ui,sans-serif", fontSize: 13 }}>
                <div style={{ fontWeight: 600 }}>
                  {origin.city ? `${origin.city}, ${origin.state}` : origin.zip}
                </div>
                <div style={{ color: "#666", marginTop: 2 }}>
                  Search center {radiusMiles ? `· ${radiusMiles} mi radius` : ""}
                </div>
              </div>
            </Popup>
          </Marker>
        )}

        {markers.map((f) => {
          const monthly = f.price_from_cents
            ? `$${Math.round(f.price_from_cents / 100).toLocaleString()}`
            : null
          const label = monthly ?? (f.cms_five_star_overall ? `★ ${f.cms_five_star_overall}` : "•")
          return (
            <Marker
              key={f.id}
              position={[f.latitude, f.longitude]}
              icon={facilityIcon(label, false)}
            >
              <Popup>
                <div style={{ fontFamily: "Inter,system-ui,sans-serif", minWidth: 200 }}>
                  <div style={{ fontWeight: 600, fontSize: 14, lineHeight: 1.3 }}>{f.name}</div>
                  <div style={{ color: "#666", fontSize: 12, marginTop: 2 }}>
                    {f.city}, {f.state}
                  </div>
                  <div style={{ display: "flex", gap: 10, marginTop: 8, fontSize: 12, alignItems: "center" }}>
                    {f.cms_five_star_overall && (
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 3 }}>
                        <Star size={12} style={{ fill: "#f59e0b", color: "#f59e0b" }} />
                        <span style={{ fontWeight: 600 }}>{f.cms_five_star_overall}</span>
                        <span style={{ color: "#888" }}>CMS</span>
                      </span>
                    )}
                    {monthly && (
                      <span>
                        <span style={{ fontWeight: 600 }}>{monthly}</span>
                        <span style={{ color: "#888" }}>/mo</span>
                      </span>
                    )}
                    <span style={{ color: f.available_beds > 0 ? "#059669" : "#888" }}>
                      {f.available_beds > 0 ? `${f.available_beds} open` : "Waitlist"}
                    </span>
                  </div>
                  <Link
                    to={`/facility/${f.slug}`}
                    style={{
                      display: "inline-block",
                      marginTop: 10,
                      padding: "6px 10px",
                      borderRadius: 6,
                      background: PRIMARY,
                      color: "white",
                      fontSize: 12,
                      fontWeight: 500,
                      textDecoration: "none",
                    }}
                  >
                    View details →
                  </Link>
                </div>
              </Popup>
            </Marker>
          )
        })}
      </MapContainer>

      {markers.length === 0 && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="rounded-md bg-card/95 px-4 py-2 text-xs text-muted-foreground shadow-sm backdrop-blur">
            No mappable facilities in this view
          </div>
        </div>
      )}
    </div>
  )
}
