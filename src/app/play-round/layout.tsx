import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Play Round",
};

export default function PlayRoundLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
