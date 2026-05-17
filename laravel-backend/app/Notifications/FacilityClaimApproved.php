<?php

namespace App\Notifications;

use App\Models\Facility;
use App\Models\FacilityClaim;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

/**
 * Sent to a user when their facility claim is approved.
 *
 * Resend is the production mailer (see services.resend). In dev
 * with MAIL_MAILER=log, the message is written to the Laravel log
 * — perfect for local testing without needing real API keys.
 */
class FacilityClaimApproved extends Notification
{
    use Queueable;

    public function __construct(
        public readonly FacilityClaim $claim,
        public readonly Facility $facility,
    ) {}

    public function via(object $notifiable): array
    {
        return ['mail', 'database'];
    }

    public function toArray(object $notifiable): array
    {
        return [
            'kind' => 'facility_claim_approved',
            'facility_id' => $this->facility->id,
            'facility_slug' => $this->facility->slug,
            'facility_name' => $this->facility->name,
            'title' => "Your claim on {$this->facility->name} was approved",
            'message' => 'You can now manage this facility from your admin portal.',
            'href' => '/admin',
        ];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $siteUrl = rtrim((string) config('app.public_site_url', config('app.url')), '/');

        return (new MailMessage)
            ->subject("You're now managing {$this->facility->name} on CarePath")
            ->greeting("Hi {$this->claim->claimer_name},")
            ->line("Good news — your claim on {$this->facility->name} ({$this->facility->city}, {$this->facility->state}) has been approved.")
            ->line('You can now edit the listing, manage your bed board, route tour requests, and respond to inquiries from your CarePath admin portal.')
            ->action('Open your admin portal', $siteUrl . '/admin')
            ->line('What to do first:')
            ->line('1. Visit `/admin/data` to update your listing (photos, amenities, pricing).')
            ->line('2. Check `/admin/leads` for any pending inquiries.')
            ->line('3. Consider upgrading to Facility Pro to unlock the admissions kanban + lead routing.')
            ->salutation('— The CarePath team');
    }
}
