<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

/*
|--------------------------------------------------------------------------
| Scheduled jobs
|--------------------------------------------------------------------------
| Requires a worker / cron running `php artisan schedule:run` every
| minute. On Railway, add a separate worker service or update the
| Procfile to include a worker line, e.g.:
|   worker: while true; do php artisan schedule:run --verbose; sleep 60; done
*/

// Move placements through their retention milestones — pending →
// confirmed (rescission window), confirmed → retained_30d (releases
// 70%), retained_30d → retained_90d (releases remaining 30%).
// Runs hourly so milestones fire promptly after the dates pass.
Schedule::command('placements:advance-milestones')
    ->hourly()
    ->withoutOverlapping(60)
    ->runInBackground();

// Reset sponsored-listing daily spend counters at UTC midnight + flip
// 'depleted' campaigns back to 'active' if they still have lifetime
// budget. Also auto-ends campaigns past their end date.
Schedule::command('sponsored:reset-daily')
    ->dailyAt('00:00')   // UTC
    ->timezone('UTC')
    ->withoutOverlapping(60)
    ->runInBackground();

// Saved-search alerts — daily sweep that diffs each search's current
// matches against the last-seen snapshot and notifies the user about
// new facilities. Runs once a day at a quiet hour to avoid bursting
// the notifications bell during peak.
Schedule::command('carepath:run-saved-search-alerts')
    ->dailyAt('13:00')   // 9am ET
    ->timezone('UTC')
    ->withoutOverlapping(60)
    ->runInBackground();

// Sponsored-ad monthly invoicing. Runs on the 2nd of each month
// at 4am UTC — gives the daily-reset job time to settle the prior
// day's spend before we close the month.
Schedule::command('sponsored:bill-month')
    ->monthlyOn(2, '04:00')
    ->timezone('UTC')
    ->withoutOverlapping(180)
    ->runInBackground();
