import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";

/**
 * POST /api/members/[id]/admin - Promote a user to admin (admin only)
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAdmin();
  if (error) {
    return NextResponse.json(error.json, { status: error.status });
  }

  const { id: userId } = await params;

  if (userId === session!.user.id) {
    return NextResponse.json(
      { error: "You cannot change your own role" },
      { status: 400 }
    );
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  if (user.role === "admin") {
    return NextResponse.json(
      { error: "User is already an admin" },
      { status: 400 }
    );
  }

  await prisma.user.update({
    where: { id: userId },
    data: { role: "admin" },
  });

  return NextResponse.json({ ok: true });
}
