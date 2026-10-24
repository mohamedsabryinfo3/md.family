#!/bin/bash
# Run this script on your machine to fix the Vercel deployment
# It ensures all required files are in the GitHub repo

set -e
cd "$(dirname "$0")"

# Ensure src/app directory exists
mkdir -p src/app/api/v1/\[...path\]

# Ensure the main app files exist
if [ ! -f "src/app/layout.tsx" ]; then
    echo "❌ src/app/layout.tsx not found! Please download the latest project zip."
    exit 1
fi

if [ ! -f "src/app/page.tsx" ]; then
    echo "❌ src/app/page.tsx not found! Please download the latest project zip."
    exit 1
fi

# Ensure the API proxy route exists
cat > src/app/api/route.ts << 'EOF'
import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
export async function GET() {
  return NextResponse.json({ message: "MD.Family API", status: "ok" });
}
EOF

cat > "src/app/api/v1/[...path]/route.ts" << 'EOF'
import { NextRequest, NextResponse } from "next/server";
const BACKEND_URL = process.env.MDFAMILY_BACKEND_URL || "http://127.0.0.1:8000";
export const dynamic = "force-dynamic";
export async function GET(r: NextRequest, { params }: { params: Promise<{ path: string[] }> }) { return proxy(r, await params); }
export async function POST(r: NextRequest, { params }: { params: Promise<{ path: string[] }> }) { return proxy(r, await params); }
export async function PUT(r: NextRequest, { params }: { params: Promise<{ path: string[] }> }) { return proxy(r, await params); }
export async function PATCH(r: NextRequest, { params }: { params: Promise<{ path: string[] }> }) { return proxy(r, await params); }
export async function DELETE(r: NextRequest, { params }: { params: Promise<{ path: string[] }> }) { return proxy(r, await params); }
async function proxy(request: NextRequest, params: { path: string[] }) {
  const path = params.path.join("/");
  const url = `${BACKEND_URL}/api/v1/${path}${request.nextUrl.search}`;
  const headers = new Headers(request.headers);
  headers.delete("host");
  const body = request.method !== "GET" && request.method !== "HEAD" ? await request.text() : undefined;
  try {
    const backendRes = await fetch(url, { method: request.method, headers, body });
    const responseHeaders = new Headers(backendRes.headers);
    responseHeaders.delete("content-encoding");
    const data = await backendRes.arrayBuffer();
    return new NextResponse(data, { status: backendRes.status, statusText: backendRes.statusText, headers: responseHeaders });
  } catch (err: any) {
    return NextResponse.json({ detail: "Backend unreachable" }, { status: 502 });
  }
}
EOF

# Ensure package.json has the correct build script
python3 -c "
import json
with open('package.json', 'r') as f:
    pkg = json.load(f)
pkg['scripts']['build'] = 'next build'
with open('package.json', 'w') as f:
    json.dump(pkg, f, indent=2)
print('✅ Fixed build script')
"

# Git add and push
git add -A
git commit -m "fix: add missing src/app directory + API proxy routes"
git push

echo "✅ Done! Vercel will auto-redeploy."
