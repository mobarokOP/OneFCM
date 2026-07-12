<?php

namespace App\Http\Middleware;

use App\Models\Application;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * SDK auth: resolves the public App ID (no secret) from header or body,
 * and attaches the Application to the request. Used by device-facing routes.
 */
class ResolveApplication
{
    public function handle(Request $request, Closure $next): Response
    {
        $appId = $request->header('X-OpenFCM-App')
            ?? $request->header('X-OpenPush-App') // back-compat: SDK <= 1.0.0
            ?? $request->input('app_id')
            ?? $request->query('app_id');

        if (! $appId) {
            return response()->json([
                'error' => ['code' => 'missing_app_id', 'message' => 'App ID is required.'],
            ], 401);
        }

        $app = Application::find($appId);

        if (! $app || $app->status !== 'active') {
            return response()->json([
                'error' => ['code' => 'invalid_app', 'message' => 'Unknown or inactive application.'],
            ], 401);
        }

        $request->attributes->set('application', $app);

        return $next($request);
    }
}
