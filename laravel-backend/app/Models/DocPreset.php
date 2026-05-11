<?php

namespace App\Models;

use App\Models\Concerns\Auditable;
use App\Models\Concerns\HasMasterAndCustom;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DocPreset extends Model
{
    use Auditable, HasMasterAndCustom, HasUuids;

    protected $fillable = [
        'facility_id',
        'source',
        'code',
        'name',
        'category',
        'description',
        'requires_signature',
        'is_active',
    ];

    protected $casts = [
        'requires_signature' => 'boolean',
        'is_active' => 'boolean',
    ];

    public function facility(): BelongsTo
    {
        return $this->belongsTo(Facility::class);
    }
}
