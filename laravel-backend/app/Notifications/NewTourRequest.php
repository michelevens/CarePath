<?php

namespace App\Notifications;

use App\Models\Admission;
use App\Models\Facility;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

/**
 * Sent to facility-admin users when a family submits an inquiry or
 * books a tour from the public detail page. Both mail (so the
 * manager sees it in their inbox alongside their other messages)
 * and database (so the in-app bell-icon notification list picks it
 * up immediately).
 *
 * Speed-of-response is the single biggest tour-conversion factor
 * the industry tracks; getting this to the manager in seconds
 * instead of "next time they refresh the kanban" is the whole
 * point of CarePath over APFM (where leads sit in a queue waiting
 * to be auctioned).
 */
class NewTourRequest extends Notification
{
    use Queueable;

    public function __construct(
        public readonly Admission $admission,
        public readonly Facility $facility,
        /** 'inquiry' for a plain inquiry, 'tour_scheduled' for a booked tour */
        public readonly string $kind = 'inquiry',
    ) {}

    public function via(object $notifiable): array
    {
        return ['mail', 'database'];
    }

    public function toArray(object $notifiable): array
    {
        $isTour = $this->kind === 'tour_scheduled';

        return [
            'kind' => $isTour ? 'tour_scheduled' : 'new_inquiry',
            'facility_id' => $this->facility->id,
            'facility_slug' => $this->facility->slug,
            'facility_name' => $this->facility->name,
            'admission_id' => $this->admission->id,
            'inquirer_name' => $this->admission->inquirer_name,
            'inquirer_email' => $this->admission->inquirer_email,
            'inquirer_phone' => $this->admission->inquirer_phone,
            'prospect_level_of_care' => $this->admission->prospect_level_of_care,
            'title' => $isTour
                ? "New tour booked at {$this->facility->name}"
                : "New inquiry for {$this->facility->name}",
            'message' => "{$this->admission->inquirer_name} ({$this->admission->inquirer_relationship}) — respond from your admissions queue.",
            'href' => '/admin/admissions',
        ];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $siteUrl = rtrim((string) config('app.public_site_url', config('app.url')), '/');
        $isTour = $this->kind === 'tour_scheduled';
        $subject = $isTour
            ? "New tour booked: {$this->admission->inquirer_name} at {$this->facility->name}"
            : "New inquiry: {$this->admission->inquirer_name} for {$this->facility->name}";

        $mail = (new MailMessage)
            ->subject($subject)
            ->greeting("New {$this->kindLabel()}")
            ->line("**{$this->admission->inquirer_name}** ({$this->admission->inquirer_relationship}) just {$this->actionLabel()} on {$this->facility->name}.");

        if ($this->admission->inquirer_phone) {
            $mail->line("Phone: {$this->admission->inquirer_phone}");
        }
        $mail->line("Email: {$this->admission->inquirer_email}");

        if ($this->admission->prospect_first_name) {
            $level = $this->admission->prospect_level_of_care
                ? " (needs {$this->admission->prospect_level_of_care} care)"
                : '';
            $mail->line("Prospect: {$this->admission->prospect_first_name} {$this->admission->prospect_last_name}{$level}");
        }
        if ($this->admission->notes) {
            $mail->line("Notes: " . $this->admission->notes);
        }

        return $mail
            ->action('Open in admissions queue', $siteUrl . '/admin/admissions')
            ->line('Speed of response is the single biggest factor in conversion. Most families pick the first facility that calls them back.')
            ->salutation('— CarePath');
    }

    private function kindLabel(): string
    {
        return $this->kind === 'tour_scheduled' ? 'tour booking' : 'inquiry';
    }

    private function actionLabel(): string
    {
        return $this->kind === 'tour_scheduled'
            ? 'booked a tour'
            : 'submitted an inquiry';
    }
}
