import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";

/**
 * PATCH /api/members/[id]/admin - Update admin-only fields: role, scgaOfficial (admin only)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAdmin(request);
  if (error) {
    return NextResponse.json(error.json, { status: error.status });
  }

  const { id: userId } = await params;
  const isSelf = userId === session!.user.id;

  const body = await request.json().catch(() => ({}));
  const role = body.role as string | undefined;
  const scgaOfficial = body.scgaOfficial as boolean | undefined;

  const updateData: { role?: string; scgaOfficial?: boolean } = {};
  if (role === "admin" || role === "member") {
    if (isSelf) {
      return NextResponse.json(
        { error: "You cannot change your own role" },
        { status: 400 }
      );
    }
    updateData.role = role;
  }
  if (typeof scgaOfficial === "boolean") updateData.scgaOfficial = scgaOfficial;

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: "No valid updates" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  await prisma.user.update({
    where: { id: userId },
    data: updateData,
  });

  return NextResponse.json({ ok: true });
}

/**
 * POST /api/members/[id]/admin - Promote a user to admin (admin only, deprecated - use PATCH)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAdmin(request);
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
