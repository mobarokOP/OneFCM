<?php

namespace App\Services\Fcm;

use Google\Auth\Credentials\ServiceAccountCredentials;
use Illuminate\Support\Facades\Http;
use RuntimeException;

/**
 * Talks to the Firebase Management API using an app's service account to
 * auto-derive the CLIENT config the Android SDK needs (sender id, client
 * api key, mobilesdk app id) — so admins upload one JSON file and nothing
 * else, OneSignal-style.
 *
 * If the Firebase project has no Android app registered, one is created
 * using the application's package name.
 */
class FirebaseManagement
{
    private const API = 'https://firebase.googleapis.com/v1beta1';

    private const SCOPE = 'https://www.googleapis.com/auth/cloud-platform';

    /**
     * @param  array  $serviceAccount  decoded service-account JSON
     * @param  string|null  $packageName  preferred Android package
     * @return array{project_id:string,project_number:string,app_id:string,api_key:string,storage_bucket:?string,package_name:?string}
     *
     * @throws RuntimeException with a human-readable message on failure
     */
    public function deriveClientConfig(array $serviceAccount, ?string $packageName): array
    {
        $projectId = $serviceAccount['project_id']
            ?? throw new RuntimeException('Service account JSON has no project_id.');

        $token = $this->accessToken($serviceAccount);

        // 1. Project details → project number (FCM sender id).
        $project = $this->get($token, self::API."/projects/{$projectId}");
        $projectNumber = $project['projectNumber']
            ?? throw new RuntimeException('Could not read the Firebase project number.');

        // 2. Find (or create) an Android app in the project.
        $app = $this->findAndroidApp($token, $projectId, $packageName)
            ?? $this->createAndroidApp($token, $projectId, $packageName);

        // 3. Pull its config (the google-services.json content) → api key + app id.
        $config = $this->get($token, self::API."/{$app['name']}/config");
        $parsed = json_decode(base64_decode($config['configFileContents'] ?? ''), true)
            ?: throw new RuntimeException('Could not read the Android app config from Firebase.');

        $client = $parsed['client'][0] ?? [];
        $apiKey = $client['api_key'][0]['current_key'] ?? null;
        $mobileSdkAppId = $client['client_info']['mobilesdk_app_id'] ?? $app['appId'] ?? null;

        if (! $apiKey || ! $mobileSdkAppId) {
            throw new RuntimeException('Firebase did not return a client API key yet. Try again in a minute.');
        }

        return [
            'project_id' => $projectId,
            'project_number' => (string) $projectNumber,
            'app_id' => $mobileSdkAppId,
            'api_key' => $apiKey,
            'storage_bucket' => $parsed['project_info']['storage_bucket'] ?? null,
            'package_name' => $app['packageName'] ?? $packageName,
        ];
    }

    private function findAndroidApp(string $token, string $projectId, ?string $packageName): ?array
    {
        $list = $this->get($token, self::API."/projects/{$projectId}/androidApps", ['pageSize' => 100]);
        $apps = $list['apps'] ?? [];

        if (! $apps) {
            return null;
        }

        if ($packageName) {
            foreach ($apps as $app) {
                if (($app['packageName'] ?? null) === $packageName) {
                    return $app;
                }
            }
        }

        return $apps[0];
    }

    private function createAndroidApp(string $token, string $projectId, ?string $packageName): array
    {
        if (! $packageName) {
            throw new RuntimeException(
                'No Android app exists in this Firebase project. Set the application\'s '.
                'Android package name first so one can be registered automatically.'
            );
        }

        $op = Http::withToken($token)->acceptJson()
            ->post(self::API."/projects/{$projectId}/androidApps", [
                'packageName' => $packageName,
                'displayName' => 'OpenFCM '.$packageName,
            ]);

        if ($op->failed()) {
            throw new RuntimeException('Could not register an Android app in Firebase: '.
                ($op->json('error.message') ?? "HTTP {$op->status()}"));
        }

        // App creation is an async operation — poll briefly for the app to appear.
        foreach ([2, 3, 5] as $wait) {
            sleep($wait);
            if ($app = $this->findAndroidApp($token, $projectId, $packageName)) {
                return $app;
            }
        }

        throw new RuntimeException('Firebase is still creating the Android app. Save again in a minute.');
    }

    private function get(string $token, string $url, array $query = []): array
    {
        $response = Http::withToken($token)->acceptJson()->get($url, $query);

        if ($response->failed()) {
            $message = $response->json('error.message') ?? "HTTP {$response->status()}";

            throw new RuntimeException(match ($response->status()) {
                401, 403 => 'Firebase rejected the service account (check its permissions): '.$message,
                404 => 'Firebase project not found for this service account.',
                default => 'Firebase Management API error: '.$message,
            });
        }

        return $response->json() ?? [];
    }

    /** Exchange the service account for an OAuth token (isolated for testability). */
    protected function accessToken(array $serviceAccount): string
    {
        $creds = new ServiceAccountCredentials(self::SCOPE, $serviceAccount);
        $token = $creds->fetchAuthToken();

        return $token['access_token']
            ?? throw new RuntimeException('Could not authenticate the service account with Google.');
    }
}
