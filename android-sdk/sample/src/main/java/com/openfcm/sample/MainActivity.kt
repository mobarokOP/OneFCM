package com.openfcm.sample

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.openfcm.sdk.OpenFCM

/**
 * Minimal UI exercising the full public API surface of the OpenFCM SDK.
 */
class MainActivity : ComponentActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Ask for the Android 13+ notification permission up front.
        OpenFCM.requestNotificationPermission(this)

        setContent {
            MaterialTheme {
                Surface(modifier = Modifier.fillMaxSize()) {
                    DemoScreen()
                }
            }
        }
    }
}

@Composable
private fun DemoScreen() {
    var externalId by remember { mutableStateOf("user123") }
    var tagValue by remember { mutableStateOf("true") }
    var topic by remember { mutableStateOf("writer_25") }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(24.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        Text("OpenFCM SDK Demo", style = MaterialTheme.typography.headlineSmall)
        Text("Device id: ${OpenFCM.deviceId ?: "registering…"}")

        OutlinedTextField(
            value = externalId,
            onValueChange = { externalId = it },
            label = { Text("External id") },
            modifier = Modifier.fillMaxWidth(),
        )
        Button(onClick = { OpenFCM.login(externalId) }, modifier = Modifier.fillMaxWidth()) {
            Text("Login")
        }
        Button(onClick = { OpenFCM.logout() }, modifier = Modifier.fillMaxWidth()) {
            Text("Logout")
        }

        OutlinedTextField(
            value = tagValue,
            onValueChange = { tagValue = it },
            label = { Text("premium tag value") },
            modifier = Modifier.fillMaxWidth(),
        )
        Button(onClick = { OpenFCM.addTag("premium", tagValue) }, modifier = Modifier.fillMaxWidth()) {
            Text("Add tag premium=$tagValue")
        }
        Button(onClick = { OpenFCM.removeTag("premium") }, modifier = Modifier.fillMaxWidth()) {
            Text("Remove tag premium")
        }

        OutlinedTextField(
            value = topic,
            onValueChange = { topic = it },
            label = { Text("Topic") },
            modifier = Modifier.fillMaxWidth(),
        )
        Button(onClick = { OpenFCM.subscribeTopic(topic) }, modifier = Modifier.fillMaxWidth()) {
            Text("Subscribe to $topic")
        }
        Button(onClick = { OpenFCM.unsubscribeTopic(topic) }, modifier = Modifier.fillMaxWidth()) {
            Text("Unsubscribe from $topic")
        }
    }
}
