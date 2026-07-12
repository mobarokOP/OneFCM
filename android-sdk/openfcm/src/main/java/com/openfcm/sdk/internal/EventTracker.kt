package com.openfcm.sdk.internal

import com.openfcm.sdk.api.EventRequest
import com.openfcm.sdk.storage.OpenFCMStore
import java.util.Date
import java.util.Locale
import java.util.TimeZone
import java.text.SimpleDateFormat

/**
 * Notification tracking via `POST /v1/events` (received | opened | clicked).
 * All events route through the offline queue so tracking survives poor
 * connectivity — analytics accuracy matters.
 */
internal class EventTracker(
    private val store: OpenFCMStore,
) {

    enum class Type(val wire: String) {
        RECEIVED("received"),
        OPENED("opened"),
        CLICKED("clicked"),
    }

    suspend fun track(notificationId: String, type: Type) {
        if (notificationId.isBlank()) {
            Logger.d("Skipping ${type.wire} event: missing notification id.")
            return
        }
        val appId = store.appId
        val deviceId = store.deviceId
        if (appId == null || deviceId == null) {
            Logger.w("Skipping ${type.wire} event: device not registered.")
            return
        }

        val request = EventRequest(
            appId = appId,
            deviceId = deviceId,
            notificationId = notificationId,
            type = type.wire,
            occurredAt = iso8601Now(),
        )
        Dispatcher.guarded(
            body = request,
            serializer = EventRequest.serializer(),
            path = "v1/events",
            method = "POST",
            // Each event is distinct; never collapse.
            uniqueKey = null,
            call = { OpenFCMCore.requireApi().sendEvent(it) },
        )
    }

    private fun iso8601Now(): String {
        val fmt = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss'Z'", Locale.US)
        fmt.timeZone = TimeZone.getTimeZone("UTC")
        return fmt.format(Date())
    }
}
