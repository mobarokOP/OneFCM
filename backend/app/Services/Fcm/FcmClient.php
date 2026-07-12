<?php

namespace App\Services\Fcm;

use App\Models\Application;
use Google\Auth\Credentials\ServiceAccountCredentials;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Thin wrapper around FCM HTTP v1. Fetches short-lived OAuth access tokens
 * from the application's service account (cached), and sends single messages.
 *
 * Result shape: ['ok'=>bool, 'message_id'=>?string, 'error_code'=>?string, 'error'=>?string, 'unregister'=>bool]
 */
class FcmClient
{
    public function send(Application $app, string $token, FcmMessage $message): array
    {
        $driver = $this->driverFor($app);

        if ($driver === 'log') {
            Log::info('[FCM:simulate] push', ['app' => $app->id, 'token' => substr($token, 0, 10)]);

            return ['ok' => true, 'message_id' => 'sim_'.bin2hex(random_bytes(8)), 'error_code' => null, 'error' => null, 'unregister' => false];
        }

        try {
            $accessToken = $this->accessToken($app);
        } catch (\Throwable $e) {
            return ['ok' => false, 'message_id' => null, 'error_code' => 'AUTH_ERROR', 'error' => $e->getMessage(), 'unregister' => false];
        }

        $url = sprintf(config('openfcm.fcm.endpoint'), $this->projectId($app));

        $response = Http::withToken($accessToken)
            ->acceptJson()
            ->timeout(15)
            ->post($url, ['message' => $message->toArray($token)]);

        if ($response->successful()) {
            return [
                'ok' => true,
                'message_id' => $response->json('name'),
                'error_code' => null,
                'error' => null,
                'unregister' => false,
            ];
        }

        $errorCode = $response->json('error.status') ?? 'UNKNOWN';
        $unregister = in_array($errorCode, ['UNREGISTERED', 'INVALID_ARGUMENT', 'NOT_FOUND'], true);

        return [
            'ok' => false,
            'message_id' => null,
            'error_code' => $errorCode,
            'error' => $response->json('error.message') ?? $response->body(),
            'unregister' => $unregister,
        ];
    }

    private function driverFor(Application $app): string
    {
        $configured = config('openfcm.driver', 'auto');

        if ($configured === 'fcm') {
            return 'fcm';
        }
        if ($configured === 'log') {
            return 'log';
        }

        // auto: use real FCM when an effective service account + project exist
        // (the app's own, or the central default project).
        return ($this->serviceAccount($app) && $this->projectId($app)) ? 'fcm' : 'log';
    }

    /** The app's own service account, or the central default. */
    private function serviceAccount(Application $app): ?array
    {
        if ($app->fcm_service_account) {
            return $app->fcmServiceAccountArray();
        }

        $default = config('openfcm.default_service_account');

        return $default ? json_decode($default, true) : null;
    }

    /** The app's own FCM project id, or the central default. */
    private function projectId(Application $app): ?string
    {
        return $app->fcm_project_id ?: config('openfcm.default_client.project_id');
    }

    private function accessToken(Application $app): string
    {
        return Cache::remember(
            'fcm:token:'.$this->projectId($app),
            config('openfcm.fcm.token_cache_ttl'),
            function () use ($app) {
                $creds = new ServiceAccountCredentials(
                    config('openfcm.fcm.scope'),
                    $this->serviceAccount($app)
                );

                $token = $creds->fetchAuthToken();

                return $token['access_token'];
            }
        );
    }
}
