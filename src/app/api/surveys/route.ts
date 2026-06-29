import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatAvailabilitySurveyTitle, surveyDisplayTitle } from "@/lib/survey-title";
import { ensureSurveySlug, generateNewSurveySlug } from "@/lib/survey-slug";
import {
  endsAtFromDuration,
  isSurveyClosed,
  parseDurationDaysHours,
} from "@/lib/survey-deadline";

/**
 * GET /api/surveys - List surveys (newest first)
 */
export async function GET() {
  try {
    const surveys = await prisma.survey.findMany({
      orderBy: { createdAt: "desc" },
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
        type: s.type,
        month: s.month,
        year: s.year,
        title: surveyDisplayTitle(s),
        optionCount: s._count.options,
        createdAt: s.createdAt.toISOString(),
        endsAt: s.endsAt?.toISOString() ?? null,
        isClosed: isSurveyClosed(s.endsAt),
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
 * POST /api/surveys - Create a survey (admin only)
 *
 * Availability: { type?: "availability", month, year }
 * Multiple choice: { type: "multiple_choice", title, options: Array<string | { label?, imageUrl? }>, allowMultiple?: boolean }
 */
export async function POST(request: NextRequest) {
  const { session, error } = await requireAdmin(request);
  if (error) {
    return NextResponse.json(error.json, { status: error.status });
  }

  let body: {
    type?: string;
    month?: number;
    year?: number;
    title?: string;
    options?: unknown;
    allowMultiple?: boolean;
    durationDays?: number;
    durationHours?: number;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const type = body.type === "multiple_choice" ? "multiple_choice" : "availability";

  let month: number | null = null;
  let year: number | null = null;
  let title: string | null = null;
  let allowMultiple = true;
  let parsedOptions: { label: string | null; imageUrl: string | null }[] = [];

  if (type === "availability") {
    month = Number(body.month);
    year = Number(body.year);
    if (!Number.isInteger(month) || month < 1 || month > 12) {
      return NextResponse.json({ error: "month must be 1–12" }, { status: 400 });
    }
    if (!Number.isInteger(year) || year < 2000 || year > 2100) {
      return NextResponse.json({ error: "Invalid year" }, { status: 400 });
    }
  } else {
    title = typeof body.title === "string" ? body.title.trim() : "";
    if (!title) {
      return NextResponse.json({ error: "Question is required" }, { status: 400 });
    }
    if (title.length > 200) {
      return NextResponse.json(
        { error: "Question must be 200 characters or fewer" },
        { status: 400 }
      );
    }
    const raw = Array.isArray(body.options) ? body.options : [];
    const seen = new Set<string>();
    for (const o of raw) {
      let label: string | null = null;
      let imageUrl: string | null = null;
      if (typeof o === "string") {
        label = o.trim().slice(0, 200) || null;
      } else if (o && typeof o === "object") {
        const rec = o as { label?: unknown; imageUrl?: unknown };
        label =
          typeof rec.label === "string" ? rec.label.trim().slice(0, 200) || null : null;
        imageUrl =
          typeof rec.imageUrl === "string" && /^https?:\/\//.test(rec.imageUrl)
            ? rec.imageUrl
            : null;
      }
      if (!label && !imageUrl) continue;
      if (label) {
        const key = label.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
      }
      parsedOptions.push({ label, imageUrl });
    }
    if (parsedOptions.length < 2) {
      return NextResponse.json(
        { error: "Add at least two answer options" },
        { status: 400 }
      );
    }
    allowMultiple = body.allowMultiple === true;
  }

  const duration = parseDurationDaysHours(
    body.durationDays ?? 7,
    body.durationHours ?? 0
  );
  if ("error" in duration) {
    return NextResponse.json({ error: duration.error }, { status: 400 });
  }
  const endsAt = endsAtFromDuration(duration.days, duration.hours);

  try {
    const adminId = session!.user.id;
    const adminRow = await prisma.user.findUnique({
      where: { id: adminId },
      select: { id: true },
    });

    const displayTitle =
      type === "availability"
        ? formatAvailabilitySurveyTitle(month!, year!)
        : title!;
    const slug = await generateNewSurveySlug(displayTitle);
    const survey = await prisma.survey.create({
      data: {
        type,
        month,
        year,
        title,
        allowMultiple,
        slug,
        endsAt,
        createdById: adminRow?.id ?? null,
        ...(parsedOptions.length > 0 && {
          options: {
            create: parsedOptions.map((o, idx) => ({
              label: o.label,
              imageUrl: o.imageUrl,
              sortOrder: idx,
            })),
          },
        }),
      },
    });

    return NextResponse.json({
      id: survey.id,
      slug: survey.slug,
      type: survey.type,
      month: survey.month,
      year: survey.year,
      title: surveyDisplayTitle(survey),
      endsAt: survey.endsAt?.toISOString() ?? null,
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
