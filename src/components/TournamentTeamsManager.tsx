"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AvatarWithSash } from "@/components/AvatarWithSash";

interface RegisteredPlayer {
  id: string;
  fullName: string;
  imageUrl: string | null;
  handicapIndex: number | null;
}

export interface TournamentTeamData {
  id: string;
  name: string;
  sortOrder: number;
  memberUserIds: string[];
  members: Array<{
    id: string;
    fullName: string;
    imageUrl: string | null;
    handicapIndex: number | null;
  }>;
}

interface TeamDraft {
  clientId: string;
  name: string;
  userIds: string[];
}

interface TournamentTeamsManagerProps {
  tournamentId: string;
  teamSize: number;
  registeredUsers: RegisteredPlayer[];
  initialTeams: TournamentTeamData[];
  onTeamsChange?: (teams: TournamentTeamData[]) => void;
}

function toDraft(team: TournamentTeamData): TeamDraft {
  return {
    clientId: team.id,
    name: team.name,
    userIds: [...team.memberUserIds],
  };
}

function newDraft(index: number): TeamDraft {
  return {
    clientId: `new-${Date.now()}-${index}`,
    name: `Team ${index + 1}`,
    userIds: [],
  };
}

export function TournamentTeamsManager({
  tournamentId,
  teamSize,
  registeredUsers,
  initialTeams,
  onTeamsChange,
}: TournamentTeamsManagerProps) {
  const maxTeamSize = teamSize === 4 ? 4 : 2;
  const [drafts, setDrafts] = useState<TeamDraft[]>(() =>
    initialTeams.length > 0 ? initialTeams.map(toDraft) : [newDraft(0)]
  );
  const [saving, setSaving] = useState(false);
  const [autoAssigning, setAutoAssigning] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    setDrafts(initialTeams.length > 0 ? initialTeams.map(toDraft) : [newDraft(0)]);
  }, [initialTeams]);

  const assignedUserIds = useMemo(() => {
    const ids = new Set<string>();
    for (const draft of drafts) {
      for (const userId of draft.userIds) ids.add(userId);
    }
    return ids;
  }, [drafts]);

  const unassignedUsers = registeredUsers.filter((u) => !assignedUserIds.has(u.id));

  const buildPayload = useCallback(() => {
    return drafts.map((draft, index) => ({
      name: draft.name.trim(),
      sortOrder: index,
      userIds: draft.userIds,
    }));
  }, [drafts]);

  async function saveTeams() {
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const res = await fetch(`/api/tournaments/${tournamentId}/teams`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teams: buildPayload() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to save teams");
        return;
      }
      setDrafts(data.teams.map(toDraft));
      onTeamsChange?.(data.teams);
      setSuccess("Teams saved.");
    } catch {
      setError("Failed to save teams");
    } finally {
      setSaving(false);
    }
  }

  async function autoAssign() {
    setAutoAssigning(true);
    setError("");
    setSuccess("");
    try {
      const res = await fetch(`/api/tournaments/${tournamentId}/teams/auto-assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to auto-assign teams");
        return;
      }
      setDrafts(data.teams.map(toDraft));
      onTeamsChange?.(data.teams);
      setSuccess(`Teams assigned in groups of ${maxTeamSize}.`);
    } catch {
      setError("Failed to auto-assign teams");
    } finally {
      setAutoAssigning(false);
    }
  }

  function togglePlayer(teamClientId: string, userId: string) {
    setDrafts((prev) =>
      prev.map((draft) => {
        if (draft.clientId !== teamClientId) {
          return { ...draft, userIds: draft.userIds.filter((id) => id !== userId) };
        }
        const has = draft.userIds.includes(userId);
        if (has) {
          return { ...draft, userIds: draft.userIds.filter((id) => id !== userId) };
        }
        if (draft.userIds.length >= maxTeamSize) return draft;
        return { ...draft, userIds: [...draft.userIds, userId] };
      })
    );
  }

  if (registeredUsers.length === 0) {
    return (
      <div className="mt-8 border-t border-stone-200 pt-6">
        <h2 className="text-sm font-semibold text-stone-900">Teams</h2>
        <p className="mt-2 text-sm text-stone-500">
          Register players before creating teams.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-8 border-t border-stone-200 pt-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-sm font-semibold text-stone-900">Teams</h2>
          <p className="mt-1 text-sm text-stone-500">
            Assign registered players to teams for team scoring and prizes. Teams are
            separate from foursomes — teammates can tee off in the same or different
            groups.
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setDrafts((prev) => [...prev, newDraft(prev.length)])}
            className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50"
          >
            Add team
          </button>
          <button
            type="button"
            onClick={autoAssign}
            disabled={autoAssigning || saving}
            className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50 disabled:opacity-50"
          >
            {autoAssigning ? "Assigning…" : `Auto-assign teams of ${maxTeamSize}`}
          </button>
          <button
            type="button"
            onClick={saveTeams}
            disabled={saving || autoAssigning}
            className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save teams"}
          </button>
        </div>
      </div>

      {error ? (
        <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      ) : null}
      {success ? (
        <p className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {success}
        </p>
      ) : null}

      {unassignedUsers.length > 0 ? (
        <p className="mt-3 text-sm text-amber-700">
          {unassignedUsers.length} registered{" "}
          {unassignedUsers.length === 1 ? "player" : "players"} not assigned to a team.
        </p>
      ) : null}

      <div className="mt-4 space-y-4">
        {drafts.map((draft) => (
          <div
            key={draft.clientId}
            className="rounded-xl border border-stone-200 bg-stone-50/60 p-4"
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="flex-1">
                <label className="block text-xs font-medium uppercase tracking-wide text-stone-500">
                  Team name
                </label>
                <input
                  type="text"
                  value={draft.name}
                  onChange={(e) =>
                    setDrafts((prev) =>
                      prev.map((item) =>
                        item.clientId === draft.clientId
                          ? { ...item, name: e.target.value }
                          : item
                      )
                    )
                  }
                  className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900"
                />
              </div>
              {drafts.length > 1 ? (
                <button
                  type="button"
                  onClick={() =>
                    setDrafts((prev) => prev.filter((item) => item.clientId !== draft.clientId))
                  }
                  className="rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50"
                >
                  Remove
                </button>
              ) : null}
            </div>

            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {registeredUsers.map((player) => {
                const selected = draft.userIds.includes(player.id);
                const inOtherTeam =
                  !selected &&
                  drafts.some(
                    (other) =>
                      other.clientId !== draft.clientId && other.userIds.includes(player.id)
                  );
                const teamFull = !selected && draft.userIds.length >= maxTeamSize;
                return (
                  <label
                    key={player.id}
                    className={`flex items-center gap-3 rounded-lg border px-3 py-2 ${
                      selected
                        ? "border-emerald-300 bg-emerald-50"
                        : inOtherTeam || teamFull
                          ? "border-stone-200 bg-stone-100 opacity-50"
                          : "border-stone-200 bg-white"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selected}
                      disabled={inOtherTeam || teamFull}
                      onChange={() => togglePlayer(draft.clientId, player.id)}
                      className="rounded border-stone-300 text-emerald-600 focus:ring-emerald-500"
                    />
                    <AvatarWithSash
                      imageUrl={player.imageUrl}
                      alt={player.fullName}
                      size="sm"
                      fallback={player.fullName[0]?.toUpperCase() ?? "?"}
                    />
                    <span className="min-w-0 flex-1 truncate text-sm font-medium text-stone-900">
                      {player.fullName}
                    </span>
                    <span className="text-xs text-stone-500">
                      {player.handicapIndex != null ? `HCP ${player.handicapIndex}` : "No HCP"}
                    </span>
                  </label>
                );
              })}
            </div>

            <p className="mt-3 text-xs text-stone-500">
              {draft.userIds.length} of {maxTeamSize} players on this team
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
