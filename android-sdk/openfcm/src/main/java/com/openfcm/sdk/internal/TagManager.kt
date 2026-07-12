package com.openfcm.sdk.internal

import com.openfcm.sdk.api.TagsDeleteRequest
import com.openfcm.sdk.api.TagsUpsertRequest
import com.openfcm.sdk.storage.OpenFCMStore

/**
 * Device tag CRUD: `POST /v1/tags` (upsert) and `DELETE /v1/tags`.
 */
internal class TagManager(
    private val store: OpenFCMStore,
) {

    suspend fun addTags(tags: Map<String, String>) {
        if (tags.isEmpty()) return
        val (appId, deviceId) = identity() ?: return
        val request = TagsUpsertRequest(appId = appId, deviceId = deviceId, tags = tags)
        Dispatcher.guarded(
            body = request,
            serializer = TagsUpsertRequest.serializer(),
            path = "v1/tags",
            method = "POST",
            call = { OpenFCMCore.requireApi().upsertTags(it) },
        )
    }

    suspend fun removeTags(keys: List<String>) {
        if (keys.isEmpty()) return
        val (appId, deviceId) = identity() ?: return
        val request = TagsDeleteRequest(appId = appId, deviceId = deviceId, keys = keys)
        Dispatcher.guarded(
            body = request,
            serializer = TagsDeleteRequest.serializer(),
            path = "v1/tags",
            method = "DELETE",
            call = { OpenFCMCore.requireApi().deleteTags(it) },
        )
    }

    private fun identity(): Pair<String, String>? {
        val appId = store.appId
        val deviceId = store.deviceId
        if (appId == null || deviceId == null) {
            Logger.w("Tag change ignored: device not registered yet.")
            return null
        }
        return appId to deviceId
    }
}
