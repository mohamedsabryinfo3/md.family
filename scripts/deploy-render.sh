#!/usr/bin/env bash
#
# MD.Family — Deploy backend to Render.com
# ==========================================
# This script guides you through deploying the backend to Render.com
# so that the APK can sync data with a real public server.
#
# Prerequisites:
#   - GitHub account
#   - Render.com account (free)
#   - Git installed on your machine
#
# After deployment, you'll get a URL like:
#   https://mdfamily-api.onrender.com
#
# Usage:
#   bash scripts/deploy-render.sh
#
set -euo pipefail
cd "$(dirname "$0")/.."

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
RED='\033[0;31m'
NC='\033[0m'

log()  { echo -e "${GREEN}[MD.Family]${NC} $1"; }
info() { echo -e "${CYAN}[info]${NC} $1"; }
warn() { echo -e "${YELLOW}[warn]${NC} $1"; }
err()  { echo -e "${RED}[error]${NC} $1" >&2; }

echo ""
echo "══════════════════════════════════════════════════════"
echo "  MD.Family — Deploy to Render.com"
echo "══════════════════════════════════════════════════════"
echo ""

# ─── Step 1: Check prerequisites ────────────────────

log "Step 1: Checking prerequisites..."

if ! command -v git >/dev/null 2>&1; then
    err "Git is not installed. Install it from https://git-scm.com/"
    exit 1
fi

if [ ! -f "render.yaml" ]; then
    err "render.yaml not found. Make sure you're in the project root."
    exit 1
fi

if [ ! -f "backend/Dockerfile" ]; then
    err "backend/Dockerfile not found."
    exit 1
fi

info "✅ Prerequisites OK"

# ─── Step 2: Git setup ──────────────────────────────

log ""
log "Step 2: Git setup..."

if [ ! -d ".git" ]; then
    info "Initializing git repository..."
    git init
    git branch -M main
fi

# Check for .gitignore
if [ ! -f ".gitignore" ]; then
    info "Creating .gitignore..."
    cat > .gitignore << 'GITIGNORE'
node_modules/
.next/
out/
*.db
*.pyc
__pycache__/
.env
backend/*.db
backend/backend.log
dev.log
android/.gradle/
android/build/
android/app/build/
android/capacitor-cordova-android-plugins/build/
.zscripts/
skills/
tests/
examples/
upload/
mini-services/backend/app
mini-services/backend/.env
mini-services/backend/alembic
mini-services/backend/alembic.ini
mini-services/backend/firebase-service-account.json
GITIGNORE
fi

# Make sure sensitive files are NOT committed
if [ -f "backend/firebase-service-account.json" ]; then
    warn "firebase-service-account.json found — will NOT be committed (it's in .gitignore)"
    echo "backend/firebase-service-account.json" >> .gitignore
fi

info "✅ Git ready"

# ─── Step 3: Instructions ───────────────────────────

log ""
log "Step 3: Deployment instructions"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Follow these steps to deploy:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "  1) Create a GitHub repository:"
echo "     Go to https://github.com/new"
echo "     Name: mdfamily"
echo "     Set to PRIVATE (recommended)"
echo "     Click 'Create repository'"
echo ""
echo "  2) Push this project to GitHub:"
echo "     git remote add origin https://github.com/YOUR_USERNAME/mdfamily.git"
echo "     git add -A"
echo "     git commit -m 'MD.Family v2.3.0 — production ready'"
echo "     git push -u origin main"
echo ""
echo "  3) Deploy on Render.com:"
echo "     Go to https://dashboard.render.com"
echo "     Sign up / Sign in (free account)"
echo "     Click 'New +' → 'Blueprint'"
echo "     Select your GitHub repo: mdfamily"
echo "     Render will detect render.yaml automatically"
echo "     Click 'Apply'"
echo ""
echo "  4) Wait for deployment (~3-5 minutes)"
echo "     Render will create 3 services:"
echo "       - mdfamily-db (PostgreSQL)"
echo "       - mdfamily-redis (Redis)"
echo "       - mdfamily-api (FastAPI)"
echo ""
echo "  5) Get your API URL:"
echo "     Once deployed, you'll see:"
echo "       https://mdfamily-api.onrender.com"
echo ""
echo "  6) Set Firebase service account (for push notifications):"
echo "     In Render dashboard → mdfamily-api → Environment"
echo "     Add secret file: firebase-service-account.json"
echo "     Paste the full JSON content from Firebase Console"
echo ""
echo "  7) Rebuild APK with the public URL:"
echo "     export NEXT_PUBLIC_API_URL=https://mdfamily-api.onrender.com"
echo "     bash scripts/build-apk.sh debug"
echo ""
echo "  8) Install the new APK on your phone!"
echo "     Data will now sync with the real server."
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# ─── Step 4: Offer to push to GitHub ────────────────

log "Step 4: Ready to push to GitHub?"
echo ""
read -p "Have you created a GitHub repo? Enter the URL (or press Enter to skip): " REPO_URL

if [ -n "$REPO_URL" ]; then
    info "Adding remote..."
    git remote remove origin 2>/dev/null || true
    git remote add origin "$REPO_URL"
    
    info "Committing..."
    git add -A
    git commit -m "MD.Family v2.3.0 — production ready with Render.com deployment" 2>/dev/null || true
    
    info "Pushing to GitHub..."
    git push -u origin main
    
    log "✅ Pushed to GitHub!"
    echo ""
    info "Now go to https://dashboard.render.com → New → Blueprint"
    info "Select your repo and click 'Apply'"
else
    warn "Skipped GitHub push. Do it manually when ready."
fi

echo ""
log "Done! 🎉"
echo ""
info "After Render deployment, rebuild APK with:"
info "  NEXT_PUBLIC_API_URL=https://mdfamily-api.onrender.com bash scripts/build-apk.sh debug"
