<?php

namespace App\Models;

use App\Models\Concerns\Auditable;
use App\Models\Concerns\HasMasterAndCustom;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DiagnosisCode extends Model
{
    use Auditable, HasMasterAndCustom, HasUuids;

    protected $fillable = [
        'facility_id',
        'source',
        'code',
        'description',
        'category',
        'is_chronic',
        'is_active',
    ];

    protected $casts = [
        'is_chronic' => 'boolean',
        'is_active' => 'boolean',
    ];

    public function facility(): BelongsTo
    {
        return $this->belongsTo(Facility::class);
    }
}
