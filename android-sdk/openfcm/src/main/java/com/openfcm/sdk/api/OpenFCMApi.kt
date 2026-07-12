package com.openfcm.sdk.api

import com.openfcm.sdk.internal.Logger
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlinx.coroutines.withContext
import kotlinx.serialization.json.Json
import okhttp3.Call
import okhttp3.Callback
import okhttp3.HttpUrl.Companion.toHttpUrl
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import okhttp3.Response
import okhttp3.logging.HttpLoggingInterceptor
import java.io.IOException
import java.util.concurrent.TimeUnit
import kotlin.coroutines.resume

/**
 * Thin, coroutine-based HTTP client for the OpenFCM v1 API.
 *
 * Every device-facing endpoint carries SDK auth: the public `app_id` is sent
 * both in the JSON body and as the `X-OpenFCM-App` header, per the contract.
 *
 * The client never throws for expected HTTP errors — callers receive an
 * [ApiResult.Failure] with a [retryable][ApiResult.Failure.retryable] flag so
 * the offline queue can decide whether to re-enqueue the work.
 */
internal class OpenFCMApi(
    private val baseUrl: String,
    private val appId: String,
    private val userAgent: String,
    private val http: OkHttpClient = defaultClient(),
) {

    private val json = Json {
        ignoreUnknownKeys = true
        encodeDefaults = true
        explicitNulls = false
        coerceInputValues = true
    }

    private val jsonMediaType = "application/json; charset=utf-8".toMediaType()
    private val endpoint = baseUrl.trimEnd('/').toHttpUrl()

    // ---- D. Devices ----------------------------------------------------------

    suspend fun registerDevice(body: RegisterDeviceRequest): ApiResult<RegisterDeviceResponse> =
        post("v1/devices/register", RegisterDeviceRequest.serializer(), body) {
            decode(RegisterDeviceResponse.serializer(), it)
        }

    suspend fun updateToken(body: UpdateTokenRequest): ApiResult<Unit> =
        postNoContent("v1/devices/token", UpdateTokenRequest.serializer(), body, method = "PATCH")

    suspend fun deleteDevice(deviceId: String): ApiResult<Unit> =
        request("v1/devices/$deviceId", method = "DELETE", body = null) { Unit }

    // ---- E. Users ------------------------------------------------------------

    suspend fun userLogin(body: UserLoginRequest): ApiResult<UserLoginResponse> =
        post("v1/users/login", UserLoginRequest.serializer(), body) {
            decode(UserLoginResponse.serializer(), it)
        }

    suspend fun userLogout(body: UserLogoutRequest): ApiResult<Unit> =
        postNoContent("v1/users/logout", UserLogoutRequest.serializer(), body)

    // ---- F. Tags -------------------------------------------------------------

    suspend fun upsertTags(body: TagsUpsertRequest): ApiResult<Unit> =
        postNoContent("v1/tags", TagsUpsertRequest.serializer(), body)

    suspend fun deleteTags(body: TagsDeleteRequest): ApiResult<Unit> =
        postNoContent("v1/tags", TagsDeleteRequest.serializer(), body, method = "DELETE")

    // ---- G. Topics -----------------------------------------------------------

    suspend fun subscribeTopic(body: TopicRequest): ApiResult<Unit> =
        postNoContent("v1/topics/subscribe", TopicRequest.serializer(), body)

    suspend fun unsubscribeTopic(body: TopicRequest): ApiResult<Unit> =
        postNoContent("v1/topics/unsubscribe", TopicRequest.serializer(), body)

    // ---- L. Events -----------------------------------------------------------

    suspend fun sendEvent(body: EventRequest): ApiResult<Unit> =
        postNoContent("v1/events", EventRequest.serializer(), body)

    /**
     * Replays an arbitrary previously-serialized request. Used by the offline
     * retry worker, which persists the path/method/body of a failed call and
     * re-issues it verbatim once connectivity returns.
     */
    suspend fun sendRaw(path: String, method: String, body: String?): ApiResult<Unit> =
        request(path, method, body) { Unit }

    // ---- Internals -----------------------------------------------------------

    private fun <T> decode(serializer: kotlinx.serialization.KSerializer<T>, raw: String): T {
        val env = json.decodeFromString(DataEnvelope.serializer(serializer), raw)
        return env.data
    }

    private suspend fun <B, R> post(
        path: String,
        serializer: kotlinx.serialization.KSerializer<B>,
        body: B,
        transform: (String) -> R,
    ): ApiResult<R> = request(path, "POST", json.encodeToString(serializer, body), transform)

    private suspend fun <B> postNoContent(
        path: String,
        serializer: kotlinx.serialization.KSerializer<B>,
        body: B,
        method: String = "POST",
    ): ApiResult<Unit> = request(path, method, json.encodeToString(serializer, body)) { Unit }

    private suspend fun <R> request(
        path: String,
        method: String,
        body: String?,
        transform: (String) -> R,
    ): ApiResult<R> = withContext(Dispatchers.IO) {
        val url = endpoint.newBuilder().addPathSegments(path).build()
        val requestBody = when {
            body != null -> body.toRequestBody(jsonMediaType)
            method in setOf("POST", "PATCH", "PUT") -> ByteArray(0).toRequestBody(jsonMediaType)
            else -> null
        }
        val request = Request.Builder()
            .url(url)
            .method(method, requestBody)
            .header("Accept", "application/json")
            .header("X-OpenFCM-App", appId)
            .header("User-Agent", userAgent)
            .build()

        try {
            http.newCall(request).await().use { response ->
                val payload = response.body?.string().orEmpty()
                when {
                    // No-content endpoints pass a transform that ignores the body,
                    // so calling transform("") for 204 responses is always safe.
                    response.isSuccessful -> ApiResult.Success(transform(payload))
                    else -> ApiResult.Failure(
                        code = parseErrorCode(payload),
                        message = parseErrorMessage(payload) ?: "HTTP ${response.code}",
                        httpStatus = response.code,
                        // 408/429 and all 5xx are transient; other 4xx are permanent.
                        retryable = response.code == 408 || response.code == 429 || response.code >= 500,
                    )
                }
            }
        } catch (io: IOException) {
            Logger.w("Network failure calling $path: ${io.message}")
            ApiResult.Failure(
                code = "network_error",
                message = io.message ?: "Network unavailable",
                httpStatus = null,
                retryable = true,
                cause = io,
            )
        } catch (t: Throwable) {
            Logger.e("Unexpected failure calling $path", t)
            ApiResult.Failure(
                code = "client_error",
                message = t.message ?: "Serialization error",
                httpStatus = null,
                retryable = false,
                cause = t,
            )
        }
    }

    private fun parseErrorCode(payload: String): String = runCatching {
        json.decodeFromString(ErrorEnvelope.serializer(), payload).error.code
    }.getOrDefault("http_error")

    private fun parseErrorMessage(payload: String): String? = runCatching {
        json.decodeFromString(ErrorEnvelope.serializer(), payload).error.message
    }.getOrNull()

    companion object {
        fun defaultClient(): OkHttpClient {
            val logging = HttpLoggingInterceptor { Logger.v(it) }.apply {
                level = if (Logger.debug) {
                    HttpLoggingInterceptor.Level.BODY
                } else {
                    HttpLoggingInterceptor.Level.NONE
                }
            }
            return OkHttpClient.Builder()
                .connectTimeout(15, TimeUnit.SECONDS)
                .readTimeout(30, TimeUnit.SECONDS)
                .writeTimeout(30, TimeUnit.SECONDS)
                .retryOnConnectionFailure(true)
                .addInterceptor(logging)
                .build()
        }
    }
}

/** Suspends until the OkHttp [Call] completes, cancelling it on coroutine cancellation. */
private suspend fun Call.await(): Response = suspendCancellableCoroutine { cont ->
    enqueue(object : Callback {
        override fun onFailure(call: Call, e: IOException) {
            if (cont.isCancelled) return
            cont.resumeWith(Result.failure(e))
        }

        override fun onResponse(call: Call, response: Response) {
            cont.resume(response)
        }
    })
    cont.invokeOnCancellation {
        runCatching { cancel() }
    }
}
