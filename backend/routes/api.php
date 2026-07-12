<?php

use App\Http\Controllers\Admin\AnalyticsController;
use App\Http\Controllers\Admin\ApiKeyController;
use App\Http\Controllers\Admin\ApplicationController;
use App\Http\Controllers\Admin\DeliveryLogController;
use App\Http\Controllers\Admin\DeviceController as AdminDeviceController;
use App\Http\Controllers\Admin\SegmentController;
use App\Http\Controllers\Admin\TopicController as AdminTopicController;
use App\Http\Controllers\Admin\UserController as AdminUserController;
use App\Http\Controllers\Auth\AuthController;
use App\Http\Controllers\NotificationController;
use App\Http\Controllers\Sdk\DeviceController as SdkDeviceController;
use App\Http\Controllers\Sdk\EventController;
use App\Http\Controllers\Sdk\TagController;
use App\Http\Controllers\Sdk\TopicController as SdkTopicController;
use App\Http\Controllers\Sdk\UserSessionController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Health
|--------------------------------------------------------------------------
*/
Route::get('/health', fn () => ['status' => 'ok', 'time' => now()->toIso8601String()]);

/*
|--------------------------------------------------------------------------
| Dashboard auth (public)
|--------------------------------------------------------------------------
*/
Route::post('/auth/register', [AuthController::class, 'register']);
Route::post('/auth/login', [AuthController::class, 'login']);

/*
|--------------------------------------------------------------------------
| SDK — device-facing (App ID resolution, no secret)
|--------------------------------------------------------------------------
*/
Route::middleware('resolve.app')->group(function () {
    // Firebase client config for runtime init (no google-services.json needed).
    Route::get('/fcm-config', [\App\Http\Controllers\Sdk\FcmConfigController::class, 'show']);

    Route::post('/devices/register', [SdkDeviceController::class, 'register']);
    Route::patch('/devices/token', [SdkDeviceController::class, 'updateToken']);
    Route::delete('/devices/{deviceId}', [SdkDeviceController::class, 'destroy']);

    Route::post('/users/login', [UserSessionController::class, 'login']);
    Route::post('/users/logout', [UserSessionController::class, 'logout']);

    Route::post('/tags', [TagController::class, 'store']);
    Route::delete('/tags', [TagController::class, 'destroy']);

    Route::post('/topics/subscribe', [SdkTopicController::class, 'subscribe']);
    Route::post('/topics/unsubscribe', [SdkTopicController::class, 'unsubscribe']);

    Route::post('/events', [EventController::class, 'store']);
});

/*
|--------------------------------------------------------------------------
| Send API — REST key OR dashboard session (NotifyAuth)
|--------------------------------------------------------------------------
*/
Route::middleware('notify.auth')->group(function () {
    Route::post('/notifications', [NotificationController::class, 'store']);
    Route::get('/notifications/{id}', [NotificationController::class, 'show']);
});

/*
|--------------------------------------------------------------------------
| Dashboard (Sanctum)
|--------------------------------------------------------------------------
*/
Route::middleware('auth:sanctum')->group(function () {
    Route::get('/auth/me', [AuthController::class, 'me']);
    Route::post('/auth/logout', [AuthController::class, 'logout']);

    // Applications
    Route::get('/apps', [ApplicationController::class, 'index']);
    Route::post('/apps', [ApplicationController::class, 'store']);
    Route::get('/apps/{id}', [ApplicationController::class, 'show']);
    Route::patch('/apps/{id}', [ApplicationController::class, 'update']);
    Route::delete('/apps/{id}', [ApplicationController::class, 'destroy']);

    // API keys
    Route::get('/apps/{appId}/keys', [ApiKeyController::class, 'index']);
    Route::post('/apps/{appId}/keys', [ApiKeyController::class, 'store']);
    Route::delete('/apps/{appId}/keys/{keyId}', [ApiKeyController::class, 'destroy']);

    // Directory
    Route::get('/apps/{appId}/devices', [AdminDeviceController::class, 'index']);
    Route::get('/apps/{appId}/users', [AdminUserController::class, 'index']);
    Route::get('/apps/{appId}/topics', [AdminTopicController::class, 'index']);

    // Segments
    Route::get('/apps/{appId}/segments', [SegmentController::class, 'index']);
    Route::post('/apps/{appId}/segments', [SegmentController::class, 'store']);
    Route::patch('/apps/{appId}/segments/{id}', [SegmentController::class, 'update']);
    Route::delete('/apps/{appId}/segments/{id}', [SegmentController::class, 'destroy']);

    // Notifications (admin views)
    Route::get('/apps/{appId}/notifications', [NotificationController::class, 'index']);
    Route::get('/apps/{appId}/notifications/{id}', [NotificationController::class, 'adminShow']);
    Route::delete('/apps/{appId}/notifications/{id}', [NotificationController::class, 'destroy']);
    Route::post('/apps/{appId}/notifications/{id}/cancel', [NotificationController::class, 'cancel']);

    // Delivery logs
    Route::get('/apps/{appId}/notifications/{id}/logs', [DeliveryLogController::class, 'forNotification']);
    Route::get('/apps/{appId}/logs', [DeliveryLogController::class, 'index']);

    // Analytics
    Route::get('/apps/{appId}/analytics/overview', [AnalyticsController::class, 'overview']);
    Route::get('/apps/{appId}/analytics', [AnalyticsController::class, 'index']);
});
