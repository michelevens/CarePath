<?php

namespace App\Models;

use App\Models\Concerns\Auditable;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Facility extends Model
{
    use Auditable, HasFactory, HasUuids;

    protected $fillable = [
        'name',
        'slug',
        'type', // snf | assisted_living | memory_care | ccrc
        'address_line_1',
        'address_line_2',
        'city',
        'state',
        'zip',
        'phone',
        'email',
        'website',
        'medicaid_certified',
        'medicare_certified',
        'cms_five_star_overall',
        'cms_five_star_health_inspection',
        'cms_five_star_staffing',
        'cms_five_star_quality',
        'total_beds',
        'price_from_cents',
        'is_active',
    ];

    protected $casts = [
        'medicaid_certified' => 'boolean',
        'medicare_certified' => 'boolean',
        'is_active' => 'boolean',
    ];

    public function beds(): HasMany
    {
        return $this->hasMany(Bed::class);
    }

    public function residents(): HasMany
    {
        return $this->hasMany(Resident::class);
    }

    public function users(): BelongsToMany
    {
        return $this->belongsToMany(User::class)->withPivot('role');
    }
}
