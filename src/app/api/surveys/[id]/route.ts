import { NextRequest, NextResponse } from "next/server";
import { getAuthSession, requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { surveyDisplayTitle } from "@/lib/survey-title";
import { findSurveyByIdOrSlug } from "@/lib/survey-slug";
import { deleteSurveyOptionImages } from "@/lib/survey-images";
import {
  isSurveyClosed,
  parseDatetimeLocalValue,
  parseDurationDaysHours,
  endsAtFromDuration,
} from "@/lib/survey-deadline";

/**
 * GET /api/surveys/[id] - Survey detail with date options and current user's selections
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getAuthSession(request);
  const { id: idOrSlug } = await params;

  try {
    const survey = await findSurveyByIdOrSlug(idOrSlug);

    if (!survey) {
      return NextResponse.json({ error: "Survey not found" }, { status: 404 });
    }

    const surveyId = survey.id;

    let selectedOptionIds: string[] = [];
    if (session?.user?.id) {
      const rows = await prisma.surveyDateSelection.findMany({
        where: { surveyId, userId: session.user.id },
        select: { optionId: true },
      });
      selectedOptionIds = rows.map((r) => r.optionId);
    }

    const [selectionGroups, distinctResponders] = await Promise.all([
      prisma.surveyDateSelection.groupBy({
        by: ["optionId"],
        where: { surveyId },
        _count: { _all: true },
      }),
      prisma.surveyDateSelection.findMany({
        where: { surveyId },
        select: { userId: true },
        distinct: ["userId"],
      }),
    ]);

    const countByOptionId = Object.fromEntries(
      selectionGroups.map((g) => [g.optionId, g._count._all])
    );

    // Admins can see who picked each option
    const isAdmin = session?.user?.role === "admin";
    const respondersByOptionId: Record<
      string,
      { id: string; fullName: string; imageUrl: string | null }[]
    > = {};
    if (isAdmin) {
      const rows = await prisma.surveyDateSelection.findMany({
        where: { surveyId },
        select: {
          optionId: true,
          user: {
            select: { id: true, firstName: true, lastName: true, imageUrl: true },
          },
        },
        orderBy: [{ user: { lastName: "asc" } }, { user: { firstName: "asc" } }],
      });
      for (const r of rows) {
        (respondersByOptionId[r.optionId] ??= []).push({
          id: r.user.id,
          fullName:
            [r.user.firstName, r.user.lastName].filter(Boolean).join(" ") || "—",
          imageUrl: r.user.imageUrl,
        });
      }
    }

    return NextResponse.json({
      id: survey.id,
      slug: survey.slug,
      type: survey.type,
      allowMultiple: survey.allowMultiple,
      month: survey.month,
      year: survey.year,
      title: surveyDisplayTitle(survey),
      endsAt: survey.endsAt?.toISOString() ?? null,
      isClosed: isSurveyClosed(survey.endsAt),
      options: survey.options.map((o) => ({
        id: o.id,
        date: o.date ? o.date.toISOString().slice(0, 10) : null,
        label: o.label,
        imageUrl: o.imageUrl,
        responseCount: countByOptionId[o.id] ?? 0,
        ...(isAdmin && { responders: respondersByOptionId[o.id] ?? [] }),
      })),
      selectedOptionIds,
      uniqueResponderCount: distinctResponders.length,
    });
  } catch (e) {
    console.error("GET /api/surveys/[id] failed:", e);
    return NextResponse.json(
      { error: "Failed to load survey" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/surveys/[id] - Update survey settings (admin only)
 * Body: { endsAt?: string } or { durationDays?: number, durationHours?: number } to extend from now
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAdmin(request);
  if (error) {
    return NextResponse.json(error.json, { status: error.status });
  }

  const { id: idOrSlug } = await params;

  let body: {
    endsAt?: string;
    durationDays?: number;
    durationHours?: number;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const survey = await findSurveyByIdOrSlug(idOrSlug);
  if (!survey) {
    return NextResponse.json({ error: "Survey not found" }, { status: 404 });
  }

  let endsAt: Date | undefined;
  if (typeof body.endsAt === "string") {
    const parsed = parseDatetimeLocalValue(body.endsAt);
    if ("error" in parsed) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }
    endsAt = parsed;
  } else if (body.durationDays !== undefined || body.durationHours !== undefined) {
    const duration = parseDurationDaysHours(
      body.durationDays ?? 0,
      body.durationHours ?? 0
    );
    if ("error" in duration) {
      return NextResponse.json({ error: duration.error }, { status: 400 });
    }
    endsAt = endsAtFromDuration(duration.days, duration.hours);
  } else {
    return NextResponse.json(
      { error: "Provide endsAt or durationDays and durationHours" },
      { status: 400 }
    );
  }

  try {
    const updated = await prisma.survey.update({
      where: { id: survey.id },
      data: { endsAt },
    });
    return NextResponse.json({
      id: updated.id,
      endsAt: updated.endsAt?.toISOString() ?? null,
      isClosed: isSurveyClosed(updated.endsAt),
    });
  } catch (e) {
    console.error("PATCH /api/surveys/[id] failed:", e);
    return NextResponse.json(
      { error: "Failed to update survey" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/surveys/[id] - Remove survey and all options/selections (admin only)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAdmin(request);
  if (error) {
    return NextResponse.json(error.json, { status: error.status });
  }

  const { id: idOrSlug } = await params;

  try {
    const survey = await findSurveyByIdOrSlug(idOrSlug);
    if (!survey) {
      return NextResponse.json({ error: "Survey not found" }, { status: 404 });
    }
    await prisma.survey.delete({ where: { id: survey.id } });
    await deleteSurveyOptionImages(survey.options.map((o) => o.imageUrl));
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e && typeof e === "object" && "code" in e && e.code === "P2025") {
      return NextResponse.json({ error: "Survey not found" }, { status: 404 });
    }
    console.error("DELETE /api/surveys/[id] failed:", e);
    return NextResponse.json(
      { error: "Failed to delete survey" },
      { status: 500 }
    );
  }
}
