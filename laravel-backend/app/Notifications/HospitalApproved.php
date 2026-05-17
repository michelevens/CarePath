<?php

namespace App\Notifications;

use App\Models\HospitalPartner;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class HospitalApproved extends Notification
{
    use Queueable;

    public function __construct(public readonly HospitalPartner $partner) {}

    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $siteUrl = rtrim((string) config('app.public_site_url', config('app.url')), '/');

        return (new MailMessage)
            ->subject("{$this->partner->name} is verified on CarePath")
            ->greeting("Hi {$notifiable->name},")
            ->line("Your hospital partner profile for {$this->partner->name} has been verified.")
            ->line('Your discharge planners can now embed the CarePath search widget in any EHR / discharge-planning page. Every inquiry routed through your widget credits your hospital for the placement fee.')
            ->action('Open your hospital portal', $siteUrl . '/hospital')
            ->line('Next: copy the iframe snippet from `/hospital/embed` and drop it into your team\'s workflow.')
            ->salutation('— The CarePath team');
    }
}
