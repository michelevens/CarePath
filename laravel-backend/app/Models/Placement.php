<?php

namespace App\Models;

use App\Models\Concerns\Auditable;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * One row per successful (or attempted) placement we facilitated.
 *
 * Lifecycle:
 *   pending → confirmed (after rescission window) → retained_30d
 *           → retained_90d → paid_in_full
 *   Any state can transition to: rescinded | disputed
 *
 * Money is structured around a retention-based payout schedule:
 *   - 70% of advisor_payout released at `retained_30d`
 *   - 30% released at `retained_90d`
 * This aligns CarePath + advisor incentives with families' actual
 * outcomes, vs. APFM's pay-on-admission model which rewards any
 * placement regardless of fit.
 */
class Placement extends Model
{
    use Auditable, HasUuids;

    public const STATUSES = [
        'pending', 'confirmed',
        'retained_30d', 'retained_90d',
        'paid_in_full',
        'rescinded', 'disputed',
    ];

    public const ATTRIBUTION_SOURCES = [
        'marketplace',     // family found via /search
        'advisor_link',    // advisor's branded landing page
        'hospital_widget', // embedded discharge-planning widget
        'direct',          // family came directly to facility page
        'manual',          // entered by ops
    ];

    protected $fillable = [
        'facility_id', 'admission_id', 'advisor_user_id', 'resident_id',
        'lead_id', 'sponsored_click_id',
        'gross_fee_cents', 'platform_fee_cents', 'advisor_payout_cents',
        'platform_split_pct', 'currency',
        'status',
        'admitted_on', 'rescission_window_ends_on',
        'retention_30d_milestone_on', 'retention_90d_milestone_on',
        'confirmed_on', 'rescinded_on',
        'stripe_transfer_id', 'paid_at', 'amount_paid_cents',
        'attribution_source', 'attribution_context',
        'notes',
    ];

    protected $casts = [
        'attribution_context' => 'array',
        'admitted_on' => 'date',
        'rescission_window_ends_on' => 'date',
        'retention_30d_milestone_on' => 'date',
        'retention_90d_milestone_on' => 'date',
        'confirmed_on' => 'date',
        'rescinded_on' => 'date',
        'paid_at' => 'datetime',
    ];

    public function facility(): BelongsTo
    {
        return $this->belongsTo(Facility::class);
    }

    public function admission(): BelongsTo
    {
        return $this->belongsTo(Admission::class);
    }

    public function advisor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'advisor_user_id');
    }

    public function resident(): BelongsTo
    {
        return $this->belongsTo(Resident::class);
    }

    /**
     * The marketing Lead that originated this placement (guide download,
     * cost projection, saved-search alert, etc), if any. Most placements
     * come from direct tour requests with no Lead in the middle, but a
     * non-null lead_id closes the loop on marketing ROI.
     */
    public function lead(): BelongsTo
    {
        return $this->belongsTo(Lead::class);
    }

    /**
     * The sponsored-ad click attributed to this placement (if the family
     * touched a sponsored placement within the attribution window). FK
     * to sponsored_clicks lets the campaign-detail page compute true
     * ROAS as actual placement revenue, not just click counts.
     */
    public function sponsoredClick(): BelongsTo
    {
        return $this->belongsTo(SponsoredClick::class);
    }
}
