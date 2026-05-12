<?php

namespace App\Models;

use App\Models\Concerns\Auditable;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MedicationAdministration extends Model
{
    use Auditable, HasUuids;

    public const STATUSES = ['given', 'refused', 'held', 'missed'];

    protected $fillable = [
        'facility_id',
        'medication_id',
        'resident_id',
        'administered_by_user_id',
        'administered_by_name',
        'administered_at',
        'status',
        'scheduled_time',
        'scheduled_date',
        'notes',
    ];

    protected $casts = [
        'administered_at' => 'datetime',
        'scheduled_date' => 'date',
    ];

    public function medication(): BelongsTo
    {
        return $this->belongsTo(Medication::class);
    }

    public function resident(): BelongsTo
    {
        return $this->belongsTo(Resident::class);
    }
}
