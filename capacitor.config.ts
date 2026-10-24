import type { CapacitorConfig } from "@capacitor/cli";

/**
 * MD.Family — Capacitor configuration
 *
 * Wraps the Next.js PWA build as a native Android app.
 * The web assets are produced by `next build` (static export output)
 * and copied into the Android project's assets via `cap sync android`.
 *
 * After running `bun run android:setup`, you can:
 *   - `bun run android:open` to open in Android Studio
 *   - `bun run android:build` to produce a debug APK
 *   - `bun run android:release` to produce a signed release AAB
 *
 * The frontend talks to the FastAPI backend specified via NEXT_PUBLIC_API_URL
 * at build time. For production, set this to your public backend URL.
 */
const PROD_API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const config: CapacitorConfig = {
  appId: "family.md.sabry",
  appName: "MD.Family",
  webDir: "out",
  android: {
    allowMixedContent: false,
    captureInput: true,
    backgroundColor: "#005C9E",
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1500,
      launchAutoHide: true,
      backgroundColor: "#005C9E",
      androidSplashResourceName: "splash",
      androidScaleType: "CENTER_CROP",
      showSpinner: false,
      android: {
        imageSize: "default",
        backgroundColor: "#005C9E",
        showSpinner: false,
      },
    },
    StatusBar: {
      style: "LIGHT",
      backgroundColor: "#005C9E",
      overlaysWebView: false,
    },
    Haptics: {},
    App: {},
    Preferences: {},
  },
  server: {
    androidScheme: "https",
    // The Android app talks to the production backend at runtime via fetch().
    // For local dev with live-reload, override with `--host` flag:
    //   cap run android --host 0.0.0.0 --port 3000
    cleartext: false,
  },
};

export default config;

