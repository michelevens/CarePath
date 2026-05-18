<?php

namespace App\Models;

use App\Models\Concerns\Auditable;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class SponsoredCampaign extends Model
{
    use Auditable, HasUuids;

    public const STATUSES = ['draft', 'active', 'paused', 'depleted', 'ended'];
    public const SERVABLE_STATUSES = ['active'];

    protected $fillable = [
        'facility_id', 'name', 'status',
        'daily_budget_cents', 'total_budget_cents', 'cpc_bid_cents',
        'starts_on', 'ends_on',
        'target_states', 'target_cities',
        'exclude_states', 'exclude_types',
        'surface_bid_multipliers',
        'spent_today_cents', 'spent_total_cents', 'last_spend_reset_at',
    ];

    protected $casts = [
        'starts_on' => 'date',
        'ends_on' => 'date',
        'target_states' => 'array',
        'target_cities' => 'array',
        'exclude_states' => 'array',
        'exclude_types' => 'array',
        'surface_bid_multipliers' => 'array',
        'last_spend_reset_at' => 'datetime',
    ];

    /**
     * Effective CPC after applying the per-surface multiplier. Falls
     * back to the base bid when the multiplier isn't set or the
     * surface isn't in the map.
     */
    public function effectiveCpcCents(string $surface): int
    {
        $multipliers = $this->surface_bid_multipliers ?? [];
        $mult = isset($multipliers[$surface]) ? (float) $multipliers[$surface] : 1.0;
        $mult = max(0.1, min(3.0, $mult)); // clamp to a sensible range
        return (int) max(1, round($this->cpc_bid_cents * $mult));
    }

    public function facility(): BelongsTo
    {
        return $this->belongsTo(Facility::class);
    }

    public function impressions(): HasMany
    {
        return $this->hasMany(SponsoredImpression::class, 'campaign_id');
    }

    public function clicks(): HasMany
    {
        return $this->hasMany(SponsoredClick::class, 'campaign_id');
    }

    public function creatives(): HasMany
    {
        return $this->hasMany(SponsoredCreative::class, 'campaign_id');
    }

    /**
     * Can this campaign be shown right now? Considers status, date
     * window, and pacing budgets. The matching-against-the-current-
     * search check lives in SponsoredListingService, not here.
     */
    public function isServable(): bool
    {
        if (! in_array($this->status, self::SERVABLE_STATUSES, true)) {
            return false;
        }
        $today = now()->toDateString();
        if ($this->starts_on && $this->starts_on->toDateString() > $today) return false;
        if ($this->ends_on && $this->ends_on->toDateString() < $today) return false;
        // Pacing: don't show if next click would exceed today's budget.
        if ($this->spent_today_cents + $this->cpc_bid_cents > $this->daily_budget_cents) {
            return false;
        }
        if ($this->total_budget_cents && $this->spent_total_cents + $this->cpc_bid_cents > $this->total_budget_cents) {
            return false;
        }
        return true;
    }
}
