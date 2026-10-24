import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import jwt from "jsonwebtoken";

const prisma = new PrismaClient();

function getUserId(request: NextRequest): string | null {
  const auth = request.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) return null;
  try {
    const payload: any = jwt.verify(auth.substring(7), process.env.JWT_SECRET || "fallback-secret");
    return payload.sub;
  } catch { return null; }
}

export async function POST(request: NextRequest) {
  const userId = getUserId(request);
  if (!userId) return NextResponse.json({ detail: "Unauthorized" }, { status: 401 });

  const { name } = await request.json();
  const family = await prisma.family.create({
    data: { name, ownerId: userId, members: { create: { userId, role: "primary_owner" } } },
  });
  return NextResponse.json(family, { status: 201 });
}
