<?php

namespace App\Listeners;

use App\Events\LeadCreated;
use App\Models\LeadActivity;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Auto-adds every new Lead to a Resend Audience scoped by source, so
 * drip campaigns can fire without manual list management. Layer 1 of
 * the lead-management plan.
 *
 * Configure audience IDs per source via env:
 *
 *   RESEND_API_KEY                       — required (already set for
 *                                          transactional mail)
 *   RESEND_AUDIENCE_GUIDE_DOWNLOAD       — UUID of Resend audience
 *                                          for guide downloaders
 *   RESEND_AUDIENCE_NEWSLETTER           — etc.
 *   RESEND_AUDIENCE_COST_PROJECTION
 *   RESEND_AUDIENCE_SAVED_SEARCH
 *   RESEND_AUDIENCE_AVAILABILITY_ALERT
 *   RESEND_AUDIENCE_OTHER
 *
 * Resend Audiences are a free product feature; create them at
 * resend.com/audiences and drop the IDs into Railway env. Listener
 * is a no-op if the audience for a given source is unset — so this
 * deploys safely without configuration.
 *
 * Queued (ShouldQueue) so a transient Resend outage doesn't slow
 * down the lead-capture request. Job is retried 3× by default.
 */
class SyncLeadToResendAudience implements ShouldQueue
{
    public string $queue = 'leads';
    public int $tries = 3;

    public function handle(LeadCreated $event): void
    {
        $lead = $event->lead;
        if (! $lead->email) return;

        $apiKey = config('services.resend.key') ?? env('RESEND_API_KEY');
        if (! $apiKey) return;

        $audienceId = $this->audienceFor($lead->source);
        if (! $audienceId) return;

        // Resend Audience contact create — POST contacts to a list.
        // Docs: resend.com/docs/api-reference/contacts/create-contact
        $resp = Http::withToken($apiKey)
            ->timeout(10)
            ->acceptJson()
            ->post("https://api.resend.com/audiences/{$audienceId}/contacts", [
                'email' => $lead->email,
                'first_name' => $this->firstName($lead->name),
                'last_name' => $this->lastName($lead->name),
                'unsubscribed' => false,
            ]);

        if ($resp->successful()) {
            LeadActivity::create([
                'lead_id' => $lead->id,
                'type' => 'resend_synced',
                'meta' => [
                    'audience_id' => $audienceId,
                    'contact_id' => $resp->json('id'),
                ],
            ]);
        } else {
            Log::warning('Resend audience sync failed', [
                'lead_id' => $lead->id,
                'audience_id' => $audienceId,
                'status' => $resp->status(),
                'body' => substr((string) $resp->body(), 0, 500),
            ]);
        }
    }

    private function audienceFor(?string $source): ?string
    {
        $map = [
            'guide_download' => env('RESEND_AUDIENCE_GUIDE_DOWNLOAD'),
            'newsletter' => env('RESEND_AUDIENCE_NEWSLETTER'),
            'cost_projection' => env('RESEND_AUDIENCE_COST_PROJECTION'),
            'saved_search' => env('RESEND_AUDIENCE_SAVED_SEARCH'),
            'availability_alert' => env('RESEND_AUDIENCE_AVAILABILITY_ALERT'),
            'other' => env('RESEND_AUDIENCE_OTHER'),
        ];
        return $map[$source] ?? null;
    }

    private function firstName(?string $full): ?string
    {
        if (! $full) return null;
        return trim(explode(' ', $full, 2)[0] ?? '') ?: null;
    }

    private function lastName(?string $full): ?string
    {
        if (! $full) return null;
        $parts = explode(' ', $full, 2);
        return isset($parts[1]) ? trim($parts[1]) : null;
    }
}
