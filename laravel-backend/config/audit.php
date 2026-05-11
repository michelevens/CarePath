<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Masked fields
    |--------------------------------------------------------------------------
    | Field names that must never appear in audit_logs.before / .after JSON.
    | The Auditable trait strips these from both halves before persisting.
    */

    'masked_fields' => [
        'password',
        'remember_token',
        'two_factor_secret',
        'two_factor_recovery_codes',
        'two_factor_confirmed_at',
    ],

    /*
    |--------------------------------------------------------------------------
    | Action allowlist
    |--------------------------------------------------------------------------
    | Free-form for now — the trait writes 'created' | 'updated' | 'deleted'
    | automatically. Application code may also write 'viewed', 'exported',
    | 'logged_in', etc. via AuditLog::create() directly.
    */

    'actions' => [
        'created', 'updated', 'deleted',
        'viewed', 'exported',
        'logged_in', 'logged_out',
        'role_assigned', 'role_revoked',
    ],

];
