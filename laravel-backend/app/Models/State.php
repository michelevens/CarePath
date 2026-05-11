<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class State extends Model
{
    use HasUuids;

    protected $fillable = [
        'code',
        'name',
        'ombudsman_phone',
        'ombudsman_email',
        'regulator_name',
        'regulator_url',
        'notes',
        'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];
}
