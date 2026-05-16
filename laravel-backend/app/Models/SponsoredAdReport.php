<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SponsoredAdReport extends Model
{
    use HasUuids;

    public const REASONS = ['misleading', 'wrong_location', 'low_quality', 'off_policy', 'other'];
    public const STATUSES = ['open', 'reviewing', 'dismissed', 'actioned'];
    public const ACTIONS = ['warning_sent', 'campaign_paused', 'campaign_ended', 'no_action'];

    protected $fillable = [
        'campaign_id', 'facility_id',
        'user_id', 'session_id', 'ip_address',
        'reason', 'notes',
        'status', 'resolution_action', 'resolution_notes',
        'resolved_by_user_id', 'resolved_at',
    ];

    protected $casts = [
        'resolved_at' => 'datetime',
    ];

    public function campaign(): BelongsTo
    {
        return $this->belongsTo(SponsoredCampaign::class);
    }

    public function facility(): BelongsTo
    {
        return $this->belongsTo(Facility::class);
    }
}
