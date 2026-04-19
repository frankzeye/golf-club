import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";

/**
 * DELETE /api/surveys/[id]/options/[optionId] - Remove a date option (admin only)
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; optionId: string }> }
) {
  const { error } = await requireAdmin();
  if (error) {
    return NextResponse.json(error.json, { status: error.status });
  }

  const { id: surveyId, optionId } = await params;

  const option = await prisma.surveyDateOption.findFirst({
    where: { id: optionId, surveyId },
  });
  if (!option) {
    return NextResponse.json({ error: "Option not found" }, { status: 404 });
  }

  await prisma.surveyDateOption.delete({ where: { id: optionId } });
  return NextResponse.json({ ok: true });
}
