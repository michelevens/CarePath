<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PublicRecordsRequest extends Model
{
    use HasUuids;

    protected $fillable = [
        'source_key', 'contact_email', 'subject', 'body',
        'filed_at', 'follow_up_on', 'response_received_at',
        'notes', 'filed_by_user_id',
    ];

    protected $casts = [
        'filed_at' => 'datetime',
        'follow_up_on' => 'date',
        'response_received_at' => 'datetime',
    ];

    public function source(): ?DataSourceSchema
    {
        return DataSourceSchema::where('source_key', $this->source_key)->first();
    }

    public function filedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'filed_by_user_id');
    }

    public function isOpen(): bool
    {
        return $this->response_received_at === null;
    }

    public function isOverdue(): bool
    {
        return $this->isOpen() && $this->follow_up_on?->isPast();
    }
}
