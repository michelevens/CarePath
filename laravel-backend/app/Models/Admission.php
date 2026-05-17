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
        'family_events',
    ];

    protected $casts = [
        'prospect_dob' => 'date',
        'target_admit_date' => 'date',
        'stage_changed_at' => 'datetime',
        'family_events' => 'array',
    ];

    /**
     * Append a curated milestone the family is allowed to see. Distinct
     * from the AuditLog (internal field history) — this populates the
     * /family/placements/:id timeline directly.
     *
     * Idempotent on (key, stage) within a 24h window so accidental
     * double-triggers (e.g. transition fires twice) don't double up.
     */
    public function recordFamilyEvent(string $key, string $label, ?string $note = null, ?string $stageOverride = null): void
    {
        $events = $this->family_events ?? [];
        $now = now()->toIso8601String();
        $stage = $stageOverride ?? $this->stage;

        // Idempotency: same key + stage within the last day = no-op.
        foreach ($events as $e) {
            if (($e['key'] ?? null) === $key
                && ($e['stage'] ?? null) === $stage
                && isset($e['occurred_at'])
                && now()->diffInHours($e['occurred_at']) < 24) {
                return;
            }
        }

        $events[] = array_filter([
            'key' => $key,
            'label' => $label,
            'occurred_at' => $now,
            'stage' => $stage,
            'note' => $note,
        ]);

        $this->family_events = $events;
        $this->save();
    }

    /**
     * Auto-emit a family-visible event whenever the stage column changes
     * (the inbound `inquiry` row already gets a synthesized event via
     * the controller that creates it / the migration backfill). This
     * keeps writers from having to remember to call recordFamilyEvent
     * everywhere stage moves — admins clicking through the kanban or
     * a Hospital partner submitting an admit all end up in one place.
     */
    protected static function booted(): void
    {
        static::updating(function (Admission $a) {
            if (! $a->isDirty('stage')) return;
            $newStage = $a->stage;
            $label = \App\Http\Controllers\Family\PlacementController::canonicalMilestones()[$newStage] ?? null;
            if (! $label) return;

            $events = $a->family_events ?? [];
            // Dedupe: same stage already recorded? skip.
            if (collect($events)->contains(fn ($e) => ($e['stage'] ?? null) === $newStage)) return;

            $events[] = [
                'key' => $newStage,
                'label' => $label,
                'occurred_at' => now()->toIso8601String(),
                'stage' => $newStage,
            ];
            $a->family_events = $events;
        });
    }

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
