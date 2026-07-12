package com.openfcm.sdk.storage

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.booleanPreferencesKey
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.emptyPreferences
import androidx.datastore.preferences.core.longPreferencesKey
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.catch
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map
import java.io.IOException

private val Context.openPushDataStore: DataStore<Preferences> by preferencesDataStore(name = "openfcm")

/**
 * Durable local state for the SDK. Backed by Jetpack DataStore so reads/writes
 * are transactional and safe across processes (the FCM service runs in the same
 * process but on background threads).
 *
 * A [snapshot] cache is kept in memory and hydrated eagerly at init so hot paths
 * (e.g. building a notification) can read identifiers without suspending.
 */
internal class OpenFCMStore(context: Context) {

    private val appContext = context.applicationContext
    private val dataStore get() = appContext.openPushDataStore

    @Volatile
    private var cache: Snapshot = Snapshot()

    data class Snapshot(
        val appId: String? = null,
        val deviceId: String? = null,
        val externalId: String? = null,
        val userId: String? = null,
        val fcmToken: String? = null,
        val baseUrl: String? = null,
        val notificationPermission: Boolean = false,
        val sessionCount: Long = 0,
        val totalForegroundMs: Long = 0,
    )

    /** Loads persisted values into the in-memory cache. Call once during init. */
    suspend fun hydrate(): Snapshot {
        val prefs = dataStore.data.safe().first()
        cache = prefs.toSnapshot()
        return cache
    }

    fun snapshot(): Snapshot = cache

    val appId: String? get() = cache.appId
    val deviceId: String? get() = cache.deviceId
    val externalId: String? get() = cache.externalId
    val fcmToken: String? get() = cache.fcmToken
    val baseUrl: String? get() = cache.baseUrl

    suspend fun setAppId(value: String) = put { it[Keys.APP_ID] = value }
    suspend fun setDeviceId(value: String) = put { it[Keys.DEVICE_ID] = value }
    suspend fun setBaseUrl(value: String) = put { it[Keys.BASE_URL] = value }
    suspend fun setFcmToken(value: String) = put { it[Keys.FCM_TOKEN] = value }
    suspend fun setNotificationPermission(value: Boolean) =
        put { it[Keys.NOTIF_PERMISSION] = value }

    suspend fun setExternalId(value: String?) = put {
        if (value == null) it.remove(Keys.EXTERNAL_ID) else it[Keys.EXTERNAL_ID] = value
    }

    suspend fun setUserId(value: String?) = put {
        if (value == null) it.remove(Keys.USER_ID) else it[Keys.USER_ID] = value
    }

    suspend fun recordSession(foregroundMs: Long) = put {
        val sessions = (it[Keys.SESSION_COUNT] ?: 0) + 1
        val total = (it[Keys.TOTAL_FG_MS] ?: 0) + foregroundMs
        it[Keys.SESSION_COUNT] = sessions
        it[Keys.TOTAL_FG_MS] = total
    }

    /** Wipes user identity but keeps device registration (used by logout). */
    suspend fun clearUser() = put {
        it.remove(Keys.EXTERNAL_ID)
        it.remove(Keys.USER_ID)
    }

    private suspend fun put(block: (androidx.datastore.preferences.core.MutablePreferences) -> Unit) {
        val updated = dataStore.edit(block)
        cache = updated.toSnapshot()
    }

    private fun Flow<Preferences>.safe(): Flow<Preferences> = catch { cause ->
        if (cause is IOException) emit(emptyPreferences()) else throw cause
    }

    private fun Preferences.toSnapshot() = Snapshot(
        appId = this[Keys.APP_ID],
        deviceId = this[Keys.DEVICE_ID],
        externalId = this[Keys.EXTERNAL_ID],
        userId = this[Keys.USER_ID],
        fcmToken = this[Keys.FCM_TOKEN],
        baseUrl = this[Keys.BASE_URL],
        notificationPermission = this[Keys.NOTIF_PERMISSION] ?: false,
        sessionCount = this[Keys.SESSION_COUNT] ?: 0,
        totalForegroundMs = this[Keys.TOTAL_FG_MS] ?: 0,
    )

    /** Exposes the raw flow for observers that want live updates. */
    fun observe(): Flow<Snapshot> = dataStore.data.safe().map { it.toSnapshot() }

    private object Keys {
        val APP_ID = stringPreferencesKey("app_id")
        val DEVICE_ID = stringPreferencesKey("device_id")
        val EXTERNAL_ID = stringPreferencesKey("external_id")
        val USER_ID = stringPreferencesKey("user_id")
        val FCM_TOKEN = stringPreferencesKey("fcm_token")
        val BASE_URL = stringPreferencesKey("base_url")
        val NOTIF_PERMISSION = booleanPreferencesKey("notification_permission")
        val SESSION_COUNT = longPreferencesKey("session_count")
        val TOTAL_FG_MS = longPreferencesKey("total_foreground_ms")
    }
}
