import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { generatePasswordResetSecret, hashPasswordResetSecret } from "@/lib/reset-token";
import { sendPasswordResetEmail } from "@/lib/send-password-reset-email";

const RESET_TTL_MS = 60 * 60 * 1000;

function normalizeEmail(value: unknown): string {
  return typeof value === "string" ? value.toLowerCase().trim() : "";
}

function baseUrl(): string {
  const u = process.env.NEXTAUTH_URL?.replace(/\/$/, "");
  if (u) return u;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}

async function maskTiming(): Promise<void> {
  await new Promise((r) => setTimeout(r, 350 + Math.floor(Math.random() * 350)));
}

/**
 * POST /api/auth/forgot-password — sends a one-time reset link (Resend).
 * Always responds with the same shape when email is missing or unknown.
 */
export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    await maskTiming();
    return NextResponse.json({ ok: true });
  }

  const email = normalizeEmail(
    body && typeof body === "object" && "email" in body
      ? (body as { email?: unknown }).email
      : undefined
  );

  if (!email) {
    await maskTiming();
    return NextResponse.json({ ok: true });
  }

  const user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    await maskTiming();
    return NextResponse.json({ ok: true });
  }

  await prisma.passwordResetToken.deleteMany({
    where: { userId: user.id, usedAt: null },
  });

  const secret = generatePasswordResetSecret();
  const tokenHash = hashPasswordResetSecret(secret);
  const expiresAt = new Date(Date.now() + RESET_TTL_MS);

  const row = await prisma.passwordResetToken.create({
    data: {
      tokenHash,
      userId: user.id,
      expiresAt,
    },
  });

  const resetUrl = `${baseUrl()}/reset-password?token=${encodeURIComponent(secret)}`;

  try {
    await sendPasswordResetEmail(user.email, resetUrl);
  } catch (err) {
    console.error("Password reset email failed:", err);
    await prisma.passwordResetToken.delete({ where: { id: row.id } }).catch(() => {});
    return NextResponse.json(
      { error: "Could not send reset email. Check email configuration or try again later." },
      { status: 503 }
    );
  }

  await maskTiming();
  return NextResponse.json({ ok: true });
}
