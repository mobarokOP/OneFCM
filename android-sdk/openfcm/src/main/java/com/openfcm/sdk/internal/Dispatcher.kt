package com.openfcm.sdk.internal

import com.openfcm.sdk.api.ApiResult
import kotlinx.serialization.KSerializer
import kotlinx.serialization.json.Json

/**
 * Wraps a fire-and-forget (204) API call so that a retryable failure is
 * transparently persisted to the WorkManager offline queue. The exact request
 * body is re-serialized and replayed verbatim by [com.openfcm.sdk.work.OpenFCMSyncWorker].
 */
internal object Dispatcher {

    val json = Json {
        ignoreUnknownKeys = true
        encodeDefaults = true
        explicitNulls = false
    }

    suspend fun <B> guarded(
        body: B,
        serializer: KSerializer<B>,
        path: String,
        method: String = "POST",
        uniqueKey: String? = null,
        call: suspend (B) -> ApiResult<Unit>,
    ): ApiResult<Unit> {
        val result = call(body)
        if (result is ApiResult.Failure && result.retryable) {
            OpenFCMCore.scheduler.enqueue(
                path = path,
                method = method,
                body = json.encodeToString(serializer, body),
                uniqueKey = uniqueKey,
            )
        }
        return result
    }
}
