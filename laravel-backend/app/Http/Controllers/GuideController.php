<?php

namespace App\Http\Controllers;

use App\Models\Lead;
use App\Services\GuideCatalog;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Validation\ValidationException;

/**
 * Branded downloadable guides — lead-magnet content. Email is captured
 * (creates a Lead with source=guide_download); the PDF is rendered from
 * a Blade template and streamed back. No facility-side selling involved.
 */
class GuideController extends Controller
{
    /**
     * GET /api/marketplace/guides
     */
    public function index(): JsonResponse
    {
        return response()->json([
            'data' => array_map(fn ($g) => [
                'slug' => $g['slug'],
                'title' => $g['title'],
                'subtitle' => $g['subtitle'],
                'description' => $g['description'],
                'category' => $g['category'],
                'page_count' => $g['page_count'],
                'audience' => $g['audience'],
                'author' => $g['author'] ?? null,
                'reviewer' => $g['reviewer'] ?? null,
            ], GuideCatalog::all()),
        ]);
    }

    /**
     * POST /api/marketplace/guides/{slug}/download
     *
     * Captures the email as a Lead, then streams the PDF. Rate-limited per
     * IP because PDF rendering is non-trivial CPU work.
     */
    public function download(Request $request, string $slug): Response
    {
        $guide = GuideCatalog::find($slug);
        if (! $guide) {
            abort(404, 'Guide not found.');
        }

        $throttleKey = 'guide-download:' . $request->ip();
        if (RateLimiter::tooManyAttempts($throttleKey, 20)) {
            $seconds = RateLimiter::availableIn($throttleKey);
            throw ValidationException::withMessages([
                'rate' => "Too many downloads. Try again in {$seconds} seconds.",
            ]);
        }
        RateLimiter::hit($throttleKey, 600);

        $data = $request->validate([
            // Identification (required) — without name + phone we can't
            // actually follow up; email-only leads are mostly junk.
            'first_name' => ['required', 'string', 'max:80'],
            'last_name' => ['required', 'string', 'max:80'],
            'email' => ['required', 'email', 'max:191'],
            'phone' => ['required', 'string', 'min:7', 'max:30'],

            // Context (optional) — helps later qualification.
            'zip' => ['nullable', 'string', 'max:10'],
            'care_type' => ['nullable', 'in:assisted_living,memory_care,snf,ccrc,independent'],
            'relationship_to_prospect' => ['nullable', 'in:self,spouse,adult_child,poa,hospital,other'],
            'timeline' => ['nullable', 'in:now,30d,90d,6mo,researching'],
            'consent_followup' => ['nullable', 'boolean'],
        ]);

        $fullName = trim($data['first_name'] . ' ' . $data['last_name']);

        Lead::create([
            'source' => 'guide_download',
            'email' => strtolower($data['email']),
            'phone' => $data['phone'],
            'name' => $fullName,
            'zip' => $data['zip'] ?? null,
            'relationship_to_prospect' => $data['relationship_to_prospect'] ?? null,
            'context' => [
                'guide_slug' => $guide['slug'],
                'guide_title' => $guide['title'],
                'care_type' => $data['care_type'] ?? null,
                'first_name' => $data['first_name'],
                'last_name' => $data['last_name'],
                'timeline' => $data['timeline'] ?? null,
                'consent_followup' => (bool) ($data['consent_followup'] ?? false),
            ],
            'utm_source' => $request->query('utm_source'),
            'utm_medium' => $request->query('utm_medium'),
            'utm_campaign' => $request->query('utm_campaign'),
            'referrer' => substr((string) $request->header('referer'), 0, 500) ?: null,
            'ip_address' => $request->ip(),
            'user_agent' => substr((string) $request->userAgent(), 0, 1000) ?: null,
            'status' => 'new',
        ]);

        // setOption (singular) sets one key without nuking the vendor
        // defaults — needed for the magazine-style hero photos that
        // load from images.unsplash.com.
        $pdf = Pdf::loadView('guides.' . $guide['slug'], [
            'guide' => $guide,
            'today' => now()->format('F j, Y'),
        ])
            ->setOption('isRemoteEnabled', true)
            ->setPaper('letter');

        $filename = 'carepath-' . $guide['slug'] . '.pdf';

        return $pdf->download($filename);
    }
}
