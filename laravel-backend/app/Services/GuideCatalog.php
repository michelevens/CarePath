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
            'title' => '47 Questions to Ask On Tour',
            'subtitle' => 'A printable checklist for your facility tours',
            'description' => 'The questions that separate a great facility from a glossy brochure. Print one per facility you tour.',
            'category' => 'transition',
            'page_count' => 4,
            'audience' => 'Touring families',
            'value_props' => ['Walk in with confidence', 'Spot the red flags fast', 'Compare facilities on the same yardstick'],
            'hero_panel' => ['eyebrow' => 'Touring', 'title' => 'What to Notice When You Visit'],
            // Unsplash photo: caregiver + senior touring a community. Sized
            // for cover-page hero — width=1200 keeps the PDF lean.
            'hero_image_url' => 'https://images.unsplash.com/photo-1573497019418-b400bb3ab074?w=1200&q=80&auto=format&fit=crop',
            'toc' => [
                ['n' => 1, 'label' => 'Before you arrive', 'page' => 2],
                ['n' => 2, 'label' => 'First 60 seconds', 'page' => 3],
                ['n' => 3, 'label' => 'Care services & staffing', 'page' => 4],
                ['n' => 4, 'label' => 'Food, activities & life', 'page' => 5],
                ['n' => 5, 'label' => 'Cost, contracts & move-in', 'page' => 6],
                ['n' => 6, 'label' => 'Red flags & follow-ups', 'page' => 7],
            ],
        ],
        [
            'slug' => 'medicare-ltc-cheat-sheet',
            'title' => 'Medicare for Long-Term Care',
            'subtitle' => 'The day-count rules, the gaps, and what families always get wrong',
            'description' => 'Most families discover Medicare\'s LTC limits the hard way. This 4-page guide spells out exactly what Medicare pays, when it ends, and what fills the gap.',
            'category' => 'medicare',
            'page_count' => 4,
            'audience' => 'Pre-admission families',
            'value_props' => ['Know what Medicare covers', 'Plan for the day Medicare stops paying', 'Avoid common billing surprises'],
            'hero_panel' => ['eyebrow' => 'Medicare', 'title' => 'The 20 / 80 / 100 Day Rule'],
            'hero_image_url' => 'https://images.unsplash.com/photo-1504439468489-c8920d796a29?w=1200&q=80&auto=format&fit=crop',
            'toc' => [
                ['n' => 1, 'label' => 'What Medicare actually pays for', 'page' => 2],
                ['n' => 2, 'label' => 'The 100-day SNF benefit', 'page' => 3],
                ['n' => 3, 'label' => 'What Medicare does not cover', 'page' => 4],
                ['n' => 4, 'label' => 'Medigap & Advantage interaction', 'page' => 5],
                ['n' => 5, 'label' => 'When the bill arrives', 'page' => 6],
            ],
        ],
        [
            'slug' => 'medicaid-lookback-checklist',
            'title' => 'The 5-Year Medicaid Look-Back',
            'subtitle' => 'Transfers that trigger penalties, exemptions that survive review',
            'description' => 'The 60-month look-back is the most-misunderstood rule in Medicaid planning. This checklist walks through what counts, what doesn\'t, and how to avoid surprises.',
            'category' => 'medicaid',
            'page_count' => 4,
            'audience' => 'Families planning Medicaid application',
            'value_props' => ['Know what counts as a transfer', 'Use exemptions you didn\'t know existed', 'Avoid penalty-period delays'],
            'hero_panel' => ['eyebrow' => 'Medicaid', 'title' => '60 Months of Scrutiny'],
            'hero_image_url' => 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=1200&q=80&auto=format&fit=crop',
            'toc' => [
                ['n' => 1, 'label' => 'What the look-back actually checks', 'page' => 2],
                ['n' => 2, 'label' => 'Transfers that always trigger penalty', 'page' => 3],
                ['n' => 3, 'label' => 'Exempt transfers (more than you think)', 'page' => 4],
                ['n' => 4, 'label' => 'Asset protection that works', 'page' => 5],
                ['n' => 5, 'label' => 'Filing the application', 'page' => 6],
            ],
        ],
        [
            'slug' => 'va-aid-attendance-kit',
            'title' => 'VA Aid & Attendance Application Kit',
            'subtitle' => 'Eligibility, required documents, and a step-by-step walkthrough',
            'description' => 'Up to $2,727/mo (single veteran) or $3,232/mo (veteran + spouse) for LTC, and most eligible families never apply. Here\'s the kit to get it done.',
            'category' => 'va',
            'page_count' => 6,
            'audience' => 'Veterans and surviving spouses',
            'value_props' => ['Confirm eligibility in minutes', 'Gather every required document', 'Submit the right way the first time'],
            'hero_panel' => ['eyebrow' => 'VA Benefits', 'title' => 'Most Families Leave Money On the Table'],
            'hero_image_url' => 'https://images.unsplash.com/photo-1582719188393-bb71ca45dbb9?w=1200&q=80&auto=format&fit=crop',
            'toc' => [
                ['n' => 1, 'label' => 'Who qualifies (and who doesn\'t)', 'page' => 2],
                ['n' => 2, 'label' => 'Required documents checklist', 'page' => 3],
                ['n' => 3, 'label' => 'Income & asset limits', 'page' => 4],
                ['n' => 4, 'label' => 'Filing the 21-2680 form', 'page' => 5],
                ['n' => 5, 'label' => 'What to do if you\'re denied', 'page' => 6],
                ['n' => 6, 'label' => 'Survivor benefits for spouses', 'page' => 7],
            ],
        ],
        [
            'slug' => 'what-is-assisted-living',
            'title' => 'What is Assisted Living?',
            'subtitle' => 'A plain-English introduction for first-time families',
            'description' => 'How assisted living differs from independent living, memory care, and skilled nursing — and how to tell if it\'s the right level for your loved one.',
            'category' => 'care_basics',
            'page_count' => 4,
            'audience' => 'First-time families',
            'value_props' => ['Compare care levels at a glance', 'Match needs to the right setting', 'Avoid paying for care you don\'t need'],
            'hero_panel' => ['eyebrow' => 'Care Types', 'title' => 'Pick the Right Level First'],
            'hero_image_url' => 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=1200&q=80&auto=format&fit=crop',
            'toc' => [
                ['n' => 1, 'label' => 'What "assisted living" actually means', 'page' => 2],
                ['n' => 2, 'label' => 'Daily activities (ADLs) explained', 'page' => 3],
                ['n' => 3, 'label' => 'Assisted living vs. memory care', 'page' => 4],
                ['n' => 4, 'label' => 'Assisted living vs. skilled nursing', 'page' => 5],
                ['n' => 5, 'label' => 'When to step up to a higher level', 'page' => 6],
            ],
        ],
        [
            'slug' => 'choosing-assisted-living',
            'title' => 'How to Choose the Right Assisted Living',
            'subtitle' => 'A 9-step decision framework, from level-of-care match to red flags',
            'description' => 'The structured framework that experienced placement advisors use, written in plain English so families can use it themselves.',
            'category' => 'care_basics',
            'page_count' => 6,
            'audience' => 'Decision-stage families',
            'value_props' => ['A structured 9-step decision flow', 'Red flags every family should know', 'Cost comparison done right'],
            'hero_panel' => ['eyebrow' => 'Decision Framework', 'title' => 'A Path Through the 47 Options'],
            'hero_image_url' => 'https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=1200&q=80&auto=format&fit=crop',
            'toc' => [
                ['n' => 1, 'label' => 'Match level of care', 'page' => 2],
                ['n' => 2, 'label' => 'Set the budget honestly', 'page' => 3],
                ['n' => 3, 'label' => 'Geography & family access', 'page' => 4],
                ['n' => 4, 'label' => 'Verify Medicaid acceptance', 'page' => 5],
                ['n' => 5, 'label' => 'Tour with a scorecard', 'page' => 6],
                ['n' => 6, 'label' => 'Read the contract red flags', 'page' => 7],
            ],
        ],
        // ── Facility-operator playbook ───────────────────────────────
        // Lead-magnet for facility managers, gated server-side: the
        // download endpoint requires the authenticated user to hold at
        // least one FacilityClaim (any status). This sits behind the
        // claim-submission "thank you" moment as the value-delivery
        // reward for taking the action — and stays in the public
        // catalog for SEO/discovery (with a Lock affordance) so
        // operators search-engine-find it on their own.
        [
            'slug' => 'why-list-on-carepath',
            'title' => 'Why List on CarePath',
            'subtitle' => "The 2026 facility operator's playbook for free listings, real tour requests, and zero placement fees",
            'description' => "For SNF, ALF, memory care, CCRC, and group-home operators. Why claiming your CarePath listing converts 2-3× better than the unclaimed default, and what the free tier gets you on day one.",
            'category' => 'facility_operators',
            'page_count' => 4,
            'audience' => 'Facility owners, administrators, and DONs',
            'value_props' => [
                'No placement-fee auction — keep every move-in dollar',
                'Real photos + your own pricing replace the generic placeholder',
                'Free tier covers full listing edit + tour-request routing + analytics',
            ],
            'hero_panel' => ['eyebrow' => 'Operators', 'title' => 'Why Claim Pays For Itself'],
            'hero_image_url' => 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=1200&q=80&auto=format&fit=crop',
            'toc' => [
                ['n' => 1, 'label' => "The lead-auction math you don't have to play", 'page' => 2],
                ['n' => 2, 'label' => 'What families see when you claim', 'page' => 3],
                ['n' => 3, 'label' => 'What the free tier gets you', 'page' => 4],
                ['n' => 4, 'label' => 'The Pro tier (optional)', 'page' => 5],
                ['n' => 5, 'label' => "The CMS Five-Star reality", 'page' => 6],
                ['n' => 6, 'label' => 'How to claim (under two minutes)', 'page' => 7],
            ],
            // Server-side gating flag, read by GuideController::download().
            // When true, the download requires an authenticated user with
            // at least one FacilityClaim (pending OR approved) rather than
            // the family-side lead-capture form.
            'requires_claim' => true,
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
