<?php

namespace App\Http\Controllers;

use App\Models\Article;
use App\Models\Facility;
use Illuminate\Http\Response;

/**
 * Generates a sitemap.xml covering all public pages — static routes,
 * the content hub (articles), tools, and the 8,400+ facility detail
 * pages. The site URL is configurable so the same code works on staging.
 *
 * Note: Google's sitemap protocol caps a single sitemap at 50,000 URLs.
 * We're under that with ~8.5k facilities + ~12 articles + ~10 static
 * routes, but if we cross 40k we should split into a sitemap index.
 */
class SitemapController extends Controller
{
    private const STATIC_ROUTES = [
        '/',
        '/search',
        '/articles',
        '/tools',
        '/tools/care-level-quiz',
        '/tools/medicaid-eligibility',
        '/tools/va-eligibility',
        '/compare',
        '/login',
        '/signup',
    ];

    public function index(): Response
    {
        $siteUrl = rtrim(config('app.public_site_url', 'https://carepath.io'), '/');
        $now = now()->toIso8601String();

        $urls = [];

        foreach (self::STATIC_ROUTES as $path) {
            $urls[] = [
                'loc' => $siteUrl . $path,
                'lastmod' => $now,
                'changefreq' => $path === '/' ? 'daily' : 'weekly',
                'priority' => $path === '/' ? '1.0' : '0.7',
            ];
        }

        Article::query()
            ->where('is_published', true)
            ->whereNotNull('published_at')
            ->orderBy('published_at')
            ->chunk(500, function ($articles) use (&$urls, $siteUrl) {
                foreach ($articles as $a) {
                    $urls[] = [
                        'loc' => $siteUrl . '/articles/' . $a->slug,
                        'lastmod' => optional($a->updated_at ?? $a->published_at)->toIso8601String(),
                        'changefreq' => 'monthly',
                        'priority' => $a->is_featured ? '0.9' : '0.6',
                    ];
                }
            });

        Facility::query()
            ->where('is_active', true)
            ->orderBy('slug')
            ->chunkById(500, function ($facilities) use (&$urls, $siteUrl) {
                foreach ($facilities as $f) {
                    $urls[] = [
                        'loc' => $siteUrl . '/facility/' . $f->slug,
                        'lastmod' => optional($f->updated_at)->toIso8601String(),
                        'changefreq' => 'weekly',
                        'priority' => '0.5',
                    ];
                }
            });

        $xml = '<?xml version="1.0" encoding="UTF-8"?>' . "\n";
        $xml .= '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' . "\n";
        foreach ($urls as $u) {
            $xml .= "  <url>\n";
            $xml .= '    <loc>' . htmlspecialchars($u['loc'], ENT_XML1) . "</loc>\n";
            if (! empty($u['lastmod'])) {
                $xml .= '    <lastmod>' . $u['lastmod'] . "</lastmod>\n";
            }
            $xml .= '    <changefreq>' . $u['changefreq'] . "</changefreq>\n";
            $xml .= '    <priority>' . $u['priority'] . "</priority>\n";
            $xml .= "  </url>\n";
        }
        $xml .= '</urlset>';

        return response($xml, 200)
            ->header('Content-Type', 'application/xml; charset=utf-8')
            ->header('Cache-Control', 'public, max-age=3600');
    }

    public function robots(): Response
    {
        $siteUrl = rtrim(config('app.public_site_url', 'https://carepath.io'), '/');
        $apiUrl = rtrim(config('app.url', 'https://carepath-api-production.up.railway.app'), '/');

        $body = "User-agent: *\n";
        $body .= "Allow: /\n";
        $body .= "Disallow: /family\n";
        $body .= "Disallow: /staff\n";
        $body .= "Disallow: /admin\n";
        $body .= "Disallow: /network\n";
        $body .= "Disallow: /referral\n";
        $body .= "Disallow: /superadmin\n";
        $body .= "Disallow: /settings\n";
        $body .= "\n";
        $body .= "Sitemap: {$apiUrl}/sitemap.xml\n";

        return response($body, 200)->header('Content-Type', 'text/plain; charset=utf-8');
    }
}
