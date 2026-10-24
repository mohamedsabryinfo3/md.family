#!/usr/bin/env bash
#
# MD.Family — Deploy Frontend on Vercel + Backend on Render/PythonAnywhere + DB on Neon
# =====================================================================================
# This script creates a complete deployment package for:
#   - Vercel: Frontend (Next.js) — FREE, no credit card, 24/7
#   - Neon: PostgreSQL database — FREE (0.5GB), no credit card, 24/7
#   - Backend: FastAPI — deploy on your own machine OR Render free tier
#
# After deployment:
#   - Frontend URL: https://mdfamily.vercel.app (or similar)
#   - API URL: https://mdfamily.vercel.app/api/v1/* (proxied to backend)
#   - APK connects to: https://mdfamily.vercel.app/api/v1/*
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
echo "╔═══════════════════════════════════════════════════════════╗"
echo "║  MD.Family — Full Deployment Guide (Vercel + Neon)        ║"
echo "║  FREE • No credit card • 24/7 • Auto-sync                ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo ""

# ─── Step 1: GitHub ────────────────────────────────

log "Step 1: Push project to GitHub"
echo ""
echo "  1) Go to https://github.com/new"
echo "     Repository name: mdfamily"
echo "     Set to Private (recommended)"
echo "     Click 'Create repository'"
echo ""
echo "  2) Push the code:"
echo "     cd my-project"
echo "     git init"
echo "     git remote add origin https://github.com/YOUR_USERNAME/mdfamily.git"
echo "     git add -A"
echo "     git commit -m 'MD.Family — production ready'"
echo "     git push -u origin main"
echo ""

# ─── Step 2: Neon Database ─────────────────────────

log "Step 2: Create free PostgreSQL on Neon"
echo ""
echo "  1) Go to https://neon.tech"
echo "     Sign up with GitHub (FREE, no credit card)"
echo ""
echo "  2) Create a project:"
echo "     Name: mdfamily"
echo "     Region: closest to you"
echo "     PostgreSQL version: 16"
echo ""
echo "  3) Copy the connection string:"
echo "     It looks like:"
echo "     postgresql://mdfamily:password@ep-xxx.region.aws.neon.tech/mdfamily?sslmode=require"
echo ""
echo "  ⚠️ SAVE this URL — you'll need it in the next steps!"
echo ""

# ─── Step 3: Vercel Frontend ───────────────────────

log "Step 3: Deploy Frontend on Vercel"
echo ""
echo "  1) Go to https://vercel.com"
echo "     Sign up with GitHub (FREE, no credit card)"
echo ""
echo "  2) Import your project:"
echo "     Click 'New Project'"
echo "     Select your GitHub repo: mdfamily"
echo "     Framework Preset: Next.js (auto-detected)"
echo "     Build Command: bun run build:vercel"
echo "     Output Directory: .next (auto)"
echo ""
echo "  3) Set Environment Variables (IMPORTANT!):"
echo "     Click 'Environment Variables' and add:"
echo ""
echo "     MDFAMILY_BACKEND_URL = http://YOUR_BACKEND_URL:8000"
echo "       (your backend URL — see Step 4)"
echo ""
echo "     NEXT_PUBLIC_API_URL = (leave EMPTY)"
echo "       (empty = use relative URLs through Vercel proxy)"
echo ""
echo "  4) Click 'Deploy'"
echo "     Wait 2-3 minutes"
echo ""
echo "  5) Your frontend URL:"
echo "     https://mdfamily.vercel.app (or similar)"
echo ""

# ─── Step 4: Backend ──────────────────────────────

log "Step 4: Deploy Backend (choose one option)"
echo ""
echo "  ┌─────────────────────────────────────────────────────────┐"
echo "  │ Option A: Run on YOUR machine (FREE, 24/7 if always on) │"
echo "  └─────────────────────────────────────────────────────────┘"
echo ""
echo "  1) Install Python 3.12+ and pip"
echo "  2) Clone your repo:"
echo "     git clone https://github.com/YOUR_USERNAME/mdfamily.git"
echo "     cd mdfamily/backend"
echo ""
echo "  3) Install dependencies:"
echo "     pip install -r requirements.txt"
echo ""
echo "  4) Set environment variables:"
echo "     Create .env file with:"
echo "       MDFAMILY_DATABASE_URL=postgresql://... (from Neon Step 2)"
echo "       MDFAMILY_JWT_SECRET=$(python -c 'import secrets; print(secrets.token_urlsafe(64))')"
echo "       MDFAMILY_REDIS_URL= (leave empty)"
echo "       MDFAMILY_CORS_ORIGINS=https://mdfamily.vercel.app"
echo "       MDFAMILY_APP_ENV=production"
echo ""
echo "  5) Run migrations:"
echo "     alembic upgrade head"
echo ""
echo "  6) Start the server:"
echo "     uvicorn app.main:app --host 0.0.0.0 --port 8000"
echo ""
echo "  7) For public access (FREE):"
echo "     Install cloudflared: https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/"
echo "     Run: cloudflared tunnel --url http://localhost:8000"
echo "     You'll get: https://random-words.trycloudflare.com"
echo ""
echo "  8) Update Vercel env var:"
echo "     MDFAMILY_BACKEND_URL = https://random-words.trycloudflare.com"
echo "     (Redeploy on Vercel)"
echo ""
echo "  ┌─────────────────────────────────────────────────────────┐"
echo "  │ Option B: Render.com (requires credit card for verify)   │"
echo "  └─────────────────────────────────────────────────────────┘"
echo ""
echo "  Use render.yaml (already in the repo) with Blueprint."
echo "  Set MDFAMILY_DATABASE_URL from Neon."
echo ""

# ─── Step 5: Build APK ─────────────────────────────

log "Step 5: Build APK connected to Vercel"
echo ""
echo "  After Vercel deployment:"
echo ""
echo "  bash scripts/build-apk-public.sh https://mdfamily.vercel.app"
echo ""
echo "  The APK will connect to:"
echo "    https://mdfamily.vercel.app/api/v1/auth/register"
echo ""
echo "  Which Vercel proxies to your backend → Neon database."
echo ""

# ─── Step 6: Verify ───────────────────────────────

log "Step 6: Verify everything works"
echo ""
echo "  Test 1: Backend health"
echo "    curl https://YOUR_BACKEND_URL/health"
echo "    → {\"status\":\"ok\",...}"
echo ""
echo "  Test 2: API via Vercel"
echo "    curl https://mdfamily.vercel.app/api/v1/notifications/channels"
echo "    → {\"channels\":[...]}"
echo ""
echo "  Test 3: Register"
echo "    curl -X POST https://mdfamily.vercel.app/api/v1/auth/register \\"
echo "      -H 'Content-Type: application/json' \\"
echo "      -d '{\"email\":\"test@example.com\",\"name\":\"Test\",\"password\":\"StrongPass123!\"}'"
echo "    → {\"access_token\":\"...\",\"user\":{...}}"
echo ""
echo "  Test 4: APK"
echo "    Install MD-Family-v2.4.0.apk on your phone"
echo "    Register → data saved to Neon PostgreSQL!"
echo ""

# ─── Summary ──────────────────────────────────────

log "Summary"
echo ""
echo "  ┌──────────────────────────────────────────────┐"
echo "  │  Architecture (all FREE):                    │"
echo "  │                                              │"
echo "  │  [Phone APK]                                │"
echo "  │       ↓ HTTPS                                │"
echo "  │  [Vercel — Frontend + API proxy]             │"
echo "  │       ↓ HTTP                                 │"
echo "  │  [Your backend — FastAPI]                    │"
echo "  │       ↓ PostgreSQL                           │"
echo "  │  [Neon — Database (0.5GB free)]              │"
echo "  │                                              │"
echo "  │  Cost: $0/month                              │"
echo "  │  Credit card: NOT required                   │"
echo "  │  Uptime: 24/7 (if your machine is on)        │"
echo "  └──────────────────────────────────────────────┘"
echo ""

# ─── Offer to push to GitHub ───────────────────────

log "Ready to push to GitHub?"
echo ""
read -p "Enter your GitHub repo URL (or press Enter to skip): " REPO_URL

if [ -n "$REPO_URL" ]; then
    info "Initializing git..."
    cd "$(dirname "$0")/.."
    git init 2>/dev/null || true
    git remote remove origin 2>/dev/null || true
    git remote add origin "$REPO_URL"

    info "Committing..."
    git add -A
    git commit -m "MD.Family — Vercel + Neon production ready" 2>/dev/null || true

    info "Pushing to GitHub..."
    git push -u origin main

    log "✅ Pushed! Now import on Vercel: https://vercel.com/new"
else
    warn "Skipped. Push manually when ready."
fi

echo ""
log "Done! 🎉"
