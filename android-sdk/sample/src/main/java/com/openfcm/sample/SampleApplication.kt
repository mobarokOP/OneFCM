package com.openfcm.sample

import android.app.Application
import com.openfcm.sdk.OpenFCM

/**
 * Initializes the OpenFCM SDK once, as early as possible in the process
 * lifecycle. The app id is injected from the Gradle manifest placeholder.
 */
class SampleApplication : Application() {

    override fun onCreate() {
        super.onCreate()

        val appId = readAppId()
        OpenFCM.init(this, appId) {
            // Point at your self-hosted backend; defaults to http://localhost:8000.
            baseUrl = "http://10.0.2.2:8000" // host machine from the emulator
            enableDebugLogging = BuildConfig.DEBUG
            defaultChannelId = "general"
            defaultChannelName = "General"
        }

        OpenFCM.setNotificationOpenHandler { payload ->
            // Route the deep link, update analytics, etc.
            android.util.Log.i("Sample", "Notification opened: ${payload.notificationId} -> ${payload.deepLink}")
        }
    }

    private fun readAppId(): String {
        val metaData = packageManager
            .getApplicationInfo(packageName, android.content.pm.PackageManager.GET_META_DATA)
            .metaData
        return metaData?.getString("com.openfcm.APP_ID") ?: "REPLACE_WITH_APP_ID"
    }
}
