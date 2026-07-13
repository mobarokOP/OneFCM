<?php

namespace App\Services;

use Google\Auth\AccessToken;
use Throwable;

/**
 * Verifies a Google Identity Services ID token (the "credential" returned by
 * "Continue with Google") and returns its claims, or null when invalid.
 */
class GoogleIdTokenVerifier
{
    private const VALID_ISSUERS = ['https://accounts.google.com', 'accounts.google.com'];

    public function verify(string $idToken): ?array
    {
        $clientId = config('services.google.client_id');

        if (empty($clientId)) {
            return null;
        }

        try {
            // Checks signature (against Google's published certs), expiry and audience.
            $claims = (new AccessToken())->verify($idToken, ['audience' => $clientId]);
        } catch (Throwable) {
            return null; // Malformed/forged tokens can throw instead of returning false.
        }

        if (! is_array($claims) || ! in_array($claims['iss'] ?? null, self::VALID_ISSUERS, true)) {
            return null;
        }

        return $claims;
    }
}
