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

        // Custom data travels alongside tracking metadata.
        $data['openfcm_notification_id'] = (string) $n->id;
        if ($n->deep_link) {
            $data['deep_link'] = $n->deep_link;
        }

        $androidNotification = array_filter([
            'title' => $n->title,
            'body' => $n->body,
            'image' => $n->image_url,
            'icon' => $n->small_icon,
            'channel_id' => $n->channel_id,
            'click_action' => $n->deep_link ? 'OPENFCM_DEEPLINK' : null,
        ], fn ($v) => $v !== null && $v !== '');

        return array_filter([
            'token' => $token,
            'data' => $data ?: null,
            'android' => array_filter([
                'priority' => $n->priority === 'high' ? 'HIGH' : 'NORMAL',
                'ttl' => $n->ttl.'s',
                'collapse_key' => $n->collapse_key,
                'notification' => $androidNotification ?: null,
            ], fn ($v) => $v !== null),
        ], fn ($v) => $v !== null);
    }
}
