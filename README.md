<div align="center">

# 🔔 OpenFCM

### Open-source Android Push Notifications — self-hostable, OneSignal-style, powered by FCM

Send targeted push notifications to your Android apps with a Kotlin SDK, a REST API, and a modern admin dashboard.

[![JitPack](https://jitpack.io/v/mobarokOP/OpenFCM.svg)](https://jitpack.io/#mobarokOP/OpenFCM)
[![Platform](https://img.shields.io/badge/platform-Android%2024%2B-3DDC84?logo=android&logoColor=white)](#-android-sdk-integration)
[![Kotlin](https://img.shields.io/badge/Kotlin-2.0-7F52FF?logo=kotlin&logoColor=white)](#-android-sdk-integration)
[![Backend](https://img.shields.io/badge/Laravel-12-FF2D20?logo=laravel&logoColor=white)](#-self-hosting-the-backend)
[![FCM](https://img.shields.io/badge/Firebase-FCM%20HTTP%20v1-FFCA28?logo=firebase&logoColor=black)](#step-2--connect-firebase)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](#-license)

**[Dashboard](https://beta.kathgolap.online)** · **[Quick Start](#-android-sdk-integration)** · **[REST API](#-send-from-your-server-rest-api)** · **[Self-host](#-self-hosting-the-backend)**

</div>

---

## ✨ What is OpenFCM?

OpenFCM is a complete, multi-tenant push-notification platform for **Android** apps. Drop the SDK into your app, and send notifications from a beautiful dashboard or via a REST API — targeted by user, tag, segment, or topic. Delivery runs through **Firebase Cloud Messaging (HTTP v1)** on a queue-based engine with automatic retries and full delivery analytics.

| | |
|---|---|
| 📱 **Kotlin SDK** | One-line init, device + user management, tags, topics, deep links, offline retry |
| 🎯 **Smart targeting** | All users · specific users · devices · tags · dynamic segments · topics |
| 🖥️ **Admin dashboard** | Compose & schedule notifications, live analytics, delivery logs, API keys |
| 🔌 **REST API** | Send server-to-server with an API key; full CRUD over apps, devices, segments |
| ⚙️ **Delivery engine** | Queue-based fan-out, exponential-backoff retries, dead-token cleanup, scheduling |
| 📊 **Analytics** | Sent / delivered / opened / CTR, by country & Android version |

---

## 🚀 Android SDK Integration

Get push notifications working in your Android app in **3 steps** — no `google-services.json`, no Firebase setup in your app.

### Prerequisites
- Android Studio, app with **minSdk 24+**
- An **App ID** — create an app in the [OpenFCM dashboard](https://beta.kathgolap.online) → **Applications** → **New application**, then copy its App ID.

> ✨ The SDK fetches Firebase config from the server, initializes Firebase, registers the device, and **auto-prompts for notification permission**. The central Firebase project is configured once on the server — see [infra/](infra).

---

### Step 1 · Add the dependency

Add JitPack to your repositories, then add the SDK.

```kotlin
// settings.gradle.kts
dependencyResolutionManagement {
    repositories {
        google()
        mavenCentral()
        maven { url = uri("https://jitpack.io") }   // 👈 add this
    }
}
```

```kotlin
// app/build.gradle.kts
dependencies {
    implementation("com.github.mobarokOP:OpenFCM:3.0.0")
    // Firebase Messaging is pulled in transitively — no extra FCM dependency needed.
}
```

> 💡 Always check the latest version badge above, or browse builds at [jitpack.io/#mobarokOP/OpenFCM](https://jitpack.io/#mobarokOP/OpenFCM).

---

### Step 2 · Initialize the SDK

Initialize once in your `Application` class. Point `baseUrl` at the OpenFCM backend.

```kotlin
// MyApp.kt
import android.app.Application
import com.openfcm.sdk.OpenFCM

class MyApp : Application() {
    override fun onCreate() {
        super.onCreate()

        OpenFCM.init(this, appId = "YOUR_APP_ID") {
            baseUrl = "https://admin.beta.kathgolap.online" // your OpenFCM server
            defaultChannelId = "general"
            defaultChannelName = "General"
            enableDebugLogging = BuildConfig.DEBUG
        }
    }
}
```

```xml
<!-- AndroidManifest.xml -->
<application android:name=".MyApp" ... >
```

That's it — the device is registered automatically and starts receiving pushes. The SDK's Firebase messaging service is merged in via the library manifest; **you don't need to declare anything else.**

---

### Step 3 · Identify users, tag, and subscribe

> Notification permission (Android 13+) is requested **automatically** on your first screen. To do it yourself instead, set `promptForPermissionOnInit = false` in `init { }` and call `OpenFCM.requestNotificationPermission(activity)`.

```kotlin
// Link this device to your app's user (after they log in)
OpenFCM.login("user_12345")

// Attributes for targeting
OpenFCM.addTag("premium", "true")
OpenFCM.addTags(mapOf("language" to "bn", "city" to "Rangpur"))

// Broadcast channels
OpenFCM.subscribeTopic("announcements")

// On sign-out
OpenFCM.logout()
```

**Handle notification taps & deep links:**

```kotlin
OpenFCM.setNotificationOpenHandler { payload ->
    // payload.deepLink, payload.notificationId, payload.data[...]
    payload.deepLink?.let { openDeepLink(it) }
}
```

<details>
<summary><b>📋 Full SDK API reference</b></summary>

| Method | Description |
|--------|-------------|
| `OpenFCM.init(context, appId) { … }` | Initialize, register device, sync FCM token |
| `OpenFCM.login(externalId)` | Associate device with your user id |
| `OpenFCM.logout()` | Clear the user association |
| `OpenFCM.addTag(key, value)` / `addTags(map)` | Set targeting tags |
| `OpenFCM.removeTag(key)` / `removeTags(list)` | Remove tags |
| `OpenFCM.subscribeTopic(name)` / `unsubscribeTopic(name)` | Manage topic subscriptions |
| `OpenFCM.setNotificationOpenHandler { payload -> }` | Handle taps / deep links |
| `OpenFCM.requestNotificationPermission(activity)` | Android 13+ runtime permission |
| `OpenFCM.areNotificationsEnabled()` | Check permission state |
| `OpenFCM.deviceId` / `OpenFCM.externalId` | Introspect current registration |

**Config options** (`OpenFCM.init(...) { }`): `baseUrl`, `defaultChannelId`, `defaultChannelName`, `smallIconResId`, `accentColor`, `enableDebugLogging`, `autoRegister`, `trackSessions`.

All calls are safe on the main thread and before init completes — they queue internally and never block the UI. Failed network calls are retried offline via WorkManager.

</details>

Full SDK docs: **[android-sdk/README.md](android-sdk/README.md)**

---

## 📤 Send from your server (REST API)

Create an API key in the dashboard (**App → API Keys**), then:

```bash
curl -X POST https://admin.beta.kathgolap.online/v1/notifications \
  -H "Authorization: Bearer op_live_YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "app_id": "YOUR_APP_ID",
    "title": "New chapter published! 📖",
    "body": "Tap to read the latest update.",
    "deep_link": "myapp://book/25",
    "audience": { "type": "tags", "value": [
      { "field": "premium", "op": "eq", "value": "true" }
    ]}
  }'
```

**Audience types:** `all` · `user_ids` · `device_ids` · `tags` · `segment` · `topic`.
Schedule instead of sending now by adding `"schedule": { "send_at": "2026-08-01T09:00:00Z" }`.

Full endpoint reference: **[API_CONTRACT.md](API_CONTRACT.md)**

---

## 🖥️ Dashboard

A modern React admin console — compose notifications with a live preview, build segments, inspect delivery logs, and watch analytics.

🔗 **[beta.kathgolap.online](https://beta.kathgolap.online)**

---

## 🏗️ Self-hosting the backend

OpenFCM is fully self-hostable (Laravel · MySQL · Redis · FCM).

```bash
git clone https://github.com/mobarokOP/OpenFCM.git
cd OpenFCM

# Full stack with Docker (app · nginx · mysql · redis · queue · scheduler · dashboard)
cp .env.example .env
docker compose up --build
docker compose up --scale queue=4   # scale delivery workers
```

Or run the backend directly for development:

```bash
cd backend
composer install
php artisan migrate --seed        # demo login: demo@openfcm.test / password
php artisan serve                 # API on http://localhost:8000/v1
php artisan queue:work --queue=push
```

Deployment (nginx, supervisor, CI/CD) lives in **[infra/](infra)**.

---

## 📦 Repository structure

| Path | Description |
|------|-------------|
| [`android-sdk/`](android-sdk) | Kotlin client SDK (published to JitPack) + sample app |
| [`backend/`](backend) | Laravel REST API, auth, delivery engine, scheduler |
| [`dashboard/`](dashboard) | React + Tailwind admin dashboard |
| [`infra/`](infra) | Docker, nginx, supervisor, Redis, GitHub Actions |
| [`API_CONTRACT.md`](API_CONTRACT.md) | Full REST API reference |

---

## 🤝 Contributing

Issues and pull requests are welcome. To release a new SDK version, push a git tag — JitPack builds it automatically:

```bash
git tag 1.0.1 && git push origin 1.0.1
```

## 📄 License

Released under the **MIT License**.

<div align="center">

**Built for Android. Powered by FCM. Yours to self-host.**

</div>
