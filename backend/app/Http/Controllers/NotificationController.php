<?php

namespace App\Http\Controllers;

use App\Models\Notification;
use App\Models\Schedule;
use App\Services\AudienceResolver;
use App\Services\NotificationDispatcher;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

class NotificationController extends Controller
{
    public function __construct(
        private readonly AudienceResolver $resolver,
        private readonly NotificationDispatcher $dispatcher,
    ) {}

    /**
     * Create + queue (or schedule) a notification.
     * Auth: REST API key OR dashboard session (NotifyAuth middleware).
     */
    public function store(Request $request): JsonResponse
    {
        $app = $this->currentApp($request);

        $data = $request->validate([
            'title' => ['nullable', 'string', 'max:255'],
            'body' => ['required', 'string', 'max:2000'],
            'image_url' => ['nullable', 'url'],
            'large_icon' => ['nullable', 'string'],
            'small_icon' => ['nullable', 'string'],
            'deep_link' => ['nullable', 'string'],
            'data' => ['nullable', 'array'],
            'ttl' => ['nullable', 'integer', 'min:0', 'max:2419200'],
            'priority' => ['nullable', 'in:high,normal'],
            'collapse_key' => ['nullable', 'string'],
            'channel_id' => ['nullable', 'string'],
            'audience' => ['required', 'array'],
            'audience.type' => ['required', 'in:all,user_ids,device_ids,tags,segment,topic'],
            'audience.value' => ['nullable'],
            'schedule' => ['nullable', 'array'],
            'schedule.send_at' => ['nullable', 'date', 'after:now'],
            'schedule.timezone' => ['nullable', 'string'],
            'schedule.recurring' => ['nullable', 'in:daily,weekly,monthly'],
        ]);

        $estimated = $this->resolver->count($app, $data['audience']);

        $notification = $app->notifications()->create([
            'title' => $data['title'] ?? null,
            'body' => $data['body'],
            'image_url' => $data['image_url'] ?? null,
            'large_icon' => $data['large_icon'] ?? null,
            'small_icon' => $data['small_icon'] ?? null,
            'deep_link' => $data['deep_link'] ?? null,
            'data' => $data['data'] ?? null,
            'ttl' => $data['ttl'] ?? 2419200,
            'priority' => $data['priority'] ?? 'high',
            'collapse_key' => $data['collapse_key'] ?? null,
            'channel_id' => $data['channel_id'] ?? null,
            'audience' => $data['audience'],
            'status' => 'draft',
            'recipients_count' => $estimated,
        ]);

        $sendAt = $data['schedule']['send_at'] ?? null;

        if ($sendAt) {
            $notification->update(['status' => 'scheduled', 'scheduled_at' => Carbon::parse($sendAt)]);
            Schedule::create([
                'notification_id' => $notification->id,
                'send_at' => Carbon::parse($sendAt),
                'timezone' => $data['schedule']['timezone'] ?? null,
                'recurring' => $data['schedule']['recurring'] ?? null,
                'status' => 'pending',
            ]);

            return $this->item([
                'id' => $notification->id,
                'status' => 'scheduled',
                'estimated_recipients' => $estimated,
                'scheduled_at' => $notification->scheduled_at,
            ], 201);
        }

        $this->dispatcher->queue($notification);

        return $this->item([
            'id' => $notification->id,
            'status' => 'queued',
            'estimated_recipients' => $estimated,
        ], 201);
    }

    /** Public-ish detail by id (REST key or session). */
    public function show(Request $request, string $id): JsonResponse
    {
        $app = $this->currentApp($request);
        $n = $app->notifications()->findOrFail($id);

        return $this->item($this->present($n));
    }

    /** Admin detail scoped to an app (dashboard). */
    public function adminShow(Request $request, string $appId, string $id): JsonResponse
    {
        $app = $this->appForAdmin($request, $appId);

        return $this->item($this->present($app->notifications()->findOrFail($id)));
    }

    /** Admin list scoped to an app. */
    public function index(Request $request, string $appId): JsonResponse
    {
        $app = $this->appForAdmin($request, $appId);

        $paginator = $app->notifications()->latest()
            ->paginate($request->integer('per_page', 20))
            ->through(fn (Notification $n) => $this->present($n));

        return $this->collection($paginator);
    }

    /** Delete a past notification (history cleanup). Cascades logs/targets. */
    public function destroy(Request $request, string $appId, string $id): JsonResponse
    {
        $app = $this->appForAdmin($request, $appId);
        $n = $app->notifications()->findOrFail($id);

        if (in_array($n->status, ['queued', 'sending'], true)) {
            return response()->json([
                'error' => ['code' => 'in_flight', 'message' => 'Cancel the notification before deleting it.'],
            ], 422);
        }

        $n->delete();

        return response()->json(null, 204);
    }

    public function cancel(Request $request, string $appId, string $id): JsonResponse
    {
        $app = $this->appForAdmin($request, $appId);
        $n = $app->notifications()->findOrFail($id);

        if (in_array($n->status, ['sent', 'canceled'], true)) {
            return response()->json(['error' => ['code' => 'not_cancelable', 'message' => 'Notification already finalized.']], 422);
        }

        $n->update(['status' => 'canceled']);
        $n->schedule()?->update(['status' => 'canceled']);

        return $this->item(['id' => $n->id, 'status' => 'canceled']);
    }

    private function present(Notification $n): array
    {
        return [
            'id' => $n->id,
            'title' => $n->title,
            'body' => $n->body,
            'image_url' => $n->image_url,
            'deep_link' => $n->deep_link,
            'data' => $n->data,
            'priority' => $n->priority,
            'audience' => $n->audience,
            'status' => $n->status,
            'scheduled_at' => $n->scheduled_at,
            'completed_at' => $n->completed_at,
            'created_at' => $n->created_at,
            'stats' => [
                'recipients' => $n->recipients_count,
                'sent' => $n->sent_count,
                'delivered' => $n->delivered_count,
                'failed' => $n->failed_count,
                'opened' => $n->opened_count,
                'ctr' => $n->ctr,
            ],
        ];
    }
}
