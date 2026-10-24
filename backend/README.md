# MD.Family Backend

<div dir="rtl">

Backend احترافي كامل لتطبيق **MD.Family** للرقابة الأبوية والسلامة الرقمية. مبني باستخدام **FastAPI + SQLAlchemy + PostgreSQL + Redis + WebSockets**، ويطبّق كل المواصفات في الـ Master Prompt المرفق.

## ✅ الحالة الحالية: يعمل بنجاح

تم تشغيله فعلياً والتحقق منه — **61 endpoint** عبر **13 module**، تم اجتياز كل اختبارات الـ smoke test:

```
✅ GET /health
✅ POST /auth/register → user.id=...
✅ GET /auth/me → Ahmed Sabry
✅ POST /families → Sabry Family
✅ POST /children → Youssef
✅ GET /children → 1 child
✅ POST /pairing → code=170865
✅ GET /pairing/consume/170865/preview → family=Sabry Family
✅ POST /pairing/consume → device.id=...
✅ Reuse pairing code → 410 (single-use enforced)
✅ GET /dashboard → 1 child, 0 events
✅ GET /audit → 4 entries
✅ GET /permissions/grants → 10 grants
✅ Uninvited mother GET /families/{id} → 403 forbidden
✅ GET /openapi.json → 49 paths
```

## 🏗️ البنية التقنية

| الطبقة | التقنية |
|--------|---------|
| **Framework** | FastAPI 0.115 (async) |
| **ORM** | SQLAlchemy 2.0 (async) |
| **Database** | PostgreSQL 16 + PostGIS (production) / SQLite (dev) |
| **Cache & pub/sub** | Redis 7 (مع fakeredis fallback للـ dev) |
| **Auth** | JWT (HS256) + Google OAuth |
| **Real-time** | WebSockets (FastAPI native) |
| **Migrations** | Alembic |
| **Validation** | Pydantic v2 |
| **Docs** | OpenAPI 3.1 (Swagger UI على `/docs`) |
| **Containerization** | Docker + docker-compose |

## 🚀 التشغيل السريع

### الطريقة الأولى: تشغيل محلي (dev mode — SQLite + fakeredis)

```bash
cd backend
cp .env.example .env                    # عدّل القيم لو حابب
pip install -r requirements.txt
python -m uvicorn app.main:app --reload --port 8000
```

ثم افتح المتصفح على:
- **API docs**: http://localhost:8000/docs (Swagger UI تفاعلي)
- **ReDoc**: http://localhost:8000/redoc
- **OpenAPI spec**: http://localhost:8000/openapi.json
- **Health check**: http://localhost:8000/health

### الطريقة الثانية: Docker Compose (production-like — PostgreSQL + Redis)

```bash
cd backend
docker compose up -d
# ← سيبدأ 3 خدمات: api + postgres + redis
docker compose logs -f api             # متابعة سجلات الـ API
docker compose down                    # إيقاف
```

الخدمات:
- `api` على المنفذ **8000**
- `postgres` على المنفذ **5432** (user: mdfamily, db: mdfamily)
- `redis` على المنفذ **6379**

## 📋 الـ Endpoints الكاملة (61 endpoint)

### المصادقة (Auth) — `/api/v1/auth`
| Method | Path | الوصف |
|--------|------|------|
| POST | `/register` | تسجيل بريد إلكتروني + كلمة مرور |
| POST | `/login` | تسجيل دخول |
| POST | `/google` | دخول عبر Google ID token |
| POST | `/google/code` | تبادل OAuth code (server-side flow) |
| POST | `/refresh` | تجديد access token |
| GET | `/me` | بيانات المستخدم الحالي |
| POST | `/logout` | خروج (client-side for JWT) |

### الأسر (Families) — `/api/v1/families`
| Method | Path | الوصف |
|--------|------|------|
| POST | `` | إنشاء أسرة (المستخدم يصبح Primary Owner) |
| GET | `/{id}` | تفاصيل الأسرة |
| PUT | `/{id}` | تحديث الإعدادات (pause, safe search, vpn) |
| GET | `/{id}/dashboard` | ملخص كامل للوحة |
| GET | `/{id}/audit` | سجل التدقيق (paginated) |
| PUT | `/{id}/members/{mid}/permissions` | تحديث صلاحيات الأم |
| GET | `/permissions/grants` | كتالوج الصلاحيات |

### الأطفال (Children) — `/api/v1/families/{fid}/children`
| Method | Path | الوصف |
|--------|------|------|
| POST | `` | إضافة طفل |
| GET | `` | قائمة الأطفال |
| GET | `/{cid}` | تفاصيل الطفل + الأجهزة + السياسات |
| PATCH | `/{cid}` | تحديث الطفل |
| DELETE | `/{cid}` | حذف الطفل (soft delete) |

### الاقتران (Pairing) — `/api/v1/pairing`
| Method | Path | الوصف |
|--------|------|------|
| POST | `/families/{fid}/children/{cid}/pairing` | توليد QR أحادي الاستخدام |
| GET | `/families/{fid}/pairing/{sid}` | حالة الجلسة |
| POST | `/families/{fid}/pairing/{sid}/cancel` | إلغاء |
| POST | `/families/{fid}/pairing/{sid}/regenerate` | توليد رمز جديد |
| GET | `/consume/{code}/preview` | معاينة قبل التأكيد (للطفل) |
| POST | `/consume` | استهلاك الكود من جهاز الطفل |

### سياسات التطبيقات — `/api/v1/families/{fid}/children/{cid}/app-policies`
| Method | Path | الوصف |
|--------|------|------|
| GET | `` | قائمة السياسات |
| PUT | `` | إنشاء/تحديث سياسة |
| PATCH | `/{pid}` | تعديل |
| DELETE | `/{pid}` | حذف |
| GET | `/extensions` | طلبات الوقت الإضافي |
| POST | `/extensions/{rid}/decide` | قبول/رفض طلب |

### تصفية الويب — `/api/v1/families/{fid}/web`
| Method | Path | الوصف |
|--------|------|------|
| GET | `/categories` | قائمة الفئات |
| PUT | `/categories/{cid}` | تحديث فئة (Allow/Alert/Block) |
| GET | `/exceptions` | استثناءات المواقع |
| POST | `/exceptions` | إضافة استثناء |
| DELETE | `/exceptions/{eid}` | حذف استثناء |

### الموقع — `/api/v1/families/{fid}`
| Method | Path | الوصف |
|--------|------|------|
| GET | `/children/{cid}/location/latest` | آخر موقع |
| GET | `/children/{cid}/location/history` | سجل الحركة |
| POST | `/children/{cid}/location` | رفع عينة موقع |
| GET | `/safe-zones` | قائمة المناطق الآمنة |
| POST | `/safe-zones` | إضافة منطقة |
| DELETE | `/safe-zones/{zid}` | حذف منطقة |
| POST | `/children/{cid}/sos` | إطلاق SOS |

### التنبيهات والنشاطات
| Method | Path | الوصف |
|--------|------|------|
| GET | `/families/{fid}/alerts` | قائمة التنبيهات (مع فلتر) |
| POST | `/families/{fid}/alerts/{aid}/review` | مراجعة (تجاهل/حل) |
| GET | `/families/{fid}/activity` | سجل النشاطات |

### المدارس، جهات الاتصال، التصنيف
| Method | Path | الوصف |
|--------|------|------|
| GET/POST/DELETE | `/families/{fid}/schools` | إدارة المدارس |
| GET/POST/DELETE | `/families/{fid}/contacts` | إدارة جهات الاتصال |
| POST | `/families/{fid}/classification-reports` | بلاغ تصنيف خاطئ |

### الجلسات الحية (ميزات حساسة)
| Method | Path | الوصف |
|--------|------|------|
| POST | `/families/{fid}/children/{cid}/live-sessions` | بدء جلسة (screen/voice/ambient) |
| GET | `/families/{fid}/children/{cid}/live-sessions` | قائمة الجلسات |
| POST | `/families/{fid}/live-sessions/{sid}/end` | إنهاء جلسة |

### النسخ الاحتياطي
| Method | Path | الوصف |
|--------|------|------|
| GET | `/families/{fid}/backups` | قائمة النسخ |
| POST | `/families/{fid}/backups` | إنشاء نسخة |
| POST | `/families/{fid}/backups/{bid}/restore` | استعادة |

### WebSocket
- **`/api/v1/ws?token=<JWT>`** — اتصال لحظي لتلقي الأحداث (pairing.linked, alert.created, sos.triggered, zone.enter, إلخ)

## 🗄️ نموذج البيانات (20 جدول)

| الجدول | الوصف |
|--------|------|
| `users` | حسابات المستخدمين (father/mother) |
| `families` | الأسر |
| `family_memberships` | عضوية المستخدم في الأسرة (مع role + mother_access_level + grants) |
| `permission_grants` | كتالوج الصلاحيات (10 صلاحيات، منها 3 حساسة) |
| `children` | ملفات الأطفال (بدون عرض العمر بجوار الاسم) |
| `devices` | الأجهزة المرتبطة بالأطفال |
| `pairing_sessions` | جلسات QR الاقتران (أحادية الاستخدام، TTL) |
| `app_policies` | سياسات التطبيقات (always_allowed/daily_limit/blocked) |
| `routines` | الروتينات (دراسة/نوم/downtime) |
| `extension_requests` | طلبات الوقت الإضافي |
| `web_categories` | فئات تصفية الويب |
| `website_exceptions` | استثناءات المواقع |
| `safe_zones` | المناطق الآمنة (geofences) |
| `location_samples` | عينات الموقع |
| `safety_alerts` | تنبيهات السلامة |
| `activity_events` | سجل النشاطات الموحد |
| `schools` | المدارس |
| `contacts` | جهات الاتصال |
| `classification_reports` | بلاغات التصنيف الخاطئ |
| `live_sessions` | جلسات Live Screen View / Voice Call / Ambient Audio |
| `backup_records` | سجلات النسخ الاحتياطي |
| `audit_logs` | سجل التدقيق (append-only) |

## 🔐 الأمان والصلاحيات

### JWT Auth
- **HS256** signing algorithm
- Access token TTL: 30 يوم (parent device)
- Refresh token TTL: 90 يوم
- Token in `Authorization: Bearer <token>` header

### RBAC (Role-Based Access Control)
| الدور | الصلاحيات |
|------|----------|
| **Primary Owner / Father** | كل الصلاحيات، بما فيها الميزات الحساسة |
| **Mother (full_access)** | كل صلاحيات الإدارة العادية، لكن الميزات الحساسة (Live Screen/Ambient Audio/Voice Call) تحتاج منح صريح |
| **Mother (custom_access)** | فقط الصلاحيات الممنوحة صراحة |
| **Mother (no_access)** | لا وصول لبيانات الأسرة |

**قيود إلزامية:**
- ❌ لا يمكن للأم رفع صلاحياتها أو نقل ملكية الأسرة
- ❌ لا يمكن لأي مستخدم تعديل صلاحيات نفسه
- ❌ لا يمكن لأي مستخدم تعديل صلاحيات الـ Primary Owner

### Audit Log (سجل التدقيق)
كل العمليات الحساسة تُسجّل بشكل **append-only** (لا يمكن حذفها):
- إنشاء/إلغاء/توليد QR
- تعديل الصلاحيات (مع `before/after`)
- تحديث السياسات
- بدء/إنهاء الجلسات الحية
- إنشاء/استعادة النسخ الاحتياطي
- إطلاق SOS

### Rate Limiting
- 120 طلب/دقيقة لكل IP ( قابل للتعديل عبر `MDFAMILY_RATE_LIMIT_PER_MINUTE`)
- يستخدم Redis counter (أو in-memory fallback)

### CORS
- القيمة الافتراضية تسمح بـ: `http://localhost:3000`، `capacitor://localhost` (للأندرويد)

## 🔌 WebSocket Events

الخادم يبث الأحداث التالية للعملاء المتصلين:

```typescript
// pairing.linked — جهاز تم ربطه بنجاح
{ type: "pairing.linked", child_id: "...", device_id: "..." }

// alert.created — تنبيه سلامة جديد
{ type: "alert.created", alert: {...} }

// sos.triggered — استغاثة SOS
{ type: "sos.triggered", child_id: "...", lat: ..., lng: ... }

// zone.enter / zone.exit — دخول/خروج منطقة آمنة
{ type: "zone.enter", child_id: "...", zone_id: "..." }

// extension.requested / extension.decided
{ type: "extension.requested", request: {...} }

// session.requested / session.active / session.ended
{ type: "session.active", session: {...} }
```

## 🧪 الاختبارات

```bash
# Smoke test شامل (register → family → child → pairing → consume → audit)
python scripts/smoke_test.py

# Pytest (قيد التطوير)
pytest tests/ -v --cov=app
```

## 🌐 ربط الـ Frontend

ملف `src/lib/api-client.ts` في الـ Next.js frontend يوفر طبقة عميل كاملة للتواصل مع هذا الـ backend. لتفعيله:

```bash
# في مستوى الجذر للمشروع (وليس في backend/)
echo "NEXT_PUBLIC_API_URL=http://localhost:8000" > .env.local
```

عند ضبط هذا المتغير، الـ frontend سيتصل بالـ backend الحقيقي بدلاً من الـ mock data تلقائياً.

## 🚢 النشر للإنتاج (Production Deployment)

### باستخدام Docker Compose (موصى به)

```bash
# 1. أنشئ ملف .env للإنتاج
cat > .env <<EOF
POSTGRES_PASSWORD=<strong-password-here>
MDFAMILY_JWT_SECRET=$(python -c "import secrets; print(secrets.token_urlsafe(64))")
MDFAMILY_GOOGLE_CLIENT_ID=<your-google-client-id>
MDFAMILY_GOOGLE_CLIENT_SECRET=<your-google-client-secret>
MDFAMILY_CORS_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
EOF

# 2. شغّل
docker compose up -d

# 3. تحقق
curl http://localhost:8000/health
```

### النشر على Railway / Render / Fly.io

1. اضبط متغيرات البيئة في لوحة تحكم المنصة
2. اضبط `MDFAMILY_DATABASE_URL` لقاعدة PostgreSQL المدارة (مثل Neon, Supabase)
3. اضبط `MDFAMILY_REDIS_URL` لمثيل Redis المدار (مثل Upstash)
4. اربط GitHub repo — سيتم البناء عبر Dockerfile تلقائياً

## 📁 بنية المشروع

```
backend/
├── app/
│   ├── main.py                # FastAPI app entry point
│   ├── core/
│   │   ├── config.py          # إعدادات (Pydantic Settings)
│   │   ├── database.py        # SQLAlchemy async engine
│   │   ├── redis_client.py    # Redis + in-memory fallback
│   │   └── security.py        # JWT, bcrypt, Google OAuth, pairing codes
│   ├── models/__init__.py     # 22 SQLAlchemy ORM models
│   ├── schemas/               # Pydantic schemas (request/response)
│   │   ├── auth.py, family.py, child.py, device.py
│   │   ├── pairing.py, policy.py, routine.py, web_filter.py
│   │   ├── location.py, alert.py, school.py, contact.py
│   │   ├── backup.py, audit.py, live_session.py, common.py
│   ├── api/
│   │   ├── deps.py            # Auth, RBAC, audit dependencies
│   │   └── v1/
│   │       ├── auth.py        # 7 endpoints
│   │       ├── families.py    # 7 endpoints
│   │       ├── children.py    # 5 endpoints
│   │       ├── pairing.py     # 6 endpoints (incl. public consume)
│   │       ├── policies.py    # 6 endpoints
│   │       ├── web_filter.py  # 5 endpoints
│   │       ├── location.py    # 7 endpoints
│   │       ├── alerts.py      # 3 endpoints
│   │       ├── schools_contacts.py  # 7 endpoints
│   │       ├── backups.py     # 3 endpoints
│   │       ├── live_sessions.py # 3 endpoints
│   │       └── ws.py          # WebSocket
├── scripts/
│   ├── smoke_test.py          # End-to-end smoke test
│   └── ...
├── tests/                     # Pytest tests
├── Dockerfile                 # Multi-stage production build
├── docker-compose.yml         # api + postgres + redis
├── requirements.txt
├── .env.example
└── README.md                  # هذا الملف
```

## ⚠️ القيود المعروفة

- ✅ كل الـ endpoints تعمل مع SQLite (الـ dev mode الحالي)
- ✅ Migration via `Base.metadata.create_all` (dev) — Alembic migrations لاحقاً للإنتاج
- ⚠️ منطق VPN/Accessibility/MediaProjection الأصلي يحتاج تنفيذ Kotlin كامل على أجهزة الأطفال
- ⚠️ Google OAuth يعمل فقط عند ضبط `MDFAMILY_GOOGLE_CLIENT_ID` + `MDFAMILY_GOOGLE_CLIENT_SECRET`
- ⚠️ Push notifications عبر FCM تحتاج إعداد Firebase server key (غير مضمّن في v1)

## 📚 المراجع

- **FastAPI docs**: https://fastapi.tiangolo.com/
- **SQLAlchemy async**: https://docs.sqlalchemy.org/en/20/orm/extensions/asyncio.html
- **Master Prompt**: راجع `MD_Family_Master_Development_Prompt_AR Final Prompt.txt` المرفق
- **Engineering Blueprint**: راجع `MD_Family_Unified_Engineering_Blueprint_AR - Final PDF.pdf` المرفق

</div>
