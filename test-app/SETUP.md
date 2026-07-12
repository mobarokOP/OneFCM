# OpenFCM Test App — Setup Guide (বাংলা)

এই ছোট Android অ্যাপ দিয়ে যাচাই করবে — OpenFCM থেকে পাঠানো notification আসলেই তোমার Android ডিভাইসে পৌঁছাচ্ছে কিনা।

> **OneSignal-এর মতো:** অ্যাপে **কোনো Firebase setup লাগে না** — না `google-services.json`, না কোনো plugin। শুধু SDK + App ID। SDK নিজেই server থেকে Firebase config নিয়ে init করে, ডিভাইস register করে, আর notification permission চায়।

---

## 🧭 কীভাবে কাজ করে

```
Test App (শুধু SDK + App ID)
   │  init()
   ▼
OpenFCM server ──► Firebase config দেয় ──► SDK Firebase init করে টোকেন নেয়
   ▲                                              │ device register
   │  তুমি dashboard/API থেকে notification পাঠাও   ▼
   └────────────► central Firebase (FCM) ────► তোমার ফোনে notification 🎉
```

একটা **central Firebase project** সব অ্যাপ শেয়ার করে (তাই প্রতি অ্যাপে Firebase বসাতে হয় না)। সেটআপ শুধু **server-এ একবার**।

---

## 🖥️ Part A — Server setup (একবার, mobarok করবে)

Notification সত্যিকারে যেতে হলে backend-এ একটা central Firebase project কনফিগার করতে হবে।

### A1. একটা Firebase project বানাও
1. [Firebase Console](https://console.firebase.google.com) → **Add project** (একটাই, সব OpenFCM অ্যাপের জন্য)।
2. ভিতরে **Add app → Android** → যেকোনো package দাও (যেমন `com.openfcm.central`) → `google-services.json` download করো।

### A2. Client value গুলো বের করো (google-services.json থেকে)
| .env variable | google-services.json-এর ফিল্ড |
|---|---|
| `OPENFCM_FCM_PROJECT_ID` | `project_info.project_id` |
| `OPENFCM_FCM_SENDER_ID` | `project_info.project_number` |
| `OPENFCM_FCM_CLIENT_APP_ID` | `client[0].client_info.mobilesdk_app_id` |
| `OPENFCM_FCM_CLIENT_API_KEY` | `client[0].api_key[0].current_key` |
| `OPENFCM_FCM_STORAGE_BUCKET` | `project_info.storage_bucket` (optional) |

### A3. Service account (পাঠানোর জন্য, secret)
Firebase → ⚙️ **Project settings → Service accounts → Generate new private key** → JSON download।

### A4. VPS-এ backend `.env`-এ বসাও
```env
OPENFCM_DRIVER=fcm
OPENFCM_FCM_PROJECT_ID=your-project-id
OPENFCM_FCM_SENDER_ID=1234567890
OPENFCM_FCM_CLIENT_APP_ID=1:1234567890:android:abcdef123456
OPENFCM_FCM_CLIENT_API_KEY=AIzaSy...
OPENFCM_FCM_STORAGE_BUCKET=your-project-id.appspot.com
# service account JSON — এক লাইনে (অথবা _PATH দিয়ে ফাইল path)
OPENFCM_FCM_SERVICE_ACCOUNT_JSON={"type":"service_account","project_id":"...", ... }
```
তারপর:
```bash
php artisan config:clear
```
✅ যাচাই: `https://admin.beta.kathgolap.online/v1/fcm-config` (header `X-OpenFCM-App: <App ID>`) দিলে project config ফেরত দিলে ঠিক আছে।

---

## 📱 Part B — অ্যাপ install (তুমি / যেকোনো developer)

### B1. App ID বসাও
1. [Dashboard](https://beta.kathgolap.online) → **Applications** → App ID কপি করো।
2. `test-app/app/src/main/java/com/example/openfcmtest/TestApp.kt`:
   ```kotlin
   const val OPENFCM_APP_ID = "PASTE_YOUR_APP_ID_HERE"   // 👈 তোমার App ID
   const val OPENFCM_BASE_URL = "https://admin.beta.kathgolap.online"
   ```

### B2. Build + Install
1. Android Studio → **Open** → `test-app` ফোল্ডার।
2. Gradle sync → ডিভাইস কানেক্ট → **Run ▶️**।
3. অ্যাপ খুললে **নিজে থেকেই** notification permission চাইবে → **Allow** দাও।
4. কয়েক সেকেন্ড পর **Device ID** দেখাবে (না দেখালে **Refresh**)।

> ✅ dashboard → **Devices** পেজে ডিভাইসটা দেখা যাবে = registration সফল।

### B3. Notification পাঠাও
Dashboard → **New notification** → Title/Body → Audience **All** → **Send**।
অথবা API:
```bash
curl -X POST https://admin.beta.kathgolap.online/v1/notifications \
  -H "Authorization: Bearer op_live_YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{ "app_id":"YOUR_APP_ID", "title":"Hello 👋", "body":"OpenFCM test", "audience":{"type":"all"} }'
```

### B4. ফোনে দেখো 🎉
- অ্যাপ **বন্ধ/background:** status bar-এ notification।
- অ্যাপ **খোলা:** SDK দেখায় + tap করলে Toast।
- Dashboard → **Delivery Logs**-এ `delivered`।

---

## 🩺 আসছে না? — Checklist

1. **Server A1–A4 ঠিকভাবে হয়েছে?** `/v1/fcm-config` কাজ করছে? (সবচেয়ে জরুরি)
2. `.env` বদলানোর পর **`php artisan config:clear`** দিয়েছ?
3. `OPENFCM_DRIVER=fcm` (বা `auto`) আছে? service account JSON valid?
4. ফোনে permission **Allow** করেছ? (Settings → Apps → OpenFCM Test → Notifications)
5. **Device ID** দেখাচ্ছে? না হলে internet / App ID / baseUrl চেক করো।
6. Emulator হলে **Google Play আছে এমন image**।
7. **Logcat** → filter `OpenFCM` (init/config/token/register/receive লগ)।

---

## 🧪 অ্যাপের বাটন

| বাটন | কাজ |
|------|-----|
| Enable notifications | (auto হয়ে গেলে দরকার নেই) permission চায় |
| Login as test_user | external id `test_user` — user-target টেস্ট |
| Add tag premium=true | tag-target টেস্ট |
| Subscribe topic 'all' | topic-target টেস্ট |
| Copy Device ID | device-target টেস্ট |
| Refresh | status রিফ্রেশ |

SDK-র পুরো API: রুট [README](../README.md)।
