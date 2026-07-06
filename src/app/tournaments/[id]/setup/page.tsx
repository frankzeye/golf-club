"use client";

import { useSession } from "next-auth/react";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { Header } from "@/components/Header";
import type { TournamentFoursomeData } from "@/components/TournamentFoursomesManager";
import type { TournamentTeamData } from "@/components/TournamentTeamsManager";
import { TournamentSetupWizard } from "@/components/tournament-wizard/TournamentSetupWizard";

interface RegisteredUser {
  id: string;
  registrationId: string;
  fullName: string;
  imageUrl: string | null;
  handicapIndex: number | null;
}

interface TournamentSetupData {
  id: string;
  slug: string;
  individualOrTeam: string;
  teamSize: number | null;
  registeredUsers: RegisteredUser[];
  foursomes?: TournamentFoursomeData[];
  teams?: TournamentTeamData[];
}

export default function TournamentSetupPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;
  const isAdmin = session?.user?.role === "admin";

  const [tournament, setTournament] = useState<TournamentSetupData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const loadTournament = useCallback(() => {
    if (!id) return;
    fetch(`/api/tournaments/${id}`)
      .then((res) => {
        if (!res.ok) throw new Error("Not found");
        return res.json();
      })
      .then((data) => {
        setTournament({
          id: data.id,
          slug: data.slug ?? data.id,
          individualOrTeam: data.individualOrTeam ?? "individual",
          teamSize: data.teamSize ?? null,
          registeredUsers: (data.registeredUsers ?? []).map(
            (user: {
              id: string;
              registrationId: string;
              fullName: string;
              imageUrl: string | null;
              handicapIndex: number | null;
            }) => ({
              id: user.id,
              registrationId: user.registrationId,
              fullName: user.fullName,
              imageUrl: user.imageUrl,
              handicapIndex: user.handicapIndex,
            })
          ),
          foursomes: data.foursomes ?? [],
          teams: data.teams ?? [],
        });
        setError("");
      })
      .catch(() => setError("Tournament not found"))
      .finally(() => setIsLoading(false));
  }, [id]);

  useEffect(() => {
    if (status === "loading") return;
    if (!isAdmin) {
      router.replace(`/tournaments/${id}`);
      return;
    }
    loadTournament();
  }, [status, isAdmin, id, router, loadTournament]);

  if (status === "loading" || isLoading) {
    return (
      <div className="flex min-h-screen flex-col bg-stone-50">
        <Header />
        <main className="flex flex-1 items-center justify-center">
          <p className="text-stone-500">Loading…</p>
        </main>
      </div>
    );
  }

  if (!isAdmin || error || !tournament) {
    return (
      <div className="flex min-h-screen flex-col bg-stone-50">
        <Header />
        <main className="flex flex-1 items-center justify-center px-4">
          <p className="text-stone-600">{error || "Unable to load tournament setup."}</p>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-stone-50">
      <Header />
      <main className="flex-1 px-4 py-8">
        <TournamentSetupWizard
          tournamentId={tournament.slug}
          tournamentSlug={tournament.slug}
          individualOrTeam={tournament.individualOrTeam}
          teamSize={tournament.teamSize}
          registeredUsers={tournament.registeredUsers}
          initialFoursomes={tournament.foursomes ?? []}
          initialTeams={tournament.teams ?? []}
          onFoursomesChange={(foursomes) =>
            setTournament((prev) => (prev ? { ...prev, foursomes } : prev))
          }
          onTeamsChange={(teams) =>
            setTournament((prev) => (prev ? { ...prev, teams } : prev))
          }
          onHandicapsSaved={loadTournament}
        />
      </main>
    </div>
  );
}
