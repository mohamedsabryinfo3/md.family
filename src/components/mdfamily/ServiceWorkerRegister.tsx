"use client";

import { useEffect } from "react";

/**
 * Registers the MD.Family service worker for offline support and PWA installability.
 * Only runs in production builds; in development we skip registration to avoid
 * caching dev assets.
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;
    if (process.env.NODE_ENV !== "production") return;

    const register = async () => {
      try {
        await navigator.serviceWorker.register("/sw.js", { scope: "/" });
        // console.log("[MD.Family] Service Worker registered");
      } catch (err) {
        // Silent fail — SW is progressive enhancement
        // console.warn("[MD.Family] SW registration failed:", err);
      }
    };

    // Register after page load to avoid blocking first paint
    if (document.readyState === "complete") {
      register();
    } else {
      window.addEventListener("load", register, { once: true });
      return () => window.removeEventListener("load", register);
    }
  }, []);

  return null;
}
