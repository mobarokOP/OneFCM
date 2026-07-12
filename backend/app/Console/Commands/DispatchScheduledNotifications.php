<?php

namespace App\Console\Commands;

use App\Models\Schedule;
use App\Services\NotificationDispatcher;
use Illuminate\Console\Command;

class DispatchScheduledNotifications extends Command
{
    protected $signature = 'openfcm:dispatch-scheduled';

    protected $description = 'Promote due scheduled notifications into the delivery queue.';

    public function handle(NotificationDispatcher $dispatcher): int
    {
        $due = Schedule::with('notification')
            ->where('status', 'pending')
            ->where('send_at', '<=', now())
            ->limit(200)
            ->get();

        foreach ($due as $schedule) {
            $notification = $schedule->notification;

            if (! $notification || $notification->status === 'canceled') {
                $schedule->update(['status' => 'canceled']);

                continue;
            }

            $dispatcher->queue($notification);
            $schedule->update(['status' => 'dispatched', 'dispatched_at' => now()]);

            // Roll a recurring schedule forward to its next occurrence.
            if ($schedule->recurring) {
                $next = match ($schedule->recurring) {
                    'daily' => $schedule->send_at->addDay(),
                    'weekly' => $schedule->send_at->addWeek(),
                    'monthly' => $schedule->send_at->addMonth(),
                    default => null,
                };

                if ($next) {
                    $clone = $notification->replicate(['sent_count', 'delivered_count', 'failed_count', 'opened_count', 'completed_at']);
                    $clone->status = 'scheduled';
                    $clone->scheduled_at = $next;
                    $clone->save();

                    Schedule::create([
                        'notification_id' => $clone->id,
                        'send_at' => $next,
                        'timezone' => $schedule->timezone,
                        'recurring' => $schedule->recurring,
                        'status' => 'pending',
                    ]);
                }
            }
        }

        $this->info("Dispatched {$due->count()} scheduled notification(s).");

        return self::SUCCESS;
    }
}
