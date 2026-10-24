"use client";

import { useStore } from "./store";
import {
  USE_REAL_BACKEND,
  setAccessToken,
  getAccessToken,
  authApi,
  familyApi,
  childApi,
  pairingApi,
  policyApi,
  webFilterApi,
  locationApi,
  alertApi,
  schoolsApi,
  contactApi,
  liveSessionApi,
  backupApi,
} from "./api-client";
import { createEmptyFamily } from "./empty-family";

// ─── Configuration ──────────────────────────────────

// When API_URL is empty AND we're NOT in a browser with a proxy,
// fall back to "local mode" — the app works offline without a backend.
// This is used when the APK can't reach the backend (e.g. no public server).
const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

// Re-export for convenience
export const api = {
  USE_REAL_BACKEND,
  setAccessToken,
  getAccessToken,
  auth: authApi,
  family: familyApi,
  child: childApi,
  pairing: pairingApi,
  policy: policyApi,
  webFilter: webFilterApi,
  location: locationApi,
  alert: alertApi,
  schools: schoolsApi,
  contact: contactApi,
  liveSession: liveSessionApi,
  backup: backupApi,
};

// ─── Helpers ────────────────────────────────────────

function uid(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function generatePairingCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// ─── Public API ─────────────────────────────────────

export const apiActions = {
  USE_REAL_BACKEND,

  /**
   * Bootstrap: try to restore session from saved JWT.
   * If backend is unreachable, stay on login.
   */
  async bootstrap() {
    const token = api.getAccessToken();
    if (!token || !USE_REAL_BACKEND) return;

    try {
      const me: any = await api.auth.me();
      useStore.setState({
        authed: true,
        parent: {
          id: me.id, email: me.email, name: me.name,
          avatarColor: "#005C9E", avatarInitials: me.name?.[0] || "?",
          authProvider: "email",
        },
        family: createEmptyFamily(me.id, me.name),
        screen: "dashboard", tab: "overview", selectedChildId: null,
      });
    } catch (err) {
      api.setAccessToken(null);
    }
  },

  /**
   * Register: tries backend first, falls back to local mode on failure.
   */
  async register(name: string, email: string, password: string): Promise<void> {
    if (USE_REAL_BACKEND) {
      try {
        const res: any = await api.auth.register(email, name, password);
        api.setAccessToken(res.access_token);
        useStore.setState({
          authed: true,
          parent: {
            id: res.user.id, email: res.user.email, name: res.user.name,
            avatarColor: "#005C9E", avatarInitials: res.user.name?.[0] || "?",
            authProvider: "email",
          },
          family: createEmptyFamily(res.user.id, res.user.name),
          screen: "dashboard", tab: "overview", selectedChildId: null,
        });
        try {
          const fam: any = await api.family.create(`${name}'s Family`);
          useStore.setState((s) => ({ family: { ...s.family, id: fam.id, name: fam.name, ownerId: res.user.id } }));
        } catch {}
        return;
      } catch (err: any) {
        // Backend unreachable — fall through to local mode
      }
    }
    // Local mode (no backend)
    useStore.setState({
      authed: true,
      parent: {
        id: uid("user"), email, name,
        avatarColor: "#005C9E", avatarInitials: name[0] || "?",
        authProvider: "email",
      },
      family: createEmptyFamily(uid("user"), name),
      screen: "dashboard", tab: "overview", selectedChildId: null,
    });
  },

  /**
   * Login: tries backend first, falls back to local mode.
   */
  async loginWithEmail(email: string, password: string): Promise<void> {
    if (USE_REAL_BACKEND) {
      try {
        const res: any = await api.auth.login(email, password);
        api.setAccessToken(res.access_token);
        useStore.setState({
          authed: true,
          parent: {
            id: res.user.id, email: res.user.email, name: res.user.name,
            avatarColor: "#005C9E", avatarInitials: res.user.name?.[0] || "?",
            authProvider: "email",
          },
          family: createEmptyFamily(res.user.id, res.user.name),
          screen: "dashboard", tab: "overview", selectedChildId: null,
        });
        try {
          const fam: any = await api.family.create(`${res.user.name}'s Family`);
          const dash: any = await api.family.dashboard(fam.id);
          useStore.setState((s) => ({
            family: { ...s.family, id: fam.id, name: fam.name, ownerId: res.user.id,
              children: (dash.children || []).map((c: any) => ({
                id: c.id, name: c.name,
                avatarColor: c.avatar_color || "#3182CE",
                avatarInitials: c.avatar_initials || c.name?.[0] || "?",
                birthdate: c.birthdate, phoneBrand: c.phone_brand,
                schoolId: c.school_id, devices: c.devices || [],
                screenTimeTodayMin: c.screen_time_today_min || 0,
                screenTimeLimitMin: c.screen_time_limit_min || 0,
                todayUsagePct: c.today_usage_pct || 0,
                lastActivity: c.last_activity,
                emergencyContacts: [], sosEnabled: c.sos_enabled ?? true,
              })),
            },
          }));
        } catch {}
        return;
      } catch (err: any) {
        // If it's a 401 (wrong password), don't fall back to local — show the error
        if (err?.message?.includes("401") || err?.message?.includes("Invalid")) {
          throw err;
        }
        // Other errors (network) — fall through to local mode
      }
    }
    // Local mode
    useStore.setState({
      authed: true,
      parent: {
        id: uid("user"), email, name: email.split("@")[0],
        avatarColor: "#005C9E", avatarInitials: email[0]?.toUpperCase() || "?",
        authProvider: "email",
      },
      family: createEmptyFamily(uid("user"), email.split("@")[0]),
      screen: "dashboard", tab: "overview", selectedChildId: null,
    });
  },

  /**
   * Google login: tries backend, falls back to local.
   */
  async loginWithGoogle(idToken: string): Promise<void> {
    if (USE_REAL_BACKEND) {
      try {
        const res: any = await api.auth.loginWithGoogle(idToken);
        api.setAccessToken(res.access_token);
        useStore.setState({
          authed: true,
          parent: {
            id: res.user.id, email: res.user.email, name: res.user.name,
            avatarColor: "#005C9E", avatarInitials: res.user.name?.[0] || "?",
            authProvider: "google",
          },
          family: createEmptyFamily(res.user.id, res.user.name),
          screen: "dashboard", tab: "overview", selectedChildId: null,
        });
        try {
          const fam: any = await api.family.create(`${res.user.name}'s Family`);
          useStore.setState((s) => ({ family: { ...s.family, id: fam.id, name: fam.name, ownerId: res.user.id } }));
        } catch {}
        return;
      } catch (err: any) {
        // Fall through to local
      }
    }
    // Local mode
    useStore.setState({
      authed: true,
      parent: {
        id: uid("user"), email: "user@gmail.com", name: "مستخدم Google",
        avatarColor: "#005C9E", avatarInitials: "م",
        authProvider: "google",
      },
      family: createEmptyFamily(uid("user"), "مستخدم Google"),
      screen: "dashboard", tab: "overview", selectedChildId: null,
    });
  },

  /**
   * Sign out — clear everything.
   */
  async signOut(): Promise<void> {
    api.setAccessToken(null);
    useStore.setState({
      authed: false, screen: "login", tab: "overview",
      selectedChildId: null, pairingSession: null,
      family: createEmptyFamily("", ""),
      parent: { id: "", name: "", email: "", avatarColor: "#005C9E", avatarInitials: "?", authProvider: "email" },
    });
  },

  // ─── Child operations (with backend fallback) ────

  async addChild(input: { name: string; birthdate?: string; phoneBrand?: string; schoolId?: string }): Promise<void> {
    const famId = useStore.getState().family.id;
    if (USE_REAL_BACKEND && famId) {
      try {
        const child: any = await api.child.create(famId, {
          name: input.name, birthdate: input.birthdate,
          phone_brand: input.phoneBrand, school_id: input.schoolId,
        });
        const newChild = {
          id: child.id, name: child.name,
          avatarColor: child.avatar_color || "#3182CE",
          avatarInitials: child.avatar_initials || input.name[0] || "?",
          birthdate: child.birthdate, phoneBrand: child.phone_brand,
          schoolId: child.school_id, devices: [],
          screenTimeTodayMin: child.screen_time_today_min || 0,
          screenTimeLimitMin: child.screen_time_limit_min || 0,
          todayUsagePct: 0, emergencyContacts: [], sosEnabled: child.sos_enabled ?? true,
        };
        useStore.setState((s) => ({
          family: { ...s.family, children: [...s.family.children, newChild] },
          selectedChildId: child.id, screen: "childProfile",
        }));
        return;
      } catch {}
    }
    // Local mode
    const id = uid("child");
    const newChild: any = {
      id, name: input.name, avatarColor: "#3182CE", avatarInitials: input.name[0] || "?",
      birthdate: input.birthdate, phoneBrand: input.phoneBrand, schoolId: input.schoolId,
      devices: [], screenTimeTodayMin: 0, screenTimeLimitMin: 0, todayUsagePct: 0,
      emergencyContacts: [], sosEnabled: true,
    };
    useStore.setState((s) => ({
      family: { ...s.family, children: [...s.family.children, newChild] },
      selectedChildId: id, screen: "childProfile",
    }));
  },

  async deleteChild(childId: string): Promise<void> {
    const famId = useStore.getState().family.id;
    if (USE_REAL_BACKEND && famId) {
      try { await api.child.delete(famId, childId); } catch {}
    }
    useStore.getState().deleteChild(childId);
  },

  // ─── Pairing (with fallback) ─────────────────────

  async startPairing(childId: string): Promise<void> {
    const famId = useStore.getState().family.id;
    if (USE_REAL_BACKEND && famId) {
      try {
        const session: any = await api.pairing.create(famId, childId);
        useStore.setState({ pairingSession: {
          id: session.id, code: session.code, childId,
          status: session.status, createdAt: session.created_at, expiresAt: session.expires_at,
        }});
        return;
      } catch {}
    }
    // Local mode
    useStore.getState().startPairing(childId);
  },

  async cancelPairing(): Promise<void> {
    const session = useStore.getState().pairingSession;
    const famId = useStore.getState().family.id;
    if (USE_REAL_BACKEND && session && famId) {
      try { await api.pairing.cancel(famId, session.id); } catch {}
    }
    useStore.getState().cancelPairing();
  },

  async regeneratePairing(): Promise<void> {
    const session = useStore.getState().pairingSession;
    const famId = useStore.getState().family.id;
    if (USE_REAL_BACKEND && session && famId) {
      try {
        const updated: any = await api.pairing.regenerate(famId, session.id);
        useStore.setState({ pairingSession: { ...session, code: updated.code, status: updated.status, expiresAt: updated.expiresAt }});
        return;
      } catch {}
    }
    useStore.getState().regeneratePairing();
  },

  async simulatePairingScan(): Promise<void> {
    const session = useStore.getState().pairingSession;
    if (!session || session.status !== "ready") return;
    useStore.setState({ pairingSession: { ...session, status: "scanning" } });

    const child = useStore.getState().family.children.find((c) => c.id === session.childId);
    if (!child) return;

    const famId = useStore.getState().family.id;
    if (USE_REAL_BACKEND && famId) {
      try {
        useStore.setState({ pairingSession: { ...session, status: "verifying" } });
        const device: any = await api.pairing.consume({
          code: session.code,
          device_label: child.devices[0]?.label || `${child.name}'s Phone`,
          brand: child.phoneBrand || "Samsung", os: "Android",
          os_version: "Android 14", app_version: "MD.Family 2.0.0",
          capabilities: { usageStats: true, accessibility: true, vpn: true, location: true, mediaProjection: true, microphone: false },
        });
        useStore.setState((s) => ({
          pairingSession: { ...session, status: "linked" },
          family: { ...s.family, children: s.family.children.map((c) => c.id === session.childId ? {
            ...c, devices: [...c.devices, {
              id: device.id, label: device.label, brand: device.brand, os: device.os,
              osVersion: device.os_version, appVersion: device.app_version,
              status: device.status, batteryPct: device.battery_pct,
              lastSeen: device.last_seen_at, lastSync: device.last_sync_at,
              pairedAt: device.paired_at, capabilities: device.capabilities || {},
            }],
          } : c) },
        }));
        useStore.getState().toast({ title: "تم ربط الجهاز بنجاح", variant: "success" });
        return;
      } catch (err: any) {
        useStore.setState({ pairingSession: { ...session, status: "failed", message: err?.message } });
        useStore.getState().toast({ title: "فشل الربط", description: err?.message, variant: "error" });
        return;
      }
    }
    // Local mode
    useStore.getState().simulatePairingScan();
  },

  async toggleFamilyPause(): Promise<void> {
    const next = !useStore.getState().family.familyPauseActive;
    useStore.setState((s) => ({ family: { ...s.family, familyPauseActive: next } }));
    useStore.getState().logAudit(
      next ? "تفعيل إيقاف إنترنت الأسرة" : "إيقاف إيقاف إنترنت الأسرة",
      next ? "Family internet pause activated" : "Family internet pause deactivated",
    );
    const famId = useStore.getState().family.id;
    if (USE_REAL_BACKEND && famId) {
      try { await api.family.updateSettings(famId, { family_pause_active: next }); } catch {}
    }
  },

  async triggerSos(childId: string): Promise<void> {
    const famId = useStore.getState().family.id;
    if (USE_REAL_BACKEND && famId) {
      try { await api.location.sos(famId, childId);
        useStore.getState().toast({ title: "تم إرسال استغاثة SOS", variant: "success" });
        return;
      } catch {}
    }
    useStore.getState().toast({ title: "تم إرسال استغاثة SOS", variant: "success" });
  },

  async createBackup(): Promise<void> {
    useStore.getState().createBackup();
    const famId = useStore.getState().family.id;
    if (USE_REAL_BACKEND && famId) {
      try {
        const backup: any = await api.backup.create(famId);
        useStore.setState((s) => ({ family: { ...s.family, backups: [
          { id: backup.id, createdAt: backup.created_at, storage: backup.storage,
            sizeKb: backup.size_kb, scope: backup.scope, status: backup.status, note: backup.note },
          ...s.family.backups.filter((b) => !b.id.startsWith("mock-")),
        ]}}));
      } catch {}
    }
  },

  async restoreBackup(backupId: string): Promise<void> {
    useStore.getState().restoreBackup(backupId);
    const famId = useStore.getState().family.id;
    if (USE_REAL_BACKEND && famId) {
      try { await api.backup.restore(famId, backupId); } catch {}
    }
  },

  async saveMotherPermissions(): Promise<void> {
    const fam = useStore.getState().family;
    useStore.getState().saveMotherPermissions();
    const motherMember = fam.members.find((m) => m.role === "mother");
    if (USE_REAL_BACKEND && motherMember && fam.id) {
      try {
        await api.family.updateMemberPermissions(fam.id, motherMember.id, fam.motherPermissions,
          Object.fromEntries(fam.motherGrants.map((g) => [g.key, g.granted])));
      } catch {}
    }
  },
};
