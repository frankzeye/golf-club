import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatAvailabilitySurveyTitle } from "@/lib/survey-title";
import { ensureSurveySlug, generateNewSurveySlug } from "@/lib/survey-slug";

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

    // Assign slugs sequentially: parallel ensureSurveySlug can pick the same
    // slug for two legacy rows (same month/year, both slug null) → P2002.
    const rows = [];
    for (const s of surveys) {
      const slug = await ensureSurveySlug(s);
      rows.push({
        id: s.id,
        slug,
        month: s.month,
        year: s.year,
        title: formatAvailabilitySurveyTitle(s.month, s.year),
        optionCount: s._count.options,
        createdAt: s.createdAt.toISOString(),
      });
    }

    return NextResponse.json({ surveys: rows });
  } catch (e) {
    console.error("GET /api/surveys failed:", e);
    const hint = prismaSurveyMissingHint(e);
    return NextResponse.json(
      { error: hint ?? "Failed to load surveys" },
      { status: hint ? 503 : 500 }
    );
  }
}

const SURVEY_MIGRATE_CMD =
  "Run `npx prisma migrate deploy` on the app (or a one-off shell) with `DATABASE_URL` pointing at this same Postgres database.";

function prismaSurveyMissingHint(e: unknown): string | null {
  if (e instanceof Prisma.PrismaClientKnownRequestError) {
    if (e.code === "P2021") {
      return `Survey tables are missing. ${SURVEY_MIGRATE_CMD}`;
    }
    if (e.code === "P2022") {
      return `The database is missing a column Prisma expects (often \`Survey.slug\` after a deploy). ${SURVEY_MIGRATE_CMD}`;
    }
  }
  if (!(e instanceof Error)) return null;
  const msg = e.message;
  if (!/does not exist/i.test(msg) || !/Survey|survey/i.test(msg)) {
    return null;
  }
  // Postgres: `column "slug" of relation "Survey" does not exist` — not "tables missing"
  if (/\bcolumn\b/i.test(msg)) {
    return `The database schema is behind the app (missing column on Survey or related tables). ${SURVEY_MIGRATE_CMD}`;
  }
  return `Survey tables are missing. ${SURVEY_MIGRATE_CMD}`;
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

    const slug = await generateNewSurveySlug(month, year);
    const survey = await prisma.survey.create({
      data: {
        month,
        year,
        slug,
        createdById: adminRow?.id ?? null,
      },
    });

    return NextResponse.json({
      id: survey.id,
      slug: survey.slug,
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
