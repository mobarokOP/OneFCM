package com.openfcm.sdk.internal

import android.Manifest
import android.app.Activity
import android.content.Context
import android.content.pm.PackageManager
import android.os.Build
import androidx.core.app.NotificationManagerCompat
import androidx.core.content.ContextCompat

/**
 * Helpers for the Android 13+ (`POST_NOTIFICATIONS`) runtime permission and the
 * user-level notification enablement state.
 */
object PermissionHelper {

    const val POST_NOTIFICATIONS_REQUEST_CODE = 0xF00D

    /** True when notifications will actually be shown to the user. */
    fun areNotificationsEnabled(context: Context): Boolean =
        NotificationManagerCompat.from(context).areNotificationsEnabled()

    /** True when the runtime POST_NOTIFICATIONS permission is granted (or not required). */
    fun hasPostNotificationsPermission(context: Context): Boolean {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) return true
        return ContextCompat.checkSelfPermission(
            context,
            Manifest.permission.POST_NOTIFICATIONS,
        ) == PackageManager.PERMISSION_GRANTED
    }

    /**
     * Requests the runtime notification permission on API 33+. On older versions
     * this is a no-op (permission is implicitly granted). Call from an Activity;
     * handle the result in [Activity.onRequestPermissionsResult].
     */
    fun requestNotificationPermission(activity: Activity) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) return
        if (hasPostNotificationsPermission(activity)) return
        activity.requestPermissions(
            arrayOf(Manifest.permission.POST_NOTIFICATIONS),
            POST_NOTIFICATIONS_REQUEST_CODE,
        )
    }
}
