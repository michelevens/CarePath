<?php

namespace App\Services;

/**
 * Single source of truth for the downloadable-guides catalog.
 *
 * Each guide is a Blade view under resources/views/guides/{slug}.blade.php
 * extending guides/layout.blade.php. To add a new guide:
 *   1. Add a row here.
 *   2. Create the Blade template.
 * The controller + frontend index pick it up automatically.
 */
class GuideCatalog
{
    /**
     * Editorial team — the named humans who write and review guides.
     * Surfaced on the /guides page, on each PDF cover, and the
     * /about/editorial page. Establishes authority that lead-gen
     * competitors (APFM, Caring.com) don't build.
     *
     * Add real reviewers here as they sign on. Keep entries factual —
     * fabricating credentials on a healthcare site is both unethical
     * and a legal exposure.
     */
    public const EDITORS = [
        'editorial_team' => [
            'name' => 'CarePath Editorial',
            'role' => 'Plain-English long-term care guides',
            'bio' => 'A small team of writers and researchers focused on translating Medicare, Medicaid, VA, and state LTC rules into language families can act on. Each guide cites federal/state agency sources and is updated when the underlying rules change.',
        ],
    ];

    /**
     * Default authorship for every guide. Per-guide overrides go in the
     * GUIDES rows below (`author` / `reviewer` keys) once we have real
     * reviewers willing to be cited by name.
     */
    public const DEFAULT_AUTHOR = 'editorial_team';

    public const GUIDES = [
        [
            'slug' => 'tour-day-question-sheet',
            'title' => 'Tour Day: 47 Questions to Ask',
            'subtitle' => 'A printable checklist for your facility tours',
            'description' => 'The questions that separate a great facility from a glossy brochure. Print one per facility you tour.',
            'category' => 'transition',
            'page_count' => 4,
            'audience' => 'Touring families',
        ],
        [
            'slug' => 'medicare-ltc-cheat-sheet',
            'title' => 'Medicare for Long-Term Care: What\'s Covered, What\'s Not',
            'subtitle' => 'The day-count rules, the gaps, and the things families always get wrong',
            'description' => 'Most families discover Medicare\'s LTC limits the hard way. This 4-page guide spells out exactly what Medicare pays, when it ends, and what fills the gap.',
            'category' => 'medicare',
            'page_count' => 4,
            'audience' => 'Pre-admission families',
        ],
        [
            'slug' => 'medicaid-lookback-checklist',
            'title' => 'Medicaid 5-Year Look-Back & Spend-Down Checklist',
            'subtitle' => 'Asset transfers that trigger penalties, exemptions that survive review',
            'description' => 'The 60-month look-back is the most-misunderstood rule in Medicaid planning. This checklist walks through what counts, what doesn\'t, and how to avoid surprises.',
            'category' => 'medicaid',
            'page_count' => 4,
            'audience' => 'Families planning Medicaid application',
        ],
        [
            'slug' => 'va-aid-attendance-kit',
            'title' => 'VA Aid & Attendance Application Kit',
            'subtitle' => 'Eligibility, required documents, and a step-by-step walkthrough',
            'description' => 'Up to $2,727/mo (single veteran) or $3,232/mo (veteran + spouse) for LTC, and most eligible families never apply. Here\'s the kit to get it done.',
            'category' => 'va',
            'page_count' => 6,
            'audience' => 'Veterans and surviving spouses',
        ],
        [
            'slug' => 'what-is-assisted-living',
            'title' => 'What is Assisted Living?',
            'subtitle' => 'A plain-English introduction for first-time families',
            'description' => 'How assisted living differs from independent living, memory care, and skilled nursing — and how to tell if it\'s the right level for your loved one.',
            'category' => 'care_basics',
            'page_count' => 4,
            'audience' => 'First-time families',
        ],
        [
            'slug' => 'choosing-assisted-living',
            'title' => 'How to Choose the Right Assisted Living',
            'subtitle' => 'A 9-step decision framework, from level-of-care match to red flags',
            'description' => 'The structured framework that experienced placement advisors use, written in plain English so families can use it themselves.',
            'category' => 'care_basics',
            'page_count' => 6,
            'audience' => 'Decision-stage families',
        ],
    ];

    public static function all(): array
    {
        return array_map([self::class, 'hydrate'], self::GUIDES);
    }

    public static function find(string $slug): ?array
    {
        foreach (self::GUIDES as $g) {
            if ($g['slug'] === $slug) {
                return self::hydrate($g);
            }
        }
        return null;
    }

    /**
     * Attach the resolved author/reviewer records to a guide row, so the
     * controller and Blade templates can render `{{ $guide['author']['name'] }}`
     * without doing the lookup themselves.
     */
    private static function hydrate(array $guide): array
    {
        $authorKey = $guide['author'] ?? self::DEFAULT_AUTHOR;
        $guide['author'] = self::EDITORS[$authorKey] ?? self::EDITORS[self::DEFAULT_AUTHOR];
        if (isset($guide['reviewer']) && is_string($guide['reviewer'])) {
            $guide['reviewer'] = self::EDITORS[$guide['reviewer']] ?? null;
        }
        return $guide;
    }
}
