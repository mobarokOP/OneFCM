<?php

return [
    'paths' => ['v1/*', 'api/*', 'sanctum/csrf-cookie'],
    'allowed_methods' => ['*'],
    'allowed_origins' => [
        // OneFCM production
        'https://dashboard.onefcm.com',
        'https://onefcm.com',
        // Legacy beta deployment
        'https://beta.kathgolap.online',
        'http://beta.kathgolap.online',
        // Local development
        'http://localhost:5173',
    ],
    'allowed_origins_patterns' => [],
    'allowed_headers' => ['*'],
    'exposed_headers' => [],
    'max_age' => 0,
    'supports_credentials' => true,
];
