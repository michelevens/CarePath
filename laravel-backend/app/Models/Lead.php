<?php

namespace App\Models;

use App\Models\Concerns\Auditable;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Lead extends Model
{
    use Auditable, HasUuids;

    public const SOURCES = [
        'cost_projection',
        'saved_search',
        'availability_alert',
        'newsletter',
        'guide_download',
        'other',
    ];

    public const STATUSES = ['new', 'contacted', 'converted', 'unsubscribed'];

    protected $fillable = [
        'facility_id',
        'admission_id',
        'source',
        'email',
        'phone',
        'name',
        'zip',
        'relationship_to_prospect',
        'notes',
        'context',
        'utm_source',
        'utm_medium',
        'utm_campaign',
        'referrer',
        'ip_address',
        'user_agent',
        'status',
        'contacted_at',
        'next_follow_up_at',
        'assigned_user_id',
    ];

    protected $casts = [
        'context' => 'array',
        'contacted_at' => 'datetime',
        'next_follow_up_at' => 'datetime',
    ];

    public function facility(): BelongsTo
    {
        return $this->belongsTo(Facility::class);
    }

    public function admission(): BelongsTo
    {
        return $this->belongsTo(Admission::class);
    }

    /**
     * Auto-fire LeadCreated on every persisted Lead. Listeners fan
     * it out to Resend Audiences (Layer 1 nurture) + the generic
     * outbound CRM webhook (Layer 3). Catches every capture path
     * (GuideController, MarketplaceController, etc) without each
     * one having to remember to dispatch.
     */
    protected static function booted(): void
    {
        static::created(function (Lead $lead) {
            \App\Events\LeadCreated::dispatch($lead);
        });
    }

    /**
     * Placements that closed the loop on this marketing Lead — the
     * actual move-ins our marketing touched. Usually 0 or 1 per lead.
     * Drives "did this campaign / guide / saved-search actually produce
     * revenue?" reporting.
     */
    public function placements(): HasMany
    {
        return $this->hasMany(Placement::class);
    }

    /**
     * Per-lead activity log (status changes, notes, emails, calls).
     * Append-only; drives the lead-management drawer in SuperAdmin.
     */
    public function activities(): HasMany
    {
        return $this->hasMany(LeadActivity::class)->orderByDesc('created_at');
    }

    public function assignedUser(): BelongsTo
    {
        return $this->belongsTo(\App\Models\User::class, 'assigned_user_id');
    }
}
