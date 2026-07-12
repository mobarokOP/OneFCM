<?php

namespace App\Jobs;

use App\Models\AnalyticsEvent;
use App\Models\DeliveryLog;
use App\Models\Device;
use App\Models\Notification;
use App\Models\NotificationTarget;
use App\Services\Fcm\FcmClient;
use App\Services\Fcm\FcmMessage;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * Delivers one batch of devices for a notification via FCM. Per-device
 * outcomes are logged; the whole batch is retried on transient job failure.
 */
class SendPushBatchJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $timeout = 120;

    /** @param array<int,string> $deviceIds */
    public function __construct(
        public string $notificationId,
        public array $deviceIds,
    ) {}

    public function tries(): int
    {
        return config('openfcm.max_retries', 3);
    }

    /** @return array<int,int> backoff seconds per attempt */
    public function backoff(): array
    {
        return config('openfcm.retry_backoff', [10, 60, 300]);
    }

    public function handle(FcmClient $fcm): void
    {
        $notification = Notification::with('application')->find($this->notificationId);

        if (! $notification || $notification->status === 'canceled') {
            return;
        }

        $message = FcmMessage::fromNotification($notification);
        $devices = Device::whereIn('id', $this->deviceIds)->get();

        $sent = 0;
        $delivered = 0;
        $failed = 0;
        $logs = [];
        $events = [];
        $unregister = [];

        foreach ($devices as $device) {
            $result = $fcm->send($notification->application, $device->fcm_token, $message);
            $now = now();

            if ($result['ok']) {
                $sent++;
                $delivered++; // FCM accept == delivered-to-transport
                NotificationTarget::where('notification_id', $notification->id)
                    ->where('device_id', $device->id)
                    ->update(['status' => 'delivered', 'updated_at' => $now]);
                $device->forceFill(['last_active_at' => $now])->saveQuietly();
            } else {
                $failed++;
                NotificationTarget::where('notification_id', $notification->id)
                    ->where('device_id', $device->id)
                    ->update(['status' => 'failed', 'updated_at' => $now]);
                if ($result['unregister']) {
                    $unregister[] = $device->id;
                }
            }

            $logs[] = [
                'id' => (string) Str::uuid(),
                'notification_id' => $notification->id,
                'device_id' => $device->id,
                'status' => $result['ok'] ? 'sent' : 'failed',
                'fcm_message_id' => $result['message_id'],
                'error_code' => $result['error_code'],
                'error' => $result['error'],
                'retry_count' => $this->attempts() - 1,
                'attempted_at' => $now,
                'created_at' => $now,
                'updated_at' => $now,
            ];

            $events[] = [
                'id' => (string) Str::uuid(),
                'application_id' => $notification->application_id,
                'notification_id' => $notification->id,
                'device_id' => $device->id,
                'type' => $result['ok'] ? 'delivered' : 'failed',
                'country' => $device->country,
                'os_version' => $device->os_version,
                'occurred_at' => $now,
                'created_at' => $now,
                'updated_at' => $now,
            ];
        }

        DB::transaction(function () use ($logs, $events, $unregister, $notification, $sent, $delivered, $failed) {
            if ($logs) {
                DeliveryLog::insert($logs);
            }
            if ($events) {
                AnalyticsEvent::insert($events);
            }
            if ($unregister) {
                Device::whereIn('id', $unregister)->update(['active' => false]);
            }

            $notification->increment('sent_count', $sent);
            $notification->increment('delivered_count', $delivered);
            $notification->increment('failed_count', $failed);
        });

        $this->maybeComplete($notification->id);
    }

    private function maybeComplete(string $notificationId): void
    {
        $pending = NotificationTarget::where('notification_id', $notificationId)
            ->where('status', 'pending')
            ->exists();

        if (! $pending) {
            Notification::where('id', $notificationId)
                ->whereNotIn('status', ['canceled', 'sent'])
                ->update(['status' => 'sent', 'completed_at' => now()]);
        }
    }
}
