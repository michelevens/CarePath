<?php

namespace App\Models;

use App\Models\Concerns\Auditable;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Tour extends Model
{
    use Auditable, HasUuids;

    public const TOUR_TYPES = ['in_person', 'virtual', 'self_guided'];
    public const STATUSES = ['confirmed', 'rescheduled', 'completed', 'no_show', 'cancelled'];

    protected $fillable = [
        'facility_id',
        'admission_id',
        'starts_at',
        'duration_minutes',
        'tour_type',
        'meeting_url',
        'attendee_name',
        'attendee_email',
        'attendee_phone',
        'relationship_to_prospect',
        'prospect_first_name',
        'prospect_last_name',
        'prospect_level_of_care',
        'status',
        'notes',
        'cancellation_reason',
        'reminded_24h_at',
        'reminded_2h_at',
    ];

    protected $casts = [
        'starts_at' => 'datetime',
        'duration_minutes' => 'integer',
        'reminded_24h_at' => 'datetime',
        'reminded_2h_at' => 'datetime',
    ];

    public function facility(): BelongsTo
    {
        return $this->belongsTo(Facility::class);
    }

    public function admission(): BelongsTo
    {
        return $this->belongsTo(Admission::class);
    }
}
