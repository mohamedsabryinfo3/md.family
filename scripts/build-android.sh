#!/usr/bin/env bash
#
# MD.Family — Build PWA + Capacitor Android project
# ==================================================
#
# This script:
#   1. Runs `next build` with BUILD_TARGET=android to produce static `out/`
#   2. Initializes a Capacitor Android project (if not already added)
#   3. Copies MD.Family's custom AndroidManifest, MainActivity, ProtectionService,
#      BootReceiver, and resources into the Android project
#   4. Runs `cap sync android` to copy the web assets into the APK
#
# PREREQUISITES
# -------------
#   - Node.js 20+, bun (or npm)
#   - Android Studio (or just Android SDK + Gradle 8.5+)
#   - JAVA_HOME pointing to JDK 17
#
# USAGE
# -----
#   bash scripts/build-android.sh           # build APK (debug)
#   bash scripts/build-android.sh release    # build release AAB (unsigned)
#   bash scripts/build-android.sh open       # open in Android Studio
#
# OUTPUT
# ------
#   android/app/build/outputs/apk/debug/app-debug.apk
#   android/app/build/outputs/bundle/release/app-release.aab
#
# Then install on a device via:
#   adb install -r android/app/build/outputs/apk/debug/app-debug.apk
#
set -euo pipefail

cd "$(dirname "$0")/.."

MODE="${1:-debug}"
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() { echo -e "${GREEN}[MD.Family]${NC} $1"; }
warn() { echo -e "${YELLOW}[warn]${NC} $1"; }
err() { echo -e "${RED}[error]${NC} $1" >&2; }

# --- 1. Sanity checks ------------------------------------------------------

if ! command -v bun >/dev/null 2>&1 && ! command -v npm >/dev/null 2>&1; then
  err "Neither bun nor npm was found. Install Node.js 20+ and bun first."
  exit 1
fi

PKG_MGR="bun"
if ! command -v bun >/dev/null 2>&1; then
  PKG_MGR="npm"
fi

if [ ! -f "node_modules/.package-lock.json" ] && [ ! -d "node_modules/@capacitor" ]; then
  log "Installing dependencies..."
  $PKG_MGR install
fi

# --- 2. Build the web assets (static export) ------------------------------

log "Building static PWA export (BUILD_TARGET=android)..."
BUILD_TARGET=android npx next build

if [ ! -d "out" ]; then
  err "Build failed — 'out/' directory was not produced."
  err "Make sure next.config.ts has output='export' when BUILD_TARGET=android."
  exit 1
fi

log "Static export ready: $(du -sh out | cut -f1)"

# --- 3. Initialize the Capacitor Android project --------------------------

if [ ! -d "android" ]; then
  log "Adding Capacitor Android project..."
  npx cap add android
fi

# --- 4. Overlay MD.Family's custom Android files --------------------------

TEMPLATE_DIR="android-template"
ANDROID_DIR="android"

if [ -d "$TEMPLATE_DIR" ]; then
  log "Overlaying MD.Family Android template files..."

  # Manifest
  mkdir -p "$ANDROID_DIR/app/src/main"
  cp -f "$TEMPLATE_DIR/app/src/main/AndroidManifest.xml" \
        "$ANDROID_DIR/app/src/main/AndroidManifest.xml"

  # Kotlin sources
  mkdir -p "$ANDROID_DIR/app/src/main/java/family/md/sabry"
  cp -f "$TEMPLATE_DIR/app/src/main/java/family/md/sabry/"*.kt \
        "$ANDROID_DIR/app/src/main/java/family/md/sabry/"

  # Resources (manifest, drawables, mipmaps, values, xml)
  for d in drawable drawable-mdpi drawable-hdpi drawable-xhdpi drawable-xxhdpi drawable-xxxhdpi \
           mipmap-mdpi mipmap-hdpi mipmap-xhdpi mipmap-xxhdpi mipmap-xxxhdpi mipmap-anydpi-v26 \
           values xml; do
    if [ -d "$TEMPLATE_DIR/app/src/main/res/$d" ]; then
      mkdir -p "$ANDROID_DIR/app/src/main/res/$d"
      cp -rf "$TEMPLATE_DIR/app/src/main/res/$d/." \
             "$ANDROID_DIR/app/src/main/res/$d/"
    fi
  done

  # Gradle files
  cp -f "$TEMPLATE_DIR/build.gradle" "$ANDROID_DIR/build.gradle"
  cp -f "$TEMPLATE_DIR/app/build.gradle" "$ANDROID_DIR/app/build.gradle"
  cp -f "$TEMPLATE_DIR/app/proguard-rules.pro" "$ANDROID_DIR/app/proguard-rules.pro"
  cp -f "$TEMPLATE_DIR/settings.gradle" "$ANDROID_DIR/settings.gradle"

  log "Template overlay complete."
fi

# --- 5. Sync web assets into the Android project -------------------------

log "Running cap sync android..."
npx cap sync android

# --- 6. Build or open -----------------------------------------------------

case "$MODE" in
  release)
    log "Building RELEASE AAB (unsigned)..."
    warn "For a signed release, edit android/app/build.gradle to add signingConfig."
    cd android
    ./gradlew :app:bundleRelease
    cd ..
    log "Release AAB: android/app/build/outputs/bundle/release/app-release.aab"
    ;;
  open)
    log "Opening Android Studio..."
    npx cap open android
    ;;
  debug|*)
    log "Building DEBUG APK..."
    cd android
    ./gradlew :app:assembleDebug
    cd ..
    APK="android/app/build/outputs/apk/debug/app-debug.apk"
    if [ -f "$APK" ]; then
      log "DEBUG APK ready: $APK"
      log "Install with:  adb install -r $APK"
    else
      err "Build did not produce APK. Check gradle output above."
      exit 1
    fi
    ;;
esac

log "Done. 🎉"
