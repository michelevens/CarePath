<?php

namespace App\Models;

use App\Models\Concerns\Auditable;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class CarePlan extends Model
{
    use Auditable, HasUuids;

    public const STATUSES = ['draft', 'active', 'on_hold', 'archived'];

    protected $fillable = [
        'facility_id',
        'resident_id',
        'status',
        'started_at',
        'signed_at',
        'signed_by_user_id',
        'signed_by_name',
        'summary',
    ];

    protected $casts = [
        'started_at' => 'date',
        'signed_at' => 'datetime',
    ];

    public function facility(): BelongsTo
    {
        return $this->belongsTo(Facility::class);
    }

    public function resident(): BelongsTo
    {
        return $this->belongsTo(Resident::class);
    }

    public function items(): HasMany
    {
        return $this->hasMany(CarePlanItem::class)->orderBy('sort_order');
    }

    public function isSigned(): bool
    {
        return $this->signed_at !== null;
    }
}
