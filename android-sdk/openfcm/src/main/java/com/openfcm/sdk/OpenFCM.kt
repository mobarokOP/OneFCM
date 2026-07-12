package com.openfcm.sdk

import android.app.Activity
import android.content.Context
import com.openfcm.sdk.internal.DeviceManager
import com.openfcm.sdk.internal.Logger
import com.openfcm.sdk.internal.OpenFCMCore
import com.openfcm.sdk.internal.PermissionHelper
import com.openfcm.sdk.internal.SessionManager
import com.openfcm.sdk.internal.TagManager
import com.openfcm.sdk.internal.TopicManager
import com.openfcm.sdk.internal.UserManager
import com.openfcm.sdk.messaging.NotificationOpenHandler
import com.openfcm.sdk.messaging.NotificationPayload
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import kotlinx.coroutines.Dispatchers

/**
 * OpenFCM Android SDK — public facade.
 *
 * ```kotlin
 * OpenFCM.init(context, "YOUR_APP_ID")
 * OpenFCM.login("user123")
 * OpenFCM.addTag("premium", "true")
 * OpenFCM.subscribeTopic("writer_25")
 * OpenFCM.setNotificationOpenHandler { payload -> /* route deep link */ }
 * ```
 *
 * All methods are safe to call from the main thread and before initialization
 * completes: operations are dispatched onto an internal coroutine scope and
 * suspend until the SDK is ready. Nothing blocks the UI thread.
 */
object OpenFCM {

    @Volatile
    private var ready: CompletableDeferred<Unit> = CompletableDeferred()

    // ---- Lifecycle -----------------------------------------------------------

    /**
     * Initializes the SDK: persists [appId], establishes the API client,
     * registers the device, syncs the FCM token, and starts session tracking.
     * Idempotent — calling again re-applies config and refreshes registration.
     *
     * @param appId the public application id from the OpenFCM dashboard.
     */
    @JvmStatic
    @JvmOverloads
    fun init(context: Context, appId: String, config: OpenFCMConfig = OpenFCMConfig.default()) {
        require(appId.isNotBlank()) { "appId must not be blank" }
        val ctx = context.applicationContext
        // Reset the readiness gate for this (re-)initialization.
        val signal = CompletableDeferred<Unit>()
        ready = signal

        OpenFCMCore.scope.launch {
            OpenFCMCore.initialize(ctx, appId, config)
            signal.complete(Unit)
            Logger.i("OpenFCM initialized (appId=$appId).")

            if (config.autoRegister) {
                DeviceManager(OpenFCMCore.store).registerOrRefresh()
            }
            if (config.trackSessions) {
                withContext(Dispatchers.Main) { startSessionTracking() }
            }
            // Flush any notification tap that arrived before init finished.
            drainPendingOpen()
        }
    }

    /** Builder-style init: `OpenFCM.init(context, appId) { enableDebugLogging = true }`. */
    @JvmSynthetic
    fun init(context: Context, appId: String, block: OpenFCMConfig.Builder.() -> Unit) {
        val cfg = OpenFCMConfig.Builder().apply(block).build()
        init(context, appId, cfg)
    }

    // ---- Identity ------------------------------------------------------------

    /** Associates the current device with an external user id. */
    @JvmStatic
    fun login(externalId: String) = dispatch {
        UserManager(OpenFCMCore.store, DeviceManager(OpenFCMCore.store)).login(externalId)
    }

    /** Clears the external user association from this device. */
    @JvmStatic
    fun logout() = dispatch {
        UserManager(OpenFCMCore.store, DeviceManager(OpenFCMCore.store)).logout()
    }

    // ---- Tags ----------------------------------------------------------------

    @JvmStatic
    fun addTag(key: String, value: String) = dispatch {
        TagManager(OpenFCMCore.store).addTags(mapOf(key to value))
    }

    @JvmStatic
    fun addTags(tags: Map<String, String>) = dispatch {
        TagManager(OpenFCMCore.store).addTags(tags)
    }

    @JvmStatic
    fun removeTag(key: String) = dispatch {
        TagManager(OpenFCMCore.store).removeTags(listOf(key))
    }

    @JvmStatic
    fun removeTags(keys: List<String>) = dispatch {
        TagManager(OpenFCMCore.store).removeTags(keys)
    }

    // ---- Topics --------------------------------------------------------------

    @JvmStatic
    fun subscribeTopic(topic: String) = dispatch {
        TopicManager(OpenFCMCore.store).subscribe(topic)
    }

    @JvmStatic
    fun unsubscribeTopic(topic: String) = dispatch {
        TopicManager(OpenFCMCore.store).unsubscribe(topic)
    }

    // ---- Notifications -------------------------------------------------------

    /**
     * Registers a callback fired when the user opens an OpenFCM notification.
     * If a notification was opened before this was set, the buffered payload is
     * delivered immediately.
     */
    @JvmStatic
    fun setNotificationOpenHandler(handler: NotificationOpenHandler) {
        OpenFCMCore.openHandler = handler
        OpenFCMCore.pendingOpen?.let {
            OpenFCMCore.pendingOpen = null
            runCatching { handler.onOpened(it) }
        }
    }

    /** Kotlin-friendly lambda overload. */
    @JvmSynthetic
    fun setNotificationOpenHandler(handler: (NotificationPayload) -> Unit) =
        setNotificationOpenHandler(NotificationOpenHandler { handler(it) })

    // ---- Permission helpers --------------------------------------------------

    /** True when the app can currently display notifications. */
    @JvmStatic
    fun areNotificationsEnabled(): Boolean =
        OpenFCMCore.isInitialized && PermissionHelper.areNotificationsEnabled(OpenFCMCore.context())

    /** Requests the Android 13+ POST_NOTIFICATIONS runtime permission. */
    @JvmStatic
    fun requestNotificationPermission(activity: Activity) =
        PermissionHelper.requestNotificationPermission(activity)

    // ---- Introspection -------------------------------------------------------

    /** The backend-assigned device id, or null before registration completes. */
    @JvmStatic
    val deviceId: String?
        get() = if (OpenFCMCore.isInitialized) OpenFCMCore.store.deviceId else null

    /** The currently logged-in external id, if any. */
    @JvmStatic
    val externalId: String?
        get() = if (OpenFCMCore.isInitialized) OpenFCMCore.store.externalId else null

    // ---- Internals -----------------------------------------------------------

    private var sessionManager: SessionManager? = null

    private fun startSessionTracking() {
        if (sessionManager != null) return
        sessionManager = SessionManager(
            store = OpenFCMCore.store,
            onForeground = { DeviceManager(OpenFCMCore.store).registerOrRefresh() },
        ).also { it.start() }
    }

    private fun drainPendingOpen() {
        val handler = OpenFCMCore.openHandler ?: return
        OpenFCMCore.pendingOpen?.let {
            OpenFCMCore.pendingOpen = null
            runCatching { handler.onOpened(it) }
        }
    }

    /** Runs [block] after initialization completes, on the SDK scope. */
    private fun dispatch(block: suspend () -> Unit) {
        val gate = ready
        OpenFCMCore.scope.launch {
            gate.await()
            runCatching { block() }.onFailure { Logger.e("OpenFCM operation failed", it) }
        }
    }
}
