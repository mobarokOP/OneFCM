<?php

return [
    // FCM HTTP v1
    'fcm' => [
        'endpoint' => 'https://fcm.googleapis.com/v1/projects/%s/messages:send',
        'scope' => 'https://www.googleapis.com/auth/firebase.messaging',
        'token_cache_ttl' => 3300, // seconds (< 1h google token lifetime)
    ],

    // Delivery pipeline
    'queue' => env('OPENFCM_QUEUE', 'push'),
    'batch_size' => (int) env('OPENFCM_BATCH_SIZE', 500),
    'max_retries' => (int) env('OPENFCM_MAX_RETRIES', 3),
    'retry_backoff' => [10, 60, 300], // seconds per attempt

    // Whether to actually hit FCM. When false (or no service account),
    // the worker simulates delivery so the platform is fully testable
    // without real Firebase credentials.
    'driver' => env('OPENFCM_DRIVER', 'auto'), // auto | fcm | log

    /*
    |--------------------------------------------------------------------------
    | Central Firebase project (OneSignal-style)
    |--------------------------------------------------------------------------
    | One Firebase project shared by every app so client Android apps need only
    | the OpenFCM SDK + App ID — no google-services.json. The SDK fetches the
    | (non-secret) client config from GET /v1/apps/{appId}/fcm-config and
    | initializes Firebase at runtime; the server sends via the service account.
    |
    | Apps may still override with their own project by storing a service
    | account on the application record; otherwise this default is used.
    */
    'default_client' => [
        'project_id' => env('OPENFCM_FCM_PROJECT_ID'),
        'app_id' => env('OPENFCM_FCM_CLIENT_APP_ID'),       // mobilesdk_app_id
        'api_key' => env('OPENFCM_FCM_CLIENT_API_KEY'),
        'sender_id' => env('OPENFCM_FCM_SENDER_ID'),         // project_number
        'storage_bucket' => env('OPENFCM_FCM_STORAGE_BUCKET'),
    ],

    // Service account for the central project. Provide the JSON inline
    // (OPENFCM_FCM_SERVICE_ACCOUNT_JSON) or a file path.
    'default_service_account' => env('OPENFCM_FCM_SERVICE_ACCOUNT_JSON')
        ?: (env('OPENFCM_FCM_SERVICE_ACCOUNT_PATH')
            ? @file_get_contents(env('OPENFCM_FCM_SERVICE_ACCOUNT_PATH'))
            : null),
];
