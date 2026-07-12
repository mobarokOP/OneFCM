package com.openfcm.sdk.messaging

import android.os.Bundle

/**
 * A parsed OpenFCM notification. Built from the FCM `data` payload the backend
 * sends (see the Notification Composer fields in the API contract).
 *
 * The backend delivers everything as string data fields so the SDK controls
 * rendering, tracking, and deep linking uniformly whether the app is in the
 * foreground or background.
 */
data class NotificationPayload(
    /** Server-side notification id — used for received/opened/clicked tracking. */
    val notificationId: String,
    val title: String?,
    val body: String?,
    val imageUrl: String?,
    val largeIcon: String?,
    val smallIcon: String?,
    val channelId: String?,
    val deepLink: String?,
    val priority: String?,
    val collapseKey: String?,
    /** Arbitrary custom key/value data attached by the sender. */
    val data: Map<String, String>,
) {
    companion object {
        internal const val KEY_NOTIFICATION_ID = "op_notification_id"
        internal const val KEY_TITLE = "op_title"
        internal const val KEY_BODY = "op_body"
        internal const val KEY_IMAGE = "op_image_url"
        internal const val KEY_LARGE_ICON = "op_large_icon"
        internal const val KEY_SMALL_ICON = "op_small_icon"
        internal const val KEY_CHANNEL = "op_channel_id"
        internal const val KEY_DEEP_LINK = "op_deep_link"
        internal const val KEY_PRIORITY = "op_priority"
        internal const val KEY_COLLAPSE_KEY = "op_collapse_key"
        internal const val KEY_DATA = "op_data"

        private val reserved = setOf(
            KEY_NOTIFICATION_ID, KEY_TITLE, KEY_BODY, KEY_IMAGE, KEY_LARGE_ICON,
            KEY_SMALL_ICON, KEY_CHANNEL, KEY_DEEP_LINK, KEY_PRIORITY,
            KEY_COLLAPSE_KEY, KEY_DATA,
        )

        /** Builds a payload from the raw FCM data map. */
        fun fromData(data: Map<String, String>): NotificationPayload {
            val custom = data.filterKeys { it !in reserved }
            return NotificationPayload(
                notificationId = data[KEY_NOTIFICATION_ID] ?: "",
                title = data[KEY_TITLE],
                body = data[KEY_BODY],
                imageUrl = data[KEY_IMAGE],
                largeIcon = data[KEY_LARGE_ICON],
                smallIcon = data[KEY_SMALL_ICON],
                channelId = data[KEY_CHANNEL],
                deepLink = data[KEY_DEEP_LINK],
                priority = data[KEY_PRIORITY],
                collapseKey = data[KEY_COLLAPSE_KEY],
                data = custom,
            )
        }

        /** Reconstructs a payload from Intent extras set by the trampoline. */
        fun fromBundle(bundle: Bundle): NotificationPayload {
            val map = bundle.keySet().associateWith { key -> bundle.getString(key) ?: "" }
            return fromData(map)
        }
    }

    /** Flattens this payload back into a Bundle for Intent transport. */
    fun toBundle(): Bundle = Bundle().apply {
        putString(KEY_NOTIFICATION_ID, notificationId)
        title?.let { putString(KEY_TITLE, it) }
        body?.let { putString(KEY_BODY, it) }
        imageUrl?.let { putString(KEY_IMAGE, it) }
        largeIcon?.let { putString(KEY_LARGE_ICON, it) }
        smallIcon?.let { putString(KEY_SMALL_ICON, it) }
        channelId?.let { putString(KEY_CHANNEL, it) }
        deepLink?.let { putString(KEY_DEEP_LINK, it) }
        priority?.let { putString(KEY_PRIORITY, it) }
        collapseKey?.let { putString(KEY_COLLAPSE_KEY, it) }
        data.forEach { (k, v) -> putString(k, v) }
    }
}

/** Callback invoked when the user opens/taps an OpenFCM notification. */
fun interface NotificationOpenHandler {
    fun onOpened(payload: NotificationPayload)
}
