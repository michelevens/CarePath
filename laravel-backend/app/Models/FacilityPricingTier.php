<?php

namespace App\Models;

use App\Models\Concerns\Auditable;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class FacilityPricingTier extends Model
{
    use Auditable, HasUuids;

    public const TYPES = ['base', 'level_adder', 'ancillary', 'community_fee'];
    public const CADENCES = ['monthly', 'one_time', 'per_visit'];

    protected $fillable = [
        'facility_id', 'tier_type', 'name', 'level_of_care', 'amount_cents',
        'billing_cadence', 'notes', 'is_active', 'sort_order',
    ];

    protected $casts = [
        'amount_cents' => 'integer',
        'sort_order' => 'integer',
        'is_active' => 'boolean',
    ];

    public function facility(): BelongsTo
    {
        return $this->belongsTo(Facility::class);
    }
}
