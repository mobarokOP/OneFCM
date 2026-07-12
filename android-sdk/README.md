# OpenPush Android SDK

A lightweight, Kotlin-first client library for the **OpenPush** self-hostable
push notification platform. Comparable in shape to OneSignal's Android SDK, but
talking to *your* backend over the [OpenPush v1 API](../API_CONTRACT.md) and
delivering via **Firebase Cloud Messaging (HTTP v1)**.

- One-line initialization
- Device registration + automatic FCM token sync / refresh
- External-id login / logout
- Tags & topics
- Rich notifications (channels, large/small icons, images, deep links)
- Received / opened / clicked tracking
- Offline retry queue (WorkManager) — nothing is lost when the network drops
- Foreground session tracking
- Android 13+ notification-permission helpers

Min SDK **24** · Compile/Target SDK **34** · Kotlin · AGP 8.x

---

## Module layout

```
android-sdk/
├── settings.gradle.kts
├── build.gradle.kts
├── gradle.properties
├── gradle/
│   ├── libs.versions.toml            # version catalog
│   └── wrapper/gradle-wrapper.properties
├── openpush/                         # ← the publishable library (AAR)
│   ├── build.gradle.kts
│   ├── consumer-rules.pro
│   └── src/main/…                    # com.openpush.sdk
└── sample/                           # demo app exercising the full API
```

---

## Installation

### 1. Add the dependency (via JitPack)

Add the JitPack repository, then the SDK:

```kotlin
// settings.gradle.kts
dependencyResolutionManagement {
    repositories {
        google()
        mavenCentral()
        maven { url = uri("https://jitpack.io") } // <-- add this
    }
}

// app/build.gradle.kts
dependencies {
    implementation("com.github.mobarokOP:OpenFCM:1.0.0")
    // Firebase Messaging is exposed transitively (api) by the SDK.
}
```

> Replace `1.0.0` with any released git tag, a branch (`main-SNAPSHOT`), or a commit hash.
> First resolution triggers a JitPack build — check status at
> `https://jitpack.io/#mobarokOP/OpenFCM`.

**Publishing a new version:** push a git tag to `mobarokOP/OpenFCM` (e.g. `git tag v1.0.0 && git push origin v1.0.0`) or create a GitHub Release. JitPack builds it on first request using the repo-root [`jitpack.yml`](../jitpack.yml).

Or build the AAR locally:

```bash
./gradlew :openpush:assembleRelease
# → openpush/build/outputs/aar/openpush-release.aar
```

> The wrapper JAR is not committed. Run `gradle wrapper --gradle-version 8.7`
> once to generate `gradlew` / `gradle-wrapper.jar`.

### 2. Firebase setup

The SDK uses FCM as the delivery transport, so the host app needs a Firebase
project:

1. Create a Firebase project and register your Android package name.
2. Download `google-services.json` into your **app module** (a template lives at
   `sample/google-services.json.template`).
3. Apply the Google Services plugin in your app module:

   ```kotlin
   plugins {
       id("com.google.gms.google-services")
   }
   ```

4. Upload the Firebase **service-account JSON** to the OpenPush dashboard when
   creating the application (`POST /v1/apps`) so the backend can send via FCM
   HTTP v1.

The SDK already declares the `FirebaseMessagingService`, `INTERNET`,
`ACCESS_NETWORK_STATE`, and `POST_NOTIFICATIONS` entries via manifest merging —
you do **not** need to add them yourself.

---

## Initialization

Initialize once, as early as possible (typically in `Application.onCreate`):

```kotlin
class MyApp : Application() {
    override fun onCreate() {
        super.onCreate()

        OpenPush.init(this, "YOUR_APP_ID") {
            baseUrl = "https://push.example.com"  // your backend
            enableDebugLogging = BuildConfig.DEBUG
            defaultChannelId = "general"
            defaultChannelName = "General"
            // smallIconResId = R.drawable.ic_stat_push
            // accentColor = Color.parseColor("#6200EE")
        }

        OpenPush.setNotificationOpenHandler { payload ->
            // Route the deep link / update UI.
            startActivity(deepLinkIntent(payload.deepLink))
        }
    }
}
```

`init` is asynchronous and non-blocking: every other call is safe to make
immediately — operations queue internally and run once initialization and device
registration complete.

### Requesting the notification permission (Android 13+)

```kotlin
class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        OpenPush.requestNotificationPermission(this)  // no-op below API 33
    }
}
```

---

## API reference

| Method | Description | Backend endpoint |
| --- | --- | --- |
| `OpenPush.init(context, appId, config?)` | Store app id, build API client, register device, sync FCM token, start session tracking. | `POST /v1/devices/register` |
| `OpenPush.login(externalId)` | Associate this device with an external user id. | `POST /v1/users/login` |
| `OpenPush.logout()` | Remove the external-id association. | `POST /v1/users/logout` |
| `OpenPush.addTag(key, value)` | Upsert a single tag. | `POST /v1/tags` |
| `OpenPush.addTags(map)` | Upsert multiple tags. | `POST /v1/tags` |
| `OpenPush.removeTag(key)` | Delete one tag. | `DELETE /v1/tags` |
| `OpenPush.removeTags(keys)` | Delete multiple tags. | `DELETE /v1/tags` |
| `OpenPush.subscribeTopic(topic)` | Subscribe device to a topic. | `POST /v1/topics/subscribe` |
| `OpenPush.unsubscribeTopic(topic)` | Unsubscribe device from a topic. | `POST /v1/topics/unsubscribe` |
| `OpenPush.setNotificationOpenHandler { payload -> }` | Callback on notification tap (buffers if set late). | — |
| `OpenPush.requestNotificationPermission(activity)` | Request `POST_NOTIFICATIONS` on API 33+. | — |
| `OpenPush.areNotificationsEnabled()` | Whether notifications can be shown. | — |
| `OpenPush.deviceId` | Backend device id (null until registered). | — |
| `OpenPush.externalId` | Current external id, if logged in. | — |

Automatic (no direct call needed):

| Trigger | Behaviour | Endpoint |
| --- | --- | --- |
| FCM token refresh | Persist + push new token. | `PATCH /v1/devices/token` |
| Notification delivered | Fire `received` event. | `POST /v1/events` |
| Notification opened / tapped | Fire `opened` + `clicked`, run open handler, route deep link. | `POST /v1/events` |

### Notification payload

Notifications are delivered as FCM **data messages** keyed by `op_*` fields
(`op_notification_id`, `op_title`, `op_body`, `op_image_url`, `op_large_icon`,
`op_small_icon`, `op_channel_id`, `op_deep_link`, `op_priority`,
`op_collapse_key`). Any non-reserved keys are surfaced as
`NotificationPayload.data`. This lets the SDK render and track uniformly whether
the app is foreground or background.

### Offline behaviour

Every write (registration, token, tags, topics, user login/logout, events) is
attempted immediately. On a transient failure (network error, HTTP 408/429/5xx)
the request is serialized and re-enqueued via **WorkManager** with a network
constraint and exponential backoff. Permanent failures (other 4xx) are dropped.

---

## ProGuard / R8

The library ships `consumer-rules.pro`, applied automatically to consuming apps.
It keeps the public facade, the Firebase service, and the kotlinx.serialization
models/serializers. No extra rules are required in your app. For reference:

```proguard
-keep public class com.openpush.sdk.OpenPush { public *; }
-keep public class com.openpush.sdk.OpenPushConfig { public *; }
-keep class com.openpush.sdk.messaging.OpenPushFirebaseMessagingService { *; }
-keepclasseswithmembers class com.openpush.sdk.api.** {
    kotlinx.serialization.KSerializer serializer(...);
}
```

If you use Firebase Messaging elsewhere, keep Firebase's own consumer rules
(bundled with `firebase-messaging`).

---

## Sending a test notification

From your server (REST API key), per the API contract:

```bash
curl -X POST https://push.example.com/v1/notifications \
  -H "Authorization: Bearer $REST_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
        "app_id": "YOUR_APP_ID",
        "title": "Hello",
        "body": "From OpenPush",
        "image_url": "https://picsum.photos/600/300",
        "deep_link": "opsample://open",
        "priority": "high",
        "audience": { "type": "all" }
      }'
```

---

## License

Open-source (Apache-2.0 recommended). See the platform repository for details.
