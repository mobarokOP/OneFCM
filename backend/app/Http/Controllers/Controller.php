<?php

namespace App\Http\Controllers;

use App\Models\Application;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

abstract class Controller
{
    /** Standard single-resource envelope. */
    protected function item(mixed $data, int $status = 200): JsonResponse
    {
        return response()->json(['data' => $data], $status);
    }

    /** Standard collection envelope with pagination meta. */
    protected function collection(LengthAwarePaginator $p, array $meta = []): JsonResponse
    {
        return response()->json([
            'data' => $p->items(),
            'meta' => array_merge([
                'page' => $p->currentPage(),
                'per_page' => $p->perPage(),
                'total' => $p->total(),
            ], $meta),
        ]);
    }

    /** Resolve an application belonging to the authenticated admin's account, or 404. */
    protected function appForAdmin(Request $request, string $appId): Application
    {
        $app = Application::where('id', $appId)
            ->where('account_id', $request->user()->account_id)
            ->first();

        if (! $app) {
            throw new NotFoundHttpException('Application not found.');
        }

        return $app;
    }

    /** The application attached by SDK/API-key middleware. */
    protected function currentApp(Request $request): Application
    {
        return $request->attributes->get('application');
    }
}
