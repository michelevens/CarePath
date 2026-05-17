<?php

namespace App\Models;

use App\Models\Concerns\Auditable;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class FacilityReview extends Model
{
    use Auditable, HasUuids;

    protected $fillable = [
        'facility_id', 'resident_id', 'user_id', 'verified_via_admission_id',
        'author_name', 'author_relationship',
        'rating',
        'rating_cleanliness', 'rating_friendliness', 'rating_care',
        'rating_staff', 'rating_meals', 'rating_activities', 'rating_value',
        'title', 'body', 'photos',
        'is_verified', 'stay_started_at', 'is_published',
        'facility_response', 'facility_response_by_user_id', 'facility_responded_at',
        'helpful_count', 'moderation_status', 'moderation_notes',
    ];

    protected $casts = [
        'rating' => 'integer',
        'rating_cleanliness' => 'integer',
        'rating_friendliness' => 'integer',
        'rating_care' => 'integer',
        'rating_staff' => 'integer',
        'rating_meals' => 'integer',
        'rating_activities' => 'integer',
        'rating_value' => 'integer',
        'is_verified' => 'boolean',
        'is_published' => 'boolean',
        'stay_started_at' => 'date',
        'photos' => 'array',
        'facility_responded_at' => 'datetime',
        'helpful_count' => 'integer',
    ];

    public function facility(): BelongsTo
    {
        return $this->belongsTo(Facility::class);
    }

    public function resident(): BelongsTo
    {
        return $this->belongsTo(Resident::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function admission(): BelongsTo
    {
        return $this->belongsTo(Admission::class, 'verified_via_admission_id');
    }

    public function facilityResponder(): BelongsTo
    {
        return $this->belongsTo(User::class, 'facility_response_by_user_id');
    }
}
