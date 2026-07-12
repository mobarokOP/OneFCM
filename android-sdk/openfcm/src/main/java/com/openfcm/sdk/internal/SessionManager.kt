package com.openfcm.sdk.internal

import androidx.lifecycle.DefaultLifecycleObserver
import androidx.lifecycle.LifecycleOwner
import androidx.lifecycle.ProcessLifecycleOwner
import com.openfcm.sdk.storage.OpenFCMStore
import kotlinx.coroutines.launch
import android.os.SystemClock

/**
 * Tracks app foreground session time using the process lifecycle. On each
 * foreground → background transition the elapsed foreground duration is
 * accumulated into local state (surfaced later as an engagement signal and, if
 * desired, flushed to the backend). Also refreshes device activity on resume.
 */
internal class SessionManager(
    private val store: OpenFCMStore,
    private val onForeground: suspend () -> Unit,
) : DefaultLifecycleObserver {

    @Volatile
    private var foregroundStartedAt: Long = 0

    fun start() {
        // Must observe on the main thread.
        ProcessLifecycleOwner.get().lifecycle.addObserver(this)
    }

    override fun onStart(owner: LifecycleOwner) {
        foregroundStartedAt = SystemClock.elapsedRealtime()
        Logger.d("Session started.")
        OpenFCMCore.scope.launch { onForeground() }
    }

    override fun onStop(owner: LifecycleOwner) {
        val started = foregroundStartedAt
        if (started <= 0) return
        val elapsed = SystemClock.elapsedRealtime() - started
        foregroundStartedAt = 0
        Logger.d("Session ended (+${elapsed}ms foreground).")
        OpenFCMCore.scope.launch { store.recordSession(elapsed) }
    }
}
