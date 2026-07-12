<?php

namespace App\Console\Commands;

use App\Models\AnalyticsEvent;
use App\Models\DeliveryLog;
use App\Models\Notification;
use App\Models\NotificationTarget;
use Illuminate\Console\Command;

class PruneNotificationHistory extends Command
{
    /** Only finished notifications are ever pruned; anything still in flight is kept. */
    private const TERMINAL_STATUSES = ['sent', 'failed', 'canceled'];

    protected $signature = 'openfcm:prune-history';

    protected $description = 'Trim history to the configured retention: keep the last N finished notifications per app and time-box raw log rows.';

    public function handle(): int
    {
        $retention = config('openfcm.retention');

        $notifications = $this->pruneNotificationsPerApp((int) $retention['notifications_per_app']);
        $logs = $this->pruneOlderThan(DeliveryLog::class, 'created_at', (int) $retention['delivery_log_days']);
        $targets = $this->pruneOlderThan(NotificationTarget::class, 'created_at', (int) $retention['delivery_log_days']);
        $events = $this->pruneOlderThan(AnalyticsEvent::class, 'occurred_at', (int) $retention['analytics_days']);

        $this->info("Pruned {$notifications} notification(s), {$logs} delivery log(s), {$targets} target row(s), {$events} analytics event(s).");

        return self::SUCCESS;
    }

    /**
     * Keep only the most recent $keep finished notifications per application.
     * DB-level FK cascades clean up their targets, delivery logs and schedules.
     */
    private function pruneNotificationsPerApp(int $keep): int
    {
        if ($keep <= 0) {
            return 0;
        }

        $appIds = Notification::whereIn('status', self::TERMINAL_STATUSES)
            ->groupBy('application_id')
            ->havingRaw('COUNT(*) > ?', [$keep])
            ->pluck('application_id');

        $deleted = 0;

        foreach ($appIds as $appId) {
            $keepIds = Notification::where('application_id', $appId)
                ->whereIn('status', self::TERMINAL_STATUSES)
                ->orderByDesc('created_at')
                ->orderByDesc('id')
                ->limit($keep)
                ->pluck('id');

            $staleIds = Notification::where('application_id', $appId)
                ->whereIn('status', self::TERMINAL_STATUSES)
                ->whereNotIn('id', $keepIds)
                ->pluck('id');

            foreach ($staleIds->chunk(100) as $chunk) {
                $deleted += Notification::whereIn('id', $chunk)->delete();
            }
        }

        return $deleted;
    }

    /** Chunked date-based delete that works on both MySQL and SQLite. */
    private function pruneOlderThan(string $model, string $column, int $days): int
    {
        if ($days <= 0) {
            return 0;
        }

        $cutoff = now()->subDays($days);
        $deleted = 0;

        do {
            $ids = $model::where($column, '<', $cutoff)->limit(1000)->pluck('id');

            if ($ids->isEmpty()) {
                break;
            }

            $deleted += $model::whereIn('id', $ids)->delete();
        } while (true);

        return $deleted;
    }
}
