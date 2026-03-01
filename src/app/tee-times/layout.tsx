import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Tee Times",
};

export default function TeeTimesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
