"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AvatarWithSash } from "@/components/AvatarWithSash";
import { FLIGHTS_SCORING_FORMAT } from "@/lib/tournament-scoring-formats";

interface RegisteredPlayer {
  id: string;
  fullName: string;
  imageUrl: string | null;
  handicapIndex: number | null;
}

export interface TournamentFlightData {
  id: string;
  name: string;
  sortOrder: number;
  minHandicap: number | null;
  maxHandicap: number | null;
  memberUserIds: string[];
  members: Array<{
    id: string;
    fullName: string;
    imageUrl: string | null;
    handicapIndex: number | null;
  }>;
}

interface FlightDraft {
  clientId: string;
  name: string;
  minHandicap: string;
  maxHandicap: string;
  userIds: string[];
}

interface TournamentFlightsManagerProps {
  tournamentId: string;
  scoringFormat: string;
  registeredUsers: RegisteredPlayer[];
  initialFlights: TournamentFlightData[];
  onFlightsChange?: (flights: TournamentFlightData[]) => void;
}

function toDraft(flight: TournamentFlightData, index: number): FlightDraft {
  return {
    clientId: flight.id,
    name: flight.name,
    minHandicap: flight.minHandicap != null ? String(flight.minHandicap) : "",
    maxHandicap: flight.maxHandicap != null ? String(flight.maxHandicap) : "",
    userIds: [...flight.memberUserIds],
  };
}

function newDraft(index: number): FlightDraft {
  return {
    clientId: `new-${Date.now()}-${index}`,
    name: `Flight ${index + 1}`,
    minHandicap: "",
    maxHandicap: "",
    userIds: [],
  };
}

export function TournamentFlightsManager({
  tournamentId,
  scoringFormat,
  registeredUsers,
  initialFlights,
  onFlightsChange,
}: TournamentFlightsManagerProps) {
  const [drafts, setDrafts] = useState<FlightDraft[]>(() =>
    initialFlights.length > 0
      ? initialFlights.map(toDraft)
      : [newDraft(0)]
  );
  const [saving, setSaving] = useState(false);
  const [autoAssigning, setAutoAssigning] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    setDrafts(
      initialFlights.length > 0
        ? initialFlights.map(toDraft)
        : [newDraft(0)]
    );
  }, [initialFlights]);

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
      minHandicap: draft.minHandicap.trim() === "" ? null : Number(draft.minHandicap),
      maxHandicap: draft.maxHandicap.trim() === "" ? null : Number(draft.maxHandicap),
      userIds: draft.userIds,
    }));
  }, [drafts]);

  async function saveFlights() {
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const res = await fetch(`/api/tournaments/${tournamentId}/flights`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ flights: buildPayload() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to save flights");
        return;
      }
      setDrafts(data.flights.map(toDraft));
      onFlightsChange?.(data.flights);
      setSuccess("Flights saved.");
    } catch {
      setError("Failed to save flights");
    } finally {
      setSaving(false);
    }
  }

  async function autoAssign() {
    const raw = window.prompt(
      `Split ${registeredUsers.length} registered players into how many flights?`,
      String(Math.min(3, registeredUsers.length || 1))
    );
    if (raw == null) return;
    const flightCount = Number(raw);
    if (!Number.isInteger(flightCount) || flightCount < 1) {
      setError("Enter a valid number of flights.");
      return;
    }

    setAutoAssigning(true);
    setError("");
    setSuccess("");
    try {
      const res = await fetch(`/api/tournaments/${tournamentId}/flights/auto-assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ flightCount }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to auto-assign flights");
        return;
      }
      setDrafts(data.flights.map(toDraft));
      onFlightsChange?.(data.flights);
      setSuccess("Flights assigned by handicap.");
    } catch {
      setError("Failed to auto-assign flights");
    } finally {
      setAutoAssigning(false);
    }
  }

  function togglePlayer(flightClientId: string, userId: string) {
    setDrafts((prev) =>
      prev.map((draft) => {
        if (draft.clientId !== flightClientId) {
          return { ...draft, userIds: draft.userIds.filter((id) => id !== userId) };
        }
        const has = draft.userIds.includes(userId);
        return {
          ...draft,
          userIds: has
            ? draft.userIds.filter((id) => id !== userId)
            : [...draft.userIds, userId],
        };
      })
    );
  }

  if (scoringFormat !== FLIGHTS_SCORING_FORMAT) {
    return null;
  }

  if (registeredUsers.length === 0) {
    return (
      <div className="mt-8 border-t border-stone-200 pt-6">
        <h2 className="text-sm font-semibold text-stone-900">Flights</h2>
        <p className="mt-2 text-sm text-stone-500">
          Register players before creating flights.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-8 border-t border-stone-200 pt-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-sm font-semibold text-stone-900">Flights</h2>
          <p className="mt-1 text-sm text-stone-500">
            Group players into flights so each flight has its own winner. Flights are
            usually organized by handicap.
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setDrafts((prev) => [...prev, newDraft(prev.length)])}
            className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50"
          >
            Add flight
          </button>
          <button
            type="button"
            onClick={autoAssign}
            disabled={autoAssigning || saving}
            className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50 disabled:opacity-50"
          >
            {autoAssigning ? "Assigning…" : "Auto-assign by handicap"}
          </button>
          <button
            type="button"
            onClick={saveFlights}
            disabled={saving || autoAssigning}
            className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save flights"}
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
          {unassignedUsers.length === 1 ? "player" : "players"} not assigned to a flight.
        </p>
      ) : null}

      <div className="mt-4 space-y-4">
        {drafts.map((draft, index) => (
          <div
            key={draft.clientId}
            className="rounded-xl border border-stone-200 bg-stone-50/60 p-4"
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="flex-1">
                <label className="block text-xs font-medium uppercase tracking-wide text-stone-500">
                  Flight name
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
              <div>
                <label className="block text-xs font-medium uppercase tracking-wide text-stone-500">
                  Min HCP
                </label>
                <input
                  type="number"
                  min={0}
                  max={54}
                  step={0.1}
                  value={draft.minHandicap}
                  onChange={(e) =>
                    setDrafts((prev) =>
                      prev.map((item) =>
                        item.clientId === draft.clientId
                          ? { ...item, minHandicap: e.target.value }
                          : item
                      )
                    )
                  }
                  placeholder="—"
                  className="mt-1 w-24 rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900"
                />
              </div>
              <div>
                <label className="block text-xs font-medium uppercase tracking-wide text-stone-500">
                  Max HCP
                </label>
                <input
                  type="number"
                  min={0}
                  max={54}
                  step={0.1}
                  value={draft.maxHandicap}
                  onChange={(e) =>
                    setDrafts((prev) =>
                      prev.map((item) =>
                        item.clientId === draft.clientId
                          ? { ...item, maxHandicap: e.target.value }
                          : item
                      )
                    )
                  }
                  placeholder="—"
                  className="mt-1 w-24 rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900"
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
                const inOtherFlight =
                  !selected &&
                  drafts.some(
                    (other) =>
                      other.clientId !== draft.clientId && other.userIds.includes(player.id)
                  );
                return (
                  <label
                    key={player.id}
                    className={`flex items-center gap-3 rounded-lg border px-3 py-2 ${
                      selected
                        ? "border-emerald-300 bg-emerald-50"
                        : inOtherFlight
                          ? "border-stone-200 bg-stone-100 opacity-50"
                          : "border-stone-200 bg-white"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selected}
                      disabled={inOtherFlight}
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
              {draft.userIds.length} player{draft.userIds.length === 1 ? "" : "s"} in this flight
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

interface FlightLeaderboardProps {
  flightLeaderboards: Array<{
    flightId: string;
    flightName: string;
    minHandicap: number | null;
    maxHandicap: number | null;
    leader: {
      userId: string;
      fullName: string;
      toPar: number | null;
      total: number;
    } | null;
    rows: Array<{
      rank: number;
      userId: string;
      fullName: string;
      imageUrl: string | null;
      handicapIndex: number | null;
      total: number;
      holesPlayed: number;
      toPar: number | null;
    }>;
  }>;
}

export function TournamentFlightLeaderboards({ flightLeaderboards }: FlightLeaderboardProps) {
  if (flightLeaderboards.length === 0) return null;

  function formatToPar(toPar: number | null) {
    if (toPar == null) return "—";
    if (toPar === 0) return "E";
    return toPar > 0 ? `+${toPar}` : String(toPar);
  }

  return (
    <div className="mt-8 border-t border-stone-200 pt-6">
      <h2 className="text-sm font-semibold text-stone-900">Flight Leaderboards</h2>
      <p className="mt-1 text-sm text-stone-500">
        Each flight has its own winner based on score relative to par.
      </p>
      <div className="mt-4 space-y-4">
        {flightLeaderboards.map((flight) => (
          <div
            key={flight.flightId}
            className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm"
          >
            <div className="border-b border-stone-200 bg-stone-50 px-4 py-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-semibold text-stone-900">{flight.flightName}</h3>
                {flight.minHandicap != null && flight.maxHandicap != null ? (
                  <span className="text-xs text-stone-500">
                    HCP {flight.minHandicap}–{flight.maxHandicap}
                  </span>
                ) : null}
              </div>
              {flight.leader ? (
                <p className="mt-1 text-xs text-emerald-700">
                  Leader: {flight.leader.fullName} ({formatToPar(flight.leader.toPar)})
                </p>
              ) : null}
            </div>
            <div className="divide-y divide-stone-100">
              {flight.rows.map((row) => (
                <div key={row.userId} className="flex items-center gap-3 px-4 py-3">
                  <span
                    className={`w-6 text-center text-sm font-bold ${
                      row.rank === 1 && row.toPar != null ? "text-emerald-700" : "text-stone-400"
                    }`}
                  >
                    {row.toPar != null ? row.rank : "—"}
                  </span>
                  <AvatarWithSash
                    imageUrl={row.imageUrl}
                    alt={row.fullName}
                    size="sm"
                    fallback={row.fullName[0]?.toUpperCase() ?? "?"}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-stone-900">{row.fullName}</p>
                    <p className="text-xs text-stone-500">
                      {row.handicapIndex != null ? `HCP ${row.handicapIndex}` : "No HCP"}
                      {row.holesPlayed > 0
                        ? ` · ${row.total} strokes · ${row.holesPlayed} holes`
                        : " · No scores yet"}
                    </p>
                  </div>
                  <span className="text-lg font-bold text-stone-900">
                    {formatToPar(row.toPar)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
