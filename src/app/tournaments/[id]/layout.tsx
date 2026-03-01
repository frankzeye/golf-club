import { Metadata } from "next";
import { findTournamentByIdOrSlug } from "@/lib/tournament-resolve";

type Props = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const tournament = await findTournamentByIdOrSlug(id);

  return {
    title: tournament?.name ?? "Tournament",
  };
}

export default function TournamentDetailLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
