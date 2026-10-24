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

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = getUserId(request);
  if (!userId) return NextResponse.json({ detail: "Unauthorized" }, { status: 401 });

  const { id: familyId } = await params;
  const { name, birthdate, phoneBrand, schoolId } = await request.json();

  const child = await prisma.child.create({
    data: {
      familyId,
      name,
      birthdate,
      phoneBrand,
      schoolId,
      avatarInitials: name.charAt(0).toUpperCase(),
    },
  });
  return NextResponse.json(child, { status: 201 });
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = getUserId(request);
  if (!userId) return NextResponse.json({ detail: "Unauthorized" }, { status: 401 });

  const { id: familyId } = await params;
  const children = await prisma.child.findMany({
    where: { familyId, isDeleted: false },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json(children);
}
