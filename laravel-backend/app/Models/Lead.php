<?php

namespace App\Models;

use App\Models\Concerns\Auditable;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Lead extends Model
{
    use Auditable, HasUuids;

    public const SOURCES = [
        'cost_projection',
        'saved_search',
        'availability_alert',
        'newsletter',
        'guide_download',
        'other',
    ];

    public const STATUSES = ['new', 'contacted', 'converted', 'unsubscribed'];

    protected $fillable = [
        'facility_id',
        'admission_id',
        'source',
        'email',
        'phone',
        'name',
        'zip',
        'relationship_to_prospect',
        'context',
        'utm_source',
        'utm_medium',
        'utm_campaign',
        'referrer',
        'ip_address',
        'user_agent',
        'status',
        'contacted_at',
    ];

    protected $casts = [
        'context' => 'array',
        'contacted_at' => 'datetime',
    ];

    public function facility(): BelongsTo
    {
        return $this->belongsTo(Facility::class);
    }

    public function admission(): BelongsTo
    {
        return $this->belongsTo(Admission::class);
    }

    /**
     * Placements that closed the loop on this marketing Lead — the
     * actual move-ins our marketing touched. Usually 0 or 1 per lead.
     * Drives "did this campaign / guide / saved-search actually produce
     * revenue?" reporting.
     */
    public function placements(): HasMany
    {
        return $this->hasMany(Placement::class);
    }
}
