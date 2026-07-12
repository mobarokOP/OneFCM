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
    | History retention (free-tier friendly)
    |--------------------------------------------------------------------------
    | Keeps the database light: each app retains only its most recent finished
    | notifications, and raw per-device rows expire after a fixed window.
    | Aggregate counters on the kept notifications survive forever.
    | Enforced daily by `openfcm:prune-history`. Set a value to 0 to disable
    | that prune. Draft/queued/scheduled/sending notifications are never pruned.
    */
    'retention' => [
        // Finished (sent|failed|canceled) notifications kept per application.
        'notifications_per_app' => (int) env('OPENFCM_RETENTION_NOTIFICATIONS_PER_APP', 30),

        // Days of per-device delivery logs + target rows to keep.
        'delivery_log_days' => (int) env('OPENFCM_RETENTION_DELIVERY_LOG_DAYS', 30),

        // Days of raw analytics events to keep (dashboard charts read these).
        'analytics_days' => (int) env('OPENFCM_RETENTION_ANALYTICS_DAYS', 90),
    ],

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
