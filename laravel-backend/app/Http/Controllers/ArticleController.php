<?php

namespace App\Http\Controllers;

use App\Models\Article;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ArticleController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $data = $request->validate([
            'category' => ['nullable', 'in:' . implode(',', Article::CATEGORIES)],
            'featured' => ['nullable', 'boolean'],
            'limit' => ['nullable', 'integer', 'min:1', 'max:50'],
        ]);

        $query = Article::query()
            ->where('is_published', true)
            ->whereNotNull('published_at')
            ->orderByDesc('is_featured')
            ->orderByDesc('published_at');

        if (! empty($data['category'])) {
            $query->where('category', $data['category']);
        }
        if (! empty($data['featured'])) {
            $query->where('is_featured', true);
        }

        $articles = $query->limit($data['limit'] ?? 20)->get([
            'id', 'slug', 'title', 'subtitle', 'hero_image_url', 'category',
            'summary', 'author_name', 'reading_time_minutes', 'is_featured',
            'published_at',
        ]);

        return response()->json(['data' => $articles]);
    }

    public function show(string $slug): JsonResponse
    {
        $article = Article::query()
            ->where('slug', $slug)
            ->where('is_published', true)
            ->firstOrFail();

        $related = Article::query()
            ->where('is_published', true)
            ->where('id', '!=', $article->id)
            ->where('category', $article->category)
            ->orderByDesc('published_at')
            ->limit(3)
            ->get([
                'id', 'slug', 'title', 'subtitle', 'hero_image_url',
                'summary', 'reading_time_minutes', 'category',
            ]);

        return response()->json([
            'data' => $article,
            'related' => $related,
        ]);
    }
}
