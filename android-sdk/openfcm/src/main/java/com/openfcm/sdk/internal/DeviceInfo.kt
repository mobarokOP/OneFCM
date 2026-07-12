package com.openfcm.sdk.internal

import android.content.Context
import android.content.pm.PackageManager
import android.os.Build
import java.util.Locale
import java.util.TimeZone

/** Collects the device metadata required by `POST /v1/devices/register`. */
internal object DeviceInfo {

    fun appVersion(context: Context): String = runCatching {
        val pm = context.packageManager
        val info = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            pm.getPackageInfo(context.packageName, PackageManager.PackageInfoFlags.of(0))
        } else {
            @Suppress("DEPRECATION")
            pm.getPackageInfo(context.packageName, 0)
        }
        info.versionName ?: "0"
    }.getOrDefault("0")

    fun osVersion(): String = Build.VERSION.RELEASE ?: Build.VERSION.SDK_INT.toString()

    fun language(): String = Locale.getDefault().language.ifBlank { "en" }

    fun country(): String {
        val locale = Locale.getDefault()
        return locale.country.ifBlank { "US" }
    }

    fun timezone(): String = TimeZone.getDefault().id
}
