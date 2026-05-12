<?php

namespace App\Models;

use App\Models\Concerns\Auditable;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class CarePlanItem extends Model
{
    use Auditable, HasUuids;

    public const KINDS = ['goal', 'intervention'];

    public const CATEGORIES = [
        'adl',
        'mobility',
        'nutrition',
        'behavior',
        'safety',
        'meds',
        'wound',
        'psychosocial',
        'continence',
        'cognition',
    ];

    public const STATUSES = ['open', 'in_progress', 'met', 'discontinued'];

    public const FREQUENCIES = [
        'daily',
        'twice_daily',
        'tid',
        'qid',
        'weekly',
        'monthly',
        'prn',
    ];

    protected $fillable = [
        'care_plan_id',
        'parent_id',
        'kind',
        'category',
        'description',
        'status',
        'target_date',
        'frequency',
        'responsible_role',
        'completed_at',
        'sort_order',
    ];

    protected $casts = [
        'target_date' => 'date',
        'completed_at' => 'datetime',
        'sort_order' => 'integer',
    ];

    public function carePlan(): BelongsTo
    {
        return $this->belongsTo(CarePlan::class);
    }

    public function parent(): BelongsTo
    {
        return $this->belongsTo(self::class, 'parent_id');
    }

    public function children(): HasMany
    {
        return $this->hasMany(self::class, 'parent_id');
    }
}
