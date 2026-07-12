<?php

namespace App\Jobs;

use App\Models\Notification;
use App\Models\NotificationTarget;
use App\Services\AudienceResolver;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Str;

/**
 * Resolves the audience for a notification and fans devices out into
 * bounded batches, each handed to a SendPushBatchJob.
 */
class DispatchNotificationJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $timeout = 300;

    public function __construct(public string $notificationId) {}

    public function handle(AudienceResolver $resolver): void
    {
        $notification = Notification::with('application')->find($this->notificationId);

        if (! $notification || in_array($notification->status, ['canceled', 'sent'], true)) {
            return;
        }

        $notification->update(['status' => 'sending']);

        $batchSize = config('openfcm.batch_size');
        $total = 0;

        $resolver->query($notification->application, $notification->audience)
            ->select('devices.id')
            ->chunkById($batchSize, function ($devices) use ($notification, &$total) {
                $ids = $devices->pluck('id')->all();
                $total += count($ids);

                // Track intended recipients.
                $rows = array_map(fn ($id) => [
                    'id' => (string) Str::uuid(),
                    'notification_id' => $notification->id,
                    'device_id' => $id,
                    'status' => 'pending',
                    'created_at' => now(),
                    'updated_at' => now(),
                ], $ids);
                NotificationTarget::insert($rows);

                SendPushBatchJob::dispatch($notification->id, $ids)
                    ->onQueue(config('openfcm.queue'));
            });

        $notification->update(['recipients_count' => $total]);

        if ($total === 0) {
            $notification->update(['status' => 'sent', 'completed_at' => now()]);
        }
    }
}
