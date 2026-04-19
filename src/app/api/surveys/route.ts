import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatAvailabilitySurveyTitle } from "@/lib/survey-title";

/**
 * GET /api/surveys - List availability surveys (newest first)
 */
export async function GET() {
  try {
    const surveys = await prisma.survey.findMany({
      orderBy: [{ year: "desc" }, { month: "desc" }, { createdAt: "desc" }],
      include: {
        _count: { select: { options: true } },
      },
    });

    return NextResponse.json({
      surveys: surveys.map((s) => ({
        id: s.id,
        month: s.month,
        year: s.year,
        title: formatAvailabilitySurveyTitle(s.month, s.year),
        optionCount: s._count.options,
        createdAt: s.createdAt.toISOString(),
      })),
    });
  } catch (e) {
    console.error("GET /api/surveys failed:", e);
    const hint = prismaSurveyMissingHint(e);
    return NextResponse.json(
      { error: hint ?? "Failed to load surveys" },
      { status: hint ? 503 : 500 }
    );
  }
}

function prismaSurveyMissingHint(e: unknown): string | null {
  if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2021") {
    return "Survey tables are missing. Run `npx prisma migrate deploy` (or `prisma db push`) against this database.";
  }
  if (e instanceof Error && /Survey|survey/i.test(e.message) && /does not exist/i.test(e.message)) {
    return "Survey tables are missing. Run `npx prisma migrate deploy` (or `prisma db push`) against this database.";
  }
  return null;
}

/**
 * POST /api/surveys - Create survey for a calendar month (admin only)
 */
export async function POST(request: NextRequest) {
  const { session, error } = await requireAdmin();
  if (error) {
    return NextResponse.json(error.json, { status: error.status });
  }

  let body: { month?: number; year?: number };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const month = Number(body.month);
  const year = Number(body.year);
  if (!Number.isInteger(month) || month < 1 || month > 12) {
    return NextResponse.json({ error: "month must be 1–12" }, { status: 400 });
  }
  if (!Number.isInteger(year) || year < 2000 || year > 2100) {
    return NextResponse.json({ error: "Invalid year" }, { status: 400 });
  }

  try {
    const adminId = session!.user.id;
    const adminRow = await prisma.user.findUnique({
      where: { id: adminId },
      select: { id: true },
    });

    const survey = await prisma.survey.create({
      data: {
        month,
        year,
        createdById: adminRow?.id ?? null,
      },
    });

    return NextResponse.json({
      id: survey.id,
      month: survey.month,
      year: survey.year,
      title: formatAvailabilitySurveyTitle(survey.month, survey.year),
    });
  } catch (e) {
    console.error("POST /api/surveys failed:", e);
    const missing = prismaSurveyMissingHint(e);
    if (missing) {
      return NextResponse.json({ error: missing }, { status: 503 });
    }
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2003") {
      return NextResponse.json(
        {
          error:
            "Database rejected the creator link (foreign key). Sign out and sign in again, or run migrations if the User table does not match your session.",
        },
        { status: 400 }
      );
    }
    const message =
      e instanceof Error ? e.message : "Failed to create survey";
    return NextResponse.json(
      {
        error:
          process.env.NODE_ENV === "development"
            ? `Failed to create survey: ${message}`
            : "Failed to create survey",
      },
      { status: 500 }
    );
  }
}
