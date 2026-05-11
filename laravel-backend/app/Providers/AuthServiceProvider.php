<?php

namespace App\Providers;

use App\Models\AuditLog;
use App\Models\Bed;
use App\Models\Facility;
use App\Models\Resident;
use App\Policies\AuditLogPolicy;
use App\Policies\BedPolicy;
use App\Policies\FacilityPolicy;
use App\Policies\ResidentPolicy;
use Illuminate\Foundation\Support\Providers\AuthServiceProvider as ServiceProvider;

class AuthServiceProvider extends ServiceProvider
{
    /**
     * @var array<class-string, class-string>
     */
    protected $policies = [
        Facility::class => FacilityPolicy::class,
        Resident::class => ResidentPolicy::class,
        Bed::class => BedPolicy::class,
        AuditLog::class => AuditLogPolicy::class,
    ];

    public function boot(): void
    {
        $this->registerPolicies();
    }
}
