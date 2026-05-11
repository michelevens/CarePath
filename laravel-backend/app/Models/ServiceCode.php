<?php

namespace App\Models;

use App\Models\Concerns\Auditable;
use App\Models\Concerns\HasMasterAndCustom;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ServiceCode extends Model
{
    use Auditable, HasMasterAndCustom, HasUuids;

    protected $fillable = [
        'facility_id',
        'source',
        'code',
        'description',
        'unit_type',
        'default_unit_amount_cents',
        'is_active',
    ];

    protected $casts = [
        'default_unit_amount_cents' => 'decimal:2',
        'is_active' => 'boolean',
    ];

    public function facility(): BelongsTo
    {
        return $this->belongsTo(Facility::class);
    }
}
