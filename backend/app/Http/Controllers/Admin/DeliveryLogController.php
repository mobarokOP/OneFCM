<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\DeliveryLog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DeliveryLogController extends Controller
{
    /** Logs for a single notification. */
    public function forNotification(Request $request, string $appId, string $notificationId): JsonResponse
    {
        $app = $this->appForAdmin($request, $appId);
        $app->notifications()->findOrFail($notificationId);

        $query = DeliveryLog::where('notification_id', $notificationId)->latest('attempted_at');

        if ($status = $request->query('status')) {
            $query->where('status', $status);
        }

        return $this->collection($this->paginate($request, $query), $this->retentionMeta());
    }

    /** All logs across an app. */
    public function index(Request $request, string $appId): JsonResponse
    {
        $app = $this->appForAdmin($request, $appId);

        $query = DeliveryLog::whereIn('notification_id', $app->notifications()->select('id'))
            ->with('notification:id,title')
            ->latest('attempted_at');

        if ($status = $request->query('status')) {
            $query->where('status', $status);
        }

        return $this->collection($this->paginate($request, $query), $this->retentionMeta());
    }

    private function retentionMeta(): array
    {
        return [
            'retention' => [
                'delivery_log_days' => (int) config('openfcm.retention.delivery_log_days'),
            ],
        ];
    }

    private function paginate(Request $request, $query)
    {
        return $query->paginate($request->integer('per_page', 25))
            ->through(fn (DeliveryLog $l) => [
                'id' => $l->id,
                'notification_id' => $l->notification_id,
                'notification_title' => $l->notification?->title,
                'device_id' => $l->device_id,
                'status' => $l->status,
                'fcm_message_id' => $l->fcm_message_id,
                'error_code' => $l->error_code,
                'error' => $l->error,
                'retry_count' => $l->retry_count,
                'attempted_at' => $l->attempted_at,
            ]);
    }
}
