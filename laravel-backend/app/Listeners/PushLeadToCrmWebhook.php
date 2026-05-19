<?php

namespace App\Listeners;

use App\Events\LeadCreated;
use App\Models\LeadActivity;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Generic outbound webhook for every new Lead. Layer 3 of the lead-
 * management plan — designed to drop into HubSpot, Pipedrive, Close,
 * Zapier, n8n, Make.com, or any custom CRM the team picks later,
 * without code changes.
 *
 * Configure via env:
 *
 *   CRM_WEBHOOK_URL      — POST target (HTTPS recommended)
 *   CRM_WEBHOOK_SECRET   — optional; sent as X-CarePath-Signature
 *                          (HMAC-SHA256 of the body) so the receiver
 *                          can verify authenticity
 *
 * The payload is a flat JSON object with every captured field:
 *
 *   {
 *     id, source, status, email, phone, name, zip,
 *     relationship_to_prospect, utm_source, utm_medium, utm_campaign,
 *     referrer, facility_id, created_at, context: { ... }
 *   }
 *
 * Queued (ShouldQueue) — a slow CRM doesn't slow down lead capture.
 * No-op when CRM_WEBHOOK_URL is unset.
 */
class PushLeadToCrmWebhook implements ShouldQueue
{
    public string $queue = 'leads';
    public int $tries = 3;

    public function handle(LeadCreated $event): void
    {
        $url = env('CRM_WEBHOOK_URL');
        if (! $url) return;

        $lead = $event->lead->fresh()->load('facility:id,name,slug');

        $payload = [
            'id' => $lead->id,
            'source' => $lead->source,
            'status' => $lead->status,
            'email' => $lead->email,
            'phone' => $lead->phone,
            'name' => $lead->name,
            'zip' => $lead->zip,
            'relationship_to_prospect' => $lead->relationship_to_prospect,
            'utm_source' => $lead->utm_source,
            'utm_medium' => $lead->utm_medium,
            'utm_campaign' => $lead->utm_campaign,
            'referrer' => $lead->referrer,
            'facility_id' => $lead->facility_id,
            'facility_slug' => $lead->facility?->slug,
            'facility_name' => $lead->facility?->name,
            'context' => $lead->context,
            'created_at' => $lead->created_at?->toIso8601String(),
        ];

        $body = json_encode($payload, JSON_UNESCAPED_SLASHES);
        $headers = ['Content-Type' => 'application/json'];

        $secret = env('CRM_WEBHOOK_SECRET');
        if ($secret) {
            $headers['X-CarePath-Signature'] = hash_hmac('sha256', $body, $secret);
        }

        $resp = Http::withHeaders($headers)
            ->timeout(15)
            ->withBody($body, 'application/json')
            ->post($url);

        LeadActivity::create([
            'lead_id' => $lead->id,
            'type' => 'webhook_sent',
            'meta' => [
                'url' => $url,
                'status_code' => $resp->status(),
                'ok' => $resp->successful(),
            ],
        ]);

        if (! $resp->successful()) {
            Log::warning('CRM webhook non-2xx', [
                'lead_id' => $lead->id,
                'status' => $resp->status(),
                'body' => substr((string) $resp->body(), 0, 500),
            ]);
        }
    }
}
