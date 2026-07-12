package com.openfcm.sdk.messaging

import android.graphics.Bitmap
import android.graphics.BitmapFactory
import com.openfcm.sdk.internal.Logger
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.OkHttpClient
import okhttp3.Request
import java.util.concurrent.TimeUnit

/**
 * Minimal image downloader for notification large icons and big-picture images.
 * Kept dependency-free (no Glide/Coil) so the SDK stays lightweight; images are
 * fetched once at display time with a short timeout.
 */
internal object ImageLoader {

    private val client: OkHttpClient by lazy {
        OkHttpClient.Builder()
            .connectTimeout(10, TimeUnit.SECONDS)
            .readTimeout(15, TimeUnit.SECONDS)
            .build()
    }

    suspend fun load(url: String?): Bitmap? {
        if (url.isNullOrBlank()) return null
        return withContext(Dispatchers.IO) {
            runCatching {
                val request = Request.Builder().url(url).build()
                client.newCall(request).execute().use { response ->
                    if (!response.isSuccessful) return@use null
                    response.body?.byteStream()?.use { stream ->
                        BitmapFactory.decodeStream(stream)
                    }
                }
            }.onFailure { Logger.w("Failed to load image $url: ${it.message}") }.getOrNull()
        }
    }
}
