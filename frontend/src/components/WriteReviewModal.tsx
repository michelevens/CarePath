import { useState, type FormEvent } from "react"
import { Loader2, Plus, Star, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { api } from "@/lib/api"
import { cn } from "@/lib/utils"

interface Props {
  open: boolean
  onClose: () => void
  facilitySlug: string
  facilityName: string
  onSubmitted: () => void
}

const SUBSCORE_DIMENSIONS: Array<{ key: string; label: string }> = [
  { key: "rating_cleanliness", label: "Cleanliness" },
  { key: "rating_friendliness", label: "Friendliness" },
  { key: "rating_care", label: "Care services" },
  { key: "rating_staff", label: "Staff" },
  { key: "rating_meals", label: "Meals" },
  { key: "rating_activities", label: "Activities" },
  { key: "rating_value", label: "Value for cost" },
]

/**
 * Write-a-review modal. Posts to /api/facilities/{slug}/reviews.
 * The endpoint auto-determines verified status by checking for an
 * admission record where the auth user is the inquirer — so families
 * don't have to claim verification, it's intrinsic.
 */
export function WriteReviewModal({
  open,
  onClose,
  facilitySlug,
  facilityName,
  onSubmitted,
}: Props) {
  const [rating, setRating] = useState(0)
  const [title, setTitle] = useState("")
  const [body, setBody] = useState("")
  const [relationship, setRelationship] = useState<"family" | "resident" | "visitor" | "staff">("family")
  const [subscores, setSubscores] = useState<Record<string, number>>({})
  const [photoUrls, setPhotoUrls] = useState<string[]>([])
  const [photoInput, setPhotoInput] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  if (!open) return null

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (rating < 1 || body.trim().length < 30 || busy) return
    setBusy(true)
    setError(null)
    try {
      const r = await api.post<{ data: { message: string; is_verified: boolean } }>(
        `/facilities/${facilitySlug}/reviews`,
        {
          rating,
          title: title.trim() || null,
          body: body.trim(),
          author_relationship: relationship,
          ...subscores,
          photos: photoUrls.length > 0 ? photoUrls.map((u) => ({ url: u })) : undefined,
        },
      )
      setSuccess(r.data.data.message)
      setTimeout(() => {
        onSubmitted()
        onClose()
      }, 1500)
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string; errors?: Record<string, string[]> } } }
      const first = e.response?.data?.errors ? Object.values(e.response.data.errors)[0]?.[0] : undefined
      setError(first ?? e.response?.data?.message ?? "Something went wrong.")
    } finally {
      setBusy(false)
    }
  }

  const addPhoto = () => {
    const u = photoInput.trim()
    if (!u || photoUrls.length >= 6) return
    try {
      new URL(u)
    } catch {
      setError("Photo URL doesn't look valid.")
      return
    }
    setPhotoUrls([...photoUrls, u])
    setPhotoInput("")
    setError(null)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <form
        onSubmit={submit}
        className="w-full max-w-xl overflow-hidden rounded-lg border bg-card shadow-2xl"
      >
        <div className="flex items-start justify-between border-b p-4">
          <div>
            <h2 className="text-lg font-semibold">Review {facilityName}</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Honest, first-hand experiences help other families. Your review will
              be marked <strong>Verified</strong> automatically if you have a tour
              or admission record on this facility.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto p-4">
          {/* Star rating */}
          <div>
            <label className="text-xs font-medium">Overall rating *</label>
            <div className="mt-1 flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setRating(n)}
                  className="rounded p-0.5 hover:bg-muted"
                  aria-label={`${n} star${n === 1 ? "" : "s"}`}
                >
                  <Star
                    className={cn(
                      "h-7 w-7 transition-colors",
                      n <= rating ? "fill-amber-400 text-amber-500" : "text-muted-foreground/40"
                    )}
                  />
                </button>
              ))}
              {rating > 0 && (
                <span className="ml-2 text-sm font-medium">{rating}/5</span>
              )}
            </div>
          </div>

          {/* Title */}
          <div className="mt-4">
            <label className="text-xs font-medium">Title (optional)</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={160}
              placeholder="What stood out?"
              className="mt-1 block w-full rounded-md border bg-background px-2 py-1.5 text-sm"
            />
          </div>

          {/* Body */}
          <div className="mt-4">
            <label className="text-xs font-medium">Your experience * <span className="text-muted-foreground">(min 30 chars)</span></label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              maxLength={5000}
              rows={5}
              placeholder="Tell other families about the staff, care quality, food, activities, and value..."
              className="mt-1 block w-full rounded-md border bg-background px-2 py-1.5 text-sm"
              required
              minLength={30}
            />
            <div className="mt-0.5 text-right text-[10px] text-muted-foreground">
              {body.length} / 5000
            </div>
          </div>

          {/* Relationship */}
          <div className="mt-4">
            <label className="text-xs font-medium">You are…</label>
            <select
              value={relationship}
              onChange={(e) => setRelationship(e.target.value as typeof relationship)}
              className="mt-1 block w-full rounded-md border bg-background px-2 py-1.5 text-sm"
            >
              <option value="family">A family member</option>
              <option value="resident">A current or former resident</option>
              <option value="visitor">A visitor</option>
              <option value="staff">Staff</option>
            </select>
          </div>

          {/* Subscores */}
          <div className="mt-5">
            <label className="text-xs font-medium">Sub-scores (optional)</label>
            <div className="mt-2 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
              {SUBSCORE_DIMENSIONS.map((d) => (
                <div key={d.key} className="flex items-center justify-between rounded border bg-card px-2 py-1.5 text-xs">
                  <span>{d.label}</span>
                  <div className="flex items-center gap-0.5">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setSubscores({ ...subscores, [d.key]: n })}
                        className="p-0.5"
                      >
                        <Star
                          className={cn(
                            "h-3.5 w-3.5",
                            n <= (subscores[d.key] ?? 0)
                              ? "fill-amber-400 text-amber-500"
                              : "text-muted-foreground/40"
                          )}
                        />
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Photos */}
          <div className="mt-5">
            <label className="text-xs font-medium">
              Photo proof (optional, up to 6) <span className="text-muted-foreground">— paste a URL</span>
            </label>
            <div className="mt-1 flex gap-1.5">
              <input
                value={photoInput}
                onChange={(e) => setPhotoInput(e.target.value)}
                placeholder="https://…"
                className="flex-1 rounded-md border bg-background px-2 py-1.5 text-sm"
                disabled={photoUrls.length >= 6}
              />
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={addPhoto}
                disabled={!photoInput.trim() || photoUrls.length >= 6}
              >
                <Plus className="h-3 w-3" /> Add
              </Button>
            </div>
            {photoUrls.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {photoUrls.map((u, i) => (
                  <div key={i} className="relative">
                    <img src={u} alt="" className="h-16 w-16 rounded-md object-cover ring-1 ring-border" />
                    <button
                      type="button"
                      onClick={() => setPhotoUrls(photoUrls.filter((_, j) => j !== i))}
                      className="absolute -right-1 -top-1 rounded-full bg-foreground p-0.5 text-background"
                      aria-label="Remove"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {error && (
            <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-2 text-xs text-red-700">
              {error}
            </div>
          )}
          {success && (
            <div className="mt-4 rounded-md border border-emerald-200 bg-emerald-50 p-2 text-xs text-emerald-800">
              {success}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 border-t bg-muted/30 p-3">
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            size="sm"
            disabled={rating === 0 || body.trim().length < 30 || busy || !!success}
          >
            {busy && <Loader2 className="h-3 w-3 animate-spin" />}
            Submit review
          </Button>
        </div>
      </form>
    </div>
  )
}
