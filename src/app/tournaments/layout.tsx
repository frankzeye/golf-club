import { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    template: "%s | Spencer's Crossing Golf Club",
    default: "Tournaments | Spencer's Crossing Golf Club",
  },
};

export default function TournamentsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
