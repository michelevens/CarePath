<?php

namespace App\Http\Controllers\SuperAdmin;

use App\Http\Controllers\Controller;
use App\Models\DataSourceSchema;
use App\Models\PublicRecordsRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/**
 * Public Records Request tracker — backs the "File PRR" button on
 * Tier-4 source cards (FL APD primarily).
 *
 * The actual email is composed client-side via a mailto: link the
 * frontend builds from our template; this controller persists the
 * request + sets the follow-up date so it shows up in the alerts
 * panel until marked responded.
 */
class PrrController extends Controller
{
    /**
     * GET /api/superadmin/prr
     *
     * All requests (open + completed), most recent first. Plus a
     * summary the dashboard alerts panel reads from.
     */
    public function index(): JsonResponse
    {
        $items = PublicRecordsRequest::query()
            ->orderByDesc('filed_at')
            ->limit(200)
            ->get();

        return response()->json([
            'data' => $items->map(fn (PublicRecordsRequest $p) => [
                'id' => $p->id,
                'source_key' => $p->source_key,
                'source_display' => $p->source()?->display_name,
                'contact_email' => $p->contact_email,
                'subject' => $p->subject,
                'body' => $p->body,
                'filed_at' => $p->filed_at,
                'follow_up_on' => $p->follow_up_on,
                'response_received_at' => $p->response_received_at,
                'is_open' => $p->isOpen(),
                'is_overdue' => $p->isOverdue(),
                'notes' => $p->notes,
            ]),
            'summary' => [
                'open' => PublicRecordsRequest::whereNull('response_received_at')->count(),
                'overdue' => PublicRecordsRequest::whereNull('response_received_at')
                    ->whereDate('follow_up_on', '<', now())
                    ->count(),
                'total' => PublicRecordsRequest::count(),
            ],
        ]);
    }

    /**
     * POST /api/superadmin/prr
     *
     * Records a filed PRR. Frontend has already opened mailto: with
     * the body — this just persists the bookkeeping.
     */
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'source_key' => ['required', 'string', Rule::exists('data_source_schemas', 'source_key')],
            'contact_email' => ['required', 'email'],
            'subject' => ['required', 'string', 'max:191'],
            'body' => ['required', 'string'],
            'follow_up_days' => ['nullable', 'integer', 'min:1', 'max:365'],
        ]);

        $filed = now();
        $followUp = $filed->copy()->addDays($data['follow_up_days'] ?? 30);

        $prr = PublicRecordsRequest::create([
            'source_key' => $data['source_key'],
            'contact_email' => $data['contact_email'],
            'subject' => $data['subject'],
            'body' => $data['body'],
            'filed_at' => $filed,
            'follow_up_on' => $followUp->toDateString(),
            'filed_by_user_id' => $request->user()?->id,
        ]);

        return response()->json(['data' => $prr], 201);
    }

    /**
     * POST /api/superadmin/prr/{id}/mark-received
     *
     * Mark a PRR as responded. SuperAdmin clicks this once the
     * agency has emailed back; clears it from the alerts panel.
     */
    public function markReceived(Request $request, string $id): JsonResponse
    {
        $data = $request->validate([
            'notes' => ['nullable', 'string', 'max:2000'],
        ]);

        $prr = PublicRecordsRequest::findOrFail($id);
        $prr->update([
            'response_received_at' => now(),
            'notes' => $data['notes'] ?? $prr->notes,
        ]);

        return response()->json(['data' => $prr]);
    }

    /**
     * GET /api/superadmin/prr/template/{source_key}
     *
     * Pre-filled PRR body the frontend uses for the mailto: link.
     * Pulls the contact + body from the data source schema.
     */
    public function template(string $sourceKey): JsonResponse
    {
        $schema = DataSourceSchema::where('source_key', $sourceKey)->firstOrFail();

        $subject = "Public Records Request — Licensed Facility List ({$schema->display_name})";

        $body = <<<EOT
Pursuant to applicable public records statute, I request a current list of all licensed facilities under your jurisdiction, including for each: provider name, license number, address, city, county, ZIP, contact phone, services offered, and licensure status.

Format: Excel (.xlsx) or CSV preferred. Electronic delivery requested.

Thank you.
EOT;

        return response()->json([
            'data' => [
                'source_key' => $schema->source_key,
                'source_display' => $schema->display_name,
                'contact_email' => $schema->contact_email,
                'contact_phone' => $schema->contact_phone,
                'subject' => $subject,
                'body' => $body,
                'follow_up_days' => 30,
            ],
        ]);
    }
}
