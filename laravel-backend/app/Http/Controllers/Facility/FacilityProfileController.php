<?php

namespace App\Http\Controllers\Facility;

use App\Http\Controllers\Controller;
use App\Models\Facility;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/**
 * Self-serve editor for the *public* marketplace listing — what
 * a family sees on /facility/{slug}. Scoped via FacilityScope
 * middleware so a manager can only ever read/write their own
 * facility row.
 *
 * Deliberately narrow: NO address mutations (changing lat/lon
 * without re-geocoding would silently break radius search and
 * map pins; we surface a "Request address correction" path
 * through SuperAdmin instead), NO bed totals (driven by the
 * actual `beds` table), NO CMS-star fields (those come from the
 * CMS Nursing Home Compare ingest — overwriting locally would
 * desync at the next sync). Everything here is pure marketing
 * copy + contact info the facility owns.
 */
class FacilityProfileController extends Controller
{
    public function show(Request $request): JsonResponse
    {
        $facilityId = $request->attributes->get('facility_id');
        $facility = Facility::findOrFail($facilityId);

        return response()->json([
            'data' => [
                'id' => $facility->id,
                'slug' => $facility->slug,
                'name' => $facility->name,
                'type' => $facility->type,
                'tagline' => $facility->tagline,
                'description' => $facility->description,
                'phone' => $facility->phone,
                'email' => $facility->email,
                'website' => $facility->website,
                'price_from_cents' => $facility->price_from_cents,
                // Address shown as read-only so the UI can render it +
                // a "request a correction" affordance without a second
                // round trip.
                'address_line_1' => $facility->address_line_1,
                'address_line_2' => $facility->address_line_2,
                'city' => $facility->city,
                'state' => $facility->state,
                'zip' => $facility->zip,
            ],
        ]);
    }

    public function update(Request $request): JsonResponse
    {
        $facilityId = $request->attributes->get('facility_id');
        $facility = Facility::findOrFail($facilityId);

        $data = $request->validate([
            'name' => ['sometimes', 'string', 'max:191'],
            'type' => ['sometimes', Rule::in(Facility::TYPES)],
            'tagline' => ['nullable', 'string', 'max:200'],
            'description' => ['nullable', 'string', 'max:5000'],
            'phone' => ['nullable', 'string', 'max:30'],
            'email' => ['nullable', 'email', 'max:191'],
            'website' => ['nullable', 'url', 'max:255'],
            // Stored in cents but managers think in dollars — the
            // frontend converts before posting.
            'price_from_cents' => ['nullable', 'integer', 'min:0', 'max:10000000'],
        ]);

        $facility->update($data);

        return $this->show($request);
    }
}
