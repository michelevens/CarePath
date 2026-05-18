<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SponsoredClick extends Model
{
    public $timestamps = false;

    protected $fillable = [
        'campaign_id', 'creative_id', 'facility_id',
        'session_id', 'billed_cents',
        'ip_address', 'user_agent',
        'clicked_at',
        'converted_at', 'converted_to', 'attributed_value_cents',
    ];

    protected $casts = [
        'clicked_at' => 'datetime',
        'converted_at' => 'datetime',
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
