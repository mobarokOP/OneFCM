package com.openfcm.sdk.messaging

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.os.Build
import androidx.annotation.RequiresApi
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import com.openfcm.sdk.R
import com.openfcm.sdk.internal.Logger
import com.openfcm.sdk.internal.OpenFCMCore

/**
 * Renders a [NotificationPayload] into a system notification: channel creation,
 * small/large icons, big-picture (image) style, priority mapping, and a content
 * PendingIntent routed through [NotificationTrampolineActivity] so taps are
 * tracked and deep links handled.
 */
internal class NotificationBuilder(private val context: Context) {

    private val manager = NotificationManagerCompat.from(context)

    suspend fun show(payload: NotificationPayload) {
        val config = OpenFCMCore.config
        val channelId = payload.channelId
            ?: config.defaultChannelId
            ?: context.getString(R.string.openfcm_default_channel_id)

        ensureChannel(channelId, config.defaultChannelName)

        val smallIcon = resolveSmallIcon(config.smallIconResId)
        val largeIcon = ImageLoader.load(payload.largeIcon)
        val bigPicture = ImageLoader.load(payload.imageUrl)

        val builder = NotificationCompat.Builder(context, channelId)
            .setSmallIcon(smallIcon)
            .setContentTitle(payload.title)
            .setContentText(payload.body)
            .setAutoCancel(true)
            .setPriority(mapPriority(payload.priority))
            .setContentIntent(contentIntent(payload))
            .setDeleteIntent(dismissIntent(payload))

        config.accentColor?.let { builder.setColor(it) }
        largeIcon?.let { builder.setLargeIcon(it) }

        if (bigPicture != null) {
            builder.setStyle(
                NotificationCompat.BigPictureStyle()
                    .bigPicture(bigPicture)
                    // Hide the large icon while expanded so the image gets full width.
                    .bigLargeIcon(null as android.graphics.Bitmap?)
            )
        } else if (!payload.body.isNullOrBlank()) {
            builder.setStyle(NotificationCompat.BigTextStyle().bigText(payload.body))
        }

        payload.collapseKey?.let { builder.setGroup(it) }

        val notificationId = payload.notificationId.hashCode()
        if (!manager.areNotificationsEnabled()) {
            Logger.w("Notifications are disabled; not posting.")
            return
        }
        try {
            manager.notify(payload.notificationId.ifBlank { notificationId.toString() }, notificationId, builder.build())
        } catch (se: SecurityException) {
            // POST_NOTIFICATIONS not granted on API 33+.
            Logger.w("Missing POST_NOTIFICATIONS permission: ${se.message}")
        }
    }

    private fun contentIntent(payload: NotificationPayload): PendingIntent {
        val intent = Intent(context, NotificationTrampolineActivity::class.java).apply {
            action = NotificationTrampolineActivity.ACTION_OPEN
            putExtras(payload.toBundle())
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
        }
        return PendingIntent.getActivity(
            context,
            payload.notificationId.hashCode(),
            intent,
            pendingIntentFlags(mutable = false),
        )
    }

    private fun dismissIntent(payload: NotificationPayload): PendingIntent {
        val intent = Intent(context, NotificationTrampolineActivity::class.java).apply {
            action = NotificationTrampolineActivity.ACTION_DISMISS
            putExtras(payload.toBundle())
        }
        return PendingIntent.getActivity(
            context,
            payload.notificationId.hashCode() + 1,
            intent,
            pendingIntentFlags(mutable = false),
        )
    }

    private fun pendingIntentFlags(mutable: Boolean): Int {
        var flags = PendingIntent.FLAG_UPDATE_CURRENT
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            flags = flags or if (mutable) PendingIntent.FLAG_MUTABLE else PendingIntent.FLAG_IMMUTABLE
        }
        return flags
    }

    private fun resolveSmallIcon(configured: Int?): Int {
        if (configured != null && configured != 0) return configured
        // Fall back to the host app's launcher icon.
        val appInfo = context.applicationInfo
        return if (appInfo.icon != 0) appInfo.icon else android.R.drawable.ic_dialog_info
    }

    private fun mapPriority(priority: String?): Int = when (priority?.lowercase()) {
        "high" -> NotificationCompat.PRIORITY_HIGH
        "low" -> NotificationCompat.PRIORITY_LOW
        "min" -> NotificationCompat.PRIORITY_MIN
        else -> NotificationCompat.PRIORITY_DEFAULT
    }

    private fun ensureChannel(channelId: String, channelName: String?) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
        createChannel(channelId, channelName)
    }

    @RequiresApi(Build.VERSION_CODES.O)
    private fun createChannel(channelId: String, channelName: String?) {
        val nm = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        if (nm.getNotificationChannel(channelId) != null) return
        val name = channelName ?: context.getString(R.string.openfcm_default_channel_name)
        val channel = NotificationChannel(channelId, name, NotificationManager.IMPORTANCE_HIGH).apply {
            description = context.getString(R.string.openfcm_default_channel_description)
            enableLights(true)
            lightColor = Color.BLUE
            enableVibration(true)
        }
        nm.createNotificationChannel(channel)
    }
}
