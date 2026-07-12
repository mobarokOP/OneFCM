<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Application;
use App\Models\AuditLog;
use App\Services\Fcm\FirebaseManagement;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class ApplicationController extends Controller
{
    public function __construct(private readonly FirebaseManagement $firebase) {}

    public function index(Request $request): JsonResponse
    {
        $apps = Application::where('account_id', $request->user()->account_id)
            ->withCount(['devices', 'users'])
            ->latest()
            ->get()
            ->map(fn ($a) => $this->present($a));

        return $this->item($apps);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'package_name' => ['nullable', 'string', 'max:190'],
            'fcm_project_id' => ['nullable', 'string', 'max:190'],
            'fcm_service_account' => ['nullable'],
            'rate_limit' => ['nullable', 'integer', 'min:1'],
        ]);

        $serviceAccount = $this->normalizedServiceAccount($data['fcm_service_account'] ?? null);

        $app = Application::create([
            'account_id' => $request->user()->account_id,
            'name' => $data['name'],
            'package_name' => $data['package_name'] ?? null,
            'fcm_project_id' => $serviceAccount['project_id'] ?? ($data['fcm_project_id'] ?? null),
            'fcm_service_account' => $serviceAccount ? json_encode($serviceAccount) : null,
            'rate_limit' => $data['rate_limit'] ?? 1000,
        ]);

        if ($serviceAccount) {
            $this->syncFirebase($app, $serviceAccount);
        }

        AuditLog::record('application.created', $request->user(), ['name' => $app->name], 'application', $app->id);

        return $this->item($this->present($app), 201);
    }

    public function show(Request $request, string $id): JsonResponse
    {
        $app = $this->appForAdmin($request, $id)->loadCount(['devices', 'users']);

        return $this->item($this->present($app));
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $app = $this->appForAdmin($request, $id);

        $data = $request->validate([
            'name' => ['sometimes', 'string', 'max:120'],
            'package_name' => ['nullable', 'string', 'max:190'],
            'fcm_project_id' => ['nullable', 'string', 'max:190'],
            'fcm_service_account' => ['nullable'],
            'status' => ['sometimes', 'in:active,paused'],
            'rate_limit' => ['sometimes', 'integer', 'min:1'],
        ]);

        $serviceAccount = null;
        if (array_key_exists('fcm_service_account', $data) && $data['fcm_service_account'] !== null) {
            $serviceAccount = $this->normalizedServiceAccount($data['fcm_service_account']);
            $data['fcm_service_account'] = json_encode($serviceAccount);
            $data['fcm_project_id'] = $serviceAccount['project_id'];
        }

        $app->update($data);

        if ($serviceAccount) {
            $this->syncFirebase($app, $serviceAccount);
        }

        AuditLog::record('application.updated', $request->user(), [], 'application', $app->id);

        return $this->item($this->present($app->loadCount(['devices', 'users'])));
    }

    public function destroy(Request $request, string $id): JsonResponse
    {
        $app = $this->appForAdmin($request, $id);
        $app->delete();
        AuditLog::record('application.deleted', $request->user(), [], 'application', $id);

        return response()->json(null, 204);
    }

    /** Accepts array or JSON string; validates it looks like a service account. */
    private function normalizedServiceAccount(mixed $raw): ?array
    {
        if ($raw === null || $raw === '') {
            return null;
        }

        $decoded = is_array($raw) ? $raw : json_decode((string) $raw, true);

        if (! is_array($decoded)
            || empty($decoded['project_id'])
            || empty($decoded['client_email'])
            || empty($decoded['private_key'])) {
            throw ValidationException::withMessages([
                'fcm_service_account' => ['This does not look like a Firebase service account JSON (need project_id, client_email, private_key).'],
            ]);
        }

        return $decoded;
    }

    /** Derives + stores the Firebase client config; failures are stored, not thrown. */
    private function syncFirebase(Application $app, array $serviceAccount): void
    {
        try {
            $config = $this->firebase->deriveClientConfig($serviceAccount, $app->package_name);
            $app->forceFill([
                'fcm_client_config' => $config,
                'fcm_sync_error' => null,
                'fcm_synced_at' => now(),
            ])->save();
        } catch (\Throwable $e) {
            $app->forceFill([
                'fcm_client_config' => null,
                'fcm_sync_error' => $e->getMessage(),
                'fcm_synced_at' => null,
            ])->save();
        }
    }

    private function present(Application $app): array
    {
        $sent30d = $app->notifications()
            ->where('created_at', '>=', now()->subDays(30))
            ->sum('sent_count');

        $cfg = $app->fcm_client_config;

        return [
            'id' => $app->id,
            'name' => $app->name,
            'package_name' => $app->package_name,
            'fcm_project_id' => $app->fcm_project_id,
            'has_service_account' => (bool) $app->fcm_service_account,
            'fcm' => [
                'project_id' => $app->fcm_project_id,
                'synced' => (bool) $cfg,
                'synced_at' => $app->fcm_synced_at,
                'sender_id' => $cfg['project_number'] ?? null,
                'package_name' => $cfg['package_name'] ?? $app->package_name,
                'error' => $app->fcm_sync_error,
            ],
            'status' => $app->status,
            'rate_limit' => $app->rate_limit,
            'created_at' => $app->created_at,
            'stats' => [
                'devices' => $app->devices_count ?? $app->devices()->count(),
                'users' => $app->users_count ?? $app->users()->count(),
                'sent_30d' => (int) $sent30d,
            ],
        ];
    }
}
