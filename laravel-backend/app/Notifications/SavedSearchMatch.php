<?php

namespace App\Notifications;

use App\Models\Facility;
use App\Models\SavedSearch;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use Illuminate\Support\Collection;

/**
 * Sent when the nightly saved-search alert scheduler finds new
 * facilities matching one of a user's saved searches with alerts_on.
 *
 * Both mail (so the user actually sees it without being logged in)
 * and database (so the bell icon picks it up the next time they
 * are). Mail is the higher-leverage channel — saved-search users
 * frequently check email more often than they refresh the search
 * page.
 *
 * Replaces the bare DB-insert that SavedSearchAlertsCommand did
 * previously, which fired in-app only.
 */
class SavedSearchMatch extends Notification
{
    use Queueable;

    public function __construct(
        public readonly SavedSearch $search,
        /** @var Collection<int, Facility> */
        public readonly Collection $newFacilities,
        /** @var array<string, mixed> */
        public readonly array $params,
    ) {}

    public function via(object $notifiable): array
    {
        return ['mail', 'database'];
    }

    public function toArray(object $notifiable): array
    {
        $count = $this->newFacilities->count();
        $names = $this->newFacilities->take(5)->pluck('name');
        $message = $names->join(', ') . ($count > 5 ? " and " . ($count - 5) . " more" : '');

        return [
            'kind' => 'saved_search_match',
            'saved_search_id' => $this->search->id,
            'saved_search_name' => $this->search->name,
            'count' => $count,
            'title' => $count === 1
                ? "1 new match for '{$this->search->name}'"
                : "{$count} new matches for '{$this->search->name}'",
            'message' => $message,
            'href' => '/search?' . http_build_query($this->params),
        ];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $siteUrl = rtrim((string) config('app.public_site_url', config('app.url')), '/');
        $count = $this->newFacilities->count();
        $href = $siteUrl . '/search?' . http_build_query($this->params);

        $mail = (new MailMessage)
            ->subject($count === 1
                ? "1 new facility for your '{$this->search->name}' search"
                : "{$count} new facilities for your '{$this->search->name}' search")
            ->greeting("Hi,")
            ->line($count === 1
                ? "A new facility just matched your saved search **{$this->search->name}**."
                : "{$count} new facilities just matched your saved search **{$this->search->name}**.");

        // List up to 5 by name so the email feels substantial without
        // becoming a wall of text.
        foreach ($this->newFacilities->take(5) as $facility) {
            $cityState = trim(($facility->city ?? '') . ', ' . ($facility->state ?? ''));
            $mail->line("• **{$facility->name}** — {$cityState}");
        }
        if ($count > 5) {
            $mail->line("• …and " . ($count - 5) . " more.");
        }

        return $mail
            ->action('See all matches', $href)
            ->line("You're receiving this because you have alerts on for this saved search. You can pause alerts or unsubscribe from your saved-searches list.")
            ->salutation('— CarePath');
    }
}
