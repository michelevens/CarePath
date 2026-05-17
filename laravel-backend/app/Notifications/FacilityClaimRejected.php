<?php

namespace App\Notifications;

use App\Models\Facility;
use App\Models\FacilityClaim;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class FacilityClaimRejected extends Notification
{
    use Queueable;

    public function __construct(
        public readonly FacilityClaim $claim,
        public readonly Facility $facility,
    ) {}

    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $msg = (new MailMessage)
            ->subject("Your claim on {$this->facility->name} needs more info")
            ->greeting("Hi {$this->claim->claimer_name},")
            ->line("We weren't able to verify your claim on {$this->facility->name} based on what was submitted.");

        if ($this->claim->decision_notes) {
            $msg->line('Reviewer notes:')
                ->line('"' . $this->claim->decision_notes . '"');
        }

        return $msg
            ->line("If you do work at the facility, please reply with documentation we can verify (operating license, business card, or an email from the facility's own domain) and we'll re-review.")
            ->action('Contact CarePath support', 'mailto:help@carepath.io')
            ->salutation('— The CarePath team');
    }
}
