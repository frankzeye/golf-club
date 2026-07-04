import type { Prisma } from "@prisma/client";
import type { ScorecardHole } from "@/lib/course-scorecard";

/**
 * Built-in stroke indexes for courses where OpenGolfAPI omits hole handicap data.
 * Admin edits in the database override these per hole.
 */
const BUILTIN_STROKE_INDEX_OVERRIDES: Record<string, Record<number, number>> = {
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
  // Glen Ivy Golf Club — Corona, CA (men's handicap row)
  "f7ad0b9a-ef0d-493e-a336-5ad10047a871": {
    1: 13,
    2: 9,
    3: 7,
    4: 5,
    5: 17,
    6: 3,
    7: 1,
    8: 15,
    9: 11,
    10: 16,
    11: 18,
    12: 12,
    13: 10,
    14: 2,
    15: 8,
    16: 14,
    17: 6,
    18: 4,
  },
};

export function parseStrokeIndexesJson(raw: unknown): Record<number, number> | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;

  const result: Record<number, number> = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    const hole = Number(key);
    const strokeIndex = Number(value);
    if (
      !Number.isInteger(hole) ||
      hole < 1 ||
      !Number.isInteger(strokeIndex) ||
      strokeIndex < 1 ||
      strokeIndex > 54
    ) {
      continue;
    }
    result[hole] = strokeIndex;
  }

  return Object.keys(result).length > 0 ? result : null;
}

export function strokeIndexesToJson(overrides: Record<number, number>): Record<string, number> {
  const result: Record<string, number> = {};
  for (const [hole, strokeIndex] of Object.entries(overrides)) {
    result[String(hole)] = strokeIndex;
  }
  return result;
}

export function resolveStrokeIndexOverrides(
  courseId: string | null | undefined,
  dbStrokeIndexes?: unknown
): Record<number, number> | null {
  const builtin = courseId ? BUILTIN_STROKE_INDEX_OVERRIDES[courseId] : undefined;
  const fromDb = parseStrokeIndexesJson(dbStrokeIndexes);

  if (!builtin && !fromDb) return null;
  return { ...builtin, ...fromDb };
}

/** @deprecated Use resolveStrokeIndexOverrides */
export function strokeIndexOverridesForCourse(
  courseId: string | null | undefined
): Record<number, number> | null {
  return resolveStrokeIndexOverrides(courseId);
}

export function applyStrokeIndexOverrides(
  scorecard: ScorecardHole[],
  courseId: string | null | undefined,
  dbStrokeIndexes?: unknown
): ScorecardHole[] {
  const overrides = resolveStrokeIndexOverrides(courseId, dbStrokeIndexes);
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
  courseId: string | null | undefined,
  dbStrokeIndexes?: unknown
): Prisma.JsonValue {
  const overrides = resolveStrokeIndexOverrides(courseId, dbStrokeIndexes);
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

export function validateStrokeIndexesPayload(
  raw: unknown,
  holeCount = 18
): { ok: true; value: Record<number, number> } | { ok: false; error: string } {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { ok: false, error: "strokeIndexes must be an object keyed by hole number" };
  }

  const parsed = parseStrokeIndexesJson(raw);
  if (!parsed) {
    return { ok: false, error: "Enter at least one valid hole handicap (1–54)" };
  }

  for (const [hole, strokeIndex] of Object.entries(parsed)) {
    const holeNum = Number(hole);
    if (holeNum < 1 || holeNum > holeCount) {
      return { ok: false, error: `Hole ${holeNum} is out of range for this course` };
    }
    if (strokeIndex < 1 || strokeIndex > holeCount) {
      return {
        ok: false,
        error: `Stroke index for hole ${holeNum} must be between 1 and ${holeCount}`,
      };
    }
  }

  const values = Object.values(parsed);
  const unique = new Set(values);
  if (unique.size !== values.length) {
    return { ok: false, error: "Each stroke index must be unique across holes" };
  }

  return { ok: true, value: parsed };
}
