# MD.Family — دليل النشر على Render.com

<div dir="rtl">

## 🚀 خطوات النشر (10 دقائق)

### المتطلبات:
- حساب GitHub
- حساب Render.com (مجاني)
- Git مثبت على جهازك

### الخطوة 1: ارفع المشروع على GitHub

```bash
# 1) حمّل MD-Family-complete-project.zip وفك الضغط
cd my-project

# 2) أنشئ ملف .gitignore (موجود بالفعل)

# 3) أنشئ repo على GitHub:
#    اذهب إلى https://github.com/new
#    اسم: mdfamily
#    اضغط Create repository

# 4) ارفع الكود:
git init
git remote add origin https://github.com/YOUR_USERNAME/mdfamily.git
git add -A
git commit -m "MD.Family v2.3.0"
git push -u origin main
```

### الخطوة 2: انشر على Render.com

1. اذهب إلى https://dashboard.render.com
2. سجّل حساب مجاني (عبر GitHub)
3. اضغط **"New +"** → **"Blueprint"**
4. اختر repo: `mdfamily`
5. Render سيقرأ `render.yaml` تلقائياً وينشئ 3 خدمات:
   - **mdfamily-db** (PostgreSQL 16 مجاني)
   - **mdfamily-redis** (Redis مجاني)
   - **mdfamily-api** (FastAPI مجاني)
6. اضغط **"Apply"**
7. انتظر 3-5 دقائق

### الخطوة 3: احصل على الرابط العام

بعد اكتمال النشر، ستحصل على رابط مثل:
```
https://mdfamily-api.onrender.com
```

### الخطوة 4: اضبط Firebase (للإشعارات)

في لوحة Render:
1. اذهب إلى `mdfamily-api` → **Environment**
2. أضف ملف سري: `firebase-service-account.json`
3. الصق محتوى ملف JSON اللي نزلته من Firebase Console

### الخطوة 5: ابنِ APK متصل بالسيرفر العام

```bash
# على جهازك:
export NEXT_PUBLIC_API_URL=https://mdfamily-api.onrender.com
bash scripts/build-apk.sh debug

# الناتج: download/MD-Family-v2.3.0.apk
# ثبّته على هاتفك — البيانات ستتزامن مع السيرفر!
```

## ✅ ما سيحدث بعد النشر:

| الميزة | الحالة |
|--------|--------|
| **البيانات محفوظة على سيرفر** | ✅ PostgreSQL |
| **المزامنة بين الأجهزة** | ✅ عبر API |
| **QR Pairing حقيقي** | ✅ بين هاتف الأب والابن |
| **Push Notifications** | ✅ عبر FCM |
| **WebSockets** | ✅ أحداث حية |
| **RBAC (صلاحيات)** | ✅ كامل |
| **Audit Log** | ✅ محفوظ |

## 💰 تكلفة Render.com:

| الخطة | التكلفة | المميزات |
|------|--------|---------|
| **Free** | $0/شهر | 512MB RAM, auto-sleep بعد 15 دقيقة عدم نشاط |
| **Starter** | $7/شهر | 512MB RAM, no sleep, always on |
| **Standard** | $25/شهر | 2GB RAM, production-grade |

الخطة المجانية كافية للتجربة. للتشغيل المستمر، يُنصح بـ Starter.

## 🔧 استكشاف الأخطاء:

| المشكلة | الحل |
|--------|------|
| Build failed | تحقق من logs في Render dashboard |
| Database connection error | تأكد من أن `MDFAMILY_DATABASE_URL` مضبوط |
| CORS error | أضف رابط frontend في `MDFAMILY_CORS_ORIGINS` |
| Firebase لا يعمل | تأكد من رفع ملف service account JSON |
| Cold start بطيء | ارق لخطة Starter ($7/شهر) |

</div>
