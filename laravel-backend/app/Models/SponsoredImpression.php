<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Big-Int id (not UUID) — this table is high-volume and we never
 * expose individual impression rows publicly.
 */
class SponsoredImpression extends Model
{
    public $timestamps = false; // we set shown_at via DEFAULT CURRENT_TIMESTAMP

    protected $fillable = [
        'campaign_id', 'facility_id',
        'session_id', 'search_context',
        'was_clicked', 'shown_at',
    ];

    protected $casts = [
        'search_context' => 'array',
        'was_clicked' => 'boolean',
        'shown_at' => 'datetime',
    ];

    public function campaign(): BelongsTo
    {
        return $this->belongsTo(SponsoredCampaign::class, 'campaign_id');
    }

    public function facility(): BelongsTo
    {
        return $this->belongsTo(Facility::class);
    }
}
