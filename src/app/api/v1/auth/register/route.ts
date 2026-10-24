import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const { email, name, password } = await request.json();

    if (!email || !name || !password || password.length < 8) {
      return NextResponse.json({ detail: "Invalid input" }, { status: 422 });
    }

    // Check if email exists
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ detail: "Email already registered" }, { status: 409 });
    }

    // Create user
    const passwordHash = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: {
        email,
        name,
        passwordHash,
        avatarInitials: name.charAt(0).toUpperCase(),
      },
    });

    // Create family
    const family = await prisma.family.create({
      data: {
        name: `${name}'s Family`,
        ownerId: user.id,
        members: {
          create: {
            userId: user.id,
            role: "primary_owner",
          },
        },
      },
    });

    // Generate JWT
    const token = jwt.sign(
      { sub: user.id, typ: "access" },
      process.env.JWT_SECRET || "fallback-secret",
      { expiresIn: "30d" }
    );

    return NextResponse.json({
      access_token: token,
      refresh_token: token,
      token_type: "bearer",
      expires_in: 2592000,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ detail: error.message }, { status: 500 });
  }
}
