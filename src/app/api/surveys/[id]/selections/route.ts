import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { findSurveyByIdOrSlug } from "@/lib/survey-slug";

/**
 * PUT /api/surveys/[id]/selections - Replace current user's date selections (any signed-in member)
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: idOrSlug } = await params;
  const userId = session.user.id;

  let body: { optionIds?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!Array.isArray(body.optionIds)) {
    return NextResponse.json({ error: "optionIds must be an array" }, { status: 400 });
  }

  const optionIds = body.optionIds.filter(
    (x): x is string => typeof x === "string" && x.length > 0
  );

  const survey = await findSurveyByIdOrSlug(idOrSlug);
  if (!survey) {
    return NextResponse.json({ error: "Survey not found" }, { status: 404 });
  }
  const surveyId = survey.id;

  if (survey.type === "multiple_choice" && !survey.allowMultiple && optionIds.length > 1) {
    return NextResponse.json(
      { error: "This survey only allows one answer" },
      { status: 400 }
    );
  }

  const valid = new Set(survey.options.map((o) => o.id));
  for (const oid of optionIds) {
    if (!valid.has(oid)) {
      return NextResponse.json(
        { error: "One or more options are not part of this survey" },
        { status: 400 }
      );
    }
  }

  try {
    await prisma.$transaction([
      prisma.surveyDateSelection.deleteMany({
        where: { surveyId, userId },
      }),
      ...(optionIds.length > 0
        ? [
            prisma.surveyDateSelection.createMany({
              data: optionIds.map((optionId) => ({
                surveyId,
                userId,
                optionId,
              })),
            }),
          ]
        : []),
    ]);

    return NextResponse.json({ ok: true, selectedOptionIds: optionIds });
  } catch (e) {
    console.error("PUT /api/surveys/[id]/selections failed:", e);
    return NextResponse.json(
      { error: "Failed to save selections" },
      { status: 500 }
    );
  }
}
