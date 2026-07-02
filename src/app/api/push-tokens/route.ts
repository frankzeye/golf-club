import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

/**
 * POST /api/push-tokens — Register or refresh an Expo push token for the signed-in user.
 */
export async function POST(request: NextRequest) {
  const session = await getAuthSession(request);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const token = typeof body.token === "string" ? body.token.trim() : "";
    if (!token.startsWith("ExponentPushToken[") && !token.startsWith("ExpoPushToken[")) {
      return NextResponse.json({ error: "Invalid push token" }, { status: 400 });
    }

    const platform =
      body.platform === "ios" || body.platform === "android" ? body.platform : null;

    await prisma.pushToken.upsert({
      where: { token },
      create: {
        userId: session.user.id,
        token,
        platform,
      },
      update: {
        userId: session.user.id,
        platform,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("POST /api/push-tokens failed:", error);
    return NextResponse.json({ error: "Failed to register push token" }, { status: 500 });
  }
}

/**
 * DELETE /api/push-tokens — Remove a push token (e.g. on sign out).
 */
export async function DELETE(request: NextRequest) {
  const session = await getAuthSession(request);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const token = typeof body.token === "string" ? body.token.trim() : "";
    if (!token) {
      return NextResponse.json({ error: "Token required" }, { status: 400 });
    }

    await prisma.pushToken.deleteMany({
      where: { token, userId: session.user.id },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("DELETE /api/push-tokens failed:", error);
    return NextResponse.json({ error: "Failed to remove push token" }, { status: 500 });
  }
}
