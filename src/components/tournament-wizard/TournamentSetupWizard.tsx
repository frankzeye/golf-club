"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { TournamentFoursomesManager } from "@/components/TournamentFoursomesManager";
import { TournamentTeamsManager } from "@/components/TournamentTeamsManager";
import { TournamentHandicapsStep } from "@/components/tournament-wizard/TournamentHandicapsStep";
import { WizardShell } from "@/components/tournament-wizard/WizardShell";
import type { TournamentFoursomeData } from "@/components/TournamentFoursomesManager";
import type { TournamentTeamData } from "@/components/TournamentTeamsManager";

interface RegisteredUser {
  id: string;
  registrationId: string;
  fullName: string;
  imageUrl: string | null;
  handicapIndex: number | null;
}

interface TournamentSetupWizardProps {
  tournamentId: string;
  tournamentSlug: string;
  individualOrTeam: string;
  teamSize: number | null;
  registeredUsers: RegisteredUser[];
  initialFoursomes: TournamentFoursomeData[];
  initialTeams: TournamentTeamData[];
  onFoursomesChange?: (foursomes: TournamentFoursomeData[]) => void;
  onTeamsChange?: (teams: TournamentTeamData[]) => void;
  onHandicapsSaved?: () => void;
}

export function TournamentSetupWizard({
  tournamentId,
  tournamentSlug,
  individualOrTeam,
  teamSize,
  registeredUsers,
  initialFoursomes,
  initialTeams,
  onFoursomesChange,
  onTeamsChange,
  onHandicapsSaved,
}: TournamentSetupWizardProps) {
  const isTeam = individualOrTeam === "team";
  const steps = useMemo(
    () => (isTeam ? ["Foursomes", "Teams", "Handicaps"] : ["Foursomes", "Handicaps"]),
    [isTeam]
  );
  const [step, setStep] = useState(0);

  const registeredPlayers = registeredUsers.map((user) => ({
    id: user.id,
    fullName: user.fullName,
    imageUrl: user.imageUrl,
    handicapIndex: user.handicapIndex,
  }));

  function goNext() {
    if (step < steps.length - 1) {
      setStep((current) => current + 1);
      return;
    }
  }

  function goBack() {
    setStep((current) => Math.max(0, current - 1));
  }

  const stepKey = steps[step];
  const isLastStep = step === steps.length - 1;

  return (
    <WizardShell
      title="Setting Up the Tournament"
      subtitle="Assign groups, teams, and handicaps after players register."
      steps={steps}
      currentStep={step}
      onBack={step > 0 ? goBack : undefined}
      onNext={
        isLastStep
          ? undefined
          : goNext
      }
      nextLabel="Continue"
      cancelHref={`/tournaments/${tournamentSlug}`}
    >
      {registeredUsers.length === 0 ? (
        <div className="space-y-3">
          <p className="text-sm text-stone-600">
            No players have registered yet. You can return once registrations come in.
          </p>
          <Link
            href={`/tournaments/${tournamentSlug}`}
            className="inline-flex text-sm font-medium text-emerald-700 hover:text-emerald-800"
          >
            Back to tournament
          </Link>
        </div>
      ) : null}

      {registeredUsers.length > 0 && stepKey === "Foursomes" ? (
        <TournamentFoursomesManager
          tournamentId={tournamentId}
          registeredUsers={registeredPlayers}
          initialFoursomes={initialFoursomes}
          onFoursomesChange={onFoursomesChange}
        />
      ) : null}

      {registeredUsers.length > 0 && stepKey === "Teams" && isTeam ? (
        <TournamentTeamsManager
          tournamentId={tournamentId}
          teamSize={teamSize ?? 2}
          registeredUsers={registeredPlayers}
          initialTeams={initialTeams}
          onTeamsChange={onTeamsChange}
        />
      ) : null}

      {registeredUsers.length > 0 && stepKey === "Handicaps" ? (
        <TournamentHandicapsStep
          tournamentId={tournamentId}
          registeredUsers={registeredUsers}
          onSaved={onHandicapsSaved}
        />
      ) : null}

      {registeredUsers.length > 0 && isLastStep ? (
        <div className="mt-6 border-t border-stone-200 pt-4">
          <Link
            href={`/tournaments/${tournamentSlug}`}
            className="inline-flex rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-700"
          >
            Done — back to tournament
          </Link>
        </div>
      ) : null}
    </WizardShell>
  );
}
