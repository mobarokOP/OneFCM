package com.example.openfcmtest

import android.app.Application
import com.openfcm.sdk.OpenFCM

class TestApp : Application() {

    companion object {
        // ============================================================
        //  👇 EDIT THESE TWO VALUES
        // ============================================================
        // Your application's App ID from the OpenFCM dashboard
        // (beta.kathgolap.online → Applications → your app → copy App ID).
        const val OPENFCM_APP_ID = "019f5848-a47a-704f-8fe2-fe77574eea0b"

        // Your OpenFCM backend base URL (no trailing slash, no /v1).
        const val OPENFCM_BASE_URL = "https://admin.onefcm.com"
        // ============================================================
    }

    override fun onCreate() {
        super.onCreate()

        OpenFCM.init(this, appId = OPENFCM_APP_ID) {
            baseUrl = OPENFCM_BASE_URL
            defaultChannelId = "general"
            defaultChannelName = "General"
            smallIconResId = R.drawable.ic_stat_notification
            enableDebugLogging = true // watch Logcat: filter by "OpenFCM"
        }
    }
}
