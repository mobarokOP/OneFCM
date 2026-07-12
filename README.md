<div align="center">

# 🔔 OpenPush

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

## ✨ What is OpenPush?

OpenPush is a complete, multi-tenant push-notification platform for **Android** apps. Drop the SDK into your app, and send notifications from a beautiful dashboard or via a REST API — targeted by user, tag, segment, or topic. Delivery runs through **Firebase Cloud Messaging (HTTP v1)** on a queue-based engine with automatic retries and full delivery analytics.

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

Get push notifications working in your Android app in **5 steps**.

### Prerequisites
- Android Studio, app with **minSdk 24+**
- A **Firebase project** (free) for your app
- An **App ID** — create an app in the [OpenPush dashboard](https://beta.kathgolap.online) → **Applications** → **New application**, then copy its App ID.

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
    implementation("com.github.mobarokOP:OpenFCM:1.0.0")
    // Firebase Messaging is pulled in transitively — no extra FCM dependency needed.
}
```

> 💡 Always check the latest version badge above, or browse builds at [jitpack.io/#mobarokOP/OpenFCM](https://jitpack.io/#mobarokOP/OpenFCM).

---

### Step 2 · Connect Firebase

OpenPush delivers through **your** Firebase project, so the app and the OpenPush server must point at the same project.

1. In the [Firebase Console](https://console.firebase.google.com), add your Android app and download **`google-services.json`** into your `app/` folder.
2. Add the Google Services plugin:

```kotlin
// build.gradle.kts (project)
plugins {
    id("com.google.gms.google-services") version "4.4.2" apply false
}
// app/build.gradle.kts
plugins {
    id("com.google.gms.google-services")
}
```

3. In Firebase → **Project settings → Service accounts → Generate new private key**. Upload that JSON in the OpenPush dashboard under your app's **Settings → FCM**. *(This lets the server send on your behalf.)*

---

### Step 3 · Initialize the SDK

Initialize once in your `Application` class. Point `baseUrl` at the OpenPush backend.

```kotlin
// MyApp.kt
import android.app.Application
import com.openpush.sdk.OpenPush

class MyApp : Application() {
    override fun onCreate() {
        super.onCreate()

        OpenPush.init(this, appId = "YOUR_APP_ID") {
            baseUrl = "https://admin.beta.kathgolap.online" // your OpenPush server
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

### Step 4 · Ask for notification permission (Android 13+)

```kotlin
// In your first Activity
if (!OpenPush.areNotificationsEnabled()) {
    OpenPush.requestNotificationPermission(this)
}
```

---

### Step 5 · Identify users, tag, and subscribe

```kotlin
// Link this device to your app's user (after they log in)
OpenPush.login("user_12345")

// Attributes for targeting
OpenPush.addTag("premium", "true")
OpenPush.addTags(mapOf("language" to "bn", "city" to "Rangpur"))

// Broadcast channels
OpenPush.subscribeTopic("announcements")

// On sign-out
OpenPush.logout()
```

**Handle notification taps & deep links:**

```kotlin
OpenPush.setNotificationOpenHandler { payload ->
    // payload.deepLink, payload.notificationId, payload.data[...]
    payload.deepLink?.let { openDeepLink(it) }
}
```

<details>
<summary><b>📋 Full SDK API reference</b></summary>

| Method | Description |
|--------|-------------|
| `OpenPush.init(context, appId) { … }` | Initialize, register device, sync FCM token |
| `OpenPush.login(externalId)` | Associate device with your user id |
| `OpenPush.logout()` | Clear the user association |
| `OpenPush.addTag(key, value)` / `addTags(map)` | Set targeting tags |
| `OpenPush.removeTag(key)` / `removeTags(list)` | Remove tags |
| `OpenPush.subscribeTopic(name)` / `unsubscribeTopic(name)` | Manage topic subscriptions |
| `OpenPush.setNotificationOpenHandler { payload -> }` | Handle taps / deep links |
| `OpenPush.requestNotificationPermission(activity)` | Android 13+ runtime permission |
| `OpenPush.areNotificationsEnabled()` | Check permission state |
| `OpenPush.deviceId` / `OpenPush.externalId` | Introspect current registration |

**Config options** (`OpenPush.init(...) { }`): `baseUrl`, `defaultChannelId`, `defaultChannelName`, `smallIconResId`, `accentColor`, `enableDebugLogging`, `autoRegister`, `trackSessions`.

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

OpenPush is fully self-hostable (Laravel · MySQL · Redis · FCM).

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
php artisan migrate --seed        # demo login: demo@openpush.test / password
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
