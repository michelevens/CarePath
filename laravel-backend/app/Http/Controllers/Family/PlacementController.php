<?php

namespace App\Http\Controllers\Family;

use App\Http\Controllers\Controller;
use App\Models\Admission;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

/**
 * Family-facing view of placements they originated.
 *
 * Identification: an admission belongs to a family member if their auth
 * email matches admission.inquirer_email. This is the same key
 * MessagingController uses for broadcast targeting.
 *
 * Visibility: families see CURATED milestones from admission.family_events
 * — never the raw AuditLog (which has internal notes & assignee changes).
 */
class PlacementController extends Controller
{
    /**
     * GET /api/family/placements
     *
     * All placements the authenticated family member kicked off, with
     * the latest milestone summarized for the inbox-style list.
     */
    public function index(Request $request): JsonResponse
    {
        $email = Auth::user()->email;

        $rows = Admission::query()
            ->where('inquirer_email', $email)
            ->with(['facility:id,name,slug,city,state,phone,email'])
            ->orderByDesc('created_at')
            ->limit(100)
            ->get();

        return response()->json([
            'data' => $rows->map(fn ($a) => $this->summarize($a))->values(),
        ]);
    }

    /**
     * GET /api/family/placements/{id}
     */
    public function show(Request $request, string $id): JsonResponse
    {
        $email = Auth::user()->email;
        $a = Admission::with(['facility:id,name,slug,city,state,phone,email,address_line_1,zip'])
            ->where('inquirer_email', $email)
            ->findOrFail($id);

        $events = collect($a->family_events ?? [])
            ->sortBy('occurred_at')
            ->values()
            ->all();

        // Synthesize the "upcoming" stages families haven't reached yet
        // so the timeline shows the whole journey, not just past events.
        $milestones = self::canonicalMilestones();
        $currentStage = $a->stage;
        $reached = collect($events)->pluck('stage')->unique()->all();
        $upcoming = [];
        $seenCurrent = false;
        foreach ($milestones as $stage => $label) {
            if ($stage === $currentStage) {
                $seenCurrent = true;
                continue;
            }
            if ($seenCurrent && ! in_array($stage, ['declined', 'withdrew'], true)) {
                $upcoming[] = ['key' => $stage, 'label' => $label, 'stage' => $stage];
            }
        }

        return response()->json([
            'data' => [
                'id' => $a->id,
                'stage' => $a->stage,
                'stage_label' => self::canonicalMilestones()[$a->stage] ?? $a->stage,
                'prospect_name' => trim($a->prospect_first_name . ' ' . $a->prospect_last_name),
                'inquirer_name' => $a->inquirer_name,
                'inquirer_relationship' => $a->inquirer_relationship,
                'target_admit_date' => $a->target_admit_date?->toDateString(),
                'level_of_care' => $a->prospect_level_of_care,
                'facility' => $a->facility ? [
                    'id' => $a->facility->id,
                    'name' => $a->facility->name,
                    'slug' => $a->facility->slug,
                    'city' => $a->facility->city,
                    'state' => $a->facility->state,
                    'address_line_1' => $a->facility->address_line_1,
                    'zip' => $a->facility->zip,
                    'phone' => $a->facility->phone,
                    'email' => $a->facility->email,
                ] : null,
                'events' => $events,
                'upcoming' => $upcoming,
                'reached_keys' => $reached,
                'created_at' => $a->created_at?->toIso8601String(),
            ],
        ]);
    }

    private function summarize(Admission $a): array
    {
        $events = collect($a->family_events ?? []);
        $latest = $events->sortByDesc('occurred_at')->first();
        return [
            'id' => $a->id,
            'stage' => $a->stage,
            'stage_label' => self::canonicalMilestones()[$a->stage] ?? $a->stage,
            'prospect_name' => trim($a->prospect_first_name . ' ' . $a->prospect_last_name),
            'facility' => $a->facility ? [
                'name' => $a->facility->name,
                'slug' => $a->facility->slug,
                'city' => $a->facility->city,
                'state' => $a->facility->state,
            ] : null,
            'latest_event' => $latest,
            'target_admit_date' => $a->target_admit_date?->toDateString(),
            'created_at' => $a->created_at?->toIso8601String(),
        ];
    }

    /**
     * Canonical milestones in display order. Drives "upcoming" rendering
     * so families see the full journey path, not just past events.
     */
    public static function canonicalMilestones(): array
    {
        return [
            'inquiry' => 'Inquiry sent',
            'tour_scheduled' => 'Tour scheduled',
            'toured' => 'Tour completed',
            'assessment' => 'Assessment in progress',
            'approved' => 'Approved for admission',
            'admitted' => 'Moved in',
            'declined' => 'Declined',
            'withdrew' => 'Withdrew',
        ];
    }
}
