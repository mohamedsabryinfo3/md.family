/**
 * MD.Family — Internationalization
 *
 * Arabic is the primary language (RTL). English is the secondary (LTR).
 * The dictionary below is intentionally terse: each key maps to {ar, en}.
 * Components pick the right string based on the current language in the store.
 */

import type { Language } from "./types";

type Dict = Record<string, { ar: string; en: string }>;

export const dict: Dict = {
  // App / brand
  appName: { ar: "MD.Family", en: "MD.Family" },
  appTagline: {
    ar: "سلامة رقمية موثوقة لعائلتك",
    en: "Trusted digital safety for your family",
  },
  protectedBy: { ar: "محمي بقواعد MD-Sabry", en: "Protected by MD-Sabry rules" },

  // Tabs
  tabOverview: { ar: "الرئيسية", en: "Overview" },
  tabRules: { ar: "القواعد", en: "Rules" },
  tabMap: { ar: "الخريطة", en: "Map" },
  tabMore: { ar: "المزيد", en: "More" },

  // Common actions
  add: { ar: "إضافة", en: "Add" },
  save: { ar: "حفظ", en: "Save" },
  cancel: { ar: "إلغاء", en: "Cancel" },
  confirm: { ar: "تأكيد", en: "Confirm" },
  delete: { ar: "حذف", en: "Delete" },
  edit: { ar: "تعديل", en: "Edit" },
  back: { ar: "رجوع", en: "Back" },
  next: { ar: "التالي", en: "Next" },
  retry: { ar: "إعادة المحاولة", en: "Retry" },
  refresh: { ar: "تحديث", en: "Refresh" },
  regenerate: { ar: "توليد جديد", en: "Regenerate" },
  close: { ar: "إغلاق", en: "Close" },
  request: { ar: "طلب", en: "Request" },
  approve: { ar: "موافقة", en: "Approve" },
  reject: { ar: "رفض", en: "Reject" },
  enable: { ar: "تفعيل", en: "Enable" },
  disable: { ar: "إيقاف", en: "Disable" },
  create: { ar: "إنشاء", en: "Create" },
  restore: { ar: "استعادة", en: "Restore" },
  export: { ar: "تصدير", en: "Export" },

  // Auth
  loginTitle: { ar: "تسجيل الدخول إلى MD.Family", en: "Sign in to MD.Family" },
  loginSubtitle: {
    ar: "ادخل بريدك الإلكتروني للمتابعة، أو استخدم حساب Google",
    en: "Enter your email to continue, or use your Google account",
  },
  email: { ar: "البريد الإلكتروني", en: "Email" },
  password: { ar: "كلمة المرور", en: "Password" },
  continueWithGoogle: { ar: "المتابعة عبر Google", en: "Continue with Google" },
  createAccount: { ar: "إنشاء حساب جديد", en: "Create new account" },
  demoNote: {
    ar: "هذه واجهة عرض تجريبية — لا يتم إرسال بياناتك إلى أي خادم حقيقي.",
    en: "This is a demo UI — no data is sent to a real server.",
  },

  // Dashboard
  goodMorning: { ar: "أهلاً", en: "Welcome" },
  familyDashboard: { ar: "لوحة الأسرة", en: "Family Dashboard" },
  liveLocation: { ar: "الموقع الحي", en: "Live Location" },
  updatedMinAgo: { ar: "آخر تحديث منذ {n} دقيقة", en: "Updated {n} min ago" },
  battery: { ar: "البطارية", en: "Battery" },
  screenTimeToday: { ar: "وقت الشاشة اليوم", en: "Screen time today" },
  ofDailyLimit: { ar: "من الحد اليومي", en: "of daily limit" },
  safetyControls: { ar: "السلامة والتحكم", en: "Safety & controls" },
  socialRiskAlert: { ar: "تنبيه سلامة اجتماعية", en: "Social risk alert" },
  reviewRequired: { ar: "تحتاج مراجعة", en: "Review required" },
  pauseInternet: { ar: "إيقاف الإنترنت", en: "Pause internet" },
  resumeInternet: { ar: "استئناف الإنترنت", en: "Resume internet" },
  recentActivity: { ar: "آخر النشاطات", en: "Recent activity" },
  viewAll: { ar: "عرض الكل", en: "View all" },
  noChildrenYet: { ar: "لا يوجد أطفال بعد", en: "No children yet" },
  noChildrenHint: {
    ar: "أضف ملف الطفل الأول، ثم اربط جهازه بواسطة QR.",
    en: "Add your first child profile, then pair their device with a QR code.",
  },
  addChild: { ar: "إضافة طفل", en: "Add child" },

  // Children
  children: { ar: "الأطفال", en: "Children" },
  childName: { ar: "اسم الطفل", en: "Child name" },
  childAvatar: { ar: "صورة الطفل", en: "Child avatar" },
  birthdate: { ar: "تاريخ الميلاد", en: "Birthdate" },
  birthdateOptional: { ar: "تاريخ الميلاد (اختياري)", en: "Birthdate (optional)" },
  birthdateHint: {
    ar: "لأغراض السياسات العمرية فقط — لن يظهر العمر بجانب اسم الطفل.",
    en: "Used for age-based policies only — age is never shown next to the name.",
  },
  phoneBrand: { ar: "نوع الهاتف", en: "Phone brand" },
  phoneBrandOptional: { ar: "نوع الهاتف (اختياري)", en: "Phone brand (optional)" },
  searchBrand: { ar: "ابحث عن العلامة التجارية...", en: "Search brand..." },
  emergencyContact: { ar: "جهة اتصال الطوارئ", en: "Emergency contact" },
  schoolOptional: { ar: "المدرسة (اختياري)", en: "School (optional)" },

  // Pairing
  pairDevice: { ar: "ربط جهاز الطفل", en: "Pair child device" },
  pairTitle: { ar: "رمز اقتران أحادي الاستخدام", en: "One-time pairing code" },
  pairSubtitle: {
    ar: "ثبّت MD.Family على جهاز الطفل، ثم امسح رمز QR أدناه أو أدخل الرقم المكوّن من 6 خانات.",
    en: "Install MD.Family on the child device, then scan the QR below or enter the 6-digit code.",
  },
  pairReady: { ar: "جاهز للاقتران", en: "Ready to pair" },
  pairScanning: { ar: "جارٍ المسح...", en: "Scanning..." },
  pairVerifying: { ar: "جارٍ التحقق...", en: "Verifying..." },
  pairLinked: { ar: "تم الربط بنجاح", en: "Linked successfully" },
  pairFailed: { ar: "فشل الربط", en: "Pairing failed" },
  pairExpired: { ar: "انتهت صلاحية الرمز", en: "Code expired" },
  pairExpiresIn: { ar: "تنتهي الصلاحية خلال {n} ثانية", en: "Expires in {n} s" },
  pairCancel: { ar: "إلغاء الرمز", en: "Cancel code" },
  pairRegenerate: { ar: "توليد رمز جديد", en: "Generate new code" },
  pairAuditHint: {
    ar: "يتم تسجيل كل محاولة ربط (ناجحة أو فاشلة) في سجل التدقيق.",
    en: "Every pairing attempt (success or failure) is recorded in the audit log.",
  },

  // Screen time
  screenTime: { ar: "وقت الشاشة", en: "Screen time" },
  dailyLimit: { ar: "الحد اليومي", en: "Daily limit" },
  used: { ar: "المستخدم", en: "Used" },
  remaining: { ar: "المتبقي", en: "Remaining" },
  timeWheel: { ar: "عجلة ضبط الوقت", en: "Time wheel" },
  resetDay: { ar: "إعادة الضبط اليومية", en: "Daily reset" },
  resetHint: { ar: "حسب المنطقة الزمنية للجهاز", en: "By device timezone" },
  routines: { ar: "الروتينات", en: "Routines" },
  studyRoutine: { ar: "روتين الدراسة", en: "Study routine" },
  sleepRoutine: { ar: "روتين النوم", en: "Sleep routine" },
  downtime: { ar: "وقت التوقف", en: "Downtime" },
  exceptions: { ar: "الاستثناءات", en: "Exceptions" },
  requestMoreTime: { ar: "طلب وقت إضافي", en: "Request more time" },
  postLimitAction: { ar: "الإجراء عند انتهاء الوقت", en: "Post-limit action" },
  lockDevice: { ar: "قفل الجهاز", en: "Lock device" },
  lockNavigation: { ar: "قفل التصفح", en: "Lock navigation" },
  notifyOnly: { ar: "تنبيه فقط", en: "Notify only" },

  // App policies
  appPolicies: { ar: "سياسة التطبيقات", en: "App policies" },
  alwaysAllowed: { ar: "مسموح دائماً", en: "Always allowed" },
  dailyTimeLimit: { ar: "حد يومي", en: "Daily time limit" },
  blocked: { ar: "محظور", en: "Blocked" },
  installedApps: { ar: "التطبيقات المثبتة", en: "Installed apps" },
  systemTools: { ar: "أدوات النظام", en: "System tools" },
  allowed: { ar: "مسموح", en: "Allowed" },
  restricted: { ar: "مقيّد", en: "Restricted" },
  notSupported: { ar: "غير مدعوم", en: "Not supported" },

  // Web filtering
  webFiltering: { ar: "تصفية الويب", en: "Web filtering" },
  categories: { ar: "الفئات", en: "Categories" },
  websiteExceptions: { ar: "استثناءات المواقع", en: "Website exceptions" },
  addWebsite: { ar: "إضافة موقع", en: "Add website" },
  safeSearch: { ar: "البحث الآمن", en: "SafeSearch" },
  localVpn: { ar: "VPN محلي", en: "Local VPN" },
  localVpnDesc: {
    ar: "تطبيق قواعد الويب محلياً عبر VpnService مع موافقة واضحة من المستخدم.",
    en: "Apply web rules locally via VpnService with explicit user consent.",
  },
  block: { ar: "حظر", en: "Block" },
  alertWord: { ar: "تنبيه", en: "Alert" },
  allow: { ar: "سماح", en: "Allow" },
  categoryAdult: { ar: "محتوى للبالغين", en: "Adult content" },
  categoryGambling: { ar: "القمار", en: "Gambling" },
  categoryViolence: { ar: "العنف", en: "Violence" },
  categoryShopping: { ar: "التسوق", en: "Shopping" },
  categoryEducation: { ar: "التعليم", en: "Education" },
  categorySocial: { ar: "التواصل الاجتماعي", en: "Social media" },
  categoryGames: { ar: "الألعاب", en: "Games" },

  // Location
  location: { ar: "الموقع", en: "Location" },
  safeZones: { ar: "المناطق الآمنة", en: "Safe zones" },
  addZone: { ar: "إضافة منطقة", en: "Add zone" },
  distanceFromZone: { ar: "المسافة عن {name}: {n} م", en: "Distance from {name}: {n} m" },
  zoneEnter: { ar: "دخول منطقة", en: "Zone entry" },
  zoneExit: { ar: "خروج من منطقة", en: "Zone exit" },
  drivingReport: { ar: "تقرير القيادة", en: "Driving report" },
  movementHistory: { ar: "سجل الحركة", en: "Movement history" },
  accuracy: { ar: "الدقة", en: "Accuracy" },
  lastSync: { ar: "آخر مزامنة", en: "Last sync" },
  sos: { ar: "SOS", en: "SOS" },
  sosSent: { ar: "تم إرسال استغاثة SOS", en: "SOS alert sent" },
  sosFailed: {
    ar: "تعذّر إرسال SOS — تحقق من الشبكة",
    en: "Failed to send SOS — check network",
  },

  // Safety alerts
  safetyAlerts: { ar: "تنبيهات السلامة", en: "Safety alerts" },
  review: { ar: "مراجعة", en: "Review" },
  ignore: { ar: "تجاهل", en: "Ignore" },
  confidence: { ar: "الثقة", en: "Confidence" },
  high: { ar: "عالية", en: "High" },
  medium: { ar: "متوسطة", en: "Medium" },
  low: { ar: "منخفضة", en: "Low" },
  source: { ar: "المصدر", en: "Source" },
  reason: { ar: "السبب", en: "Reason" },
  aiAdvisoryNote: {
    ar: "هذا التقييم احتمالي ولا يعتبر تشخيصاً. راجع الإشارة قبل اتخاذ أي إجراء.",
    en: "This assessment is advisory and probabilistic. Review before taking any action.",
  },

  // Mother permissions
  motherPermissions: { ar: "صلاحيات الأم", en: "Mother permissions" },
  fullAccess: { ar: "وصول كامل", en: "Full Access" },
  customAccess: { ar: "وصول مخصص", en: "Custom Access" },
  noAccess: { ar: "بدون وصول", en: "No Access" },
  fullAccessDesc: {
    ar: "جميع صلاحيات الإدارة العادية. تبقى الميزات الحساسة (الشاشة/الميكروفون) مستقلة.",
    en: "All ordinary management permissions. Sensitive features (screen/mic) remain independent.",
  },
  customAccessDesc: {
    ar: "حدّد كل صلاحية على حدة. لا تُستنتج صلاحية من أخرى.",
    en: "Set each permission individually. No permission implies another.",
  },
  noAccessDesc: {
    ar: "يبقى الحساب الشخصي للأم دون حذف، بدون وصول لبيانات الأسرة.",
    en: "Mother's personal account remains without deletion, no access to family data.",
  },
  cannotSelfEscalate: {
    ar: "لا يمكن للأم رفع صلاحياتها أو نقل ملكية الأسرة.",
    en: "The mother cannot escalate her own permissions or transfer family ownership.",
  },
  savePermissions: { ar: "حفظ الصلاحيات", en: "Save permissions" },
  revokeAccess: { ar: "سحب الوصول", en: "Revoke access" },
  auditLog: { ar: "سجل التدقيق", en: "Audit log" },
  permissionsSaved: { ar: "تم حفظ الصلاحيات", en: "Permissions saved" },

  // Contacts
  contacts: { ar: "جهات الاتصال", en: "Contacts" },
  fatherNumbers: { ar: "أرقام الأب", en: "Father numbers" },
  motherNumbers: { ar: "أرقام الأم", en: "Mother numbers" },
  familyNumbers: { ar: "أرقام العائلة", en: "Family numbers" },
  addNumber: { ar: "إضافة رقم", en: "Add number" },
  phoneNumber: { ar: "رقم الهاتف", en: "Phone number" },
  relation: { ar: "صلة القرابة", en: "Relation" },
  primaryNumber: { ar: "رقم أساسي", en: "Primary" },
  invalidPhone: { ar: "صيغة الرقم غير صحيحة", en: "Invalid phone format" },

  // Schools
  schools: { ar: "المدارس", en: "Schools" },
  noSchoolsYet: { ar: "لا توجد مدارس بعد", en: "No schools yet" },
  noSchoolsHint: {
    ar: "أضف مدرسة الطفل لتظهر ضمن الملف وظروف الروتين.",
    en: "Add your child's school to include it in profile and routine context.",
  },
  addSchool: { ar: "إضافة مدرسة", en: "Add school" },
  schoolName: { ar: "اسم المدرسة", en: "School name" },
  schoolAddress: { ar: "العنوان", en: "Address" },
  schoolPhone: { ar: "هاتف المدرسة", en: "School phone" },

  // Classification reports
  reportWrongClassification: { ar: "إبلاغ عن تصنيف خاطئ", en: "Report wrong classification" },
  currentClassification: { ar: "التصنيف الحالي", en: "Current classification" },
  suggestedClassification: { ar: "التصنيف المقترح", en: "Suggested classification" },
  safe: { ar: "آمن", en: "Safe" },
  adult: { ar: "للبالغين", en: "Adult" },
  pendingReview: { ar: "بانتظار المراجعة", en: "Pending review" },
  reviewed: { ar: "تمت المراجعة", en: "Reviewed" },
  reportHint: {
    ar: "لا يغيّر البلاغ التصنيف العام لجميع المستخدمين تلقائياً.",
    en: "A report does not automatically change the global classification for all users.",
  },

  // Backup
  backupAndRestore: { ar: "النسخ الاحتياطي والاستعادة", en: "Backup & restore" },
  storageLocation: { ar: "مكان التخزين", en: "Storage location" },
  lastBackup: { ar: "آخر نسخة ناجحة", en: "Last successful backup" },
  backupSize: { ar: "الحجم", en: "Size" },
  includedData: { ar: "البيانات المشمولة", en: "Included data" },
  excludedData: { ar: "البيانات المستثناة", en: "Excluded data" },
  createBackup: { ar: "إنشاء نسخة احتياطية", en: "Create backup" },
  restoreBackup: { ar: "استعادة النسخة", en: "Restore backup" },
  localOnly: {
    ar: "النسخ المحلية فقط — لم يتم إعداد تخزين سحابي بعد.",
    en: "Local backups only — cloud storage is not configured yet.",
  },
  restoreWarning: {
    ar: "ستستبدل الاستعادة البيانات الحالية. تأكد قبل المتابعة.",
    en: "Restore will replace current data. Confirm before proceeding.",
  },
  backupCreated: { ar: "تم إنشاء النسخة بنجاح", en: "Backup created successfully" },
  restoreCompleted: { ar: "اكتملت الاستعادة بنجاح", en: "Restore completed successfully" },

  // Settings
  settings: { ar: "الإعدادات", en: "Settings" },
  language: { ar: "اللغة", en: "Language" },
  arabic: { ar: "العربية", en: "Arabic" },
  english: { ar: "English", en: "English" },
  theme: { ar: "المظهر", en: "Theme" },
  light: { ar: "فاتح", en: "Light" },
  darkMode: { ar: "داكن", en: "Dark" },
  account: { ar: "الحساب", en: "Account" },
  signOut: { ar: "تسجيل الخروج", en: "Sign out" },
  about: { ar: "حول التطبيق", en: "About" },
  privacyPolicy: { ar: "سياسة الخصوصية", en: "Privacy policy" },
  termsOfUse: { ar: "شروط الاستخدام", en: "Terms of use" },
  auditLogNote: {
    ar: "تسجيل العمليات الحساسة: الربط، تغيير الصلاحيات، السياسات، النسخ، الاستعادة، الجلسات.",
    en: "Logs sensitive operations: pairing, permission changes, policies, backup, restore, sessions.",
  },
  versionLabel: { ar: "الإصدار", en: "Version" },

  // Empty / states
  empty: { ar: "لا توجد بيانات", en: "Nothing here yet" },
  loading: { ar: "جارٍ التحميل...", en: "Loading..." },
  errorTitle: { ar: "حدث خطأ", en: "Something went wrong" },
  success: { ar: "تم بنجاح", en: "Done" },
  offline: { ar: "غير متصل", en: "Offline" },
  permissionDenied: { ar: "تم رفض الإذن", en: "Permission denied" },
  retryAgain: { ar: "حاول مرة أخرى", en: "Try again" },

  // Confirm dialogs
  confirmDeleteTitle: { ar: "تأكيد الحذف", en: "Confirm deletion" },
  confirmDeleteChild: {
    ar: "سيتم حذف ملف الطفل {name} وكل القواعد المرتبطة به. لا يمكن التراجع.",
    en: "Child profile {name} and all associated rules will be deleted. This cannot be undone.",
  },
  confirmRestoreTitle: { ar: "تأكيد الاستعادة", en: "Confirm restore" },
  confirmPauseTitle: { ar: "تأكيد إيقاف الإنترنت", en: "Confirm internet pause" },
  confirmPauseBody: {
    ar: "سيتم إيقاف الإنترنت على جميع أجهزة الأسرة مع استثناءات الطوارئ.",
    en: "Internet will be paused on all family devices, with emergency exceptions.",
  },

  // Device status
  deviceOnline: { ar: "متصل", en: "Online" },
  deviceOffline: { ar: "غير متصل", en: "Offline" },
  deviceSyncing: { ar: "جارٍ المزامنة", en: "Syncing" },
  deviceUnknown: { ar: "الحالة غير معروفة", en: "Unknown" },
  protectionActive: { ar: "الحماية فعّالة", en: "Protection active" },
  protectionInactive: { ar: "الحماية غير فعّالة", en: "Protection inactive" },

  // Sensitive feature flags
  liveScreenView: { ar: "مشاهدة الشاشة الحية", en: "Live Screen View" },
  voiceCall: { ar: "مكالمة صوتية", en: "Voice call" },
  ambientAudio: { ar: "جلسة صوت المحيط", en: "Ambient audio session" },
  voiceMessages: { ar: "الرسائل الصوتية", en: "Voice messages" },
  sensitiveFeatureNote: {
    ar: "هذه الميزة حساسة وتتطلب موافقة مستقلة، إذن نظام، وحالة ظاهرة على الجهاز.",
    en: "This feature is sensitive and requires independent consent, system permission, and a visible on-device status.",
  },
  sessionRequested: { ar: "تم طلب الجلسة", en: "Session requested" },
  sessionActive: { ar: "الجلسة نشطة", en: "Session active" },
  sessionEnded: { ar: "انتهت الجلسة", en: "Session ended" },
  notSupportedOnDevice: { ar: "غير مدعومة على هذا الجهاز", en: "Not supported on this device" },

  // Onboarding
  onboardingTitle1: {
    ar: "حماية أطفالك رقمياً",
    en: "Protect your children digitally",
  },
  onboardingBody1: {
    ar: "إدارة وقت الشاشة، تصفية الويب، الموقع الآمن، وتنبيهات السلامة — في مكان واحد.",
    en: "Screen time, web filtering, safe location, and safety alerts — all in one place.",
  },
  onboardingTitle2: {
    ar: "خصوصية أولاً، شفافية دائماً",
    en: "Privacy first, transparency always",
  },
  onboardingBody2: {
    ar: "كل ميزة حساسة تتطلب موافقة واضحة. لا مراقبة خفية، لا تجاوز لإذن النظام.",
    en: "Every sensitive feature requires explicit consent. No covert monitoring, no system permission bypass.",
  },
  onboardingTitle3: {
    ar: "ابدأ بإنشاء حساب الأسرة",
    en: "Start by creating a family account",
  },
  onboardingBody3: {
    ar: "أنشئ ملف الطفل، ثم اربط جهازه برمز QR أحادي الاستخدام.",
    en: "Create a child profile, then pair their device with a one-time QR code.",
  },
  getStarted: { ar: "ابدأ الآن", en: "Get started" },
  skip: { ar: "تخطي", en: "Skip" },
};

export type DictKey = keyof typeof dict;

export function t(key: DictKey, lang: Language, vars?: Record<string, string | number>): string {
  const entry = dict[key];
  if (!entry) return String(key);
  let s = entry[lang] ?? entry.ar;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      s = s.replace(`{${k}}`, String(v));
    }
  }
  return s;
}
