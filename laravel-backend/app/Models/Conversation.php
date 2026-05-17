<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Conversation extends Model
{
    use HasUuids;

    protected $fillable = [
        'subject', 'is_broadcast', 'facility_id',
        'started_by_user_id', 'last_message_at',
    ];

    protected $casts = [
        'is_broadcast' => 'boolean',
        'last_message_at' => 'datetime',
    ];

    public function facility(): BelongsTo
    {
        return $this->belongsTo(Facility::class);
    }

    public function startedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'started_by_user_id');
    }

    public function participants(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'conversation_participants')
            ->withPivot('last_read_at', 'left_at')
            ->withTimestamps();
    }

    public function messages(): HasMany
    {
        return $this->hasMany(Message::class)->orderBy('sent_at');
    }

    public function latestMessage(): HasMany
    {
        return $this->hasMany(Message::class)->latest('sent_at')->limit(1);
    }
}
