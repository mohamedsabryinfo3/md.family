/**
 * MD.Family — Global client state
 *
 * Uses Zustand. The store owns:
 *  - The current language (ar|en) and theme (light|dark)
 *  - The current navigation state (which screen, which tab, which child is selected)
 *  - The full family domain object (mutated through explicit actions)
 *  - The active pairing session (one at a time)
 *  - Toast / confirmation dialog state
 */

"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type {
  Family,
  Language,
  ThemeMode,
  ScreenName,
  TabKey,
  ChildProfile,
  PairingSession,
  PermissionGrant,
  SafetyAlert,
  WebCategory,
  WebsiteException,
  ContactEntry,
  School,
  BackupRecord,
  ClassificationReport,
  MotherAccessLevel,
  PhoneBrand,
} from "./types";
import { APPS_BY_CHILD } from "./mock-data";
// APPS_BY_CHILD is the only mock data still used — it provides the catalog
// of installed apps for each child (for the App Policies screen).
// All user data (family, children, devices, etc.) comes from the backend.

export interface ConfirmOptions {
  title: string;
  body?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
}

export interface ToastMessage {
  id: string;
  title: string;
  description?: string;
  variant?: "default" | "success" | "error" | "warning";
}

interface AuditEntry {
  id: string;
  at: string;
  ar: string;
  en: string;
}

interface AppState {
  // Auth
  authed: boolean;
  parent: {
    id: string;
    name: string;
    email: string;
    avatarColor: string;
    avatarInitials: string;
    authProvider: "google" | "email";
  };

  // Prefs
  lang: Language;
  theme: ThemeMode;

  // Navigation
  screen: ScreenName;
  tab: TabKey;
  selectedChildId: string | null;

  // Data
  family: Family;
  auditLog: AuditEntry[];

  // Pairing
  pairingSession: PairingSession | null;

  // UI overlays
  confirm: ConfirmOptions | null;
  toasts: ToastMessage[];

  // Actions — auth & prefs
  setLang: (l: Language) => void;
  toggleTheme: () => void;
  setTheme: (t: ThemeMode) => void;
  signIn: (provider?: "google" | "email") => void;
  signOut: () => void;

  // Actions — navigation
  go: (s: ScreenName) => void;
  setTab: (t: TabKey) => void;
  selectChild: (id: string | null) => void;

  // Actions — pairing
  startPairing: (childId: string) => void;
  cancelPairing: () => void;
  regeneratePairing: () => void;
  simulatePairingScan: () => void;
  simulatePairingVerify: () => void;
  finishPairing: () => void;

  // Actions — children
  addChild: (input: {
    name: string;
    birthdate?: string;
    phoneBrand?: PhoneBrand;
    schoolId?: string;
  }) => void;
  deleteChild: (id: string) => void;

  // Actions — mother permissions
  setMotherAccess: (level: MotherAccessLevel) => void;
  toggleMotherGrant: (key: string) => void;
  saveMotherPermissions: () => void;
  revokeMotherAccess: () => void;

  // Actions — web filtering
  setWebCategoryAction: (id: string, action: WebCategory["action"]) => void;
  addWebsiteException: (url: string, action: WebsiteException["action"]) => void;
  removeWebsiteException: (id: string) => void;
  toggleSafeSearch: () => void;
  toggleLocalVpn: () => void;
  toggleFamilyPause: () => void;

  // Actions — alerts
  reviewAlert: (id: string, decision: "ignore" | "resolved") => void;

  // Actions — contacts
  addContact: (c: Omit<ContactEntry, "id">) => void;
  toggleContact: (id: string) => void;
  removeContact: (id: string) => void;

  // Actions — schools
  addSchool: (s: Omit<School, "id" | "addedAt">) => void;
  deleteSchool: (id: string) => void;

  // Actions — classification reports
  submitClassificationReport: (r: Omit<ClassificationReport, "id" | "submittedAt" | "status">) => void;

  // Actions — backups
  createBackup: () => void;
  restoreBackup: (id: string) => void;

  // Actions — extension requests
  decideExtension: (id: string, decision: "approved" | "rejected") => void;
  requestExtension: (childId: string, appName: string, minutes: number) => void;

  // Actions — live sessions (sensitive features)
  startLiveSession: (childId: string, kind: "screen_view" | "voice_call" | "ambient_audio") => void;
  endLiveSession: (id: string) => void;

  // Actions — UI overlays
  confirmDialog: (opts: ConfirmOptions) => void;
  dismissConfirm: () => void;
  toast: (m: Omit<ToastMessage, "id">) => void;
  dismissToast: (id: string) => void;

  // Audit
  logAudit: (ar: string, en: string) => void;
}

function uid(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function generatePairingCode(): string {
  // 6-digit one-time code, easy to type manually
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// The store starts COMPLETELY EMPTY — no mock data, no fake users.
// Real data is loaded from the backend after login via apiActions.bootstrap().
const emptyParent = {
  id: "",
  name: "",
  email: "",
  avatarColor: "#005C9E",
  avatarInitials: "?",
  authProvider: "email" as "email" | "google",
};

const emptyFamily: Family = {
  id: "",
  name: "",
  ownerId: "",
  members: [],
  children: [],
  schools: [],
  contacts: [],
  webCategories: [],
  websiteExceptions: [],
  safeZones: [],
  alerts: [],
  activity: [],
  backups: [],
  classificationReports: [],
  motherPermissions: "no_access",
  motherGrants: [],
  familyPauseActive: false,
  safeSearchEnabled: true,
  localVpnEnabled: true,
  extensionRequests: [],
  liveSessions: [],
};

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      authed: false,
      parent: emptyParent,

      lang: "ar",
      theme: "light",

      screen: "splash",
      tab: "overview",
      selectedChildId: null,

      family: emptyFamily,
      auditLog: [],

      pairingSession: null,

      confirm: null,
      toasts: [],

      setLang: (l) => set({ lang: l }),
      toggleTheme: () =>
        set((s) => ({ theme: s.theme === "light" ? "dark" : "light" })),
      setTheme: (t) => set({ theme: t }),

      signIn: (provider = "google") => {
        // This is only used for mock/dev mode — real auth goes through apiActions
        set({
          authed: true,
          parent: {
            ...emptyParent,
            authProvider: provider,
          },
          screen: "dashboard",
          tab: "overview",
          family: { ...emptyFamily },
        });
        get().toast({
          title: get().lang === "ar" ? "تم تسجيل الدخول بنجاح" : "Signed in successfully",
          variant: "success",
        });
      },
      signOut: () =>
        set({
          authed: false,
          screen: "login",
          tab: "overview",
          selectedChildId: null,
          pairingSession: null,
          family: { ...emptyFamily },
          auditLog: [],
          parent: { ...emptyParent },
        }),

      go: (s) => set({ screen: s }),
      setTab: (t) => {
        const screenForTab: Record<TabKey, ScreenName> = {
          overview: "dashboard",
          rules: "screenTime",
          map: "location",
          more: "settings",
        };
        set({ tab: t, screen: screenForTab[t] });
      },
      selectChild: (id) => set({ selectedChildId: id }),

      startPairing: (childId) => {
        const code = generatePairingCode();
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString(); // 5 min
        set({
          pairingSession: {
            id: uid("pair"),
            code,
            childId,
            status: "ready",
            createdAt: new Date().toISOString(),
            expiresAt,
          },
        });
      },
      cancelPairing: () => {
        const session = get().pairingSession;
        if (session) {
          get().logAudit(
            `إلغاء رمز اقتران لطفل ${session.childId}`,
            `Cancelled pairing code for child ${session.childId}`,
          );
        }
        set({ pairingSession: null });
      },
      regeneratePairing: () => {
        const session = get().pairingSession;
        if (!session) return;
        const code = generatePairingCode();
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();
        set({
          pairingSession: {
            ...session,
            code,
            status: "ready",
            createdAt: new Date().toISOString(),
            expiresAt,
          },
        });
      },
      simulatePairingScan: () => {
        const session = get().pairingSession;
        if (!session || session.status !== "ready") return;
        set({ pairingSession: { ...session, status: "scanning" } });
        setTimeout(() => {
          const cur = get().pairingSession;
          if (cur && cur.id === session.id && cur.status === "scanning") {
            set({ pairingSession: { ...cur, status: "verifying" } });
          }
        }, 800);
      },
      simulatePairingVerify: () => {
        const session = get().pairingSession;
        if (!session || session.status !== "verifying") return;
        setTimeout(() => {
          const cur = get().pairingSession;
          if (cur && cur.id === session.id && cur.status === "verifying") {
            set({ pairingSession: { ...cur, status: "linked" } });
            get().logAudit(
              `ربط جهاز بنجاح للطفل ${cur.childId}`,
              `Device paired successfully for child ${cur.childId}`,
            );
            get().toast({
              title: get().lang === "ar" ? "تم ربط الجهاز بنجاح" : "Device paired successfully",
              variant: "success",
            });
          }
        }, 1100);
      },
      finishPairing: () => {
        const session = get().pairingSession;
        if (!session) return;
        // Mark device as paired+online on the child
        set((s) => ({
          pairingSession: null,
          family: {
            ...s.family,
            children: s.family.children.map((c) =>
              c.id === session.childId
                ? {
                    ...c,
                    devices: c.devices.map((d, i) =>
                      i === 0 ? { ...d, status: "online", lastSync: new Date().toISOString() } : d,
                    ),
                  }
                : c,
            ),
          },
        }));
        get().go("childProfile");
      },

      addChild: (input) => {
        const id = uid("child");
        const newChild: ChildProfile = {
          id,
          name: input.name.trim(),
          avatarColor: ["#3182CE", "#FF6B9D", "#34C759", "#FF9500", "#8B5CF6"][
            Math.floor(Math.random() * 5)
          ],
          avatarInitials: input.name.trim().charAt(0) || "؟",
          birthdate: input.birthdate,
          phoneBrand: input.phoneBrand,
          schoolId: input.schoolId,
          devices: [],
          screenTimeTodayMin: 0,
          screenTimeLimitMin: 0,
          todayUsagePct: 0,
          emergencyContacts: [],
          sosEnabled: true,
        };
        set((s) => ({
          family: { ...s.family, children: [...s.family.children, newChild] },
          selectedChildId: id,
          screen: "childProfile",
        }));
        get().logAudit(
          `إضافة طفل جديد: ${newChild.name}`,
          `Added new child: ${newChild.name}`,
        );
        get().toast({
          title: get().lang === "ar" ? `تمت إضافة ${newChild.name}` : `${newChild.name} added`,
          variant: "success",
        });
      },
      deleteChild: (id) => {
        const child = get().family.children.find((c) => c.id === id);
        set((s) => ({
          family: { ...s.family, children: s.family.children.filter((c) => c.id !== id) },
          selectedChildId:
            s.selectedChildId === id
              ? s.family.children.find((c) => c.id !== id)?.id ?? null
              : s.selectedChildId,
        }));
        if (child) {
          get().logAudit(`حذف الطفل: ${child.name}`, `Deleted child: ${child.name}`);
        }
      },

      setMotherAccess: (level) => {
        set((s) => ({
          family: {
            ...s.family,
            motherPermissions: level,
            // If switching to full_access, grant all non-sensitive grants
            // If no_access, revoke all
            motherGrants:
              level === "full_access"
                ? s.family.motherGrants.map((g) => ({ ...g, granted: !g.sensitive ? true : g.granted }))
                : level === "no_access"
                ? s.family.motherGrants.map((g) => ({ ...g, granted: false }))
                : s.family.motherGrants,
          },
        }));
      },
      toggleMotherGrant: (key) => {
        // Sensitive grants cannot be auto-granted via Full Access — only via explicit toggle
        set((s) => ({
          family: {
            ...s.family,
            motherGrants: s.family.motherGrants.map((g) =>
              g.key === key ? { ...g, granted: !g.granted } : g,
            ),
          },
        }));
      },
      saveMotherPermissions: () => {
        get().logAudit(
          "حفظ تعديلات صلاحيات الأم",
          "Saved mother permission changes",
        );
        get().toast({
          title: get().lang === "ar" ? "تم حفظ الصلاحيات" : "Permissions saved",
          variant: "success",
        });
      },
      revokeMotherAccess: () => {
        set((s) => ({
          family: {
            ...s.family,
            motherPermissions: "no_access",
            motherGrants: s.family.motherGrants.map((g) => ({ ...g, granted: false })),
          },
        }));
        get().logAudit("سحب وصول الأم بالكامل", "Revoked all mother access");
        get().toast({
          title: get().lang === "ar" ? "تم سحب وصول الأم" : "Mother access revoked",
          variant: "warning",
        });
      },

      setWebCategoryAction: (id, action) => {
        set((s) => ({
          family: {
            ...s.family,
            webCategories: s.family.webCategories.map((c) =>
              c.id === id ? { ...c, action } : c,
            ),
          },
        }));
      },
      addWebsiteException: (url, action) => {
        const ex: WebsiteException = {
          id: uid("we"),
          url,
          action,
          addedAt: new Date().toISOString(),
        };
        set((s) => ({
          family: { ...s.family, websiteExceptions: [...s.family.websiteExceptions, ex] },
        }));
        get().toast({
          title: get().lang === "ar" ? "تمت إضافة الاستثناء" : "Exception added",
          variant: "success",
        });
      },
      removeWebsiteException: (id) => {
        set((s) => ({
          family: {
            ...s.family,
            websiteExceptions: s.family.websiteExceptions.filter((e) => e.id !== id),
          },
        }));
      },
      toggleSafeSearch: () => {
        set((s) => ({ family: { ...s.family, safeSearchEnabled: !s.family.safeSearchEnabled } }));
      },
      toggleLocalVpn: () => {
        set((s) => ({ family: { ...s.family, localVpnEnabled: !s.family.localVpnEnabled } }));
      },
      toggleFamilyPause: () => {
        const next = !get().family.familyPauseActive;
        set((s) => ({ family: { ...s.family, familyPauseActive: next } }));
        get().logAudit(
          next ? "تفعيل إيقاف إنترنت الأسرة" : "إيقاف إيقاف إنترنت الأسرة",
          next ? "Family internet pause activated" : "Family internet pause deactivated",
        );
        get().toast({
          title: next
            ? get().lang === "ar" ? "تم إيقاف إنترنت الأسرة" : "Family internet paused"
            : get().lang === "ar" ? "تم استئناف إنترنت الأسرة" : "Family internet resumed",
          variant: next ? "warning" : "success",
        });
      },

      reviewAlert: (id, decision) => {
        set((s) => ({
          family: {
            ...s.family,
            alerts: s.family.alerts.map((a) =>
              a.id === id ? { ...a, status: decision === "ignore" ? "ignored" : "resolved" } : a,
            ),
          },
        }));
        get().toast({
          title:
            decision === "ignore"
              ? get().lang === "ar" ? "تم تجاهل التنبيه" : "Alert ignored"
              : get().lang === "ar" ? "تمت مراجعة التنبيه" : "Alert reviewed",
          variant: "success",
        });
      },

      addContact: (c) => {
        const contact: ContactEntry = { ...c, id: uid("c") };
        set((s) => ({ family: { ...s.family, contacts: [...s.family.contacts, contact] } }));
        get().toast({
          title: get().lang === "ar" ? "تمت إضافة جهة الاتصال" : "Contact added",
          variant: "success",
        });
      },
      toggleContact: (id) => {
        set((s) => ({
          family: {
            ...s.family,
            contacts: s.family.contacts.map((c) =>
              c.id === id ? { ...c, enabled: !c.enabled } : c,
            ),
          },
        }));
      },
      removeContact: (id) => {
        set((s) => ({
          family: { ...s.family, contacts: s.family.contacts.filter((c) => c.id !== id) },
        }));
      },

      addSchool: (s2) => {
        const school: School = { ...s2, id: uid("school"), addedAt: new Date().toISOString() };
        set((s) => ({ family: { ...s.family, schools: [...s.family.schools, school] } }));
        get().toast({
          title: get().lang === "ar" ? "تمت إضافة المدرسة" : "School added",
          variant: "success",
        });
      },
      deleteSchool: (id) => {
        set((s) => ({
          family: { ...s.family, schools: s.family.schools.filter((sc) => sc.id !== id) },
        }));
      },

      submitClassificationReport: (r) => {
        const report: ClassificationReport = {
          ...r,
          id: uid("cr"),
          submittedAt: new Date().toISOString(),
          status: "pending_review",
        };
        set((s) => ({
          family: {
            ...s.family,
            classificationReports: [report, ...s.family.classificationReports],
          },
        }));
        get().toast({
          title: get().lang === "ar" ? "تم استلام البلاغ" : "Report submitted",
          description:
            get().lang === "ar"
              ? "لن يتغير التصنيف العام تلقائياً."
              : "Global classification will not change automatically.",
          variant: "success",
        });
      },

      createBackup: () => {
        const backup: BackupRecord = {
          id: uid("backup"),
          createdAt: new Date().toISOString(),
          storage: "local",
          sizeKb: 180000 + Math.floor(Math.random() * 10000),
          scope: "الأسرة، الأطفال، الأجهزة، القواعد، جهات الاتصال",
          status: "success",
        };
        set((s) => ({
          family: { ...s.family, backups: [backup, ...s.family.backups] },
        }));
        get().logAudit("إنشاء نسخة احتياطية محلية", "Created local backup");
        get().toast({
          title: get().lang === "ar" ? "تم إنشاء النسخة بنجاح" : "Backup created",
          variant: "success",
        });
      },
      restoreBackup: (id) => {
        get().logAudit(`استعادة نسخة احتياطية ${id}`, `Restored backup ${id}`);
        get().toast({
          title: get().lang === "ar" ? "اكتملت الاستعادة بنجاح" : "Restore completed",
          variant: "success",
        });
      },

      decideExtension: (id, decision) => {
        set((s) => ({
          family: {
            ...s.family,
            extensionRequests: s.family.extensionRequests.map((er) =>
              er.id === id
                ? { ...er, status: decision, decidedAt: new Date().toISOString() }
                : er,
            ),
          },
        }));
        get().logAudit(
          decision === "approved" ? `قبول طلب وقت إضافي ${id}` : `رفض طلب وقت إضافي ${id}`,
          decision === "approved" ? `Approved extension request ${id}` : `Rejected extension request ${id}`,
        );
        get().toast({
          title: decision === "approved"
            ? get().lang === "ar" ? "تم قبول الطلب" : "Request approved"
            : get().lang === "ar" ? "تم رفض الطلب" : "Request rejected",
          variant: decision === "approved" ? "success" : "warning",
        });
      },
      requestExtension: (childId, appName, minutes) => {
        const er = {
          id: uid("er"),
          childId,
          appName,
          requestedMinutes: minutes,
          status: "pending" as const,
          requestedAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
        };
        set((s) => ({
          family: { ...s.family, extensionRequests: [er, ...s.family.extensionRequests] },
        }));
        get().logAudit(
          `طلب وقت إضافي: ${minutes} دقيقة لـ ${appName}`,
          `Extension request: ${minutes}m for ${appName}`,
        );
        get().toast({
          title: get().lang === "ar" ? "تم إرسال الطلب" : "Request sent",
          variant: "success",
        });
      },

      startLiveSession: (childId, kind) => {
        // Check device capability for screen/mic
        const child = get().family.children.find((c) => c.id === childId);
        const device = child?.devices[0];
        const supported =
          kind === "screen_view"
            ? device?.capabilities.mediaProjection
            : kind === "voice_call" || kind === "ambient_audio"
            ? device?.capabilities.microphone
            : false;

        const session = {
          id: uid("ls"),
          childId,
          kind,
          status: supported ? ("requested" as const) : ("not_supported" as const),
          startedAt: new Date().toISOString(),
        };
        set((s) => ({
          family: { ...s.family, liveSessions: [...s.family.liveSessions, session] },
        }));

        if (!supported) {
          get().toast({
            title: get().lang === "ar" ? "غير مدعومة على هذا الجهاز" : "Not supported on this device",
            variant: "error",
          });
          return;
        }

        // Simulate system consent + session start
        setTimeout(() => {
          set((s) => ({
            family: {
              ...s.family,
              liveSessions: s.family.liveSessions.map((ls) =>
                ls.id === session.id ? { ...ls, status: "active" } : ls,
              ),
            },
          }));
          get().logAudit(
            `بدء جلسة ${kind === "screen_view" ? "مشاهدة الشاشة" : kind === "voice_call" ? "مكالمة صوتية" : "صوت المحيط"} للطفل ${childId}`,
            `Started ${kind} session for child ${childId}`,
          );
        }, 1200);
      },
      endLiveSession: (id) => {
        set((s) => ({
          family: {
            ...s.family,
            liveSessions: s.family.liveSessions.map((ls) =>
              ls.id === id
                ? { ...ls, status: "ended", endedAt: new Date().toISOString() }
                : ls,
            ),
          },
        }));
        get().logAudit(`إنهاء جلسة ${id}`, `Ended session ${id}`);
        get().toast({
          title: get().lang === "ar" ? "تم إنهاء الجلسة" : "Session ended",
          variant: "success",
        });
      },

      confirmDialog: (opts) => set({ confirm: opts }),
      dismissConfirm: () => set({ confirm: null }),
      toast: (m) => {
        const id = uid("toast");
        set((s) => ({ toasts: [...s.toasts, { ...m, id }] }));
        setTimeout(() => {
          set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
        }, 3500);
      },
      dismissToast: (id) =>
        set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),

      logAudit: (ar, en) => {
        const entry: AuditEntry = { id: uid("audit"), at: new Date().toISOString(), ar, en };
        set((s) => ({ auditLog: [entry, ...s.auditLog].slice(0, 100) }));
      },
    }),
    {
      name: "mdfamily-store",
      storage: createJSONStorage(() => (typeof window !== "undefined" ? localStorage : (undefined as unknown as Storage))),
      partialize: (s) => ({
        lang: s.lang,
        theme: s.theme,
        authed: s.authed,
        parent: s.parent,
        family: s.family,
        auditLog: s.auditLog,
      }),
    },
  ),
);

/** Helper hook: get the currently selected child profile (or null) */
export function useSelectedChild(): ChildProfile | null {
  return useStore((s) => {
    const id = s.selectedChildId;
    if (!id) return null;
    return s.family.children.find((c) => c.id === id) ?? null;
  });
}

/** Helper hook: get installed apps for the selected child */
export function useSelectedChildApps() {
  return useStore((s) => {
    const id = s.selectedChildId;
    if (!id) return [];
    return APPS_BY_CHILD[id] ?? [];
  });
}
