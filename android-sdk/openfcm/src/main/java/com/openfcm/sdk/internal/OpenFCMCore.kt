package com.openfcm.sdk.internal

import android.content.Context
import com.openfcm.sdk.BuildConfig
import com.openfcm.sdk.OpenFCMConfig
import com.openfcm.sdk.api.OpenFCMApi
import com.openfcm.sdk.messaging.NotificationOpenHandler
import com.openfcm.sdk.messaging.NotificationPayload
import com.openfcm.sdk.storage.OpenFCMStore
import com.openfcm.sdk.work.OpenFCMWorkScheduler
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock

/**
 * Process-wide singleton holding the SDK's shared collaborators. Both the public
 * [com.openfcm.sdk.OpenFCM] facade and background components (FCM service,
 * WorkManager workers) resolve their dependencies from here.
 *
 * The core is resilient to process death: [ensureInitialized] rehydrates state
 * from [OpenFCMStore] so a worker that runs before the app calls `init()` can
 * still function using the last-known app id / base URL.
 */
internal object OpenFCMCore {

    @Volatile
    private var appContext: Context? = null

    @Volatile
    private var api: OpenFCMApi? = null

    @Volatile
    var config: OpenFCMConfig = OpenFCMConfig.default()
        private set

    @Volatile
    var openHandler: NotificationOpenHandler? = null

    /** Buffers a notification opened before a handler was registered. */
    @Volatile
    var pendingOpen: NotificationPayload? = null

    val scope: CoroutineScope = CoroutineScope(SupervisorJob() + Dispatchers.Default)

    private val initMutex = Mutex()

    lateinit var store: OpenFCMStore
        private set

    lateinit var scheduler: OpenFCMWorkScheduler
        private set

    val isInitialized: Boolean get() = appContext != null && this::store.isInitialized

    fun context(): Context =
        appContext ?: error("OpenFCM is not initialized. Call OpenFCM.init(context, appId) first.")

    fun apiOrNull(): OpenFCMApi? = api

    fun requireApi(): OpenFCMApi =
        api ?: error("OpenFCM has no app id configured yet.")

    /** Full initialization triggered by [com.openfcm.sdk.OpenFCM.init]. */
    suspend fun initialize(context: Context, appId: String, cfg: OpenFCMConfig) = initMutex.withLock {
        val ctx = context.applicationContext
        appContext = ctx
        config = cfg
        Logger.debug = cfg.enableDebugLogging

        if (!this::store.isInitialized) store = OpenFCMStore(ctx)
        if (!this::scheduler.isInitialized) scheduler = OpenFCMWorkScheduler(ctx)

        store.hydrate()
        store.setAppId(appId)
        val baseUrl = cfg.baseUrl ?: store.baseUrl ?: BuildConfig.OPENFCM_DEFAULT_BASE_URL
        store.setBaseUrl(baseUrl)
        rebuildApi(appId, baseUrl)
    }

    /**
     * Lazily bootstraps the core from persisted state. Used by the FCM service
     * and workers, which may run after process death before `init()` is called.
     * Returns true if an API client is available afterwards.
     */
    suspend fun ensureInitialized(context: Context): Boolean = initMutex.withLock {
        val ctx = context.applicationContext
        if (appContext == null) appContext = ctx
        if (!this::store.isInitialized) store = OpenFCMStore(ctx)
        if (!this::scheduler.isInitialized) scheduler = OpenFCMWorkScheduler(ctx)
        if (api == null) {
            store.hydrate()
            val appId = store.appId
            val baseUrl = store.baseUrl ?: BuildConfig.OPENFCM_DEFAULT_BASE_URL
            if (appId != null) rebuildApi(appId, baseUrl)
        }
        api != null
    }

    private fun rebuildApi(appId: String, baseUrl: String) {
        api = OpenFCMApi(
            baseUrl = baseUrl,
            appId = appId,
            userAgent = "OpenFCM-Android/${BuildConfig.OPENFCM_SDK_VERSION}",
        )
    }
}
