package com.openfcm.sdk.internal

import com.google.firebase.messaging.FirebaseMessaging
import com.openfcm.sdk.api.ApiResult
import com.openfcm.sdk.api.RegisterDeviceRequest
import com.openfcm.sdk.api.UpdateTokenRequest
import com.openfcm.sdk.storage.OpenFCMStore
import com.openfcm.sdk.work.OpenFCMWorkScheduler
import kotlinx.coroutines.tasks.await

/**
 * Owns device registration and FCM token lifecycle:
 * `POST /v1/devices/register` and `PATCH /v1/devices/token`.
 */
internal class DeviceManager(
    private val store: OpenFCMStore,
) {

    /**
     * Ensures the current device is registered with the backend. Fetches the
     * FCM token if one is not cached, then registers (or refreshes the token if
     * already registered). Safe to call repeatedly / on every launch.
     */
    suspend fun registerOrRefresh() {
        val token = store.fcmToken ?: fetchFcmToken()
        if (token == null) {
            Logger.w("No FCM token available; deferring registration.")
            return
        }
        store.setFcmToken(token)

        if (store.deviceId == null) {
            register(token)
        } else {
            updateToken(token)
        }
    }

    /** Registers the device, persisting the returned device id. */
    suspend fun register(fcmToken: String) {
        val appId = store.appId ?: return
        val context = OpenFCMCore.context()
        val permission = PermissionHelper.areNotificationsEnabled(context)
        store.setNotificationPermission(permission)

        val request = RegisterDeviceRequest(
            appId = appId,
            fcmToken = fcmToken,
            externalId = store.externalId,
            appVersion = DeviceInfo.appVersion(context),
            osVersion = DeviceInfo.osVersion(),
            language = DeviceInfo.language(),
            country = DeviceInfo.country(),
            timezone = DeviceInfo.timezone(),
            notificationPermission = permission,
        )

        when (val result = OpenFCMCore.requireApi().registerDevice(request)) {
            is ApiResult.Success -> {
                store.setDeviceId(result.value.deviceId)
                Logger.i("Device registered: ${result.value.deviceId}")
            }
            is ApiResult.Failure -> {
                Logger.w("Device registration failed: ${result.message}")
                if (result.retryable) {
                    OpenFCMCore.scheduler.enqueue(
                        path = "v1/devices/register",
                        method = "POST",
                        body = Dispatcher.json.encodeToString(RegisterDeviceRequest.serializer(), request),
                        uniqueKey = OpenFCMWorkScheduler.KEY_REGISTER,
                    )
                }
            }
        }
    }

    /** Pushes a new/refreshed FCM token to the backend. */
    suspend fun updateToken(fcmToken: String) {
        store.setFcmToken(fcmToken)
        val appId = store.appId ?: return
        val deviceId = store.deviceId ?: run {
            // Not registered yet — register instead of patching.
            register(fcmToken)
            return
        }

        val request = UpdateTokenRequest(appId = appId, deviceId = deviceId, fcmToken = fcmToken)
        Dispatcher.guarded(
            body = request,
            serializer = UpdateTokenRequest.serializer(),
            path = "v1/devices/token",
            method = "PATCH",
            uniqueKey = OpenFCMWorkScheduler.KEY_TOKEN,
            call = { OpenFCMCore.requireApi().updateToken(it) },
        ).onSuccess { Logger.i("FCM token synced.") }
    }

    private suspend fun fetchFcmToken(): String? = runCatching {
        FirebaseMessaging.getInstance().token.await()
    }.onFailure { Logger.w("Failed to fetch FCM token: ${it.message}") }.getOrNull()
}
