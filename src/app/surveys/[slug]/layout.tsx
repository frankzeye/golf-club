import type { Metadata } from "next";
import { formatAvailabilitySurveyTitle } from "@/lib/survey-title";
import { findSurveyByIdOrSlug } from "@/lib/survey-slug";

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const survey = await findSurveyByIdOrSlug(slug);

  const title = survey
    ? formatAvailabilitySurveyTitle(survey.month, survey.year)
    : "Survey";

  return { title };
}

export default function SurveyDetailLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
