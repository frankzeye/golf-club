import { NextRequest, NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { prisma } from "@/lib/db";
import { hashPasswordResetSecret } from "@/lib/reset-token";

/**
 * POST /api/auth/reset-password — set a new password using a token from email.
 */
export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { token, password } = body as { token?: unknown; password?: unknown };
  const tokenStr = typeof token === "string" ? token.trim() : "";
  const passwordStr = typeof password === "string" ? password : "";

  if (!tokenStr || !passwordStr) {
    return NextResponse.json(
      { error: "Token and password are required" },
      { status: 400 }
    );
  }

  if (passwordStr.length < 8) {
    return NextResponse.json(
      { error: "Password must be at least 8 characters" },
      { status: 400 }
    );
  }

  const tokenHash = hashPasswordResetSecret(tokenStr);
  const record = await prisma.passwordResetToken.findUnique({
    where: { tokenHash },
  });

  const now = new Date();
  if (!record || record.usedAt || record.expiresAt < now) {
    return NextResponse.json(
      { error: "Invalid or expired reset link. Request a new one from the sign-in page." },
      { status: 400 }
    );
  }

  const hashed = await hash(passwordStr, 12);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: record.userId },
      data: { password: hashed },
    }),
    prisma.passwordResetToken.update({
      where: { id: record.id },
      data: { usedAt: now },
    }),
  ]);

  return NextResponse.json({ ok: true });
}
