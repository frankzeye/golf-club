import { parseCourseScorecard, type ScorecardHole } from "@/lib/course-scorecard";
import { applyStrokeIndexOverrides } from "@/lib/course-stroke-indexes";
import { fetchAndCacheCourseDetails } from "@/lib/golf-course";
import { prisma } from "@/lib/db";

function finalizeScorecard(
  scorecard: ScorecardHole[],
  courseId: string | null
): ScorecardHole[] {
  return applyStrokeIndexOverrides(scorecard, courseId);
}

export async function loadPlayRoundScorecard(
  courseId: string | null,
  holeCount: number,
  coursePar?: number | null
): Promise<ScorecardHole[]> {
  if (!courseId) {
    return finalizeScorecard(
      parseCourseScorecard(null, { holeCount, totalPar: coursePar }),
      null
    );
  }

  try {
    const details = await fetchAndCacheCourseDetails(courseId);
    return finalizeScorecard(
      parseCourseScorecard(details, { holeCount, totalPar: coursePar }),
      courseId
    );
  } catch {
    const course = await prisma.golfCourse.findUnique({
      where: { id: courseId },
      select: { par: true, detailsJson: true },
    });
    return finalizeScorecard(
      parseCourseScorecard(course?.detailsJson ?? null, {
        holeCount,
        totalPar: course?.par ?? coursePar,
      }),
      courseId
    );
  }
}
