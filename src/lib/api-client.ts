/**
 * MD.Family Frontend — API client for talking to the FastAPI backend.
 *
 * Drop-in replacement for the mock data layer in `src/lib/mock-data.ts`.
 * When `NEXT_PUBLIC_API_URL` is set (e.g. http://localhost:8000), the
 * frontend talks to the real backend; otherwise it falls back to mock data.
 *
 * All endpoints match the backend's OpenAPI spec at <API_URL>/docs.
 */

import type {
  ChildProfile,
  DeviceInfo,
  Family,
  PairingSession,
  SafetyAlert,
  School,
  ContactEntry,
  WebCategory,
  WebsiteException,
  SafeZone,
  BackupRecord,
  ActivityEvent,
  ClassificationReport,
  PermissionGrant,
  MotherAccessLevel,
} from "./types";

// ─── Configuration ──────────────────────────────────

// URL resolution priority:
// 1. NEXT_PUBLIC_API_URL (if set — production deployment with dedicated backend)
// 2. Capacitor native platform (APK — use sandbox gateway)
// 3. Browser on localhost (dev mode — relative URL, proxied by Next.js rewrites)
// 4. Browser on Vercel (production — relative URL, proxied by Next.js rewrites)
const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

// Sandbox gateway for APK mode (no Next.js server available)
const GATEWAY_BASE = "https://preview-md-family.space-z.ai";
const GATEWAY_PORT_PARAM = "XTransformPort=8000";

const USE_REAL_BACKEND = true;

// Token storage — kept simple for now. In production, use httpOnly cookies.
let _accessToken: string | null = null;

export function setAccessToken(token: string | null) {
  _accessToken = token;
  if (typeof window !== "undefined") {
    if (token) localStorage.setItem("mdf_access_token", token);
    else localStorage.removeItem("mdf_access_token");
  }
}

export function getAccessToken(): string | null {
  if (_accessToken) return _accessToken;
  if (typeof window !== "undefined") {
    _accessToken = localStorage.getItem("mdf_access_token");
  }
  return _accessToken;
}

// ─── HTTP client ────────────────────────────────────

interface FetchOpts {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  headers?: Record<string, string>;
  signal?: AbortSignal;
}

async function apiFetch<T = any>(path: string, opts: FetchOpts = {}): Promise<T> {
  if (!USE_REAL_BACKEND) {
    throw new Error("Backend not configured");
  }
  const token = getAccessToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(opts.headers || {}),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  // Build URL:
  // - If API_URL is set (production deployment), use it directly
  // - If running in browser with Next.js dev server (localhost:3000), use relative URL
  // - If running in Capacitor APK (no dev server), use the sandbox gateway
  //   with XTransformPort=8000 query parameter
  let url: string;
  if (API_URL) {
    // Production deployment — use the configured URL
    url = `${API_URL}${path}`;
  } else if (typeof window !== "undefined") {
    // Check if we're in a Capacitor WebView (APK) vs a regular browser
    const isCapacitor = typeof (window as any).Capacitor !== "undefined" &&
                        (window as any).Capacitor?.isNativePlatform?.();
    const isLocalhost = window.location.hostname === "localhost" ||
                        window.location.hostname === "127.0.0.1";

    if (isCapacitor || !isLocalhost) {
      // APK mode or production browser — use sandbox gateway
      const gatewayBase = "https://preview-md-family.space-z.ai";
      url = `${gatewayBase}${path}`;
      url += path.includes("?") ? `&${GATEWAY_PORT_PARAM}` : `?${GATEWAY_PORT_PARAM}`;
    } else {
      // Dev mode — relative URL (Next.js rewrites handle it)
      url = path;
    }
  } else {
    // SSR — relative URL
    url = path;
  }

  const res = await fetch(url, {
    method: opts.method || "GET",
    headers,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
    signal: opts.signal,
  });

  if (res.status === 401) {
    // Token expired or invalid — clear and let the app redirect to login
    setAccessToken(null);
    throw new Error("Unauthorized");
  }
  if (!res.ok) {
    let detail = "";
    try {
      const err = await res.json();
      detail = err.detail || err.title || JSON.stringify(err);
    } catch {
      detail = `HTTP ${res.status}`;
    }
    throw new Error(detail);
  }
  if (res.status === 204) return null as T;
  const ct = res.headers.get("content-type") || "";
  if (!ct.includes("application/json")) return null as T;
  return res.json();
}

// ─── Auth ────────────────────────────────────────────

export interface AuthAPI {
  register(email: string, name: string, password: string): Promise<{
    access_token: string;
    refresh_token: string;
    user: { id: string; email: string; name: string };
  }>;
  login(email: string, password: string): Promise<{
    access_token: string;
    refresh_token: string;
    user: { id: string; email: string; name: string };
  }>;
  loginWithGoogle(idToken: string): Promise<{
    access_token: string;
    refresh_token: string;
    user: { id: string; email: string; name: string };
  }>;
  me(): Promise<{ id: string; email: string; name: string }>;
}

export const authApi: AuthAPI = {
  register: (email, name, password) =>
    apiFetch("/api/v1/auth/register", { method: "POST", body: { email, name, password } }),
  login: (email, password) =>
    apiFetch("/api/v1/auth/login", { method: "POST", body: { email, password } }),
  loginWithGoogle: (idToken) =>
    apiFetch("/api/v1/auth/google", { method: "POST", body: { id_token: idToken } }),
  me: () => apiFetch("/api/v1/auth/me"),
};

// ─── Families ────────────────────────────────────────

export interface FamilyAPI {
  create(name: string): Promise<{ id: string; name: string; owner_id: string }>;
  get(familyId: string): Promise<any>;
  dashboard(familyId: string): Promise<any>;
  updateSettings(
    familyId: string,
    settings: Partial<{ family_pause_active: boolean; safe_search_enabled: boolean; local_vpn_enabled: boolean }>,
  ): Promise<any>;
  listAudit(familyId: string, page?: number, pageSize?: number): Promise<{
    items: any[];
    total: number;
    page: number;
    page_size: number;
    has_next: boolean;
  }>;
  updateMemberPermissions(
    familyId: string,
    memberId: string,
    accessLevel: MotherAccessLevel,
    grants?: Record<string, boolean>,
  ): Promise<void>;
  listPermissionGrants(): Promise<PermissionGrant[]>;
}

export const familyApi: FamilyAPI = {
  create: (name) => apiFetch("/api/v1/families", { method: "POST", body: { name } }),
  get: (id) => apiFetch(`/api/v1/families/${id}`),
  dashboard: (id) => apiFetch(`/api/v1/families/${id}/dashboard`),
  updateSettings: (id, s) => apiFetch(`/api/v1/families/${id}`, { method: "PUT", body: s }),
  listAudit: (id, page = 1, pageSize = 20) =>
    apiFetch(`/api/v1/families/${id}/audit?page=${page}&page_size=${pageSize}`),
  updateMemberPermissions: (fid, mid, level, grants) =>
    apiFetch(`/api/v1/families/${fid}/members/${mid}/permissions`, {
      method: "PUT",
      body: { access_level: level, grants },
    }),
  listPermissionGrants: () => apiFetch("/api/v1/families/permissions/grants"),
};

// ─── Children ───────────────────────────────────────

export interface ChildAPI {
  list(familyId: string): Promise<ChildProfile[]>;
  create(familyId: string, data: {
    name: string;
    birthdate?: string;
    phone_brand?: string;
    school_id?: string;
  }): Promise<ChildProfile>;
  get(familyId: string, childId: string): Promise<any>;
  update(familyId: string, childId: string, data: Partial<ChildProfile>): Promise<ChildProfile>;
  delete(familyId: string, childId: string): Promise<void>;
}

export const childApi: ChildAPI = {
  list: (fid) => apiFetch(`/api/v1/families/${fid}/children`),
  create: (fid, data) =>
    apiFetch(`/api/v1/families/${fid}/children`, { method: "POST", body: data }),
  get: (fid, cid) => apiFetch(`/api/v1/families/${fid}/children/${cid}`),
  update: (fid, cid, data) =>
    apiFetch(`/api/v1/families/${fid}/children/${cid}`, { method: "PATCH", body: data }),
  delete: (fid, cid) =>
    apiFetch(`/api/v1/families/${fid}/children/${cid}`, { method: "DELETE" }),
};

// ─── Pairing ────────────────────────────────────────

export interface PairingAPI {
  create(familyId: string, childId: string, label?: string): Promise<PairingSession>;
  getStatus(familyId: string, sessionId: string): Promise<PairingSession>;
  cancel(familyId: string, sessionId: string): Promise<void>;
  regenerate(familyId: string, sessionId: string): Promise<PairingSession>;
  preview(code: string): Promise<{
    session_id: string;
    status: string;
    expires_at: string;
    family_name: string;
    child_name: string;
    child_avatar_color: string;
    child_avatar_initials: string;
  }>;
  consume(payload: {
    code: string;
    device_label: string;
    brand: string;
    os: "Android" | "iOS";
    os_version: string;
    app_version: string;
    capabilities: Record<string, boolean>;
  }): Promise<DeviceInfo>;
}

export const pairingApi: PairingAPI = {
  create: (fid, cid, label) =>
    apiFetch(`/api/v1/pairing/families/${fid}/children/${cid}/pairing`, {
      method: "POST",
      body: { child_id: cid, label },
    }),
  getStatus: (fid, sid) => apiFetch(`/api/v1/pairing/families/${fid}/pairing/${sid}`),
  cancel: (fid, sid) =>
    apiFetch(`/api/v1/pairing/families/${fid}/pairing/${sid}/cancel`, { method: "POST" }),
  regenerate: (fid, sid) =>
    apiFetch(`/api/v1/pairing/families/${fid}/pairing/${sid}/regenerate`, { method: "POST" }),
  preview: (code) => apiFetch(`/api/v1/pairing/consume/${code}/preview`),
  consume: (payload) => apiFetch("/api/v1/pairing/consume", { method: "POST", body: payload }),
};

// ─── App policies ───────────────────────────────────

export interface PolicyAPI {
  list(familyId: string, childId: string): Promise<any[]>;
  upsert(familyId: string, childId: string, data: any): Promise<any>;
  patch(familyId: string, childId: string, policyId: string, data: any): Promise<any>;
  delete(familyId: string, childId: string, policyId: string): Promise<void>;
  listExtensionRequests(familyId: string, childId: string): Promise<any[]>;
  decideExtension(familyId: string, childId: string, requestId: string, decision: "approved" | "rejected"): Promise<any>;
}

export const policyApi: PolicyAPI = {
  list: (fid, cid) => apiFetch(`/api/v1/families/${fid}/children/${cid}/app-policies`),
  upsert: (fid, cid, data) =>
    apiFetch(`/api/v1/families/${fid}/children/${cid}/app-policies`, { method: "PUT", body: data }),
  patch: (fid, cid, pid, data) =>
    apiFetch(`/api/v1/families/${fid}/children/${cid}/app-policies/${pid}`, { method: "PATCH", body: data }),
  delete: (fid, cid, pid) =>
    apiFetch(`/api/v1/families/${fid}/children/${cid}/app-policies/${pid}`, { method: "DELETE" }),
  listExtensionRequests: (fid, cid) =>
    apiFetch(`/api/v1/families/${fid}/children/${cid}/app-policies/extensions`),
  decideExtension: (fid, cid, rid, decision) =>
    apiFetch(`/api/v1/families/${fid}/children/${cid}/app-policies/extensions/${rid}/decide`, {
      method: "POST",
      body: { decision },
    }),
};

// ─── Web filtering ──────────────────────────────────

export interface WebFilterAPI {
  listCategories(familyId: string): Promise<WebCategory[]>;
  updateCategory(familyId: string, categoryId: string, action: "allow" | "alert" | "block"): Promise<WebCategory>;
  listExceptions(familyId: string): Promise<WebsiteException[]>;
  addException(familyId: string, url: string, action: "allow" | "alert" | "block", note?: string): Promise<WebsiteException>;
  deleteException(familyId: string, exceptionId: string): Promise<void>;
}

export const webFilterApi: WebFilterAPI = {
  listCategories: (fid) => apiFetch(`/api/v1/families/${fid}/web/categories`),
  updateCategory: (fid, catId, action) =>
    apiFetch(`/api/v1/families/${fid}/web/categories/${catId}`, { method: "PUT", body: { action } }),
  listExceptions: (fid) => apiFetch(`/api/v1/families/${fid}/web/exceptions`),
  addException: (fid, url, action, note) =>
    apiFetch(`/api/v1/families/${fid}/web/exceptions`, { method: "POST", body: { url, action, note } }),
  deleteException: (fid, eid) =>
    apiFetch(`/api/v1/families/${fid}/web/exceptions/${eid}`, { method: "DELETE" }),
};

// ─── Location ────────────────────────────────────────

export interface LocationAPI {
  latest(familyId: string, childId: string): Promise<any>;
  history(familyId: string, childId: string, limit?: number): Promise<any[]>;
  report(familyId: string, childId: string, sample: any): Promise<any>;
  listSafeZones(familyId: string): Promise<SafeZone[]>;
  createSafeZone(familyId: string, data: any): Promise<SafeZone>;
  deleteSafeZone(familyId: string, zoneId: string): Promise<void>;
  sos(familyId: string, childId: string): Promise<void>;
}

export const locationApi: LocationAPI = {
  latest: (fid, cid) => apiFetch(`/api/v1/families/${fid}/children/${cid}/location/latest`),
  history: (fid, cid, limit = 100) =>
    apiFetch(`/api/v1/families/${fid}/children/${cid}/location/history?limit=${limit}`),
  report: (fid, cid, sample) =>
    apiFetch(`/api/v1/families/${fid}/children/${cid}/location`, { method: "POST", body: sample }),
  listSafeZones: (fid) => apiFetch(`/api/v1/families/${fid}/safe-zones`),
  createSafeZone: (fid, data) =>
    apiFetch(`/api/v1/families/${fid}/safe-zones`, { method: "POST", body: data }),
  deleteSafeZone: (fid, zid) =>
    apiFetch(`/api/v1/families/${fid}/safe-zones/${zid}`, { method: "DELETE" }),
  sos: (fid, cid) =>
    apiFetch(`/api/v1/families/${fid}/children/${cid}/sos`, { method: "POST" }),
};

// ─── Alerts & activity ──────────────────────────────

export interface AlertAPI {
  list(familyId: string, status?: string, childId?: string): Promise<SafetyAlert[]>;
  review(familyId: string, alertId: string, decision: "ignored" | "resolved"): Promise<SafetyAlert>;
  listActivity(familyId: string, childId?: string, limit?: number): Promise<ActivityEvent[]>;
}

export const alertApi: AlertAPI = {
  list: (fid, status, cid) => {
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    if (cid) params.set("child_id", cid);
    const qs = params.toString();
    return apiFetch(`/api/v1/families/${fid}/alerts${qs ? "?" + qs : ""}`);
  },
  review: (fid, aid, decision) =>
    apiFetch(`/api/v1/families/${fid}/alerts/${aid}/review`, { method: "POST", body: { decision } }),
  listActivity: (fid, cid, limit = 20) => {
    const params = new URLSearchParams({ limit: String(limit) });
    if (cid) params.set("child_id", cid);
    return apiFetch(`/api/v1/families/${fid}/activity?${params.toString()}`);
  },
};

// ─── Schools & contacts ──────────────────────────────

export interface SchoolsAPI {
  list(familyId: string): Promise<School[]>;
  create(familyId: string, data: Omit<School, "id" | "addedAt">): Promise<School>;
  delete(familyId: string, schoolId: string): Promise<void>;
  submitClassificationReport(familyId: string, data: any): Promise<{ id: string; status: string }>;
}

export const schoolsApi: SchoolsAPI = {
  list: (fid) => apiFetch(`/api/v1/families/${fid}/schools`),
  create: (fid, data) =>
    apiFetch(`/api/v1/families/${fid}/schools`, { method: "POST", body: data }),
  delete: (fid, sid) =>
    apiFetch(`/api/v1/families/${fid}/schools/${sid}`, { method: "DELETE" }),
  submitClassificationReport: (fid, data) =>
    apiFetch(`/api/v1/families/${fid}/classification-reports`, { method: "POST", body: data }),
};

export interface ContactAPI {
  list(familyId: string): Promise<ContactEntry[]>;
  create(familyId: string, data: any): Promise<ContactEntry>;
  delete(familyId: string, contactId: string): Promise<void>;
}

export const contactApi: ContactAPI = {
  list: (fid) => apiFetch(`/api/v1/families/${fid}/contacts`),
  create: (fid, data) =>
    apiFetch(`/api/v1/families/${fid}/contacts`, { method: "POST", body: data }),
  delete: (fid, cid) =>
    apiFetch(`/api/v1/families/${fid}/contacts/${cid}`, { method: "DELETE" }),
};

// ─── Live sessions (sensitive features) ─────────────

export interface LiveSessionAPI {
  start(familyId: string, childId: string, kind: "screen_view" | "voice_call" | "ambient_audio"): Promise<any>;
  list(familyId: string, childId: string): Promise<any[]>;
  end(familyId: string, sessionId: string): Promise<any>;
}

export const liveSessionApi: LiveSessionAPI = {
  start: (fid, cid, kind) =>
    apiFetch(`/api/v1/families/${fid}/children/${cid}/live-sessions`, {
      method: "POST",
      body: { child_id: cid, kind },
    }),
  list: (fid, cid) =>
    apiFetch(`/api/v1/families/${fid}/children/${cid}/live-sessions`),
  end: (fid, sid) =>
    apiFetch(`/api/v1/families/${fid}/live-sessions/${sid}/end`, { method: "POST" }),
};

// ─── Backups ─────────────────────────────────────────

export interface BackupAPI {
  list(familyId: string): Promise<BackupRecord[]>;
  create(familyId: string): Promise<BackupRecord>;
  restore(familyId: string, backupId: string): Promise<void>;
}

export const backupApi: BackupAPI = {
  list: (fid) => apiFetch(`/api/v1/families/${fid}/backups`),
  create: (fid) => apiFetch(`/api/v1/families/${fid}/backups`, { method: "POST" }),
  restore: (fid, bid) =>
    apiFetch(`/api/v1/families/${fid}/backups/${bid}/restore`, { method: "POST" }),
};

// ─── WebSocket ──────────────────────────────────────

export function openWebSocket(onMessage: (event: any) => void): WebSocket {
  if (!USE_REAL_BACKEND) throw new Error("Backend not configured");
  const token = getAccessToken();
  if (!token) throw new Error("Not authenticated");
  const protocol = API_URL.startsWith("https") ? "wss" : "ws";
  const host = API_URL.replace(/^https?:\/\//, "");
  const ws = new WebSocket(`${protocol}://${host}/api/v1/ws?token=${token}`);
  ws.onmessage = (ev) => {
    try {
      onMessage(JSON.parse(ev.data));
    } catch {}
  };
  return ws;
}

// ─── Export ─────────────────────────────────────────

export { USE_REAL_BACKEND, API_URL };

export const api = {
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
