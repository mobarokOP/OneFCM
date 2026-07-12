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

        $url = sprintf(config('openfcm.fcm.endpoint'), $app->fcm_project_id);

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

        // auto: use real FCM only when a service account + project are present.
        return ($app->fcm_service_account && $app->fcm_project_id) ? 'fcm' : 'log';
    }

    private function accessToken(Application $app): string
    {
        return Cache::remember(
            "fcm:token:{$app->id}",
            config('openfcm.fcm.token_cache_ttl'),
            function () use ($app) {
                $creds = new ServiceAccountCredentials(
                    config('openfcm.fcm.scope'),
                    $app->fcmServiceAccountArray()
                );

                $token = $creds->fetchAuthToken();

                return $token['access_token'];
            }
        );
    }
}
