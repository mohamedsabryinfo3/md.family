import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import jwt from "jsonwebtoken";

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    const auth = request.headers.get("authorization");
    if (!auth || !auth.startsWith("Bearer ")) {
      return NextResponse.json({ detail: "Unauthorized" }, { status: 401 });
    }

    const token = auth.substring(7);
    const payload: any = jwt.verify(token, process.env.JWT_SECRET || "fallback-secret");
    
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, name: true, avatarColor: true, avatarInitials: true },
    });

    if (!user) {
      return NextResponse.json({ detail: "User not found" }, { status: 404 });
    }

    return NextResponse.json(user);
  } catch {
    return NextResponse.json({ detail: "Invalid token" }, { status: 401 });
  }
}
