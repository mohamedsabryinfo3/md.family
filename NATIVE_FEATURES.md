# MD.Family — Native Android Features

<div dir="rtl">

توثيق شامل لكل الميزات الأصلية المُفعّلة في تطبيق MD.Family على أجهزة الأطفال.

## ✅ الميزات المُنفّذة بالكامل

### 1. Firebase Cloud Messaging (FCM) — Push Notifications

**Backend** (`backend/app/core/fcm.py`):
- ✅ Firebase Admin SDK v7.7.0 مثبّت ومُهيّأ
- ✅ وضعان: production (مع service account JSON) + dev mode (تسجيل فقط)
- ✅ 8 أنواع من الإشعارات: SOS, alerts, extension requests, policy updates, pairing linked, zone enter/exit, live sessions, family pause
- ✅ إرسال لكل الآباء (`notify_family_parents`) أو لجهاز طفل معين (`notify_child_device`)
- ✅ 7 قنوات إشعارات أندرويد (`/api/v1/notifications/channels`)

**Endpoints جديدة**:
- `POST /api/v1/devices/{device_id}/register-token` — تسجيل FCM token لجهاز الطفل
- `POST /api/v1/me/register-token` — تسجيل FCM token لجهاز الوالد
- `DELETE /api/v1/devices/{device_id}/register-token` — إلغاء تفعيل الـ token
- `POST /api/v1/devices/{device_id}/test-notification` — إرسال إشعار اختبار
- `GET /api/v1/notifications/channels` — قائمة قنوات الإشعارات

**جدول قاعدة بيانات جديد**: `device_tokens` (مع فهرسة على user_id و device_id و unique على token)

**Android** (`notifications/MDFamilyFirebaseMessagingService.kt`):
- ✅ استقبال FCM messages وتحويلها لـ Capacitor events
- ✅ إظهار إشعارات بالقناة المناسبة (HIGH importance لـ SOS)
- ✅ تفعيل ProtectionService تلقائياً عند `policy.updated` / `family_pause`
- ✅ تحديث FCM token تلقائياً عند `onNewToken()`

### 2. VPN Service (MD-Sabry Engine)

**Android** (`services/MDSabryVpnService.kt` + `engine/MDSabryRuleEngine.kt`):
- ✅ `VpnService` كامل ي-establish TUN interface
- ✅ قراءة DNS packets من الـ TUN
- ✅ تصنيف الـ hostname (adult, gambling, social, education, games, shopping)
- ✅ قواعد BLOCK / ALERT / ALLOW
- ✅ URL exceptions تتجاوز الفئات
- ✅ Family pause يمنع كل شيء ما عدا المُستثنى
- ✅ LRU cache لتسرييع تقييم الـ hostnames
- ✅ Foreground notification دائمة (لون Trust Blue)
- ✅ معالجة `onRevoke()` (عند سحب المستخدم للموافقة)
- ✅ Foreground service type: `systemExempted` (Android 14+)

**Rule Engine**:
- ✅ Category classification (8 فئات افتراضية)
- ✅ Per-app daily limit tracking
- ✅ Daily reset لـ usage counters
- ✅ Family pause state
- ✅ Policy version tracking
- ✅ Cache invalidation عند تحديث القواعد

**Tests**: 20+ unit tests في `MDSabryRuleEngineTest.kt`

### 3. Accessibility Service (App Policies)

**Android** (`services/MDFamilyAccessibilityService.kt` + `services/LockOverlay.kt`):
- ✅ مراقبة `TYPE_WINDOW_STATE_CHANGED` events فقط (لا scraping للمحتوى)
- ✅ مطابقة الـ foreground package مع قائمة المحظورات
- ✅ إظهار `LockOverlay` عند فتح تطبيق محظور
- ✅ زر "طلب وقت إضافي" في الـ overlay
- ✅ زر "الاتصال بالطوارئ" دائماً متاح
- ✅ Background thread يحسب الاستخدام كل 60 ثانية
- ✅ Auto-block عند تجاوز الحد اليومي
- ✅ Accessibility config XML (لا يقرأ محتوى الـ window)
- ✅ Opt-in فقط (المستخدم يفعّلها من Settings → Accessibility)

**LockOverlay**:
- ✅ Window type: `TYPE_APPLICATION_OVERLAY` (يتطلب `SYSTEM_ALERT_WINDOW`)
- ✅ غير قابل للإغلاق بالـ swipe
- ✅ خلفية Deep Navy مع شفافية 94%
- ✅ نص عربي واضح للسبب
- ✅ زر طلب وقت إضافي باللون Amber

### 4. MediaProjection (Live Screen View)

**Android** (`services/ScreenCaptureService.kt`):
- ✅ `MediaProjection` API رسمي
- ✅ Captures JPEG frames @ 2 FPS (قابل للتعديل)
- ✅ Foreground notification دائمة أثناء الجلسة (HIGH importance)
- ✅ Foreground service type: `mediaProjection` (Android 14+)
- ✅ زر "إنهاء" في الإشعار
- ✅ معالجة `MediaProjection.Callback.onStop()` (عند سحب الموافقة)
- ✅ Auto-stop عند انقطاع الـ consent
- ✅ لا remote touch control (per blueprint §11)

### 5. Voice Calls + Ambient Audio

**Android** (`services/VoiceCallService.kt`):
- ✅ `AudioRecord` بـ `VOICE_COMMUNICATION` source للمكالمات
- ✅ `AudioRecord` بـ `MIC` source لـ ambient audio
- ✅ AcousticEchoCanceler للمكالمات
- ✅ NoiseSuppressor للمكالمات
- ✅ 16 kHz sample rate, 16-bit PCM, mono
- ✅ Mute / unmute controls
- ✅ Foreground service type: `microphone` (Android 14+)
- ✅ Foreground notification HIGH importance
- ✅ Max ambient session duration: 10 دقائق (auto-stop)
- ✅ لا يتم حفظ التسجيل (stream فقط)

### 6. Foreground Protection Service

**Android** (`ProtectionService.kt`):
- ✅ Singleton `MDSabryRuleEngine` (shared across services)
- ✅ Foreground service type: `dataSync|location`
- ✅ إشعار دائم (LOW importance) مع زر "إيقاف الإنترنت"
- ✅ استقبال FCM events (policy.updated, family_pause)
- ✅ تحديث الـ rule engine عند policy.updated
- ✅ Start/Stop VPN service
- ✅ Restart بعد boot (via `BootReceiver`)
- ✅ START_STICKY (restart if killed)

### 7. Geofencing (Safe Zones)

**Android** (`services/MDFamilyLocationService.kt` + `receivers/MDFamilyGeofenceTransitionReceiver.kt`):
- ✅ `GeofencingClient` من Google Play Services
- ✅ Register / unregister geofences ديناميكياً
- ✅ Enter / exit transitions
- ✅ Pending intent + BroadcastReceiver
- ✅ إشعار محلي عند كل transition
- ✅ Upload للـ backend (queued offline)
- ✅ `FusedLocationProviderClient` للحصول على الموقع الحالي
- ✅ Periodic location uploads (كل 15 دقيقة)
- ✅ لا يتم تفعيله إلا بعد ACCESS_FINE_LOCATION consent

### 8. UsageStatsManager (App Usage Stats)

**Android** (`services/MDFamilyUsageStatsCollector.kt`):
- ✅ قراءة per-app usage stats من النظام
- ✅ Aggregate by package (معالجة multiple intervals)
- ✅ Sort by usage minutes descending
- ✅ App name lookup via PackageManager
- ✅ Permission check (`unsafeCheckOpNoThrow` على Android 10+)
- ✅ Helper لفتح شاشة Usage Access settings
- ✅ JSON array output لرفعه للـ backend

### 9. Capacitor Plugin Bridge

**Android** (`plugins/MDFamilyNativePlugin.kt`):
- ✅ `@CapacitorPlugin(name = "MDFamilyNative")` مسجّل
- ✅ 15+ methods مكشوفة لـ JavaScript:
  - `getPermissionStatus(name)` — فحص صلاحية
  - `openPermissionSettings(name)` — فتح شاشة الإعدادات
  - `startVpnService()` / `stopVpnService()` — تحكم VPN
  - `startScreenCapture(sessionId)` / `stopScreenCapture()` — Live Screen View
  - `startVoiceCall(sessionId)` / `startAmbientAudio(sessionId)` / `stopAudioSession()`
  - `triggerSos(childId)` — استغاثة SOS
  - `getUsageStats()` — قراءة إحصائيات التطبيقات
  - `getRuleEngineState()` — debugging
  - `updateBlockedPackages(packages)` — تحديث قائمة المحظورات
- ✅ ActivityResult callbacks (VPN consent, MediaProjection consent)
- ✅ Web fallback (returns "not_determined" للصلاحيات)

**Frontend** (`src/lib/native-bridge.ts`):
- ✅ TypeScript wrapper كامل مع types
- ✅ Auto-detect Capacitor.isNativePlatform()
- ✅ Graceful web fallback
- ✅ Lazy plugin loading

## 🎯 المنطقة الكاملة (Architecture)

```
┌─────────────────────────────────────────────────────────────┐
│                    Android Device (Child)                   │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ Capacitor WebView (Next.js PWA)                        │ │
│  │  ├─ src/lib/native-bridge.ts                           │ │
│  │  └─ src/lib/api-actions.ts                              │ │
│  └─────────────────────────┬──────────────────────────────┘ │
│                            │ JS Bridge                       │
│  ┌─────────────────────────┴──────────────────────────────┐ │
│  │ Capacitor Plugin: MDFamilyNativePlugin                  │ │
│  └─────────────────────────┬──────────────────────────────┘ │
│                            │                                 │
│  ┌─────────────────────────┴──────────────────────────────┐ │
│  │ Native Services (Kotlin)                                │ │
│  │  ├─ MDFamilyFirebaseMessagingService (FCM receive)      │ │
│  │  ├─ ProtectionService (foreground, always-on)           │ │
│  │  ├─ MDSabryVpnService (web filtering)                   │ │
│  │  ├─ MDFamilyAccessibilityService (app policies)         │ │
│  │  ├─ ScreenCaptureService (Live Screen View)             │ │
│  │  ├─ VoiceCallService (voice calls + ambient audio)      │ │
│  │  ├─ MDFamilyLocationService (geofencing)                │ │
│  │  ├─ MDFamilyUsageStatsCollector (app usage)             │ │
│  │  ├─ MDSabryRuleEngine (in-memory policy store)          │ │
│  │  └─ LockOverlay (blocked app UI)                        │ │
│  └─────────────────────────┬──────────────────────────────┘ │
│                            │                                 │
└────────────────────────────┼─────────────────────────────────┘
                             │ HTTPS / WebSocket
                             ▼
┌─────────────────────────────────────────────────────────────┐
│                   FastAPI Backend (:8000)                    │
│  ├─ /api/v1/notifications/* (FCM token registration)         │
│  ├─ /api/v1/.../sos (SOS → FCM push to parents)              │
│  ├─ /api/v1/.../pairing/consume (link device → FCM to parents)│
│  ├─ WebSocket /api/v1/ws (real-time events)                  │
│  └─ Firebase Admin SDK → FCM HTTP v1                          │
└─────────────────────────────────────────────────────────────┘
```

## 📊 الأذونات المطلوبة (مع شرح كل واحد)

| الإذن | السبب | مطلوب سياقياً؟ |
|------|------|------------------|
| `INTERNET` | مزامنة البيانات | تلقائي |
| `ACCESS_FINE_LOCATION` | الموقع الحي + Geofencing | بعد موافقة |
| `ACCESS_BACKGROUND_LOCATION` | Geofencing في الخلفية | بعد موافقة |
| `BIND_VPN_SERVICE` | فلترة الويب | بعد موافقة VPN consent |
| `BIND_ACCESSIBILITY_SERVICE` | سياسات التطبيقات | يفعّلها المستخدم يدوياً |
| `PACKAGE_USAGE_STATS` | حساب وقت التطبيقات | يفعّلها المستخدم يدوياً |
| `SYSTEM_ALERT_WINDOW` | LockOverlay | يفعّلها المستخدم يدوياً |
| `FOREGROUND_SERVICE_*` | 5 services تعمل في الخلفية | تلقائي (مع الإشعار) |
| `RECORD_AUDIO` | المكالمات + Ambient audio | بعد موافقة |
| `CALL_PHONE` | زر الطوارئ | تفاعل صريح |
| `POST_NOTIFICATIONS` | إشعارات (Android 13+) | بعد موافقة |
| `RECEIVE_BOOT_COMPLETED` | إعادة تشغيل ProtectionService | تلقائي |
| `WAKE_LOCK` | الحفاظ على الخدمة | تلقائي |

## 🔐 الأمان والخصوصية

### لا مراقبة خفية
- ✅ كل الخدمات foreground مع إشعار ظاهر
- ✅ Accessibility لا يقرأ محتوى الشاشة (`canRetrieveWindowContent=false`)
- ✅ لا scraping للنصوص أو كلمات المرور
- ✅ لا تحايل على إعدادات النظام
- ✅ لا منع uninstallation بطريقة غير مشروعة

### موافقة صريحة لكل ميزة حساسة
- ✅ VPN: consent dialog من Android
- ✅ Accessibility: user يفعّلها يدوياً من Settings
- ✅ MediaProjection: consent dialog من Android + إشعار دائم
- ✅ Microphone: runtime permission + إشعار foreground دائم
- ✅ UsageStats: user يفعّلها يدوياً من Settings
- ✅ Draw over apps: user يفعّلها يدوياً من Settings

### Audit log كامل
كل العمليات التالية تُسجّل في `audit_logs` (append-only):
- ✅ Pairing create / cancel / regenerate / linked
- ✅ Permission updates
- ✅ Policy updates
- ✅ Live session start / end
- ✅ SOS triggers
- ✅ Backup create / restore
- ✅ Test notification send

## 📁 ملفات Kotlin الجديدة

```
android-template/app/src/main/java/family/md/sabry/
├── ProtectionService.kt                 (محدّث — أصبح الـ coordinator الأساسي)
├── MainActivity.kt                      (موجود — يحمّل WebView)
├── BootReceiver.kt                       (موجود — يعيد تشغيل ProtectionService)
├── engine/
│   └── MDSabryRuleEngine.kt             (جديد — في-memory rule store)
├── notifications/
│   ├── NotificationChannels.kt          (جديد — 8 قنوات إشعارات)
│   └── MDFamilyFirebaseMessagingService.kt (جديد — FCM receive)
├── services/
│   ├── MDSabryVpnService.kt              (جديد — VPN filtering)
│   ├── MDFamilyAccessibilityService.kt   (جديد — app policies)
│   ├── MDFamilyLocationService.kt        (جديد — geofencing + location)
│   ├── MDFamilyUsageStatsCollector.kt    (جديد — app usage stats)
│   ├── ScreenCaptureService.kt          (جديد — Live Screen View)
│   ├── VoiceCallService.kt              (جديد — voice calls + ambient audio)
│   └── LockOverlay.kt                   (جديد — overlay للمحظورات)
├── receivers/
│   └── MDFamilyGeofenceTransitionReceiver.kt (جديد — geofence events)
└── plugins/
    └── MDFamilyNativePlugin.kt          (جديد — Capacitor bridge)

android-template/app/src/main/res/xml/
├── accessibility_service_config.xml      (جديد — Accessibility config)
└── network_security_config.xml           (موجود)

android-template/app/src/test/java/family/md/sabry/
├── engine/
│   └── MDSabryRuleEngineTest.kt          (جديد — 20+ unit tests)
├── notifications/
│   └── NotificationChannelsTest.kt       (جديد — channel tests)
└── services/
    └── ProtectionServiceTest.kt          (جديد — service tests)
```

## 🧪 اختبارات pytest الجديدة

```bash
cd backend
pytest tests/test_notifications.py -v
```

النتيجة: 6 tests pass (channels list, register parent token, idempotent registration, register child device token, unknown device 404, test notification send).

**إجمالي اختبارات الـ backend**: 63/64 pass (1 skipped because needs paired device).

## 🚀 تفعيل FCM في الإنتاج

لتفعيل الإشعارات الفعلية:

1. **أنشئ Firebase Project** على [console.firebase.google.com](https://console.firebase.google.com)
2. **أضف Android app** بـ package name `family.md.sabry`
3. **حمّل `google-services.json`** وضعه في `android/app/`
4. **أنشئ Service Account key** من Project Settings → Service Accounts → Generate new private key
5. **احفظ ملف JSON** على الخادم (مثلاً `/etc/mdfamily/firebase-service-account.json`)
6. **أضف المتغير** في `.env`:
   ```
   MDFAMILY_FIREBASE_SERVICE_ACCOUNT_PATH=/etc/mdfamily/firebase-service-account.json
   ```
7. **أعد تشغيل الـ backend** — ستظهر في الـ log:
   ```
   [FCM] Firebase Admin SDK initialized from /etc/...
   ```

بدون هذا الإعداد، الـ FCM يعمل في dev mode (يسجّل الإشعارات في log فقط).

## ⚠️ القيود المعروفة في هذا الإصدار

- ✅ كل الكود مكتوب وجاهز للبناء
- ⚠️ الـ backend يعمل في dev mode للـ FCM (لا يرسل فعلياً حتى تضبط service account)
- ⚠️ VPN service لا تُختبر فعلياً على جهاز أندرويد (تحتاج جهاز حقيقي)
- ⚠️ Accessibility service تحتاج تفعيل يدوي من المستخدم
- ⚠️ WebRTC للـ Live Screen View يحتاج signaling server (غير مضمّن — حالياً نُسجّل حجم الـ frames فقط)
- ⚠️ Opus encoding للـ voice calls يحتاج مكتبة native (غير مضمّن — حالياً نقرأ PCM فقط)

## 🎯 الخطوات التالية

1. **أنشئ Firebase project** وحمّل `google-services.json` + service account JSON
2. **ابنِ APK** بأمر: `bash scripts/build-apk.sh debug`
3. **ثبّت APK على هاتف طفل** وفعّل Accessibility + Usage Access + Draw over apps
4. **اختبر تدفق SOS** من تطبيق الوالد — يجب أن يصلك FCM push
5. **اربط Firebase Cloud Messaging** بـ APNs (لو لدعم iOS لاحقاً)
6. **أضف WebRTC signaling server** للـ Live Screen View بجودة عالية

</div>
