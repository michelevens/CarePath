<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class CmsFTag extends Model
{
    use HasUuids;

    protected $table = 'cms_f_tags';

    protected $fillable = [
        'code',
        'title',
        'description',
        'category',
        'severity_max',
        'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];
}
