package com.openfcm.sdk.api

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.JsonElement

/**
 * Request / response models mirroring the OpenFCM API contract (v1).
 * All bodies use snake_case field names as defined in API_CONTRACT.md.
 */

// ---- Envelopes ---------------------------------------------------------------

@Serializable
internal data class DataEnvelope<T>(val data: T)

@Serializable
internal data class ApiError(
    val code: String = "error",
    val message: String = "Unknown error",
    val details: Map<String, List<String>> = emptyMap(),
)

@Serializable
internal data class ErrorEnvelope(val error: ApiError)

// ---- FCM client config (runtime Firebase init) -------------------------------

@Serializable
internal data class FcmConfigResponse(
    @SerialName("project_id") val projectId: String,
    @SerialName("app_id") val appId: String,
    @SerialName("api_key") val apiKey: String,
    @SerialName("sender_id") val senderId: String,
    @SerialName("storage_bucket") val storageBucket: String? = null,
)

// ---- D. Devices --------------------------------------------------------------

@Serializable
internal data class RegisterDeviceRequest(
    @SerialName("app_id") val appId: String,
    @SerialName("fcm_token") val fcmToken: String,
    @SerialName("external_id") val externalId: String? = null,
    val platform: String = "android",
    @SerialName("app_version") val appVersion: String,
    @SerialName("os_version") val osVersion: String,
    val language: String,
    val country: String,
    val timezone: String,
    @SerialName("notification_permission") val notificationPermission: Boolean,
)

@Serializable
internal data class RegisterDeviceResponse(
    @SerialName("device_id") val deviceId: String,
)

@Serializable
internal data class UpdateTokenRequest(
    @SerialName("app_id") val appId: String,
    @SerialName("device_id") val deviceId: String,
    @SerialName("fcm_token") val fcmToken: String,
)

// ---- E. Users ----------------------------------------------------------------

@Serializable
internal data class UserLoginRequest(
    @SerialName("app_id") val appId: String,
    @SerialName("device_id") val deviceId: String,
    @SerialName("external_id") val externalId: String,
)

@Serializable
internal data class UserLoginResponse(
    @SerialName("user_id") val userId: String,
)

@Serializable
internal data class UserLogoutRequest(
    @SerialName("app_id") val appId: String,
    @SerialName("device_id") val deviceId: String,
)

// ---- F. Tags -----------------------------------------------------------------

@Serializable
internal data class TagsUpsertRequest(
    @SerialName("app_id") val appId: String,
    @SerialName("device_id") val deviceId: String,
    val tags: Map<String, String>,
)

@Serializable
internal data class TagsDeleteRequest(
    @SerialName("app_id") val appId: String,
    @SerialName("device_id") val deviceId: String,
    val keys: List<String>,
)

// ---- G. Topics ---------------------------------------------------------------

@Serializable
internal data class TopicRequest(
    @SerialName("app_id") val appId: String,
    @SerialName("device_id") val deviceId: String,
    val topic: String,
)

// ---- L. Events / Tracking ----------------------------------------------------

@Serializable
internal data class EventRequest(
    @SerialName("app_id") val appId: String,
    @SerialName("device_id") val deviceId: String,
    @SerialName("notification_id") val notificationId: String,
    val type: String, // received | opened | clicked
    @SerialName("occurred_at") val occurredAt: String,
    val data: JsonElement? = null,
)
