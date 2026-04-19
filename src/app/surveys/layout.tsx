import type { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    template: "%s | Spencer's Crossing Golf Club",
    default: "Surveys | Spencer's Crossing Golf Club",
  },
};

export default function SurveysLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
