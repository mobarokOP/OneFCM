<?php

namespace App\Services;

use App\Jobs\DispatchNotificationJob;
use App\Models\Notification;

class NotificationDispatcher
{
    /**
     * Queue a notification for delivery (immediate). Fan-out happens
     * asynchronously inside DispatchNotificationJob.
     */
    public function queue(Notification $notification): void
    {
        $notification->update(['status' => 'queued']);

        DispatchNotificationJob::dispatch($notification->id)
            ->onQueue(config('openfcm.queue'));
    }
}
