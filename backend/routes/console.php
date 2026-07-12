<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Promote due scheduled notifications every minute.
Schedule::command('openfcm:dispatch-scheduled')->everyMinute()->withoutOverlapping();

// Enforce free-tier history retention nightly (keep-last-N per app + time-boxed logs).
Schedule::command('openfcm:prune-history')->dailyAt('03:30')->withoutOverlapping()->onOneServer();
