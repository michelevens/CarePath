<?php

namespace App\Notifications;

use App\Models\Admission;
use App\Models\Facility;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

/**
 * Confirmation email to the family who submitted a tour request /
 * inquiry. Sets expectations on response time, surfaces the facility's
 * direct phone if they want to be proactive, and reinforces that the
 * inquiry is NOT being resold to competitors (the differentiator
 * vs APFM/Caring.com that's worth saying out loud).
 *
 * No database channel — this fires to a non-authenticated email address.
 * The Notification facade's routeNotificationFor('mail') is used by the
 * controller to send to an arbitrary address without a User model.
 */
class TourRequestConfirmation extends Notification
{
    use Queueable;

    public function __construct(
        public readonly Admission $admission,
        public readonly Facility $facility,
        public readonly string $kind = 'inquiry',
    ) {}

    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $siteUrl = rtrim((string) config('app.public_site_url', config('app.url')), '/');
        $isTour = $this->kind === 'tour_scheduled';

        $mail = (new MailMessage)
            ->subject($isTour
                ? "Your tour at {$this->facility->name} is requested"
                : "Your inquiry to {$this->facility->name}")
            ->greeting("Hi {$this->admission->inquirer_name},")
            ->line($isTour
                ? "Thanks for booking a tour at **{$this->facility->name}** ({$this->facility->city}, {$this->facility->state})."
                : "Thanks for reaching out about **{$this->facility->name}** ({$this->facility->city}, {$this->facility->state}).")
            ->line('Your message went directly to their admissions team — not to a lead-auction. Expect a reply within one business day.');

        if ($this->facility->phone) {
            $mail->line("If you'd like to call them yourself: **{$this->facility->phone}**.");
        }

        return $mail
            ->action('View the facility', $siteUrl . '/facility/' . $this->facility->slug)
            ->line("**Why we're different from A Place for Mom or Caring.com:** we don't sell your information to multiple facilities. Your contact details went to one place: " . $this->facility->name . ".")
            ->line('We never share your phone number with anyone else.')
            ->salutation('— The CarePath team');
    }
}
