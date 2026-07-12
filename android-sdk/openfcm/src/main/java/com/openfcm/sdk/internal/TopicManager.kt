package com.openfcm.sdk.internal

import com.openfcm.sdk.api.TopicRequest
import com.openfcm.sdk.storage.OpenFCMStore

/**
 * Topic subscription: `POST /v1/topics/subscribe` and `/unsubscribe`.
 */
internal class TopicManager(
    private val store: OpenFCMStore,
) {

    suspend fun subscribe(topic: String) = change(topic, subscribe = true)

    suspend fun unsubscribe(topic: String) = change(topic, subscribe = false)

    private suspend fun change(topic: String, subscribe: Boolean) {
        require(topic.isNotBlank()) { "topic must not be blank" }
        val appId = store.appId
        val deviceId = store.deviceId
        if (appId == null || deviceId == null) {
            Logger.w("Topic change ignored: device not registered yet.")
            return
        }
        val request = TopicRequest(appId = appId, deviceId = deviceId, topic = topic)
        val path = if (subscribe) "v1/topics/subscribe" else "v1/topics/unsubscribe"
        Dispatcher.guarded(
            body = request,
            serializer = TopicRequest.serializer(),
            path = path,
            method = "POST",
            call = {
                if (subscribe) OpenFCMCore.requireApi().subscribeTopic(it)
                else OpenFCMCore.requireApi().unsubscribeTopic(it)
            },
        )
    }
}
