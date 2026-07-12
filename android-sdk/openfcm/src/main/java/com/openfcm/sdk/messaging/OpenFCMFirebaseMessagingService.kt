package com.openfcm.sdk.messaging

import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage
import com.openfcm.sdk.internal.DeviceManager
import com.openfcm.sdk.internal.EventTracker
import com.openfcm.sdk.internal.Logger
import com.openfcm.sdk.internal.OpenFCMCore
import kotlinx.coroutines.runBlocking

/**
 * OpenFCM's FCM entry point, registered automatically via the library manifest.
 *
 * - [onNewToken] persists and PATCHes the refreshed token to `/v1/devices/token`.
 * - [onMessageReceived] parses the OpenFCM data payload, fires the `received`
 *   tracking event, and posts a rich notification (channel, icons, image, deep
 *   link) — for both foreground and background delivery.
 *
 * Work runs with [runBlocking] because FCM callbacks execute on a background
 * thread and the process may be reclaimed once the method returns.
 */
class OpenFCMFirebaseMessagingService : FirebaseMessagingService() {

    override fun onNewToken(token: String) {
        Logger.i("onNewToken received.")
        runBlocking {
            if (!OpenFCMCore.ensureInitialized(applicationContext)) {
                // No app id yet: persist so init() can pick it up later.
                if (OpenFCMCore.isInitialized) OpenFCMCore.store.setFcmToken(token)
                return@runBlocking
            }
            DeviceManager(OpenFCMCore.store).updateToken(token)
        }
    }

    override fun onMessageReceived(message: RemoteMessage) {
        Logger.d("Message received: ${message.messageId}")
        val data = buildData(message)
        val payload = NotificationPayload.fromData(data)

        runBlocking {
            OpenFCMCore.ensureInitialized(applicationContext)
            // 1. Track delivery.
            EventTracker(OpenFCMCore.store).track(payload.notificationId, EventTracker.Type.RECEIVED)
            // 2. Render the notification.
            NotificationBuilder(applicationContext).show(payload)
        }
    }

    /** Merges FCM notification block (if any) into the OpenFCM data map. */
    private fun buildData(message: RemoteMessage): Map<String, String> {
        val map = HashMap(message.data)
        message.notification?.let { n ->
            n.title?.let { map.putIfAbsent(NotificationPayload.KEY_TITLE, it) }
            n.body?.let { map.putIfAbsent(NotificationPayload.KEY_BODY, it) }
            n.imageUrl?.let { map.putIfAbsent(NotificationPayload.KEY_IMAGE, it.toString()) }
            n.channelId?.let { map.putIfAbsent(NotificationPayload.KEY_CHANNEL, it) }
        }
        return map
    }
}
