<?php

namespace App\Http\Controllers\Facility;

use App\Http\Controllers\Controller;
use App\Models\FacilityPhoto;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Intervention\Image\Laravel\Facades\Image;

/**
 * Facility-manager photo upload. Files go to Cloudflare R2 via the
 * `r2` disk (filesystems.php); the row in facility_photos stores
 * the public hot-link URL so the public detail page can render
 * without any signing roundtrip.
 *
 * Already scoped by the `facility.scope` middleware on the parent
 * route group — managers can only ever read/write photos on their
 * active facility.
 *
 * Image rules: 5MB max, JPEG/PNG/WebP only, max 10 photos per
 * facility on the free tier (Pro raises the cap — gated client-side
 * by subscription_tier; enforced here as a hard ceiling so a
 * downgrade can't leave a manager over-quota).
 */
class FacilityPhotoController extends Controller
{
    private const MAX_PHOTOS = 30;
    private const MAX_BYTES = 5 * 1024 * 1024;
    // Hero on the public detail page is rendered at ~1200px wide on
    // a 2k monitor; serving 4k JPEGs from a phone camera is wasted
    // bytes. Cap the long edge at 2000 — generous for retina + lightbox
    // zoom, but a 10x cut over a typical phone-camera original. WebP
    // re-encodes for an additional ~25% reduction at q=82.
    private const MAX_LONG_EDGE = 2000;
    private const WEBP_QUALITY = 82;

    public function index(Request $request): JsonResponse
    {
        $facilityId = $request->attributes->get('facility_id');

        $rows = FacilityPhoto::query()
            ->where('facility_id', $facilityId)
            ->orderBy('sort_order')
            ->orderBy('created_at')
            ->get();

        return response()->json(['data' => $rows]);
    }

    public function store(Request $request): JsonResponse
    {
        $facilityId = $request->attributes->get('facility_id');

        $request->validate([
            'photo' => [
                'required',
                'file',
                'image',
                'mimes:jpeg,jpg,png,webp',
                'max:' . (self::MAX_BYTES / 1024),
            ],
            'category' => ['nullable', Rule::in(FacilityPhoto::CATEGORIES)],
            'caption' => ['nullable', 'string', 'max:200'],
        ]);

        $current = FacilityPhoto::where('facility_id', $facilityId)->count();
        if ($current >= self::MAX_PHOTOS) {
            return response()->json([
                'message' => 'Photo limit reached (' . self::MAX_PHOTOS . '). Delete an existing photo first.',
            ], 422);
        }

        $file = $request->file('photo');

        // Resize + WebP-encode in memory before pushing to R2. We
        // store ONE optimized file per upload (not a thumb/medium/full
        // pyramid) — simplest mental model, no per-render lookups
        // for "which variant am I serving here", and 5× smaller than
        // a typical phone-camera JPEG so the storage tradeoff vs
        // pyramid is negligible.
        $img = Image::read($file->getRealPath());
        if ($img->width() > self::MAX_LONG_EDGE || $img->height() > self::MAX_LONG_EDGE) {
            $img->scaleDown(width: self::MAX_LONG_EDGE, height: self::MAX_LONG_EDGE);
        }
        $encoded = $img->toWebp(quality: self::WEBP_QUALITY);

        // UUID-based filename so we never overwrite or leak the
        // uploader's original name, and so concurrent uploads can't
        // collide. Extension is always .webp now regardless of input.
        $path = sprintf('facility-photos/%s/%s.webp', $facilityId, (string) Str::uuid());

        Storage::disk('r2')
            ->put($path, (string) $encoded, [
                'visibility' => 'public',
                'CacheControl' => 'public, max-age=31536000, immutable',
                'ContentType' => 'image/webp',
            ]);

        $publicUrl = $this->publicUrl($path);

        $maxOrder = FacilityPhoto::where('facility_id', $facilityId)->max('sort_order') ?? -1;

        $row = FacilityPhoto::create([
            'facility_id' => $facilityId,
            'url' => $publicUrl,
            'caption' => $request->input('caption'),
            'category' => $request->input('category'),
            'sort_order' => $maxOrder + 1,
            'is_active' => true,
        ]);

        return response()->json(['data' => $row], 201);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $facilityId = $request->attributes->get('facility_id');

        $row = FacilityPhoto::where('facility_id', $facilityId)->findOrFail($id);

        $data = $request->validate([
            'caption' => ['nullable', 'string', 'max:200'],
            'category' => ['nullable', Rule::in(FacilityPhoto::CATEGORIES)],
            'is_active' => ['sometimes', 'boolean'],
        ]);

        $row->update($data);

        return response()->json(['data' => $row->fresh()]);
    }

    public function destroy(Request $request, string $id): JsonResponse
    {
        $facilityId = $request->attributes->get('facility_id');

        $row = FacilityPhoto::where('facility_id', $facilityId)->findOrFail($id);

        // Best-effort object delete — if R2 is unreachable, we still
        // delete the row so the photo disappears from the listing.
        // Orphaned objects are reclaimed by a nightly cleanup job
        // (TODO when meaningful storage starts accruing).
        try {
            $path = $this->pathFromUrl($row->url);
            if ($path) {
                Storage::disk('r2')->delete($path);
            }
        } catch (\Throwable $e) {
            // swallow — row delete proceeds
        }

        $row->delete();

        return response()->json(['ok' => true]);
    }

    /**
     * POST /api/facility/photos/reorder
     * Body: { "order": ["uuid-1", "uuid-2", ...] }
     */
    public function reorder(Request $request): JsonResponse
    {
        $facilityId = $request->attributes->get('facility_id');

        $data = $request->validate([
            'order' => ['required', 'array'],
            'order.*' => ['string'],
        ]);

        $valid = FacilityPhoto::where('facility_id', $facilityId)
            ->whereIn('id', $data['order'])
            ->pluck('id')
            ->all();
        $validSet = array_flip($valid);

        DB::transaction(function () use ($data, $validSet, $facilityId) {
            $order = 0;
            foreach ($data['order'] as $id) {
                if (! isset($validSet[$id])) continue;
                FacilityPhoto::where('id', $id)
                    ->where('facility_id', $facilityId)
                    ->update(['sort_order' => $order++]);
            }
        });

        return response()->json(['ok' => true]);
    }

    /**
     * Build the public hot-link URL. R2 doesn't auto-expose objects
     * over HTTPS unless the bucket has a public-read setting OR a
     * custom domain is bound — we configure that out-of-band and
     * point R2_PUBLIC_BASE at it.
     */
    private function publicUrl(string $path): string
    {
        $base = rtrim((string) config('filesystems.disks.r2.url'), '/');
        if ($base !== '') {
            return $base . '/' . ltrim($path, '/');
        }
        // Fallback: Flysystem can build a URL when the disk's `url`
        // is set. Final fallback is the storage path itself, which
        // won't actually load — but we want to log/notice that
        // R2_PUBLIC_BASE is missing rather than 500 the upload.
        return Storage::disk('r2')->url($path);
    }

    /**
     * Strip the R2_PUBLIC_BASE prefix off a stored URL to recover
     * the object key — needed for delete. If the prefix doesn't
     * match (e.g., the URL was stored before R2_PUBLIC_BASE was
     * configured), we bail and skip the storage-side delete.
     */
    private function pathFromUrl(string $url): ?string
    {
        $base = rtrim((string) config('filesystems.disks.r2.url'), '/');
        if ($base === '' || ! str_starts_with($url, $base . '/')) {
            return null;
        }
        return substr($url, strlen($base) + 1);
    }
}
