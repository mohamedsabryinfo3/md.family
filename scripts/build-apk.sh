#!/usr/bin/env bash
#
# MD.Family — Build Android APK (one command)
# ============================================
#
# Usage:
#   bash scripts/build-apk.sh            # → download/MD-Family-v2.0.0-debug.apk
#   bash scripts/build-apk.sh release    # → download/MD-Family-v2.0.0-release-unsigned.apk
#
# Prerequisites (auto-installed if missing on Linux/macOS):
#   - Node.js 20+ and bun (or npm)
#   - Android SDK (cmdline-tools + platform-tools + build-tools;36 + platforms;android-36)
#   - JDK 21 (Temurin/OpenJDK)
#
# Environment variables you can set:
#   ANDROID_HOME — path to Android SDK (default: ~/android-sdk)
#   JAVA_HOME    — path to JDK 21 (default: auto-detected)
#
set -euo pipefail
cd "$(dirname "$0")/.."

MODE="${1:-debug}"
VERSION="2.0.0"
GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'
log()  { echo -e "${GREEN}[MD.Family]${NC} $1"; }
warn() { echo -e "${YELLOW}[warn]${NC} $1"; }
err()  { echo -e "${RED}[error]${NC} $1" >&2; }

# --- 1. Locate JDK 21 -----------------------------------------------------
if [ -z "${JAVA_HOME:-}" ]; then
  # Try common locations
  for cand in \
    "$HOME/jdk/jdk-21.0.5+11" \
    "/usr/lib/jvm/java-21-openjdk-amd64" \
    "/Library/Java/JavaVirtualMachines/temurin-21.jdk/Contents/Home"; do
    if [ -x "$cand/bin/javac" ]; then JAVA_HOME="$cand"; break; fi
  done
fi
if [ -z "${JAVA_HOME:-}" ] || [ ! -x "$JAVA_HOME/bin/javac" ]; then
  err "JDK 21 not found. Install Temurin 21 from https://adoptium.net/temurin/releases/?version=21"
  err "Then set: export JAVA_HOME=/path/to/jdk-21"
  exit 1
fi
export JAVA_HOME
export PATH="$JAVA_HOME/bin:$PATH"
log "Using JDK: $JAVA_HOME ($(javac -version 2>&1))"

# --- 2. Locate Android SDK ------------------------------------------------
if [ -z "${ANDROID_HOME:-}" ]; then
  for cand in "$HOME/android-sdk" "$HOME/Android/Sdk" "/opt/android-sdk" "/usr/lib/android-sdk"; do
    if [ -d "$cand/platforms" ]; then ANDROID_HOME="$cand"; break; fi
  done
fi
if [ -z "${ANDROID_HOME:-}" ] || [ ! -d "$ANDROID_HOME/platforms" ]; then
  err "Android SDK not found. Install Android Studio or just cmdline-tools:"
  err "  https://developer.android.com/studio#command-line-tools-only"
  err "Then set: export ANDROID_HOME=/path/to/android-sdk"
  err "And install: sdkmanager \"platform-tools\" \"platforms;android-36\" \"build-tools;36.0.0\""
  exit 1
fi
export ANDROID_HOME
export PATH="$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools:$PATH"
log "Using Android SDK: $ANDROID_HOME"

# --- 3. Install deps if missing -------------------------------------------
if [ ! -d "node_modules/@capacitor" ]; then
  log "Installing dependencies..."
  if command -v bun >/dev/null 2>&1; then bun install; else npm install; fi
fi

# --- 4. Build the PWA static export ---------------------------------------
log "Building PWA static export (BUILD_TARGET=android)..."
BUILD_TARGET=android npx next build 2>&1 | tail -5

if [ ! -d "out" ]; then
  err "Static export failed — 'out/' not produced."
  exit 1
fi
log "Static export ready: $(du -sh out | cut -f1)"

# --- 5. Initialize Capacitor Android project if missing -------------------
if [ ! -d "android" ]; then
  log "Adding Capacitor Android project..."
  npx cap add android
fi

# --- 6. Overlay MD.Family's custom files ---------------------------------
TEMPLATE_DIR="android-template"
ANDROID_DIR="android"
if [ -d "$TEMPLATE_DIR" ]; then
  log "Overlaying MD.Family template files..."
  cp -f "$TEMPLATE_DIR/app/src/main/AndroidManifest.xml" \
        "$ANDROID_DIR/app/src/main/AndroidManifest.xml"
  mkdir -p "$ANDROID_DIR/app/src/main/java/family/md/sabry"
  find "$ANDROID_DIR/app/src/main/java" -name "MainActivity.java" -delete 2>/dev/null || true
  cp -f "$TEMPLATE_DIR/app/src/main/java/family/md/sabry/"*.kt \
        "$ANDROID_DIR/app/src/main/java/family/md/sabry/"
  for d in drawable drawable-mdpi drawable-hdpi drawable-xhdpi drawable-xxhdpi drawable-xxxhdpi \
           mipmap-mdpi mipmap-hdpi mipmap-xhdpi mipmap-xxhdpi mipmap-xxxhdpi mipmap-anydpi-v26 \
           values xml; do
    if [ -d "$TEMPLATE_DIR/app/src/main/res/$d" ]; then
      rm -rf "$ANDROID_DIR/app/src/main/res/$d"
      mkdir -p "$ANDROID_DIR/app/src/main/res/$d"
      cp -rf "$TEMPLATE_DIR/app/src/main/res/$d/." "$ANDROID_DIR/app/src/main/res/$d/"
    fi
  done
fi

# --- 7. Sync web assets into Android -------------------------------------
log "Running cap sync android..."
npx cap sync android 2>&1 | tail -5

# --- 8. Build APK / AAB ---------------------------------------------------
cd android
chmod +x gradlew
case "$MODE" in
  release)
    log "Building RELEASE AAB (unsigned)..."
    ./gradlew bundleRelease --no-daemon 2>&1 | tail -3
    AAB="app/build/outputs/bundle/release/app-release.aab"
    [ -f "$AAB" ] || { err "AAB build failed"; exit 1; }
    cp "$AAB" "../download/MD-Family-v${VERSION}-release-unsigned.aab"
    log "Release AAB: download/MD-Family-v${VERSION}-release-unsigned.aab"
    ;;
  debug|"")
    log "Building DEBUG APK..."
    ./gradlew assembleDebug --no-daemon 2>&1 | tail -3
    APK="app/build/outputs/apk/debug/app-debug.apk"
    [ -f "$APK" ] || { err "APK build failed"; exit 1; }
    cp "$APK" "../download/MD-Family-v${VERSION}-debug.apk"
    SIZE=$(du -h "../download/MD-Family-v${VERSION}-debug.apk" | cut -f1)
    log "✅ APK ready: download/MD-Family-v${VERSION}-debug.apk ($SIZE)"
    echo ""
    echo "To install on your phone:"
    echo "  1) Enable USB debugging in Settings → Developer options"
    echo "  2) Connect your phone via USB"
    echo "  3) Run: adb install -r download/MD-Family-v${VERSION}-debug.apk"
    echo ""
    echo "Or copy the APK to your phone and tap to install"
    echo "(enable 'Install from unknown sources' for your file manager)"
    ;;
  *)
    err "Unknown mode: $MODE (use 'debug' or 'release')"
    exit 1
    ;;
esac

log "Done. 🎉"
