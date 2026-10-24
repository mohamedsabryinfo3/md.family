#!/usr/bin/env bash
#
# MD.Family — Deploy backend to PythonAnywhere (FREE, no credit card)
# ==================================================================
# This script creates a complete deployment package for PythonAnywhere.
#
# PythonAnywhere free tier:
#   ✅ No credit card required
#   ✅ Python 3.12
#   ✅ HTTPS automatically
#   ✅ Custom subdomain: YOUR_USERNAME.pythonanywhere.com
#   ⚠️ No WebSockets (REST API works fine)
#   ⚠� SQLite only (no PostgreSQL on free tier)
#   ⚠️ 512MB disk, 512MB RAM
#   ⚠️ App sleeps after 24h of inactivity (wakes on request)
#
set -euo pipefail
cd "$(dirname "$0")/.."

GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
NC='\033[0m'

log()  { echo -e "${GREEN}[MD.Family]${NC} $1"; }
info() { echo -e "${CYAN}[info]${NC} $1"; }
warn() { echo -e "${YELLOW}[warn]${NC} $1"; }

echo ""
echo "╔════════════════════════════════════════════════════╗"
echo "║  MD.Family — Deploy to PythonAnywhere (FREE)      ║"
echo "╠════════════════════════════════════════════════════╣"
echo "║  No credit card required                           ║"
echo "║  Free tier: 512MB RAM, SQLite, HTTPS              ║"
echo "╚════════════════════════════════════════════════════╝"
echo ""

# Step 1: Create deployment zip
log "Step 1: Creating deployment package..."

DEPLOY_ZIP="download/MD-Family-backend-deploy.zip"
rm -f "$DEPLOY_ZIP"

cd backend
zip -r "../$DEPLOY_ZIP" . \
  -x "__pycache__/*" \
  -x "app/__pycache__/*" \
  -x "app/**/__pycache__/*" \
  -x "tests/__pycache__/*" \
  -x "*.pyc" \
  -x "*.db" \
  -x "backend.log" \
  -x "test_mdfamily.db" \
  -x "firebase-service-account.json" \
  -q
cd ..

info "✅ Created: $DEPLOY_ZIP ($(du -h "$DEPLOY_ZIP" | cut -f1))"

# Step 2: Instructions
log ""
log "Step 2: Follow these steps to deploy:"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  📋 Deployment Steps (5 minutes)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "  1) Sign up at:"
echo "     https://www.pythonanywhere.com/registration/register/beginner/"
echo "     (Choose 'Beginner' — it's FREE, no credit card)"
echo ""
echo "  2) Upload the backend:"
echo "     Go to 'Files' tab"
echo "     Upload MD-Family-backend-deploy.zip"
echo "     Create folder: ~/mdfamily"
echo "     Extract the zip into ~/mdfamily/"
echo ""
echo "  3) Create a Web App:"
echo "     Go to 'Web' tab → 'Add a new web app'"
echo "     Choose: 'Manual configuration'"
echo "     Choose: 'Python 3.12'"
echo ""
echo "  4) Configure the Web App:"
echo "     Source code: /home/YOUR_USERNAME/mdfamily"
echo "     Working directory: /home/YOUR_USERNAME/mdfamily"
echo "     WSGI file: /var/www/YOUR_USERNAME_pythonanywhere_com_wsgi.py"
echo "     Edit WSGI file, replace ALL content with:"
echo ""
echo "       import sys"
echo "       sys.path.insert(0, '/home/YOUR_USERNAME/mdfamily')"
echo "       from pa_wsgi import application"
echo ""
echo "  5) Install requirements:"
echo "     Go to 'Consoles' tab → 'Bash' console"
echo "     Run:"
echo "       cd ~/mdfamily"
echo "       pip install -r requirements.txt"
echo ""
echo "  6) Set environment variables:"
echo "     Go to 'Web' tab → your app → 'Environment variables'"
echo "     Add:"
echo "       MDFAMILY_JWT_SECRET = (run: python -c \"import secrets; print(secrets.token_urlsafe(64))\")"
echo "       MDFAMILY_DATABASE_URL = sqlite+aiosqlite:////home/YOUR_USERNAME/mdfamily.db"
echo "       MDFAMILY_REDIS_URL = (leave empty)"
echo "       MDFAMILY_CORS_ORIGINS = *"
echo ""
echo "  7) Reload the web app:"
echo "     Go to 'Web' tab → click 'Reload'"
echo ""
echo "  8) Test your API:"
echo "     Open: https://YOUR_USERNAME.pythonanywhere.com/health"
echo "     You should see: {\"status\":\"ok\",...}"
echo ""
echo "  9) Build APK with your URL:"
echo "     export NEXT_PUBLIC_API_URL=https://YOUR_USERNAME.pythonanywhere.com"
echo "     bash scripts/build-apk-public.sh https://YOUR_USERNAME.pythonanywhere.com"
echo ""
echo "  10) Install APK on your phone!"
echo "      Data will sync with the free server!"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Step 3: Build APK that works with any URL
log ""
log "Step 3: Building APK with offline fallback..."

# The APK already has offline mode (from api-actions.ts)
# It will try the backend first, then fall back to local mode

# Build APK without a specific API URL (uses relative paths)
# When the user deploys to PythonAnywhere, they rebuild with the URL
export ANDROID_HOME=${ANDROID_HOME:-$HOME/android-sdk}
export JAVA_HOME=${JAVA_HOME:-$HOME/jdk/jdk-21.0.5+11}
export PATH=$JAVA_HOME/bin:$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools:$PATH

# Temporarily move API routes for static export
mv "src/app/api/v1/[...path]/route.ts" "src/app/api/v1/[...path]/route.ts.dev" 2>/dev/null || true
mv "src/app/api/route.ts" "src/app/api/route.ts.dev" 2>/dev/null || true
echo 'export const dynamic = "force-static"; export function GET() { return Response.json({ status: "ok" }); }' > src/app/api/route.ts

info "Building PWA..."
BUILD_TARGET=android NEXT_PUBLIC_API_URL="" bun x next build 2>&1 | tail -5

info "Syncing Capacitor..."
npx cap sync android 2>&1 | tail -1

info "Building APK..."
cd android
./gradlew assembleDebug --no-daemon 2>&1 | tail -3
cp app/build/outputs/apk/debug/app-debug.apk ../download/MD-Family-v2.3.0.apk

# Restore dev routes
cd ..
mv "src/app/api/route.ts.dev" "src/app/api/route.ts" 2>/dev/null || true
mv "src/app/api/v1/[...path]/route.ts.dev" "src/app/api/v1/[...path]/route.ts" 2>/dev/null || true

log "✅ APK built: download/MD-Family-v2.3.0.apk"
echo ""
info "After deploying to PythonAnywhere, rebuild with:"
info "  bash scripts/build-apk-public.sh https://YOUR_USERNAME.pythonanywhere.com"
echo ""
