<?php

namespace App\Models;

use App\Models\Concerns\Auditable;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * A/B-testable creative variant attached to a sponsored campaign.
 * When 0 active variants exist on a campaign, the renderer falls
 * back to facility name + default subtitle (legacy behavior).
 */
class SponsoredCreative extends Model
{
    use Auditable, HasUuids;

    protected $fillable = ['campaign_id', 'label', 'headline', 'body', 'is_active'];
    protected $casts = ['is_active' => 'boolean'];

    public function campaign(): BelongsTo
    {
        return $this->belongsTo(SponsoredCampaign::class);
    }
}
