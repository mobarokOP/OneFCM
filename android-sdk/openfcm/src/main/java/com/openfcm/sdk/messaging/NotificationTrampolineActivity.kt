package com.openfcm.sdk.messaging

import android.app.Activity
import android.content.Intent
import android.net.Uri
import android.os.Bundle
import com.openfcm.sdk.internal.EventTracker
import com.openfcm.sdk.internal.Logger
import com.openfcm.sdk.internal.OpenFCMCore
import kotlinx.coroutines.launch

/**
 * Invisible trampoline launched when the user taps (or dismisses) a notification.
 * Responsibilities:
 *  1. Fire the `opened`/`clicked` tracking event.
 *  2. Invoke the host's [NotificationOpenHandler].
 *  3. Route the deep link (or open the app's launcher activity).
 *
 * Using a trampoline (rather than a direct PendingIntent to the host) guarantees
 * click tracking runs exactly once regardless of the app's current state.
 */
class NotificationTrampolineActivity : Activity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val extras = intent?.extras
        if (extras == null) {
            finish()
            return
        }
        val payload = NotificationPayload.fromBundle(extras)

        when (intent.action) {
            ACTION_DISMISS -> {
                Logger.d("Notification dismissed: ${payload.notificationId}")
                finish()
                return
            }
            else -> handleOpen(payload)
        }
        finish()
    }

    private fun handleOpen(payload: NotificationPayload) {
        // Bootstrap + track. Runs on the SDK scope so it survives this Activity.
        OpenFCMCore.scope.launch {
            OpenFCMCore.ensureInitialized(applicationContext)
            val tracker = EventTracker(OpenFCMCore.store)
            // "opened" = app brought to foreground; "clicked" = user interaction.
            tracker.track(payload.notificationId, EventTracker.Type.CLICKED)
            tracker.track(payload.notificationId, EventTracker.Type.OPENED)
        }

        // Dispatch to the host handler (or buffer if not yet set).
        val handler = OpenFCMCore.openHandler
        if (handler != null) {
            runCatching { handler.onOpened(payload) }
                .onFailure { Logger.e("openHandler threw", it) }
        } else {
            OpenFCMCore.pendingOpen = payload
        }

        launchTarget(payload)
    }

    private fun launchTarget(payload: NotificationPayload) {
        val launch: Intent? = when {
            !payload.deepLink.isNullOrBlank() -> Intent(Intent.ACTION_VIEW, Uri.parse(payload.deepLink)).apply {
                setPackage(packageName)
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                putExtras(payload.toBundle())
            }
            else -> packageManager.getLaunchIntentForPackage(packageName)?.apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                putExtras(payload.toBundle())
            }
        }

        if (launch == null) {
            Logger.w("No target activity resolved for deep link '${payload.deepLink}'.")
            return
        }
        runCatching { startActivity(launch) }
            .onFailure {
                Logger.w("Deep link failed, falling back to launcher: ${it.message}")
                packageManager.getLaunchIntentForPackage(packageName)?.let { fallback ->
                    fallback.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                    startActivity(fallback)
                }
            }
    }

    companion object {
        const val ACTION_OPEN = "com.openfcm.sdk.action.OPEN"
        const val ACTION_DISMISS = "com.openfcm.sdk.action.DISMISS"
    }
}
