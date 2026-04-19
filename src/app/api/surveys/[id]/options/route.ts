import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { isYmdInCalendarMonth } from "@/lib/survey-title";

/**
 * POST /api/surveys/[id]/options - Add a date option (admin only). Date must fall in the survey's month/year.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAdmin();
  if (error) {
    return NextResponse.json(error.json, { status: error.status });
  }

  const { id: surveyId } = await params;

  const survey = await prisma.survey.findUnique({ where: { id: surveyId } });
  if (!survey) {
    return NextResponse.json({ error: "Survey not found" }, { status: 404 });
  }

  let body: { date?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const dateStr = typeof body.date === "string" ? body.date.trim() : "";
  if (!dateStr || !isYmdInCalendarMonth(dateStr, survey.month, survey.year)) {
    return NextResponse.json(
      {
        error: `Date must be in ${survey.month}/${survey.year} (YYYY-MM-DD within that month)`,
      },
      { status: 400 }
    );
  }

  const date = new Date(`${dateStr}T12:00:00.000Z`);

  try {
    const option = await prisma.surveyDateOption.create({
      data: { surveyId, date },
    });

    return NextResponse.json({
      id: option.id,
      date: option.date.toISOString().slice(0, 10),
    });
  } catch (e) {
    if (e && typeof e === "object" && "code" in e && e.code === "P2002") {
      return NextResponse.json(
        { error: "That date is already an option for this survey" },
        { status: 400 }
      );
    }
    console.error("POST /api/surveys/[id]/options failed:", e);
    return NextResponse.json(
      { error: "Failed to add date option" },
      { status: 500 }
    );
  }
}
