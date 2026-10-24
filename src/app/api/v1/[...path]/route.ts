import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.MDFAMILY_BACKEND_URL || "http://127.0.0.1:8000";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return proxyRequest(request, await params);
}
export async function POST(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return proxyRequest(request, await params);
}
export async function PUT(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return proxyRequest(request, await params);
}
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return proxyRequest(request, await params);
}
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return proxyRequest(request, await params);
}

async function proxyRequest(request: NextRequest, params: { path: string[] }) {
  const path = params.path.join("/");
  const url = `${BACKEND_URL}/api/v1/${path}${request.nextUrl.search}`;

  const headers = new Headers(request.headers);
  headers.delete("host");

  const body = request.method !== "GET" && request.method !== "HEAD"
    ? await request.text()
    : undefined;

  try {
    const backendRes = await fetch(url, { method: request.method, headers, body });
    const responseHeaders = new Headers(backendRes.headers);
    responseHeaders.delete("content-encoding");
    const data = await backendRes.arrayBuffer();
    return new NextResponse(data, {
      status: backendRes.status,
      statusText: backendRes.statusText,
      headers: responseHeaders,
    });
  } catch (err: any) {
    return NextResponse.json(
      { detail: "Backend unreachable" },
      { status: 502 },
    );
  }
}
