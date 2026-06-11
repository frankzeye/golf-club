import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { findSurveyByIdOrSlug } from "@/lib/survey-slug";
import { deleteSurveyOptionImages } from "@/lib/survey-images";

/**
 * DELETE /api/surveys/[id]/options/[optionId] - Remove an option (admin only)
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; optionId: string }> }
) {
  const { error } = await requireAdmin();
  if (error) {
    return NextResponse.json(error.json, { status: error.status });
  }

  const { id: idOrSlug, optionId } = await params;

  const survey = await findSurveyByIdOrSlug(idOrSlug);
  if (!survey) {
    return NextResponse.json({ error: "Survey not found" }, { status: 404 });
  }

  const option = await prisma.surveyDateOption.findFirst({
    where: { id: optionId, surveyId: survey.id },
  });
  if (!option) {
    return NextResponse.json({ error: "Option not found" }, { status: 404 });
  }

  await prisma.surveyDateOption.delete({ where: { id: optionId } });
  await deleteSurveyOptionImages([option.imageUrl]);
  return NextResponse.json({ ok: true });
}
