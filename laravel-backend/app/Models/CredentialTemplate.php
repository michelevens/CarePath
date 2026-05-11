<?php

namespace App\Models;

use App\Models\Concerns\Auditable;
use App\Models\Concerns\HasMasterAndCustom;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CredentialTemplate extends Model
{
    use Auditable, HasMasterAndCustom, HasUuids;

    protected $fillable = [
        'facility_id',
        'source',
        'code',
        'name',
        'description',
        'renewal_months',
        'requires_state_license',
        'is_active',
    ];

    protected $casts = [
        'renewal_months' => 'integer',
        'requires_state_license' => 'boolean',
        'is_active' => 'boolean',
    ];

    public function facility(): BelongsTo
    {
        return $this->belongsTo(Facility::class);
    }
}
