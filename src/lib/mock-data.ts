/**
 * MD.Family — Mock data layer
 *
 * ⚠️ MOCK DATA — clearly marked. This file is the single source of truth
 * for all data shown in the UI. No production backend is wired yet.
 * When a real backend is added, replace these factories with API calls;
 * the rest of the app should not change.
 *
 * Conventions:
 *  - All IDs are stable strings starting with "mock-".
 *  - All timestamps are ISO 8601 strings.
 *  - Phone numbers are Egyptian-format examples: +20 1X XXXX XXXX.
 */

import type {
  ActivityEvent,
  BackupRecord,
  ChildProfile,
  ClassificationReport,
  ContactEntry,
  ExtensionRequest,
  Family,
  FamilyMember,
  LiveSession,
  PermissionGrant,
  SafeZone,
  School,
  SafetyAlert,
  WebCategory,
  WebsiteException,
  InstalledApp,
} from "./types";

const now = Date.now();
const iso = (offsetMs: number) => new Date(now + offsetMs).toISOString();
const today = (h: number, m: number) => {
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d.toISOString();
};

export const CURRENT_PARENT = {
  id: "mock-parent-1",
  name: "أحمد صبري",
  email: "ahmed.sabry@example.com",
  avatarColor: "#005C9E",
  avatarInitials: "أ",
  authProvider: "google" as "google" | "email",
};

export const MOTHER_MEMBER: FamilyMember = {
  id: "mock-member-mother",
  name: "منى صبري",
  email: "mona.sabry@example.com",
  role: "mother",
  avatarColor: "#FF6B9D",
  avatarInitials: "م",
  accessLevel: "custom_access",
  joinedAt: iso(-1000 * 60 * 60 * 24 * 30),
};

export const FATHER_MEMBER: FamilyMember = {
  id: "mock-member-father",
  name: CURRENT_PARENT.name,
  email: CURRENT_PARENT.email,
  role: "primary_owner",
  avatarColor: CURRENT_PARENT.avatarColor,
  avatarInitials: CURRENT_PARENT.avatarInitials,
  accessLevel: "full_access",
  joinedAt: iso(-1000 * 60 * 60 * 24 * 120),
};

export const INITIAL_WEB_CATEGORIES: WebCategory[] = [
  { id: "mock-wc-1", key: "adult", labelAr: "محتوى للبالغين", labelEn: "Adult content", action: "block" },
  { id: "mock-wc-2", key: "gambling", labelAr: "القمار", labelEn: "Gambling", action: "block" },
  { id: "mock-wc-3", key: "violence", labelAr: "العنف", labelEn: "Violence", action: "alert" },
  { id: "mock-wc-4", key: "shopping", labelAr: "التسوق", labelEn: "Shopping", action: "allow" },
  { id: "mock-wc-5", key: "education", labelAr: "التعليم", labelEn: "Education", action: "allow" },
  { id: "mock-wc-6", key: "social", labelAr: "التواصل الاجتماعي", labelEn: "Social media", action: "alert" },
  { id: "mock-wc-7", key: "games", labelAr: "الألعاب", labelEn: "Games", action: "alert" },
];

export const INITIAL_WEBSITE_EXCEPTIONS: WebsiteException[] = [
  {
    id: "mock-we-1",
    url: "https://www.khanacademy.org",
    action: "allow",
    note: "استثناء تعليمي",
    addedAt: iso(-1000 * 60 * 60 * 24 * 7),
  },
  {
    id: "mock-we-2",
    url: "https://www.example-gambling.com",
    action: "block",
    note: "حظر صريح",
    addedAt: iso(-1000 * 60 * 60 * 24 * 3),
  },
  {
    id: "mock-we-3",
    url: "https://chat.example-social.com",
    action: "alert",
    addedAt: iso(-1000 * 60 * 60 * 24 * 1),
  },
];

export const INITIAL_SAFE_ZONES: SafeZone[] = [
  {
    id: "mock-sz-1",
    name: "المنزل",
    kind: "home",
    lat: 30.0444,
    lng: 31.2357,
    radiusMeters: 150,
    address: "القاهرة، مصر",
    enabled: true,
  },
  {
    id: "mock-sz-2",
    name: "المدرسة",
    kind: "school",
    lat: 30.0566,
    lng: 31.2407,
    radiusMeters: 200,
    address: "مدرسة المستقبل",
    enabled: true,
  },
];

export const INITIAL_SCHOOLS: School[] = [
  {
    id: "mock-school-1",
    name: "مدرسة المستقبل الدولية",
    address: "القاهرة الجديدة، التجمع الخامس",
    phone: "+20 2 1234 5678",
    notes: "مدرسة يوسف الابتدائية",
    addedAt: iso(-1000 * 60 * 60 * 24 * 60),
  },
];

export const INITIAL_CONTACTS: ContactEntry[] = [
  {
    id: "mock-c-1",
    name: "أحمد صبري (الأب)",
    relation: "father",
    phone: "+20 100 123 4567",
    isPrimary: true,
    enabled: true,
  },
  {
    id: "mock-c-2",
    name: "منى صبري (الأم)",
    relation: "mother",
    phone: "+20 122 987 6543",
    isPrimary: false,
    enabled: true,
  },
  {
    id: "mock-c-3",
    name: "الجد",
    relation: "grandfather",
    phone: "+20 100 555 4444",
    isPrimary: false,
    enabled: true,
  },
  {
    id: "mock-c-4",
    name: "الجدة",
    relation: "grandmother",
    phone: "+20 122 111 2222",
    isPrimary: false,
    enabled: false,
  },
];

export const INITIAL_APPS_CHILD1: InstalledApp[] = [
  {
    id: "mock-app-1",
    packageName: "com.android.dialer",
    name: "الهاتف",
    category: "communication",
    iconColor: "#34C759",
    todayUsageMin: 12,
    policy: "always_allowed",
  },
  {
    id: "mock-app-2",
    packageName: "com.whatsapp",
    name: "WhatsApp",
    category: "communication",
    iconColor: "#25D366",
    todayUsageMin: 24,
    policy: "always_allowed",
  },
  {
    id: "mock-app-3",
    packageName: "com.mojang.minecraftpe",
    name: "Minecraft",
    category: "games",
    iconColor: "#8B5CF6",
    todayUsageMin: 78,
    policy: "daily_limit",
    dailyLimitMin: 90,
  },
  {
    id: "mock-app-4",
    packageName: "com.roblox.client",
    name: "Roblox",
    category: "games",
    iconColor: "#FF6B6B",
    todayUsageMin: 45,
    policy: "daily_limit",
    dailyLimitMin: 60,
  },
  {
    id: "mock-app-5",
    packageName: "com.youtube",
    name: "YouTube",
    category: "entertainment",
    iconColor: "#FF0000",
    todayUsageMin: 32,
    policy: "daily_limit",
    dailyLimitMin: 60,
  },
  {
    id: "mock-app-6",
    packageName: "com.tiktok",
    name: "TikTok",
    category: "social",
    iconColor: "#000000",
    todayUsageMin: 5,
    policy: "blocked",
  },
  {
    id: "mock-app-7",
    packageName: "com.android.chrome",
    name: "Chrome",
    category: "browser",
    iconColor: "#4285F4",
    todayUsageMin: 18,
    policy: "daily_limit",
    dailyLimitMin: 120,
  },
  {
    id: "mock-app-8",
    packageName: "com.khanacademy.app",
    name: "Khan Academy",
    category: "education",
    iconColor: "#14BF96",
    todayUsageMin: 22,
    policy: "always_allowed",
  },
];

export const INITIAL_APPS_CHILD2: InstalledApp[] = [
  {
    id: "mock-app-9",
    packageName: "com.android.dialer",
    name: "الهاتف",
    category: "communication",
    iconColor: "#34C759",
    todayUsageMin: 6,
    policy: "always_allowed",
  },
  {
    id: "mock-app-10",
    packageName: "com.whatsapp",
    name: "WhatsApp",
    category: "communication",
    iconColor: "#25D366",
    todayUsageMin: 18,
    policy: "always_allowed",
  },
  {
    id: "mock-app-11",
    packageName: "com.supercell.clashroyale",
    name: "Clash Royale",
    category: "games",
    iconColor: "#FF9500",
    todayUsageMin: 56,
    policy: "daily_limit",
    dailyLimitMin: 45,
  },
  {
    id: "mock-app-12",
    packageName: "com.youtube",
    name: "YouTube Kids",
    category: "entertainment",
    iconColor: "#FF0000",
    todayUsageMin: 28,
    policy: "daily_limit",
    dailyLimitMin: 45,
  },
];

export const INITIAL_ALERTS: SafetyAlert[] = [
  {
    id: "mock-alert-1",
    childId: "mock-child-1",
    severity: "high",
    category: "cyberbullying",
    source: "WhatsApp · محادثة جماعية",
    capturedAt: today(18, 42),
    confidence: "medium",
    reasonAr: "تطابق إشارات لغوية متعددة ضمن سياق قصير. هذا ليس حكماً نهائياً.",
    reasonEn: "Multiple language signals matched within a short context. Not a final verdict.",
    status: "pending",
    recommendation: "review",
  },
  {
    id: "mock-alert-2",
    childId: "mock-child-1",
    severity: "medium",
    category: "inappropriate_content",
    source: "YouTube · فيديو مقترح",
    capturedAt: today(15, 12),
    confidence: "low",
    reasonAr: "عنوان فيديو يحتمل أن يكون غير مناسب. راجع قبل اتخاذ أي إجراء.",
    reasonEn: "Video title potentially inappropriate. Review before any action.",
    status: "pending",
    recommendation: "review",
  },
  {
    id: "mock-alert-3",
    childId: "mock-child-2",
    severity: "low",
    category: "screen_time",
    source: "نظام وقت الشاشة",
    capturedAt: today(20, 5),
    confidence: "high",
    reasonAr: "اقترب الطفل من الحد اليومي (45/60 دقيقة).",
    reasonEn: "Child approaching daily limit (45/60 minutes).",
    status: "pending",
    recommendation: "ignore",
  },
];

export const INITIAL_ACTIVITY: ActivityEvent[] = [
  {
    id: "mock-act-1",
    childId: "mock-child-1",
    type: "zone_enter",
    labelAr: "دخل يوسف منطقة المنزل",
    labelEn: "Youssef entered Home zone",
    timestamp: today(17, 30),
    severity: "info",
  },
  {
    id: "mock-act-2",
    childId: "mock-child-1",
    type: "app_blocked",
    labelAr: "حُظر TikTok على جهاز يوسف",
    labelEn: "TikTok was blocked on Youssef's device",
    timestamp: today(16, 12),
    severity: "warning",
  },
  {
    id: "mock-act-3",
    childId: "mock-child-1",
    type: "extension_request",
    labelAr: "يوسف طلب 15 دقيقة إضافية لـ Minecraft",
    labelEn: "Youssef requested 15 more minutes for Minecraft",
    timestamp: today(14, 48),
    severity: "info",
  },
  {
    id: "mock-act-4",
    childId: "mock-child-2",
    type: "zone_exit",
    labelAr: "غادر سارة منطقة المدرسة",
    labelEn: "Sara exited School zone",
    timestamp: today(14, 5),
    severity: "info",
  },
  {
    id: "mock-act-5",
    childId: "mock-child-2",
    type: "device_online",
    labelAr: "اتصل جهاز سارة",
    labelEn: "Sara's device came online",
    timestamp: today(13, 30),
    severity: "info",
  },
];

export const INITIAL_BACKUPS: BackupRecord[] = [
  {
    id: "mock-backup-1",
    createdAt: iso(-1000 * 60 * 60 * 24 * 2),
    storage: "local",
    sizeKb: 184320,
    scope: "الأسرة، الأطفال، الأجهزة، القواعد، جهات الاتصال",
    status: "success",
  },
  {
    id: "mock-backup-2",
    createdAt: iso(-1000 * 60 * 60 * 24 * 5),
    storage: "local",
    sizeKb: 175640,
    scope: "الأسرة، الأطفال، الأجهزة، القواعد، جهات الاتصال",
    status: "success",
  },
];

export const INITIAL_CLASSIFICATION_REPORTS: ClassificationReport[] = [
  {
    id: "mock-cr-1",
    appName: "Minecraft",
    currentClassification: "safe",
    suggestedClassification: "safe",
    reason: "ألعاب إبداعية مع وضع لعب جماعي محدود.",
    submittedAt: iso(-1000 * 60 * 60 * 24 * 4),
    status: "reviewed",
  },
];

export const INITIAL_MOTHER_GRANTS: PermissionGrant[] = [
  {
    key: "view_children",
    labelAr: "عرض ملفات الأطفال",
    labelEn: "View child profiles",
    descriptionAr: "الاطلاع على بيانات الأطفال دون تعديل.",
    descriptionEn: "Read child data without editing.",
    granted: true,
    sensitive: false,
  },
  {
    key: "view_devices",
    labelAr: "عرض الأجهزة",
    labelEn: "View devices",
    descriptionAr: "رؤية حالة الأجهزة وآخر مزامنة.",
    descriptionEn: "See device status and last sync.",
    granted: true,
    sensitive: false,
  },
  {
    key: "view_reports",
    labelAr: "عرض التقارير",
    labelEn: "View reports",
    descriptionAr: "تقارير وقت الشاشة والاستخدام.",
    descriptionEn: "Screen time and usage reports.",
    granted: true,
    sensitive: false,
  },
  {
    key: "manage_rules",
    labelAr: "تعديل القواعد",
    labelEn: "Edit rules",
    descriptionAr: "تعديل حدود الوقت والروتينات والاستثناءات.",
    descriptionEn: "Edit time limits, routines, exceptions.",
    granted: false,
    sensitive: false,
  },
  {
    key: "manage_contacts",
    labelAr: "إدارة جهات الاتصال",
    labelEn: "Manage contacts",
    descriptionAr: "إضافة وتعديل أرقام العائلة.",
    descriptionEn: "Add and edit family numbers.",
    granted: true,
    sensitive: false,
  },
  {
    key: "manage_schools",
    labelAr: "إدارة المدارس",
    labelEn: "Manage schools",
    descriptionAr: "إضافة وتعديل بيانات المدارس.",
    descriptionEn: "Add and edit schools.",
    granted: false,
    sensitive: false,
  },
  {
    key: "trigger_backup",
    labelAr: "إنشاء نسخة احتياطية",
    labelEn: "Create backup",
    descriptionAr: "إنشاء نسخ احتياطية محلية.",
    descriptionEn: "Create local backups.",
    granted: false,
    sensitive: false,
  },
  {
    key: "live_screen_view",
    labelAr: "مشاهدة الشاشة الحية",
    labelEn: "Live Screen View",
    descriptionAr: "صلاحية مستقلة وحساسة — تتطلب موافقة نظام وحالة ظاهرة على الجهاز.",
    descriptionEn: "Independent, sensitive permission — requires system consent and visible on-device status.",
    granted: false,
    sensitive: true,
  },
  {
    key: "ambient_audio",
    labelAr: "جلسة صوت المحيط",
    labelEn: "Ambient audio session",
    descriptionAr: "صلاحية مستقلة وحساسة — لا تعمل خفية ولا تتجاوز مؤشرات الخصوصية.",
    descriptionEn: "Independent, sensitive — never covert, never bypasses privacy indicators.",
    granted: false,
    sensitive: true,
  },
  {
    key: "voice_call",
    labelAr: "مكالمة صوتية",
    labelEn: "Voice call",
    descriptionAr: "اتصال صوتي ثنائي الاتجاه — يتطلب إذن الميكروفون.",
    descriptionEn: "Two-way voice call — requires microphone permission.",
    granted: false,
    sensitive: true,
  },
];

export const INITIAL_CHILDREN: ChildProfile[] = [
  {
    id: "mock-child-1",
    name: "يوسف",
    avatarColor: "#3182CE",
    avatarInitials: "ي",
    birthdate: "2015-04-12",
    phoneBrand: "Samsung",
    schoolId: "mock-school-1",
    devices: [
      {
        id: "mock-device-1",
        label: "هاتف يوسف",
        brand: "Samsung",
        os: "Android",
        osVersion: "Android 14",
        appVersion: "MD.Family 2.0.0",
        status: "online",
        batteryPct: 78,
        lastSeen: iso(-1000 * 60 * 2),
        lastSync: iso(-1000 * 60 * 2),
        pairedAt: iso(-1000 * 60 * 60 * 24 * 30),
        capabilities: {
          usageStats: true,
          accessibility: true,
          vpn: true,
          location: true,
          mediaProjection: true,
          microphone: false,
        },
      },
    ],
    screenTimeTodayMin: 150,
    screenTimeLimitMin: 180,
    todayUsagePct: 83,
    lastActivity: iso(-1000 * 60 * 2),
    emergencyContacts: ["mock-c-1", "mock-c-2"],
    sosEnabled: true,
  },
  {
    id: "mock-child-2",
    name: "سارة",
    avatarColor: "#FF6B9D",
    avatarInitials: "س",
    birthdate: "2017-09-23",
    phoneBrand: "Xiaomi",
    schoolId: "mock-school-1",
    devices: [
      {
        id: "mock-device-2",
        label: "هاتف سارة",
        brand: "Xiaomi",
        os: "Android",
        osVersion: "Android 13",
        appVersion: "MD.Family 2.0.0",
        status: "offline",
        batteryPct: 23,
        lastSeen: iso(-1000 * 60 * 45),
        lastSync: iso(-1000 * 60 * 45),
        pairedAt: iso(-1000 * 60 * 60 * 24 * 14),
        capabilities: {
          usageStats: true,
          accessibility: false,
          vpn: true,
          location: true,
          mediaProjection: false,
          microphone: false,
        },
      },
    ],
    screenTimeTodayMin: 90,
    screenTimeLimitMin: 120,
    todayUsagePct: 75,
    lastActivity: iso(-1000 * 60 * 45),
    emergencyContacts: ["mock-c-1", "mock-c-2"],
    sosEnabled: true,
  },
];

export const APPS_BY_CHILD: Record<string, InstalledApp[]> = {
  "mock-child-1": INITIAL_APPS_CHILD1,
  "mock-child-2": INITIAL_APPS_CHILD2,
};

export const INITIAL_EXTENSION_REQUESTS: ExtensionRequest[] = [
  {
    id: "mock-er-1",
    childId: "mock-child-1",
    deviceId: "mock-device-1",
    appName: "Minecraft",
    requestedMinutes: 15,
    reason: lang_undefined(),
    status: "pending",
    requestedAt: today(14, 48),
    expiresAt: iso(1000 * 60 * 30),
  },
];

function lang_undefined() {
  return undefined;
}

export const INITIAL_LIVE_SESSIONS: LiveSession[] = [];

export function createInitialFamily(): Family {
  return {
    id: "mock-family-1",
    name: "أسرة صبري",
    ownerId: CURRENT_PARENT.id,
    members: [FATHER_MEMBER, MOTHER_MEMBER],
    children: INITIAL_CHILDREN,
    schools: INITIAL_SCHOOLS,
    contacts: INITIAL_CONTACTS,
    webCategories: INITIAL_WEB_CATEGORIES,
    websiteExceptions: INITIAL_WEBSITE_EXCEPTIONS,
    safeZones: INITIAL_SAFE_ZONES,
    alerts: INITIAL_ALERTS,
    activity: INITIAL_ACTIVITY,
    backups: INITIAL_BACKUPS,
    classificationReports: INITIAL_CLASSIFICATION_REPORTS,
    motherPermissions: "custom_access",
    motherGrants: INITIAL_MOTHER_GRANTS,
    familyPauseActive: false,
    safeSearchEnabled: true,
    localVpnEnabled: true,
    extensionRequests: INITIAL_EXTENSION_REQUESTS,
    liveSessions: INITIAL_LIVE_SESSIONS,
  };
}

export const AUDIT_LOG_SEED: { id: string; at: string; ar: string; en: string }[] = [
  { id: "mock-audit-1", at: iso(-1000 * 60 * 60 * 2), ar: "تعديل صلاحيات الأم: تم منح إدارة جهات الاتصال", en: "Mother permissions updated: granted manage contacts" },
  { id: "mock-audit-2", at: iso(-1000 * 60 * 60 * 24 * 2), ar: "إنشاء نسخة احتياطية محلية بنجاح", en: "Local backup created successfully" },
  { id: "mock-audit-3", at: iso(-1000 * 60 * 60 * 24 * 5), ar: "ربط جهاز سارة (Xiaomi) بنجاح", en: "Sara's device (Xiaomi) paired successfully" },
  { id: "mock-audit-4", at: iso(-1000 * 60 * 60 * 24 * 7), ar: "تعديل سياسة تطبيق Minecraft: حد يومي 90 دقيقة", en: "Minecraft policy updated: 90-min daily limit" },
];
