<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\MorphTo;
use RuntimeException;

/**
 * Immutable, polymorphic audit log. Modeled after ClinicLink's AuditLog.
 *
 * Records are append-only — updates and deletes are forbidden at the model
 * layer. Sensitive fields are expected to be masked by the writer before
 * being persisted (see config/audit.php for the masked-field allowlist).
 */
class AuditLog extends Model
{
    use HasUuids;

    public $timestamps = false;

    protected $fillable = [
        'facility_id',
        'user_id',
        'action', // created | updated | deleted | viewed | exported
        'auditable_type',
        'auditable_id',
        'before',
        'after',
        'ip_address',
        'user_agent',
        'occurred_at',
    ];

    protected $casts = [
        'before' => 'array',
        'after' => 'array',
        'occurred_at' => 'datetime',
    ];

    protected static function booted(): void
    {
        static::updating(function () {
            throw new RuntimeException('AuditLog records are immutable.');
        });

        static::deleting(function () {
            throw new RuntimeException('AuditLog records cannot be deleted.');
        });
    }

    public function auditable(): MorphTo
    {
        return $this->morphTo();
    }
}
