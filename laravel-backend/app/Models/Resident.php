<?php

namespace App\Models;

use App\Models\Concerns\Auditable;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Resident extends Model
{
    use Auditable, HasFactory, HasUuids;

    protected $fillable = [
        'facility_id',
        'first_name',
        'last_name',
        'date_of_birth',
        'admission_date',
        'discharge_date',
        'level_of_care',
        'primary_payer', // medicaid | medicare | private_pay | ltc_insurance | va
        'mrn', // medical record number
        'status', // active | discharged | deceased
        'notes',
    ];

    protected $casts = [
        'date_of_birth' => 'date',
        'admission_date' => 'date',
        'discharge_date' => 'date',
    ];

    public function facility(): BelongsTo
    {
        return $this->belongsTo(Facility::class);
    }

    public function bed(): HasOne
    {
        return $this->hasOne(Bed::class);
    }

    public function carePlan(): HasOne
    {
        return $this->hasOne(CarePlan::class);
    }

    public function carePlans(): HasMany
    {
        return $this->hasMany(CarePlan::class);
    }

    public function medications(): HasMany
    {
        return $this->hasMany(Medication::class);
    }

    public function medicationAdministrations(): HasMany
    {
        return $this->hasMany(MedicationAdministration::class);
    }
}
