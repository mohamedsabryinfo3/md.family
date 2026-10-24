/**
 * MD.Family — Type definitions
 *
 * NOTE: These types describe the domain model used by the UI layer.
 * They are intentionally complete enough to drive a real backend later;
 * for now all instances are populated from a clearly-marked mock data layer
 * (see `src/lib/mock-data.ts`). No production backend is wired yet.
 */

export type Role = "primary_owner" | "father" | "mother" | "child";

export type MotherAccessLevel = "full_access" | "custom_access" | "no_access";

export type Language = "ar" | "en";
export type ThemeMode = "light" | "dark";

export type ScreenName =
  | "splash"
  | "login"
  | "dashboard"
  | "children"
  | "addChild"
  | "childProfile"
  | "pairing"
  | "screenTime"
  | "appPolicies"
  | "webFiltering"
  | "location"
  | "safetyAlerts"
  | "motherPermissions"
  | "contacts"
  | "schools"
  | "backup"
  | "settings"
  | "liveSession";

export type TabKey = "overview" | "rules" | "map" | "more";

export type PhoneBrand =
  | "Samsung"
  | "Apple iPhone"
  | "Xiaomi"
  | "Redmi"
  | "POCO"
  | "Huawei"
  | "HONOR"
  | "OPPO"
  | "vivo"
  | "Realme"
  | "OnePlus"
  | "Motorola"
  | "Nokia"
  | "Infinix"
  | "Tecno"
  | "Google Pixel"
  | "Other";

export const PHONE_BRANDS: PhoneBrand[] = [
  "Samsung",
  "Apple iPhone",
  "Xiaomi",
  "Redmi",
  "POCO",
  "Huawei",
  "HONOR",
  "OPPO",
  "vivo",
  "Realme",
  "OnePlus",
  "Motorola",
  "Nokia",
  "Infinix",
  "Tecno",
  "Google Pixel",
  "Other",
];

export type DeviceStatus = "online" | "offline" | "syncing" | "unknown";

export interface DeviceInfo {
  id: string;
  label: string;
  brand: PhoneBrand | "Other";
  os: "Android" | "iOS";
  osVersion: string;
  appVersion: string;
  status: DeviceStatus;
  batteryPct?: number;
  lastSeen: string; // ISO
  lastSync?: string; // ISO
  pairedAt: string; // ISO
  capabilities: {
    usageStats: boolean;
    accessibility: boolean;
    vpn: boolean;
    location: boolean;
    mediaProjection: boolean;
    microphone: boolean;
  };
}

export type AppPolicyMode = "always_allowed" | "daily_limit" | "blocked";

export interface InstalledApp {
  id: string;
  packageName: string;
  name: string;
  category: AppCategory;
  iconColor: string;
  todayUsageMin: number;
  policy: AppPolicyMode;
  dailyLimitMin?: number;
}

export type AppCategory =
  | "communication"
  | "social"
  | "games"
  | "education"
  | "entertainment"
  | "tools"
  | "browser"
  | "shopping"
  | "system";

export type WebAction = "allow" | "alert" | "block";

export interface WebCategory {
  id: string;
  key: string;
  labelAr: string;
  labelEn: string;
  action: WebAction;
}

export interface WebsiteException {
  id: string;
  url: string;
  action: WebAction;
  note?: string;
  addedAt: string;
}

export interface SafeZone {
  id: string;
  name: string;
  kind: "home" | "school" | "custom";
  lat: number;
  lng: number;
  radiusMeters: number;
  address?: string;
  enabled: boolean;
}

export interface LocationSample {
  id: string;
  lat: number;
  lng: number;
  accuracyMeters: number;
  capturedAt: string; // ISO
  speedKmh?: number;
  batteryPct?: number;
  source: "gps" | "network" | "unknown";
}

export type SafetySeverity = "low" | "medium" | "high" | "critical";
export type SafetyCategory =
  | "cyberbullying"
  | "predator"
  | "hate"
  | "inappropriate_content"
  | "privacy_risk"
  | "screen_time";

export interface SafetyAlert {
  id: string;
  childId: string;
  severity: SafetySeverity;
  category: SafetyCategory;
  source: string;
  capturedAt: string; // ISO
  confidence: "low" | "medium" | "high";
  reasonAr: string;
  reasonEn: string;
  status: "pending" | "reviewing" | "ignored" | "resolved";
  recommendation: "review" | "ignore" | "block_source";
}

export interface ChildProfile {
  id: string;
  name: string;
  avatarColor: string;
  avatarInitials: string;
  birthdate?: string; // ISO date, kept private — age NOT shown next to name
  phoneBrand?: PhoneBrand;
  schoolId?: string;
  devices: DeviceInfo[];
  screenTimeTodayMin: number;
  screenTimeLimitMin: number; // 0 means unlimited
  todayUsagePct: number; // 0..100, derived
  lastActivity?: string; // ISO
  emergencyContacts: string[]; // contact ids
  sosEnabled: boolean;
}

export interface School {
  id: string;
  name: string;
  address?: string;
  phone?: string;
  notes?: string;
  addedAt: string;
}

export interface ContactEntry {
  id: string;
  name?: string;
  relation: "father" | "mother" | "grandfather" | "grandmother" | "trusted" | "other";
  phone: string;
  isPrimary: boolean;
  enabled: boolean;
}

export interface ClassificationReport {
  id: string;
  appName: string;
  currentClassification: "safe" | "adult";
  suggestedClassification: "safe" | "adult";
  reason: string;
  note?: string;
  submittedAt: string;
  status: "pending_review" | "reviewed";
}

export interface BackupRecord {
  id: string;
  createdAt: string;
  storage: "local" | "server" | "cloud";
  sizeKb: number;
  scope: string;
  status: "success" | "failed" | "in_progress";
  note?: string;
}

export interface PermissionGrant {
  key: string;
  labelAr: string;
  labelEn: string;
  descriptionAr: string;
  descriptionEn: string;
  granted: boolean;
  sensitive: boolean; // true for screen/audio/microphone
}

export interface FamilyMember {
  id: string;
  name: string;
  email: string;
  role: Role;
  avatarColor: string;
  avatarInitials: string;
  accessLevel?: MotherAccessLevel;
  joinedAt: string;
}

export interface ActivityEvent {
  id: string;
  childId: string;
  type:
    | "app_opened"
    | "app_blocked"
    | "website_blocked"
    | "zone_enter"
    | "zone_exit"
    | "sos"
    | "screen_time_exceeded"
    | "extension_request"
    | "device_offline"
    | "device_online";
  labelAr: string;
  labelEn: string;
  timestamp: string;
  severity: "info" | "warning" | "critical";
}

export interface PairingSession {
  id: string;
  code: string; // 6-digit one-time code
  childId: string;
  deviceId?: string;
  status: "ready" | "scanning" | "verifying" | "linked" | "failed" | "expired";
  createdAt: string;
  expiresAt: string;
  message?: string;
}

export interface ParentAccount {
  id: string;
  name: string;
  email: string;
  avatarColor: string;
  avatarInitials: string;
  authProvider: "google" | "email";
}

export interface ExtensionRequest {
  id: string;
  childId: string;
  deviceId?: string;
  appName?: string;
  requestedMinutes: number;
  reason?: string;
  status: "pending" | "approved" | "rejected" | "expired";
  requestedAt: string;
  decidedAt?: string;
  expiresAt: string; // auto-expire if not decided
}

export interface LiveSession {
  id: string;
  childId: string;
  kind: "screen_view" | "voice_call" | "ambient_audio";
  status: "requested" | "active" | "ended" | "failed" | "permission_required" | "not_supported";
  startedAt?: string;
  endedAt?: string;
  durationSec?: number;
  note?: string;
}

export interface Family {
  id: string;
  name: string;
  ownerId: string;
  members: FamilyMember[];
  children: ChildProfile[];
  schools: School[];
  contacts: ContactEntry[];
  webCategories: WebCategory[];
  websiteExceptions: WebsiteException[];
  safeZones: SafeZone[];
  alerts: SafetyAlert[];
  activity: ActivityEvent[];
  backups: BackupRecord[];
  classificationReports: ClassificationReport[];
  motherPermissions: MotherAccessLevel;
  motherGrants: PermissionGrant[];
  familyPauseActive: boolean;
  safeSearchEnabled: boolean;
  localVpnEnabled: boolean;
  extensionRequests: ExtensionRequest[];
  liveSessions: LiveSession[];
}
