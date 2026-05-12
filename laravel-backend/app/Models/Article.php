<?php

namespace App\Models;

use App\Models\Concerns\Auditable;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class Article extends Model
{
    use Auditable, HasUuids;

    public const CATEGORIES = [
        'care_basics', 'medicare', 'medicaid', 'va',
        'dementia', 'transition', 'financial', 'legal',
    ];

    protected $fillable = [
        'slug', 'title', 'subtitle', 'hero_image_url', 'category', 'tags',
        'summary', 'body', 'author_name', 'author_title',
        'reading_time_minutes', 'is_featured', 'is_published', 'published_at',
    ];

    protected $casts = [
        'tags' => 'array',
        'is_featured' => 'boolean',
        'is_published' => 'boolean',
        'published_at' => 'datetime',
        'reading_time_minutes' => 'integer',
    ];
}
