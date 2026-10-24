# MD.Family — تطبيق الأندرويد

<div dir="rtl">

## ✅ APK جاهز للتثبيت

تم بناء ملف **APK كامل** في:
```
/home/z/my-project/download/MD-Family-v2.0.0-debug.apk
```

| الخاصية | القيمة |
|---------|--------|
| **اسم الحزمة** | `family.md.sabry` |
| **اسم التطبيق** | MD.Family |
| **الإصدار** | 2.0.0 (versionCode 1) |
| **minSdkVersion** | 24 (Android 7.0) — يعمل على 99%+ من الأجهزة |
| **targetSdkVersion** | 36 (Android 16) |
| **حجم الملف** | ~4.9 MB |
| **التوقيع** | Debug keystore (صالح للتثبيت على أي جهاز في وضع التطوير) |
| **عدد الملفات داخل APK** | 502 |

---

## 📱 طريقة التثبيت على هاتفك الأندرويد

### الطريقة الأبسط: نقل ملف APK يدوياً
1. انسخ ملف `MD-Family-v2.0.0-debug.apk` إلى هاتفك (عبر USB أو Google Drive أو إيميل).
2. على هاتفك، افتح ملف APK من تطبيق الملفات (Files).
3. إذا ظهر تحذير "التثبيت من مصادر غير معروفة":
   - اضغط **الإعدادات** → فعّل **"سماح من هذا المصدر"** لتطبيق الملفات فقط.
4. اضغط **تثبيت**.
5. ستجد أيقونة **MD.Family** على شاشتك الرئيسية — اضغط عليها لفتح التطبيق.

### الطريقة عبر ADB (للمطورين)
```bash
# 1) فعّل USB debugging على هاتفك:
#    الإعدادات → معلومات الهاتف → اضغط "رقم الإصدار" 7 مرات
#    ارجع → خيارات المطور → فعّل USB debugging

# 2) وصل الهاتف بالكمبيوتر عبر USB

# 3) ثبّت APK:
adb install -r MD-Family-v2.0.0-debug.apk

# 4) افتح التطبيق:
adb shell am start -n family.md.sabry/.MainActivity
```

---

## 🔄 إعادة بناء APK (لو عدّلت الكود)

### المتطلبات على جهازك
- [Node.js 20+](https://nodejs.org/) و [bun](https://bun.sh/)
- [JDK 21](https://adoptium.net/temurin/releases/?version=21)
- [Android SDK](https://developer.android.com/studio#command-line-tools-only) (cmdline-tools + platform-tools + build-tools;36.0.0 + platforms;android-36)

### بناء بأمر واحد
```bash
# بناء APK Debug (جاهز للتثبيت على هاتفك)
bash scripts/build-apk.sh debug

# بناء AAB Release (للنشر على Google Play — يحتاج توقيع خاص بك)
bash scripts/build-apk.sh release
```

السكريبت يقوم تلقائياً بـ:
1. ✅ التحقق من JDK 21 و Android SDK
2. ✅ تثبيت اعتماديات npm/bun
3. ✅ بناء النسخة الثابتة من تطبيق الويب (`out/`)
4. ✅ تهيئة مشروع Capacitor Android
5. ✅ نسخ ملفات MD.Family المخصّصة (Manifest + MainActivity + ProtectionService + الأيقونات)
6. ✅ `cap sync android` لنسخ الأصول
7. ✅ بناء APK عبر Gradle

الملف الناتج: `download/MD-Family-v2.0.0-debug.apk`

---

## 🏪 النشر على Google Play

1. ابنِ نسخة الـ Release:
   ```bash
   bash scripts/build-apk.sh release
   ```
2. أنشئ keystore خاص بك (مرة واحدة فقط):
   ```bash
   keytool -genkey -v -keystore mdfamily.keystore \
     -keyalg RSA -keysize 2048 -validity 10000 -alias mdfamily
   ```
3. أضف `signingConfigs` إلى `android/app/build.gradle`:
   ```gradle
   signingConfigs {
     release {
       storeFile file("mdfamily.keystore")
       storePassword "your-store-password"
       keyAlias "mdfamily"
       keyPassword "your-key-password"
     }
   }
   buildTypes {
     release {
       signingConfig signingConfigs.release
     }
   }
   ```
4. ارفع `MD-Family-v2.0.0-release-unsigned.aab` إلى [Google Play Console](https://play.google.com/console).

### بيانات المتجر المقترحة
- **اسم الحزمة:** `family.md.sabry`
- **الفئة:** Parenting / Lifestyle
- **الجمهور المستهدف:** الآباء والأمهات
- **الأذونات المطلوبة:** موضّحة في AndroidManifest.xml — كل إذن مع شرح سببه
- **COPPA / GDPR-Kids:** يجب مراجعة متخصص قانوني قبل النشر

---

## 🔧 بنية تطبيق الأندرويد

| المكوّن | المسار | الوظيفة |
|---------|--------|--------|
| **MainActivity** | `app/src/main/java/family/md/sabry/MainActivity.kt` | يحمّل Capacitor WebView، يدعم RTL العربي، يربط زر الرجوع |
| **ProtectionService** | `app/src/main/java/family/md/sabry/ProtectionService.kt` | Foreground Service لمحرك MD-Sabry، إشعار ظاهر دائماً |
| **BootReceiver** | `app/src/main/java/family/md/sabry/BootReceiver.kt` | يعيد تشغيل خدمة الحماية بعد الإقلاع |
| **AndroidManifest** | `app/src/main/AndroidManifest.xml` | كل الأذونات مع تعليقات تشرح سببها |
| **Resources** | `app/src/main/res/` | أيقونات (Adaptive+Legacy+Round)، splash، strings، styles، xml configs |

## الأذونات المطلوبة ولماذا

| الإذن | السبب |
|------|------|
| `INTERNET` | مزامنة سياسات الأسرة والتنبيهات |
| `ACCESS_FINE_LOCATION` | الموقع الحي والمناطق الآمنة |
| `ACCESS_BACKGROUND_LOCATION` | مراقبة المناطق الآمنة في الخلفية |
| `BIND_VPN_SERVICE` | فلترة الويب المحلية (مع موافقة) |
| `BIND_ACCESSIBILITY_SERVICE` | سياسات التطبيقات وتراكبات القفل |
| `PACKAGE_USAGE_STATS` | حساب وقت استخدام التطبيقات |
| `FOREGROUND_SERVICE_*` | خدمة الحماية الأمامية (إشعار ظاهر دائماً) |
| `RECORD_AUDIO` | المكالمات الصوتية وجلسات صوت المحيط |
| `CALL_PHONE` | زر اتصال الطوارئ (بتفاعل صريح) |
| `POST_NOTIFICATIONS` | إشعارات التنبيهات (Android 13+) |
| `RECEIVE_BOOT_COMPLETED` | إعادة تشغيل خدمة الحماية بعد الإقلاع |

كل الأذونات الحساسة تُطلب سياقياً من داخل الشاشة المناسبة — لا توجد مراقبة خفية.

---

## ❓ استكشاف الأخطاء

| المشكلة | الحل |
|--------|------|
| `JDK 21 not found` | ثبّت [Temurin 21](https://adoptium.net/) واضبط `JAVA_HOME` |
| `Android SDK not found` | ثبّت [cmdline-tools](https://developer.android.com/studio#command-line-tools-only) واضبط `ANDROID_HOME` |
| `attribute android:requestForegroundService not found` | تأكد أن `compileSdkVersion = 36` في `android/variables.gradle` |
| `Toolchain does not provide JAVA_COMPILER` | استخدم JDK كامل (OpenJDK)، وليس JRE فقط |
| APK يفتح لكن الشاشة بيضاء | شغّل `npx cap sync android` بعد أي تعديل |
| `adb: command not found` | `sdkmanager "platform-tools"` ثم أضفه إلى PATH |

## القيود المعروفة في هذا الإصدار

- ✅ APK يعمل وكل الواجهات تعمل (Dashboard، Pairing، Screen Time، Web Filter، Location، SOS، إلخ)
- ⚠️ خدمة `ProtectionService` معرّفة لكن منطق VPN/Accessibility الأصلي يحتاج تنفيذ Kotlin كامل
- ⚠️ لا يوجد Backend حقيقي بعد؛ كل البيانات mock ومخزّنة محلياً (localStorage)
- ⚠️ ميزات Live Screen View / Ambient Audio تعرض "غير مدعومة" حتى تُربط بـ MediaProjection/Mic APIs الأصلية

</div>
