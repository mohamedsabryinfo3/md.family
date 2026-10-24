"use client";

/**
 * MD.Family Native Bridge — TypeScript wrapper for the Capacitor MDFamilyNative plugin.
 *
 * This module abstracts over the Capacitor plugin (registered in
 * `MDFamilyNativePlugin.kt`) and provides a clean async API for the frontend.
 *
 * When running in the browser (web preview, not in the APK), all methods
 * return a fallback "web" status so the UI can degrade gracefully.
 */

import { Capacitor } from "@capacitor/core";

// Lazy-import the plugin only on native platforms
let MDFamilyNative: any = null;
let initialized = false;

async function ensurePlugin(): Promise<any> {
  if (initialized) return MDFamilyNative;
  initialized = true;
  if (!Capacitor.isNativePlatform()) {
    MDFamilyNative = null;
    return null;
  }
  try {
    // Dynamic import — fails gracefully on web
    const mod = await import("@capacitor/core");
    MDFamilyNative = (mod as any).registerPlugin?.("MDFamilyNative") ?? null;
  } catch (e) {
    MDFamilyNative = null;
  }
  return MDFamilyNative;
}

// ─── Types ──────────────────────────────────────────

export type PermissionName =
  | "vpn"
  | "accessibility"
  | "usage_stats"
  | "draw_over_apps"
  | "location"
  | "microphone"
  | "notifications";

export type PermissionStatus = "granted" | "denied" | "not_determined" | "unknown";

export interface PermissionResult {
  name: PermissionName;
  status: PermissionStatus;
}

export interface UsageStat {
  package_name: string;
  app_name: string;
  usage_minutes: number;
  last_used: number;
}

// ─── Public API ─────────────────────────────────────

export const nativeBridge = {
  /** Returns true if running inside the native Android APK (vs. browser). */
  isNative(): boolean {
    return Capacitor.isNativePlatform();
  },

  /** Returns the FCM token registered for this device, or null if not registered yet. */
  async getFcmToken(): Promise<string | null> {
    if (typeof window === "undefined") return null;
    try {
      // Token is stored in localStorage by the login flow after registration
      const token = localStorage.getItem("fcm_token");
      return token;
    } catch {
      return null;
    }
  },

  /**
   * Saves the FCM token locally (so we can send it to the backend on next login).
   * Called by the FCM token refresh handler.
   */
  async saveFcmToken(token: string): Promise<void> {
    if (typeof window === "undefined") return;
    localStorage.setItem("fcm_token", token);
    localStorage.setItem("fcm_token_registered_at", Date.now().toString());
  },

  /**
   * Returns the current status of a native permission.
   * On web, always returns "not_determined" (since there's no equivalent).
   */
  async getPermissionStatus(name: PermissionName): Promise<PermissionResult> {
    const plugin = await ensurePlugin();
    if (!plugin) {
      return { name, status: "not_determined" };
    }
    try {
      const result = await plugin.getPermissionStatus({ name });
      return { name, status: result.status as PermissionStatus };
    } catch (e) {
      return { name, status: "unknown" };
    }
  },

  /** Opens the system settings screen for the given permission. */
  async openPermissionSettings(name: PermissionName): Promise<void> {
    const plugin = await ensurePlugin();
    if (!plugin) return;
    try {
      await plugin.openPermissionSettings({ name });
    } catch (e) {
      // Silent
    }
  },

  /**
   * Starts the MD-Sabry VPN service for web filtering.
   * Triggers the Android VPN consent dialog if not already granted.
   *
   * @returns { ok: boolean, status: "started" | "denied" }
   */
  async startVpn(): Promise<{ ok: boolean; status: string }> {
    const plugin = await ensurePlugin();
    if (!plugin) return { ok: false, status: "web" };
    try {
      return await plugin.startVpnService();
    } catch (e: any) {
      return { ok: false, status: "error" };
    }
  },

  /** Stops the VPN service. */
  async stopVpn(): Promise<{ ok: boolean; status: string }> {
    const plugin = await ensurePlugin();
    if (!plugin) return { ok: false, status: "web" };
    try {
      return await plugin.stopVpnService();
    } catch (e: any) {
      return { ok: false, status: "error" };
    }
  },

  /**
   * Starts a Live Screen View session.
   * Triggers the MediaProjection consent dialog.
   *
   * @param sessionId The live session ID from the backend
   */
  async startScreenCapture(sessionId: string): Promise<{ ok: boolean; status: string }> {
    const plugin = await ensurePlugin();
    if (!plugin) return { ok: false, status: "web" };
    try {
      return await plugin.startScreenCapture({ sessionId });
    } catch (e: any) {
      return { ok: false, status: "error" };
    }
  },

  /** Stops the live screen capture session. */
  async stopScreenCapture(): Promise<{ ok: boolean; status: string }> {
    const plugin = await ensurePlugin();
    if (!plugin) return { ok: false, status: "web" };
    try {
      return await plugin.stopScreenCapture();
    } catch (e: any) {
      return { ok: false, status: "error" };
    }
  },

  /** Starts a two-way voice call. */
  async startVoiceCall(sessionId: string): Promise<{ ok: boolean; status: string }> {
    const plugin = await ensurePlugin();
    if (!plugin) return { ok: false, status: "web" };
    try {
      return await plugin.startVoiceCall({ sessionId });
    } catch (e: any) {
      return { ok: false, status: "error" };
    }
  },

  /** Starts an ambient audio session (parent listens to surroundings). */
  async startAmbientAudio(sessionId: string): Promise<{ ok: boolean; status: string }> {
    const plugin = await ensurePlugin();
    if (!plugin) return { ok: false, status: "web" };
    try {
      return await plugin.startAmbientAudio({ sessionId });
    } catch (e: any) {
      return { ok: false, status: "error" };
    }
  },

  /** Stops any active audio session (voice call or ambient audio). */
  async stopAudioSession(): Promise<{ ok: boolean; status: string }> {
    const plugin = await ensurePlugin();
    if (!plugin) return { ok: false, status: "web" };
    try {
      return await plugin.stopAudioSession();
    } catch (e: any) {
      return { ok: false, status: "error" };
    }
  },

  /**
   * Triggers an SOS alert from this device.
   * Gets the current location and uploads it to the backend, then notifies all parents.
   */
  async triggerSos(childId: string): Promise<{
    ok: boolean;
    lat?: number;
    lng?: number;
    accuracy?: number;
    location?: string;
  }> {
    const plugin = await ensurePlugin();
    if (!plugin) return { ok: false, location: "web" };
    try {
      return await plugin.triggerSos({ childId });
    } catch (e: any) {
      return { ok: false, location: "error" };
    }
  },

  /**
   * Returns today's per-app usage stats (requires usage_stats permission).
   * If permission is not granted, returns { ok: false, status: "permission_required" }.
   */
  async getUsageStats(): Promise<{
    ok: boolean;
    status?: string;
    permission?: string;
    stats?: UsageStat[];
  }> {
    const plugin = await ensurePlugin();
    if (!plugin) return { ok: false, status: "web" };
    try {
      const result = await plugin.getUsageStats();
      if (!result.ok) return result;
      // The plugin returns stats as a JSON string (Capacitor serializes strings best)
      const stats = typeof result.stats === "string" ? JSON.parse(result.stats) : result.stats;
      return { ok: true, stats };
    } catch (e: any) {
      return { ok: false, status: "error" };
    }
  },

  /**
   * Returns the current state of the MD-Sabry rule engine (for debugging).
   */
  async getRuleEngineState(): Promise<{ ok: boolean; state?: string }> {
    const plugin = await ensurePlugin();
    if (!plugin) return { ok: false };
    try {
      return await plugin.getRuleEngineState();
    } catch (e: any) {
      return { ok: false };
    }
  },

  /**
   * Updates the blocked packages list in the accessibility service.
   * Called when the parent app pushes a new policy to the child device.
   */
  async updateBlockedPackages(packages: string[]): Promise<{ ok: boolean; count?: number }> {
    const plugin = await ensurePlugin();
    if (!plugin) return { ok: false };
    try {
      return await plugin.updateBlockedPackages({ packages });
    } catch (e: any) {
      return { ok: false };
    }
  },
};
