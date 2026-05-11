<?php

namespace App\Models\Concerns;

use App\Models\AuditLog;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Auth;

/**
 * Auto-write an immutable AuditLog row on every create / update / delete.
 *
 * - `before` and `after` JSON contain only the changed columns on update
 *   (full row on create, full row on delete) — not the entire model.
 * - Masked fields (password, secrets, recovery codes) are stripped before
 *   persisting; see config/audit.php.
 * - `facility_id` is auto-extracted from the model when present so audit
 *   queries can be scoped per facility without an extra join.
 *
 * @mixin Model
 */
trait Auditable
{
    public static function bootAuditable(): void
    {
        static::created(function (Model $model): void {
            $model->writeAuditLog(
                action: 'created',
                before: null,
                after: $model->getAttributes(),
            );
        });

        static::updated(function (Model $model): void {
            $changes = $model->getChanges();
            if (empty($changes)) {
                return;
            }
            // Skip pure timestamp-only updates — they're noise.
            $meaningful = array_diff_key($changes, array_flip(['updated_at']));
            if (empty($meaningful)) {
                return;
            }

            $beforeKeys = array_intersect_key(
                $model->getOriginal(),
                $meaningful,
            );

            $model->writeAuditLog(
                action: 'updated',
                before: $beforeKeys,
                after: $meaningful,
            );
        });

        static::deleted(function (Model $model): void {
            $model->writeAuditLog(
                action: 'deleted',
                before: $model->getOriginal(),
                after: null,
            );
        });
    }

    public function writeAuditLog(string $action, ?array $before, ?array $after): void
    {
        if (static::class === AuditLog::class) {
            return; // never audit the audit log itself
        }

        $masked = config('audit.masked_fields', []);

        AuditLog::create([
            'facility_id' => $this->getAttribute('facility_id'),
            'user_id' => Auth::id(),
            'action' => $action,
            'auditable_type' => static::class,
            'auditable_id' => (string) $this->getKey(),
            'before' => $before ? $this->stripMasked($before, $masked) : null,
            'after' => $after ? $this->stripMasked($after, $masked) : null,
            'ip_address' => request()?->ip(),
            'user_agent' => substr((string) request()?->userAgent(), 0, 1000) ?: null,
            'occurred_at' => now(),
        ]);
    }

    /**
     * @param  array<string, mixed>  $attributes
     * @param  array<int, string>  $masked
     * @return array<string, mixed>
     */
    private function stripMasked(array $attributes, array $masked): array
    {
        foreach ($masked as $field) {
            if (array_key_exists($field, $attributes)) {
                $attributes[$field] = '[masked]';
            }
        }

        return $attributes;
    }
}
