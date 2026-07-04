import type { Prisma } from "@prisma/client";
import type { ScorecardHole } from "@/lib/course-scorecard";

/**
 * Stroke indexes (1 = hardest) for courses where OpenGolfAPI omits hole handicap data.
 * Source: published course scorecards (e.g. BlueGolf men's handicap row).
 */
const STROKE_INDEX_OVERRIDES: Record<string, Record<number, number>> = {
  // The Golf Club At Rancho California — Murrieta, CA
  "9346b7eb-21f3-4f25-a203-d35564cc76f4": {
    1: 9,
    2: 13,
    3: 3,
    4: 7,
    5: 5,
    6: 17,
    7: 15,
    8: 1,
    9: 11,
    10: 12,
    11: 10,
    12: 2,
    13: 8,
    14: 6,
    15: 18,
    16: 14,
    17: 16,
    18: 4,
  },
};

export function strokeIndexOverridesForCourse(
  courseId: string | null | undefined
): Record<number, number> | null {
  if (!courseId) return null;
  return STROKE_INDEX_OVERRIDES[courseId] ?? null;
}

export function applyStrokeIndexOverrides(
  scorecard: ScorecardHole[],
  courseId: string | null | undefined
): ScorecardHole[] {
  const overrides = strokeIndexOverridesForCourse(courseId);
  if (!overrides) return scorecard;

  return scorecard.map((hole) => {
    if (hole.handicap != null) return hole;
    const strokeIndex = overrides[hole.hole];
    if (strokeIndex == null) return hole;
    return { ...hole, handicap: strokeIndex };
  });
}

/** Merge known stroke indexes into cached OpenGolfAPI course details. */
export function mergeStrokeIndexesIntoCourseDetails(
  details: Prisma.JsonValue,
  courseId: string | null | undefined
): Prisma.JsonValue {
  const overrides = strokeIndexOverridesForCourse(courseId);
  if (!overrides || !details || typeof details !== "object" || Array.isArray(details)) {
    return details;
  }

  const record = details as Record<string, unknown>;
  if (!Array.isArray(record.scorecard)) return details;

  const scorecard = record.scorecard.map((entry) => {
    if (!entry || typeof entry !== "object") return entry;
    const row = entry as Record<string, unknown>;
    const hole = Number(row.hole ?? row.number ?? row.holeNumber);
    if (!Number.isInteger(hole) || hole < 1) return entry;

    const existing = Number(
      row.handicap ?? row.strokeIndex ?? row.stroke_index ?? row.hcp ?? row.index
    );
    if (Number.isInteger(existing) && existing >= 1) return entry;

    const strokeIndex = overrides[hole];
    if (strokeIndex == null) return entry;

    return { ...row, handicap: strokeIndex };
  });

  return { ...record, scorecard } as Prisma.JsonValue;
}
