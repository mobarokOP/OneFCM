<?php

namespace App\Http\Controllers\Sdk;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Serves the non-secret Firebase client config the Android SDK uses to
 * initialize Firebase at runtime — so client apps need no google-services.json
 * (OneSignal-style). Values come from the central project (config/openfcm.php).
 */
class FcmConfigController extends Controller
{
    public function show(Request $request): JsonResponse
    {
        // Ensure the app id is valid (resolve.app middleware attached it).
        $this->currentApp($request);

        $client = config('openfcm.default_client');

        $required = ['project_id', 'app_id', 'api_key', 'sender_id'];
        foreach ($required as $key) {
            if (empty($client[$key])) {
                return response()->json([
                    'error' => [
                        'code' => 'fcm_not_configured',
                        'message' => 'Push is not configured on this server yet.',
                    ],
                ], 404);
            }
        }

        return $this->item([
            'project_id' => $client['project_id'],
            'app_id' => $client['app_id'],
            'api_key' => $client['api_key'],
            'sender_id' => (string) $client['sender_id'],
            'storage_bucket' => $client['storage_bucket'] ?? null,
        ]);
    }
}
