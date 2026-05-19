<?php

namespace App\Events;

use App\Models\Lead;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

/**
 * Fires after a Lead row is persisted via any capture path. Listeners
 * fan it out to Resend Audiences (Layer 1 — automated nurture lists)
 * and to a generic outbound webhook (Layer 3 — CRM integration).
 *
 * Boot-time-bound in EventServiceProvider; queued listeners attach
 * automatically.
 */
class LeadCreated
{
    use Dispatchable, SerializesModels;

    public function __construct(public Lead $lead) {}
}
