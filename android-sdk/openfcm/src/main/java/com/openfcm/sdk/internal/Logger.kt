package com.openfcm.sdk.internal

import android.util.Log

/** Lightweight logging facade. Verbose/debug output is gated behind [debug]. */
internal object Logger {

    private const val TAG = "OpenFCM"

    @Volatile
    var debug: Boolean = false

    fun v(message: String) {
        if (debug) Log.v(TAG, message)
    }

    fun d(message: String) {
        if (debug) Log.d(TAG, message)
    }

    fun i(message: String) {
        Log.i(TAG, message)
    }

    fun w(message: String) {
        Log.w(TAG, message)
    }

    fun e(message: String, throwable: Throwable? = null) {
        Log.e(TAG, message, throwable)
    }
}
