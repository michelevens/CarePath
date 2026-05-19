<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Append-only audit trail of every meaningful thing that happened to
 * a Lead — status changes, manual notes, outbound emails fired,
 * calls logged, follow-up dates set, downstream webhook fires.
 *
 * Drives the per-lead activity timeline. Distinct from the global
 * AuditLog (which records DB writes generically); LeadActivity is
 * user-facing in the lead-management drawer.
 *
 * Types currently in use:
 *   status_change   — meta: { from: 'new', to: 'contacted' }
 *   note            — body: free-form text
 *   email_sent      — meta: { template: 'follow-up-1', subject }
 *   call_logged     — body: notes; meta: { duration_min }
 *   followup_set    — meta: { at: <iso8601> }
 *   webhook_sent    — meta: { url, status_code }
 *   resend_synced   — meta: { audience_id, contact_id }
 */
class LeadActivity extends Model
{
    use HasUuids;

    protected $fillable = [
        'lead_id',
        'type',
        'actor_user_id',
        'body',
        'meta',
    ];

    protected $casts = [
        'meta' => 'array',
    ];

    public function lead(): BelongsTo
    {
        return $this->belongsTo(Lead::class);
    }

    public function actor(): BelongsTo
    {
        return $this->belongsTo(\App\Models\User::class, 'actor_user_id');
    }
}
