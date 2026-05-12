<?php

namespace App\Models;

use App\Models\Concerns\Auditable;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Bed extends Model
{
    use Auditable, HasFactory, HasUuids;

    protected $fillable = [
        'facility_id',
        'room_number',
        'bed_label', // e.g. "A", "B" for shared rooms
        'floor',
        'unit',
        'level_of_care', // skilled | assisted | memory
        'status', // available | reserved | occupied | offline | isolation
        'notes',
        'resident_id',
    ];

    public function facility(): BelongsTo
    {
        return $this->belongsTo(Facility::class);
    }

    public function resident(): BelongsTo
    {
        return $this->belongsTo(Resident::class);
    }
}
