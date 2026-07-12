package com.openfcm.sdk.api

/**
 * Result of an API call. [Success] carries the decoded body (or [Unit] for 204
 * responses). [Failure] distinguishes transient errors (worth retrying via
 * WorkManager) from permanent ones (4xx that will never succeed on retry).
 */
sealed class ApiResult<out T> {

    data class Success<T>(val value: T) : ApiResult<T>()

    data class Failure(
        val code: String,
        val message: String,
        val httpStatus: Int?,
        val retryable: Boolean,
        val cause: Throwable? = null,
    ) : ApiResult<Nothing>()

    val isSuccess: Boolean get() = this is Success

    inline fun onSuccess(block: (T) -> Unit): ApiResult<T> {
        if (this is Success) block(value)
        return this
    }

    inline fun onFailure(block: (Failure) -> Unit): ApiResult<T> {
        if (this is Failure) block(this)
        return this
    }

    fun getOrNull(): T? = (this as? Success)?.value
}
