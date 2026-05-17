<?php

namespace App\Models;

use App\Models\Concerns\Auditable;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * A persisted saved search the user wants alerts on. Drives the
 * SavedSearchAlertsCommand artisan task.
 */
class SavedSearch extends Model
{
    use Auditable, HasUuids;

    protected $fillable = [
        'user_id',
        'name',
        'params',
        'alerts_push',
        'alerts_email',
        'last_seen_facility_ids',
        'last_run_at',
        'last_alerted_at',
        'total_alerts_sent',
    ];

    protected $casts = [
        'params' => 'array',
        'alerts_push' => 'boolean',
        'alerts_email' => 'boolean',
        'last_seen_facility_ids' => 'array',
        'last_run_at' => 'datetime',
        'last_alerted_at' => 'datetime',
        'total_alerts_sent' => 'integer',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
