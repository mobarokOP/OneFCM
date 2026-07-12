<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Promote due scheduled notifications every minute.
Schedule::command('openfcm:dispatch-scheduled')->everyMinute()->withoutOverlapping();
