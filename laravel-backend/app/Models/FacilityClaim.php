<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class FacilityClaim extends Model
{
    use HasUuids;

    public const STATUSES = ['pending', 'approved', 'rejected', 'withdrawn'];

    protected $fillable = [
        'facility_id', 'user_id',
        'claimer_name', 'claimer_title', 'claimer_email', 'claimer_phone',
        'supporting_notes',
        'status', 'reviewed_by_user_id', 'reviewed_at', 'decision_notes',
    ];

    protected $casts = [
        'reviewed_at' => 'datetime',
    ];

    public function facility(): BelongsTo
    {
        return $this->belongsTo(Facility::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function reviewer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewed_by_user_id');
    }

    /**
     * Cheap "looks plausible" signal — does the claimant's email
     * domain match the facility's website domain? Surfaces in the
     * review UI but isn't auto-approved (trivially spoofable).
     */
    public function emailDomainMatchesFacility(): ?bool
    {
        if (! $this->facility?->website) return null;
        $facilityHost = parse_url($this->facility->website, PHP_URL_HOST);
        if (! $facilityHost) return null;
        $facilityHost = strtolower(preg_replace('/^www\./', '', $facilityHost));

        $emailDomain = strtolower(substr(strrchr($this->claimer_email, '@') ?: '', 1));
        if (! $emailDomain) return null;

        // Match if either equals the other or is a subdomain.
        return $emailDomain === $facilityHost
            || str_ends_with($emailDomain, '.' . $facilityHost)
            || str_ends_with($facilityHost, '.' . $emailDomain);
    }
}
