import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Social Rounds",
};

export default function SocialRoundLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
