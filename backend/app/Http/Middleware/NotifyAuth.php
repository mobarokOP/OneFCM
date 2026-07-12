<?php

namespace App\Http\Middleware;

use App\Models\ApiKey;
use App\Models\Application;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Dual auth for the send API: accept either a REST API key (server-to-server)
 * or a dashboard Sanctum session (admin composing in the UI). Resolves and
 * attaches the target Application either way.
 */
class NotifyAuth
{
    public function handle(Request $request, Closure $next): Response
    {
        $bearer = $request->bearerToken();

        // Path 1: REST API key
        if ($bearer && str_starts_with($bearer, 'op_')) {
            $key = ApiKey::where('hash', hash('sha256', $bearer))
                ->whereNull('revoked_at')
                ->first();

            if (! $key || ! $key->application || $key->application->status !== 'active') {
                return $this->unauthorized();
            }

            $key->forceFill(['last_used_at' => now()])->saveQuietly();
            $request->attributes->set('application', $key->application);

            return $next($request);
        }

        // Path 2: Dashboard admin (Sanctum) — resolve via the guard explicitly
        // since this route group is not behind the auth:sanctum middleware.
        $user = auth('sanctum')->user();
        if (! $user) {
            return $this->unauthorized();
        }

        $request->setUserResolver(fn () => $user);

        $appId = $request->input('app_id')
            ?? $request->route('appId')
            ?? $request->header('X-OpenFCM-App')
            ?? $request->header('X-OpenPush-App'); // back-compat: SDK <= 1.0.0
        $app = Application::where('id', $appId)
            ->where('account_id', $user->account_id)
            ->first();

        if (! $app) {
            return response()->json([
                'error' => ['code' => 'app_not_found', 'message' => 'Application not found for this account.'],
            ], 404);
        }

        $request->attributes->set('application', $app);

        return $next($request);
    }

    private function unauthorized(): Response
    {
        return response()->json([
            'error' => ['code' => 'unauthorized', 'message' => 'A valid API key or session is required.'],
        ], 401);
    }
}
