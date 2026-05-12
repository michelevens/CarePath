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
        'facility_id', 'resident_id', 'author_name', 'author_relationship',
        'rating',
        'rating_cleanliness', 'rating_friendliness', 'rating_care',
        'rating_staff', 'rating_meals', 'rating_activities', 'rating_value',
        'title', 'body', 'is_verified', 'stay_started_at', 'is_published',
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
    ];

    public function facility(): BelongsTo
    {
        return $this->belongsTo(Facility::class);
    }

    public function resident(): BelongsTo
    {
        return $this->belongsTo(Resident::class);
    }
}
