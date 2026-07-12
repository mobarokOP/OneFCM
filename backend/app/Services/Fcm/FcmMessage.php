<?php

namespace App\Services\Fcm;

use App\Models\Notification;

/**
 * Builds an FCM HTTP v1 message payload from a Notification.
 * Uses the `android` block for Android-only delivery semantics.
 */
class FcmMessage
{
    public function __construct(private readonly Notification $notification) {}

    public static function fromNotification(Notification $n): self
    {
        return new self($n);
    }

    public function toArray(string $token): array
    {
        $n = $this->notification;

        $data = collect($n->data ?? [])
            ->map(fn ($v) => is_string($v) ? $v : json_encode($v))
            ->all();

        // OpenFCM data keys (op_*) the SDK reads to render + track. Kept in the
        // data payload so the SDK controls rendering, deep links, and tracking.
        $data += array_filter([
            'op_notification_id' => (string) $n->id,
            'op_title' => $n->title,
            'op_body' => $n->body,
            'op_image_url' => $n->image_url,
            'op_large_icon' => $n->large_icon,
            'op_small_icon' => $n->small_icon,
            'op_channel_id' => $n->channel_id,
            'op_deep_link' => $n->deep_link,
            'op_priority' => $n->priority,
            'op_collapse_key' => $n->collapse_key,
        ], fn ($v) => $v !== null && $v !== '');

        // DATA-ONLY message (no `notification` block), OneSignal-style: this way
        // onMessageReceived always runs — even in the background — so the SDK
        // renders the notification itself and taps go through the trampoline
        // (tracking + deep links). With a `notification` block, background
        // messages are displayed by the system and taps just open the launcher.
        return array_filter([
            'token' => $token,
            'data' => $data ?: null,
            'android' => array_filter([
                'priority' => $n->priority === 'high' ? 'HIGH' : 'NORMAL',
                'ttl' => $n->ttl.'s',
                'collapse_key' => $n->collapse_key,
            ], fn ($v) => $v !== null),
        ], fn ($v) => $v !== null);
    }
}
