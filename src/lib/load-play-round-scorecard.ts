import { parseCourseScorecard, type ScorecardHole } from "@/lib/course-scorecard";
import { applyStrokeIndexOverrides } from "@/lib/course-stroke-indexes";
import { fetchAndCacheCourseDetails } from "@/lib/golf-course";
import { prisma } from "@/lib/db";

function finalizeScorecard(
  scorecard: ScorecardHole[],
  courseId: string | null,
  dbStrokeIndexes: unknown
): ScorecardHole[] {
  return applyStrokeIndexOverrides(scorecard, courseId, dbStrokeIndexes);
}

async function loadCourseStrokeIndexes(courseId: string): Promise<unknown> {
  const course = await prisma.golfCourse.findUnique({
    where: { id: courseId },
    select: { strokeIndexesJson: true },
  });
  return course?.strokeIndexesJson ?? null;
}

export async function loadPlayRoundScorecard(
  courseId: string | null,
  holeCount: number,
  coursePar?: number | null
): Promise<ScorecardHole[]> {
  if (!courseId) {
    return finalizeScorecard(
      parseCourseScorecard(null, { holeCount, totalPar: coursePar }),
      null,
      null
    );
  }

  const dbStrokeIndexes = await loadCourseStrokeIndexes(courseId);

  try {
    const details = await fetchAndCacheCourseDetails(courseId);
    return finalizeScorecard(
      parseCourseScorecard(details, { holeCount, totalPar: coursePar }),
      courseId,
      dbStrokeIndexes
    );
  } catch {
    const course = await prisma.golfCourse.findUnique({
      where: { id: courseId },
      select: { par: true, detailsJson: true, strokeIndexesJson: true },
    });
    return finalizeScorecard(
      parseCourseScorecard(course?.detailsJson ?? null, {
        holeCount,
        totalPar: course?.par ?? coursePar,
      }),
      courseId,
      course?.strokeIndexesJson ?? dbStrokeIndexes
    );
  }
}
