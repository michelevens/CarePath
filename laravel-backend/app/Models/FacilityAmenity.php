<?php

namespace App\Models;

use App\Models\Concerns\Auditable;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class FacilityAmenity extends Model
{
    use Auditable, HasUuids;

    public const CATEGORIES = [
        'healthcare', 'dining', 'room', 'community', 'activities', 'services',
    ];

    protected $fillable = [
        'facility_id', 'category', 'name', 'detail',
        'is_featured', 'is_active', 'sort_order',
    ];

    protected $casts = [
        'is_featured' => 'boolean',
        'is_active' => 'boolean',
        'sort_order' => 'integer',
    ];

    public function facility(): BelongsTo
    {
        return $this->belongsTo(Facility::class);
    }
}
