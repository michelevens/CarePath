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
        return self::GUIDES;
    }

    public static function find(string $slug): ?array
    {
        foreach (self::GUIDES as $g) {
            if ($g['slug'] === $slug) {
                return $g;
            }
        }
        return null;
    }
}
