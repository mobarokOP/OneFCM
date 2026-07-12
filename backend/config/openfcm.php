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
];
