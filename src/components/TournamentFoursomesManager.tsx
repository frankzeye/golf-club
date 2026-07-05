"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AvatarWithSash } from "@/components/AvatarWithSash";
import {
  DEFAULT_FOURSOME_START_HOLE,
  MAX_FOURSOME_SIZE,
  MAX_FOURSOME_START_HOLE,
} from "@/lib/tournament-foursomes";

interface RegisteredPlayer {
  id: string;
  fullName: string;
  imageUrl: string | null;
  handicapIndex: number | null;
}

export interface TournamentFoursomeData {
  id: string;
  name: string;
  sortOrder: number;
  startTime: string | null;
  startHole: number;
  memberUserIds: string[];
  members: Array<{
    id: string;
    fullName: string;
    imageUrl: string | null;
    handicapIndex: number | null;
  }>;
}

interface FoursomeDraft {
  clientId: string;
  name: string;
  startTime: string;
  startHole: number;
  userIds: string[];
}

interface TournamentFoursomesManagerProps {
  tournamentId: string;
  registeredUsers: RegisteredPlayer[];
  initialFoursomes: TournamentFoursomeData[];
  onFoursomesChange?: (foursomes: TournamentFoursomeData[]) => void;
}

function toDraft(foursome: TournamentFoursomeData): FoursomeDraft {
  return {
    clientId: foursome.id,
    name: foursome.name,
    startTime: foursome.startTime ?? "",
    startHole: foursome.startHole ?? DEFAULT_FOURSOME_START_HOLE,
    userIds: [...foursome.memberUserIds],
  };
}

function newDraft(index: number): FoursomeDraft {
  return {
    clientId: `new-${Date.now()}-${index}`,
    name: `Group ${index + 1}`,
    startTime: "",
    startHole: DEFAULT_FOURSOME_START_HOLE,
    userIds: [],
  };
}

export function TournamentFoursomesManager({
  tournamentId,
  registeredUsers,
  initialFoursomes,
  onFoursomesChange,
}: TournamentFoursomesManagerProps) {
  const [drafts, setDrafts] = useState<FoursomeDraft[]>(() =>
    initialFoursomes.length > 0 ? initialFoursomes.map(toDraft) : [newDraft(0)]
  );
  const [saving, setSaving] = useState(false);
  const [autoAssigning, setAutoAssigning] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    setDrafts(
      initialFoursomes.length > 0 ? initialFoursomes.map(toDraft) : [newDraft(0)]
    );
  }, [initialFoursomes]);

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
      startTime: draft.startTime.trim() || null,
      startHole: draft.startHole,
      userIds: draft.userIds,
    }));
  }, [drafts]);

  async function saveFoursomes() {
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const res = await fetch(`/api/tournaments/${tournamentId}/foursomes`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ foursomes: buildPayload() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to save foursomes");
        return;
      }
      setDrafts(data.foursomes.map(toDraft));
      onFoursomesChange?.(data.foursomes);
      setSuccess("Foursomes saved.");
    } catch {
      setError("Failed to save foursomes");
    } finally {
      setSaving(false);
    }
  }

  async function autoAssign() {
    setAutoAssigning(true);
    setError("");
    setSuccess("");
    try {
      const res = await fetch(`/api/tournaments/${tournamentId}/foursomes/auto-assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to auto-assign foursomes");
        return;
      }
      setDrafts(data.foursomes.map(toDraft));
      onFoursomesChange?.(data.foursomes);
      setSuccess("Foursomes assigned in groups of four.");
    } catch {
      setError("Failed to auto-assign foursomes");
    } finally {
      setAutoAssigning(false);
    }
  }

  function togglePlayer(foursomeClientId: string, userId: string) {
    setDrafts((prev) =>
      prev.map((draft) => {
        if (draft.clientId !== foursomeClientId) {
          return { ...draft, userIds: draft.userIds.filter((id) => id !== userId) };
        }
        const has = draft.userIds.includes(userId);
        if (has) {
          return { ...draft, userIds: draft.userIds.filter((id) => id !== userId) };
        }
        if (draft.userIds.length >= MAX_FOURSOME_SIZE) return draft;
        return { ...draft, userIds: [...draft.userIds, userId] };
      })
    );
  }

  if (registeredUsers.length === 0) {
    return (
      <div className="mt-8 border-t border-stone-200 pt-6">
        <h2 className="text-sm font-semibold text-stone-900">Foursomes</h2>
        <p className="mt-2 text-sm text-stone-500">
          Register players before creating foursomes.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-8 border-t border-stone-200 pt-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-sm font-semibold text-stone-900">Foursomes</h2>
          <p className="mt-1 text-sm text-stone-500">
            Group players into foursomes of up to four. Set a tee time and starting hole for
            each group. When scoring starts, each player can enter scores for everyone in
            their foursome.
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setDrafts((prev) => [...prev, newDraft(prev.length)])}
            className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50"
          >
            Add foursome
          </button>
          <button
            type="button"
            onClick={autoAssign}
            disabled={autoAssigning || saving}
            className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50 disabled:opacity-50"
          >
            {autoAssigning ? "Assigning…" : "Auto-assign groups of 4"}
          </button>
          <button
            type="button"
            onClick={saveFoursomes}
            disabled={saving || autoAssigning}
            className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save foursomes"}
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
          {unassignedUsers.length === 1 ? "player" : "players"} not assigned to a foursome.
        </p>
      ) : null}

      <div className="mt-4 space-y-4">
        {drafts.map((draft) => (
          <div
            key={draft.clientId}
            className="rounded-xl border border-stone-200 bg-stone-50/60 p-4"
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
              <div className="min-w-[10rem] flex-1">
                <label className="block text-xs font-medium uppercase tracking-wide text-stone-500">
                  Group name
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
              <div className="w-full sm:w-40">
                <label className="block text-xs font-medium uppercase tracking-wide text-stone-500">
                  Tee time
                </label>
                <input
                  type="time"
                  value={draft.startTime}
                  onChange={(e) =>
                    setDrafts((prev) =>
                      prev.map((item) =>
                        item.clientId === draft.clientId
                          ? { ...item, startTime: e.target.value }
                          : item
                      )
                    )
                  }
                  className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900"
                />
              </div>
              <div className="w-full sm:w-32">
                <label className="block text-xs font-medium uppercase tracking-wide text-stone-500">
                  Start hole
                </label>
                <select
                  value={draft.startHole}
                  onChange={(e) =>
                    setDrafts((prev) =>
                      prev.map((item) =>
                        item.clientId === draft.clientId
                          ? { ...item, startHole: Number(e.target.value) }
                          : item
                      )
                    )
                  }
                  className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900"
                >
                  {Array.from({ length: MAX_FOURSOME_START_HOLE }, (_, index) => {
                    const hole = index + 1;
                    return (
                      <option key={hole} value={hole}>
                        Hole {hole}
                      </option>
                    );
                  })}
                </select>
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
                const inOtherFoursome =
                  !selected &&
                  drafts.some(
                    (other) =>
                      other.clientId !== draft.clientId && other.userIds.includes(player.id)
                  );
                const groupFull = !selected && draft.userIds.length >= MAX_FOURSOME_SIZE;
                return (
                  <label
                    key={player.id}
                    className={`flex items-center gap-3 rounded-lg border px-3 py-2 ${
                      selected
                        ? "border-emerald-300 bg-emerald-50"
                        : inOtherFoursome || groupFull
                          ? "border-stone-200 bg-stone-100 opacity-50"
                          : "border-stone-200 bg-white"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selected}
                      disabled={inOtherFoursome || groupFull}
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
              {draft.userIds.length} of {MAX_FOURSOME_SIZE} players in this foursome
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
