package com.openfcm.sdk.internal

import android.content.Context
import com.google.firebase.FirebaseApp
import com.google.firebase.FirebaseOptions
import com.openfcm.sdk.api.ApiResult

/**
 * Initializes Firebase at runtime from config fetched off the OpenFCM backend,
 * so host apps need NO google-services.json (OneSignal-style). Every app shares
 * the central Firebase project the server is configured with.
 *
 * If the host app already has its own default FirebaseApp (its own
 * google-services.json), we leave it untouched and use that.
 */
internal object FirebaseBootstrap {

    suspend fun ensure(context: Context): Boolean {
        // A default app already exists (host's own Firebase, or a prior init).
        if (FirebaseApp.getApps(context).isNotEmpty()) return true

        val api = OpenFCMCore.apiOrNull() ?: return false
        val cfg = when (val r = api.fetchFcmConfig()) {
            is ApiResult.Success -> r.value
            is ApiResult.Failure -> {
                Logger.w("FCM config unavailable (${r.code}); cannot init Firebase.")
                return false
            }
        }

        return runCatching {
            // Double-check after the network hop in case of a race.
            if (FirebaseApp.getApps(context).isNotEmpty()) return@runCatching true

            val options = FirebaseOptions.Builder()
                .setProjectId(cfg.projectId)
                .setApplicationId(cfg.appId)
                .setApiKey(cfg.apiKey)
                .setGcmSenderId(cfg.senderId)
                .apply { cfg.storageBucket?.let { setStorageBucket(it) } }
                .build()

            FirebaseApp.initializeApp(context.applicationContext, options)
            Logger.i("Firebase initialized for project ${cfg.projectId}.")
            true
        }.getOrElse {
            Logger.e("Firebase init failed", it)
            false
        }
    }
}
