package com.openfcm.sdk

import com.openfcm.sdk.messaging.NotificationPayload
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class NotificationPayloadTest {

    @Test
    fun parsesReservedFieldsAndKeepsCustomData() {
        val data = mapOf(
            NotificationPayload.KEY_NOTIFICATION_ID to "n-1",
            NotificationPayload.KEY_TITLE to "Hello",
            NotificationPayload.KEY_BODY to "World",
            NotificationPayload.KEY_DEEP_LINK to "opsample://open",
            NotificationPayload.KEY_PRIORITY to "high",
            "order_id" to "42",
        )

        val payload = NotificationPayload.fromData(data)

        assertEquals("n-1", payload.notificationId)
        assertEquals("Hello", payload.title)
        assertEquals("World", payload.body)
        assertEquals("opsample://open", payload.deepLink)
        assertEquals("high", payload.priority)
        assertEquals(mapOf("order_id" to "42"), payload.data)
        assertTrue(NotificationPayload.KEY_TITLE !in payload.data)
    }

    @Test
    fun missingNotificationIdDefaultsToEmpty() {
        val payload = NotificationPayload.fromData(emptyMap())
        assertEquals("", payload.notificationId)
    }
}
