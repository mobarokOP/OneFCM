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
   └────────► অ্যাপের নিজের Firebase (FCM) ────► তোমার ফোনে notification 🎉
```

**প্রতিটা অ্যাপের নিজস্ব Firebase project** — dashboard-এ শুধু সেই অ্যাপের **service account JSON** আপলোড করলেই হয়। বাকি সব (client config, Android app registration) backend নিজেই করে নেয়। তাই notification কখনো এক অ্যাপ থেকে আরেক অ্যাপে যাওয়ার সুযোগ নেই।

---

## 🖥️ Part A — Dashboard-এ Firebase connect (প্রতি অ্যাপে একবার)

কোনো server `.env` ঘাঁটাঘাঁটি লাগবে না — সবকিছু [dashboard](https://beta.kathgolap.online) থেকেই হয়।

### A1. Service account key নাও (Firebase Console)
1. [Firebase Console](https://console.firebase.google.com) → তোমার অ্যাপের project খোলো (না থাকলে **Add project**)।
2. ⚙️ **Project settings → Service accounts → Generate new private key** → JSON ফাইল download করো।

> `google-services.json` লাগবে **না** — শুধু এই service account JSON।

### A2. Dashboard-এ আপলোড করো
1. [Dashboard](https://beta.kathgolap.online) → **Applications** → তোমার অ্যাপ (না থাকলে **New application** — অবশ্যই **package name** দিয়ে বানাও)।
2. অ্যাপের **Settings → FCM** → service account **JSON আপলোড** করো।
3. Backend নিজে থেকেই Firebase client config (project id, sender id, API key, app id) বের করে নেবে। Firebase project-এ কোনো Android app register না থাকলে অ্যাপের package name দিয়ে **auto-register** করে দেবে।

### A3. যাচাই
Status **"Connected"** দেখালেই ready ✅ — এখন Part B-তে যাও।

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

1. **Dashboard-এ অ্যাপের FCM status "Connected" দেখাচ্ছে?** (সবচেয়ে জরুরি) — error দেখালে message-টা পড়ো (যেমন: Firebase project-এ Android app নেই → অ্যাপের package name সেট করে আবার save)।
2. Service account JSON **সঠিক project-এর** তো? (Firebase Console → Service accounts থেকে নতুন key নাও)
3. ফোনে permission **Allow** করেছ? (Settings → Apps → OpenFCM Test → Notifications)
4. **Device ID** দেখাচ্ছে? না হলে internet / App ID / baseUrl চেক করো।
5. Emulator হলে **Google Play আছে এমন image**।
6. **Logcat** → filter `OpenFCM` (init/config/token/register/receive লগ)।

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
