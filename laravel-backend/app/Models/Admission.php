<?php

namespace App\Models;

use App\Models\Concerns\Auditable;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Admission extends Model
{
    use Auditable, HasUuids;

    public const STAGES = [
        'inquiry',
        'tour_scheduled',
        'toured',
        'assessment',
        'approved',
        'admitted',
        'declined',
        'withdrew',
    ];

    protected $fillable = [
        'facility_id',
        'stage',
        'inquirer_name',
        'inquirer_phone',
        'inquirer_email',
        'inquirer_relationship',
        'prospect_first_name',
        'prospect_last_name',
        'prospect_dob',
        'prospect_level_of_care',
        'prospect_primary_payer',
        'target_admit_date',
        'assigned_user_id',
        'notes',
        'stage_changed_at',
        'resident_id',
        'bed_id',
    ];

    protected $casts = [
        'prospect_dob' => 'date',
        'target_admit_date' => 'date',
        'stage_changed_at' => 'datetime',
    ];

    public function facility(): BelongsTo
    {
        return $this->belongsTo(Facility::class);
    }

    public function resident(): BelongsTo
    {
        return $this->belongsTo(Resident::class);
    }

    public function bed(): BelongsTo
    {
        return $this->belongsTo(Bed::class);
    }

    public function assignee(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_user_id');
    }
}
