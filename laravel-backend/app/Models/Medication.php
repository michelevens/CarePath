<?php

namespace App\Models;

use App\Models\Concerns\Auditable;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Medication extends Model
{
    use Auditable, HasUuids;

    public const ROUTES = ['PO', 'SL', 'IM', 'SC', 'IV', 'top', 'inh', 'pr', 'ophth'];

    public const FREQUENCIES = [
        'QD', 'BID', 'TID', 'QID', 'QHS', 'QAM', 'Q4H', 'Q6H', 'Q8H', 'Q12H',
        'PRN', 'weekly', 'monthly',
    ];

    protected $fillable = [
        'facility_id',
        'resident_id',
        'name',
        'dose',
        'route',
        'frequency',
        'schedule_times',
        'indication',
        'prescriber',
        'start_date',
        'stop_date',
        'is_prn',
        'is_active',
        'notes',
    ];

    protected $casts = [
        'schedule_times' => 'array',
        'start_date' => 'date',
        'stop_date' => 'date',
        'is_prn' => 'boolean',
        'is_active' => 'boolean',
    ];

    public function resident(): BelongsTo
    {
        return $this->belongsTo(Resident::class);
    }

    public function administrations(): HasMany
    {
        return $this->hasMany(MedicationAdministration::class);
    }
}
