#!/usr/bin/env bash
#
# MD.Family — Build APK connected to a PUBLIC backend URL
# ======================================================
# Usage:
#   bash scripts/build-apk-public.sh https://mdfamily-api.onrender.com
#
set -euo pipefail
cd "$(dirname "$0")/.."

API_URL="${1:-}"
if [ -z "$API_URL" ]; then
    echo "❌ Usage: bash scripts/build-apk-public.sh <API_URL>"
    echo "   Example: bash scripts/build-apk-public.sh https://mdfamily-api.onrender.com"
    exit 1
fi

echo "╔═══════════════════════════════════════════════════╗"
echo "║  MD.Family — Build APK with public backend URL    ║"
echo "╚═══════════════════════════════════════════════════╝"
echo ""
echo "API URL: $API_URL"
echo ""

# Step 1: Temporarily simplify API routes for static export
echo "▶ Step 1: Preparing API routes for static export..."
mv "src/app/api/v1/[...path]/route.ts" "src/app/api/v1/[...path]/route.ts.dev" 2>/dev/null || true
mv "src/app/api/route.ts" "src/app/api/route.ts.dev" 2>/dev/null || true
echo 'export const dynamic = "force-static"; export function GET() { return Response.json({ status: "ok" }); }' > src/app/api/route.ts

# Step 2: Build PWA with public API URL
echo "▶ Step 2: Building PWA static export..."
export ANDROID_HOME=${ANDROID_HOME:-$HOME/android-sdk}
export JAVA_HOME=${JAVA_HOME:-$HOME/jdk/jdk-21.0.5+11}
export PATH=$JAVA_HOME/bin:$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools:$PATH

BUILD_TARGET=android NEXT_PUBLIC_API_URL="$API_URL" bun x next build 2>&1 | tail -5

# Step 3: Sync Capacitor
echo ""
echo "▶ Step 3: Syncing Capacitor..."
npx cap sync android 2>&1 | tail -3

# Step 4: Build APK
echo ""
echo "▶ Step 4: Building APK..."
cd android
./gradlew assembleDebug --no-daemon 2>&1 | tail -3

# Step 5: Copy APK
echo ""
echo "▶ Step 5: Copying APK..."
cp app/build/outputs/apk/debug/app-debug.apk "../download/MD-Family-v2.3.0-prod.apk"

# Step 6: Restore dev routes
echo ""
echo "▶ Step 6: Restoring dev routes..."
cd ..
mv "src/app/api/route.ts.dev" "src/app/api/route.ts" 2>/dev/null || true
mv "src/app/api/v1/[...path]/route.ts.dev" "src/app/api/v1/[...path]/route.ts" 2>/dev/null || true

# Verify
echo ""
echo "═══════════════════════════════════════════════════"
echo "  ✅ APK built successfully!"
echo "═══════════════════════════════════════════════════"
echo ""
APK=download/MD-Family-v2.3.0-prod.apk
ls -lh "$APK" | awk '{print "  File: " $9}'
echo "  Size: $(du -h $APK | cut -f1)"
echo ""
echo "  Backend URL: $API_URL"
echo ""
echo "  Install on phone:"
echo "    adb install -r $APK"
echo "  Or copy to phone and tap to install"
echo ""
