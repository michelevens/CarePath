<?php

namespace App\Notifications;

use App\Models\AdvisorProfile;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class AdvisorApproved extends Notification
{
    use Queueable;

    public function __construct(public readonly AdvisorProfile $profile) {}

    public function via(object $notifiable): array
    {
        return ['mail', 'database'];
    }

    public function toArray(object $notifiable): array
    {
        return [
            'kind' => 'advisor_approved',
            'agency_name' => $this->profile->agency_name,
            'title' => "You're verified — ready to take referrals",
            'message' => 'Complete Stripe Connect onboarding to start earning placements.',
            'href' => '/referral',
        ];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $siteUrl = rtrim((string) config('app.public_site_url', config('app.url')), '/');
        $name = $this->profile->agency_name ?? $notifiable->name ?? 'there';

        return (new MailMessage)
            ->subject("You're verified on CarePath — ready to take referrals")
            ->greeting("Hi {$name},")
            ->line('Your CarePath placement-advisor profile has been verified by our team.')
            ->line('Next steps to start earning placements:')
            ->line('1. Complete Stripe Connect onboarding so we can pay you on retained admissions.')
            ->line('2. Update your public agency profile — families see this when an admission you sourced lands.')
            ->line('3. Confirm your licensed states + service-area ZIPs so families nearby can find you.')
            ->action('Open your advisor portal', $siteUrl . '/referral')
            ->line('Reminder: CarePath is anti-lead-auction. Your transparent 82% split + license + verification status are public on your profile — that\'s the trade for families seeing real advisor info instead of a faceless broker.')
            ->salutation('— The CarePath team');
    }
}
