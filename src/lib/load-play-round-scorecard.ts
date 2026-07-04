import { parseCourseScorecard, type ScorecardHole } from "@/lib/course-scorecard";
import { fetchAndCacheCourseDetails } from "@/lib/golf-course";
import { prisma } from "@/lib/db";

export async function loadPlayRoundScorecard(
  courseId: string | null,
  holeCount: number,
  coursePar?: number | null
): Promise<ScorecardHole[]> {
  if (!courseId) {
    return parseCourseScorecard(null, { holeCount, totalPar: coursePar });
  }

  try {
    const details = await fetchAndCacheCourseDetails(courseId);
    return parseCourseScorecard(details, { holeCount, totalPar: coursePar });
  } catch {
    const course = await prisma.golfCourse.findUnique({
      where: { id: courseId },
      select: { par: true, detailsJson: true },
    });
    return parseCourseScorecard(course?.detailsJson ?? null, {
      holeCount,
      totalPar: course?.par ?? coursePar,
    });
  }
}
