package com.openfcm.sdk.internal

import android.app.Activity
import android.app.Application
import android.content.Context
import android.os.Bundle

/**
 * Shows the Android 13+ notification permission prompt automatically on the
 * first Activity that resumes after init — so host apps get OneSignal-style
 * "just add the SDK" behavior without writing any permission code.
 */
internal object PermissionAutoPrompter {

    @Volatile
    private var registered = false

    fun enable(context: Context) {
        if (registered) return
        val app = context.applicationContext as? Application ?: return
        registered = true

        app.registerActivityLifecycleCallbacks(object : Application.ActivityLifecycleCallbacks {
            override fun onActivityResumed(activity: Activity) {
                runCatching {
                    if (!PermissionHelper.hasPostNotificationsPermission(activity)) {
                        PermissionHelper.requestNotificationPermission(activity)
                    }
                }
                // One-shot: stop listening after the first resumed activity.
                app.unregisterActivityLifecycleCallbacks(this)
            }

            override fun onActivityCreated(activity: Activity, savedInstanceState: Bundle?) {}
            override fun onActivityStarted(activity: Activity) {}
            override fun onActivityPaused(activity: Activity) {}
            override fun onActivityStopped(activity: Activity) {}
            override fun onActivitySaveInstanceState(activity: Activity, outState: Bundle) {}
            override fun onActivityDestroyed(activity: Activity) {}
        })
    }
}
