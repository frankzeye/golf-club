import { NextRequest, NextResponse } from "next/server";
import { compare } from "bcryptjs";
import { prisma } from "@/lib/db";
import { createMobileAuthToken, MOBILE_TOKEN_MAX_AGE } from "@/lib/mobile-auth";

/**
 * POST /api/mobile/login
 * Email/password login for native mobile clients. Returns a Bearer JWT.
 * (Lives outside /api/auth/* to avoid conflicting with NextAuth's catch-all route.)
 */
export async function POST(request: NextRequest) {
  let body: { email?: unknown; password?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const email = typeof body.email === "string" ? body.email.toLowerCase().trim() : "";
  const password = typeof body.password === "string" ? body.password : "";

  if (!email || !password) {
    return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        password: true,
        role: true,
        firstName: true,
        lastName: true,
        imageUrl: true,
        scgaOfficial: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    const valid = await compare(password, user.password);
    if (!valid) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    const name =
      [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email;

    const token = await createMobileAuthToken({
      id: user.id,
      email: user.email,
      role: user.role ?? "member",
      name,
    });

    return NextResponse.json({
      token,
      expiresIn: MOBILE_TOKEN_MAX_AGE,
      user: {
        id: user.id,
        email: user.email,
        name,
        role: user.role ?? "member",
        imageUrl: user.imageUrl,
        scgaOfficial: user.scgaOfficial ?? false,
      },
    });
  } catch (error) {
    console.error("Mobile login failed:", error);
    return NextResponse.json(
      { error: "Server error. Is the database running?" },
      { status: 503 }
    );
  }
}
