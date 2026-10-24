# MD.Family — دليل البدء السريع

<div dir="rtl">

## 📦 محتويات الحزمة

هذه الحزمة تحتوي على المشروع الكامل:

```
MD-Family-complete-project.zip (12 MB)
├── src/                          # Frontend Next.js (380 ملف)
├── backend/                      # Backend FastAPI (49 ملف)
├── android/                      # مشروع Android Capacitor
├── android-template/             # قالب Android الكامل
├── scripts/                      # سكريبتات البناء
├── public/                       # أيقونات + PWA manifest + SW
├── .github/workflows/            # CI/CD pipelines
├── download/
│   ├── MD-Family-v2.0.0-native.apk   ← التطبيق الجاهز للتثبيت (5.7 MB)
│   └── MD-Family-v2.0.0-debug.apk    ← نسخة قديمة بدون Kotlin
├── package.json                  # اعتماديات Frontend
├── capacitor.config.ts           # إعدادات Android
├── README.md                     # التوثيق الرئيسي
├── NATIVE_FEATURES.md            # توثيق الميزات الأصلية
└── README_ANDROID.md             # دليل بناء APK
```

## 🚀 أسرع طريقة للبدء

### الطريقة 1: ثبّت الـ APK مباشرة (الأسرع)
1. فك الضغط عن الحزمة
2. انقل `download/MD-Family-v2.0.0-native.apk` إلى هاتفك الأندرويد
3. افتح الملف من تطبيق "الملفات"
4. اسمح بـ "التثبيت من مصدر غير معروف"
5. اضغط **تثبيت**

### الطريقة 2: شغّل المشروع محلياً (للتطوير)

#### المتطلبات
- Node.js 20+ و [bun](https://bun.sh/)
- Python 3.11+
- JDK 21 (لبناء APK)
- Android SDK (لبناء APK)

#### خطوات التشغيل

```bash
# 1) فك الضغط
unzip MD-Family-complete-project.zip
cd my-project

# 2) شغّل الـ Backend
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
python -m uvicorn app.main:app --reload --port 8000

# 3) في نافذة تانية، شغّل الـ Frontend
cd /path/to/my-project
bun install
bun run dev
# ← افتح http://localhost:3000

# 4) (اختياري) ابنِ APK
bash scripts/build-apk.sh debug
```

### الطريقة 3: شغّل عبر Docker (الأسهل للإنتاج)

```bash
cd backend
docker compose up -d
# ← API + PostgreSQL + Redis شغالين
```

## 📋 اللي تحتاج تعه بعد تحميل الحزمة

| الخطوة | الأولوية | الوصف |
|------|---------|------|
| ثبّت الـ APK على هاتفك | ⭐ عالية | جرّب التطبيق فوراً |
| شغّل الـ backend محلياً | ⭐ عالية | للتجربة الكاملة مع بيانات حقيقية |
| أنشئ Firebase project | 🔶 متوسطة | لتفعيل push notifications |
| اضبط Google OAuth | 🔶 متوسطة | لتفعيل الدخول بـ Google |
| انشر على Docker | 🔵 منخفضة | للنشر العام |

## 🔗 روابط مهمة

- Firebase Console: https://console.firebase.google.com
- Google Cloud Console: https://console.cloud.google.com
- Android Studio: https://developer.android.com/studio
- Bun: https://bun.sh/

## ❓ مساعدة

لو واجهت أي مشكلة، راجع:
- `README.md` — التوثيق الرئيسي الكامل
- `NATIVE_FEATURES.md` — شرح كل ميزة أصلية
- `README_ANDROID.md` — دليل بناء ونشر APK
- `backend/README.md` — توثيق الـ backend

</div>
