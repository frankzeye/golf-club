"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AvatarWithSash } from "@/components/AvatarWithSash";
import {
  buildLeaderboard,
  formatRelativeToPar,
  formatScoreToPar,
  maxStrokesForPar,
} from "@/lib/course-scorecard";

export interface PlayRoundScorecardHole {
  hole: number;
  par: number;
  handicap?: number;
}

export interface PlayRoundScorecardPlayer {
  id: string;
  userId: string;
  fullName: string;
  imageUrl: string | null;
  handicapIndex: number | null;
  scores: Record<string, number>;
  total: number;
  holesPlayed: number;
}

export interface PlayRoundFlightLeaderboard {
  flightId: string;
  flightName: string;
  minHandicap: number | null;
  maxHandicap: number | null;
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
}

interface PlayRoundScorecardProps {
  roundId: string;
  holes: PlayRoundScorecardHole[];
  players: PlayRoundScorecardPlayer[];
  status: string;
  flightLeaderboards?: PlayRoundFlightLeaderboard[];
  scorablePlayerIds?: string[];
  onRoundUpdate: (round: unknown) => void;
}

type ScorecardSection = {
  label: string;
  holes: PlayRoundScorecardHole[];
};

function buildSections(holes: PlayRoundScorecardHole[]): ScorecardSection[] {
  const frontNine = holes.filter((h) => h.hole <= 9);
  const backNine = holes.filter((h) => h.hole > 9);
  return [
    { label: "Front 9", holes: frontNine.length > 0 ? frontNine : holes },
    { label: "Back 9", holes: backNine },
  ].filter((section) => section.holes.length > 0);
}

function parTotal(sectionHoles: PlayRoundScorecardHole[]) {
  return sectionHoles.reduce((sum, h) => sum + h.par, 0);
}

function filterEntryPlayers(
  players: PlayRoundScorecardPlayer[],
  scorablePlayerIds?: string[]
): PlayRoundScorecardPlayer[] {
  if (scorablePlayerIds == null) return players;
  const ids = new Set(scorablePlayerIds);
  return players.filter((player) => ids.has(player.id));
}

function playerSectionTotal(
  player: PlayRoundScorecardPlayer,
  sectionHoles: PlayRoundScorecardHole[]
) {
  return sectionHoles.reduce((sum, hole) => sum + (player.scores[String(hole.hole)] ?? 0), 0);
}

function PlayerTotals({
  players,
  holeCount,
}: {
  players: PlayRoundScorecardPlayer[];
  holeCount: number;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {players.map((player) => (
        <div
          key={player.id}
          className="rounded-xl border border-stone-200 bg-white px-4 py-3 shadow-sm"
        >
          <p className="text-sm font-medium text-stone-900">{player.fullName}</p>
          <p className="mt-1 text-2xl font-semibold text-stone-900">
            {player.total > 0 ? player.total : "—"}
          </p>
          <p className="text-xs text-stone-500">
            {player.holesPlayed} of {holeCount} holes scored
          </p>
        </div>
      ))}
    </div>
  );
}

function ScorecardGrid({
  sections,
  players,
}: {
  sections: ScorecardSection[];
  players: PlayRoundScorecardPlayer[];
}) {
  return (
    <div className="space-y-8">
      {sections.map((section) => (
        <div
          key={section.label}
          className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm"
        >
          <div className="border-b border-stone-200 bg-stone-50 px-4 py-3">
            <h3 className="text-sm font-semibold text-stone-900">{section.label}</h3>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-stone-200 bg-white">
                  <th className="sticky left-0 z-10 bg-white px-3 py-3 text-left font-medium text-stone-500">
                    Hole
                  </th>
                  {section.holes.map((hole) => (
                    <th
                      key={hole.hole}
                      className="min-w-[3rem] px-2 py-3 text-center font-medium text-stone-700"
                    >
                      {hole.hole}
                    </th>
                  ))}
                  <th className="px-3 py-3 text-center font-medium text-stone-700">Out</th>
                </tr>
                <tr className="border-b border-stone-100 bg-stone-50/80">
                  <th className="sticky left-0 z-10 bg-stone-50/80 px-3 py-2 text-left text-xs font-medium uppercase tracking-wide text-stone-500">
                    Par
                  </th>
                  {section.holes.map((hole) => (
                    <th key={hole.hole} className="px-2 py-2 text-center text-stone-600">
                      {hole.par}
                    </th>
                  ))}
                  <th className="px-3 py-2 text-center font-medium text-stone-700">
                    {parTotal(section.holes)}
                  </th>
                </tr>
              </thead>
              <tbody>
                {players.map((player) => (
                  <tr key={player.id} className="border-b border-stone-100 last:border-0">
                    <td className="sticky left-0 z-10 bg-white px-3 py-3">
                      <div className="flex min-w-[9rem] items-center gap-2">
                        <AvatarWithSash
                          imageUrl={player.imageUrl}
                          alt={player.fullName}
                          size="sm"
                          fallback={player.fullName[0]?.toUpperCase() ?? "?"}
                        />
                        <span className="font-medium text-stone-900">{player.fullName}</span>
                      </div>
                    </td>
                    {section.holes.map((hole) => {
                      const value = player.scores[String(hole.hole)];
                      return (
                        <td key={hole.hole} className="px-1 py-2 text-center">
                          <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-stone-50 text-stone-900">
                            {value ?? "—"}
                          </span>
                          {value ? (
                            <p className="mt-0.5 text-[10px] text-stone-400">
                              {formatScoreToPar(value, hole.par)}
                            </p>
                          ) : null}
                        </td>
                      );
                    })}
                    <td className="px-3 py-3 text-center font-semibold text-stone-900">
                      {playerSectionTotal(player, section.holes) || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}

function ScoreEntryGrid({
  sections,
  players,
  savingKey,
  saveScore,
}: {
  sections: ScorecardSection[];
  players: PlayRoundScorecardPlayer[];
  savingKey: string | null;
  saveScore: (playerId: string, hole: number, strokes: string) => void;
}) {
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  if (players.length === 0) {
    return (
      <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        No players in your foursome to score. Ask an admin to assign foursomes.
      </p>
    );
  }

  return (
    <div className="space-y-8">
      {sections.map((section) => (
        <div
          key={section.label}
          className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm"
        >
          <div className="border-b border-stone-200 bg-stone-50 px-4 py-3">
            <h3 className="text-sm font-semibold text-stone-900">{section.label}</h3>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-stone-200 bg-white">
                  <th className="sticky left-0 z-10 bg-white px-3 py-3 text-left font-medium text-stone-500">
                    Hole
                  </th>
                  {section.holes.map((hole) => (
                    <th
                      key={hole.hole}
                      className="min-w-[3rem] px-2 py-3 text-center font-medium text-stone-700"
                    >
                      {hole.hole}
                    </th>
                  ))}
                  <th className="px-3 py-3 text-center font-medium text-stone-700">Out</th>
                </tr>
                <tr className="border-b border-stone-100 bg-stone-50/80">
                  <th className="sticky left-0 z-10 bg-stone-50/80 px-3 py-2 text-left text-xs font-medium uppercase tracking-wide text-stone-500">
                    Par
                  </th>
                  {section.holes.map((hole) => (
                    <th key={hole.hole} className="px-2 py-2 text-center text-stone-600">
                      {hole.par}
                    </th>
                  ))}
                  <th className="px-3 py-2 text-center font-medium text-stone-700">
                    {parTotal(section.holes)}
                  </th>
                </tr>
              </thead>
              <tbody>
                {players.map((player) => (
                  <tr key={player.id} className="border-b border-stone-100 last:border-0">
                    <td className="sticky left-0 z-10 bg-white px-3 py-3">
                      <div className="flex min-w-[9rem] items-center gap-2">
                        <AvatarWithSash
                          imageUrl={player.imageUrl}
                          alt={player.fullName}
                          size="sm"
                          fallback={player.fullName[0]?.toUpperCase() ?? "?"}
                        />
                        <span className="font-medium text-stone-900">{player.fullName}</span>
                      </div>
                    </td>
                    {section.holes.map((hole) => {
                      const holeKey = String(hole.hole);
                      const value = player.scores[holeKey];
                      const cellKey = `${player.id}-${hole.hole}`;
                      const isSaving = savingKey === cellKey;

                      return (
                        <td key={hole.hole} className="px-1 py-2 text-center">
                          <input
                            type="number"
                            min={1}
                            max={maxStrokesForPar(hole.par)}
                            inputMode="numeric"
                            value={value ?? ""}
                            placeholder="—"
                            onChange={(e) => {
                              const next = e.target.value;
                              if (debounceRef.current) clearTimeout(debounceRef.current);
                              debounceRef.current = setTimeout(() => {
                                saveScore(player.id, hole.hole, next);
                              }, 350);
                            }}
                            className={`h-9 w-9 rounded-lg border text-center text-stone-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 ${
                              isSaving
                                ? "border-emerald-300 bg-emerald-50"
                                : "border-stone-200 bg-white"
                            }`}
                            aria-label={`${player.fullName} hole ${hole.hole}`}
                          />
                          {value ? (
                            <p className="mt-0.5 text-[10px] text-stone-400">
                              {formatScoreToPar(value, hole.par)}
                            </p>
                          ) : null}
                        </td>
                      );
                    })}
                    <td className="px-3 py-3 text-center font-semibold text-stone-900">
                      {playerSectionTotal(player, section.holes) || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}

type PlayRoundMode = "enter" | "scorecard" | "leaderboard";

function ModeTabs({
  mode,
  onChange,
  tabs,
}: {
  mode: PlayRoundMode;
  onChange: (mode: PlayRoundMode) => void;
  tabs: { id: PlayRoundMode; label: string }[];
}) {
  return (
    <div className="flex rounded-xl border border-stone-200 bg-stone-100 p-1">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          className={`flex-1 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
            mode === tab.id
              ? "bg-white text-stone-900 shadow-sm"
              : "text-stone-600 hover:text-stone-900"
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

function Leaderboard({
  players,
  holes,
}: {
  players: PlayRoundScorecardPlayer[];
  holes: PlayRoundScorecardHole[];
}) {
  const rows = useMemo(() => buildLeaderboard(players, holes), [players, holes]);

  return (
    <div className="space-y-3">
      {rows.map((row) => {
        const isLeader = row.rank === 1 && row.toPar != null;
        return (
          <LeaderboardRow
            key={row.player.id}
            rank={row.toPar != null ? row.rank : null}
            fullName={row.player.fullName}
            imageUrl={row.player.imageUrl}
            handicapIndex={row.player.handicapIndex}
            total={row.total}
            holesPlayed={row.holesPlayed}
            holeCount={holes.length}
            toPar={row.toPar}
            isLeader={isLeader}
          />
        );
      })}
    </div>
  );
}

function LeaderboardRow({
  rank,
  fullName,
  imageUrl,
  handicapIndex,
  total,
  holesPlayed,
  holeCount,
  toPar,
  isLeader,
}: {
  rank: number | null;
  fullName: string;
  imageUrl: string | null;
  handicapIndex: number | null;
  total: number;
  holesPlayed: number;
  holeCount: number;
  toPar: number | null;
  isLeader: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-4 rounded-xl border px-4 py-3 shadow-sm ${
        isLeader ? "border-emerald-200 bg-emerald-50" : "border-stone-200 bg-white"
      }`}
    >
      <span
        className={`w-6 text-center text-lg font-bold ${
          isLeader ? "text-emerald-700" : "text-stone-400"
        }`}
      >
        {rank ?? "—"}
      </span>
      <AvatarWithSash
        imageUrl={imageUrl}
        alt={fullName}
        size="sm"
        fallback={fullName[0]?.toUpperCase() ?? "?"}
      />
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-stone-900">{fullName}</p>
        <p className="text-xs text-stone-500">
          {handicapIndex != null ? `HCP ${handicapIndex}` : "No HCP"}
          {holesPlayed > 0
            ? ` · ${total} strokes · ${holesPlayed}/${holeCount} holes`
            : " · No scores yet"}
        </p>
      </div>
      <span
        className={`min-w-[2.5rem] text-right text-2xl font-bold ${
          isLeader ? "text-emerald-700" : "text-stone-900"
        }`}
      >
        {toPar != null ? formatRelativeToPar(toPar) : "—"}
      </span>
    </div>
  );
}

function FlightLeaderboards({
  flightLeaderboards,
  holes,
}: {
  flightLeaderboards: PlayRoundFlightLeaderboard[];
  holes: PlayRoundScorecardHole[];
}) {
  return (
    <div className="space-y-6">
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
          </div>
          <div className="space-y-3 p-3">
            {flight.rows.map((row) => (
              <LeaderboardRow
                key={row.userId}
                rank={row.toPar != null ? row.rank : null}
                fullName={row.fullName}
                imageUrl={row.imageUrl}
                handicapIndex={row.handicapIndex}
                total={row.total}
                holesPlayed={row.holesPlayed}
                holeCount={holes.length}
                toPar={row.toPar}
                isLeader={row.rank === 1 && row.toPar != null}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export function PlayRoundScorecard({
  roundId,
  holes,
  players,
  status,
  flightLeaderboards = [],
  scorablePlayerIds,
  onRoundUpdate,
}: PlayRoundScorecardProps) {
  const readOnly = status === "completed";
  const [mode, setMode] = useState<PlayRoundMode>(readOnly ? "scorecard" : "enter");
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [error, setError] = useState("");
  const useFlightLeaderboards = flightLeaderboards.length > 0;

  const leaderboard = useFlightLeaderboards ? (
    <FlightLeaderboards flightLeaderboards={flightLeaderboards} holes={holes} />
  ) : (
    <Leaderboard players={players} holes={holes} />
  );

  const saveScore = useCallback(
    async (playerId: string, hole: number, strokes: string) => {
      const key = `${playerId}-${hole}`;
      setSavingKey(key);
      setError("");
      try {
        const res = await fetch(`/api/play-rounds/${roundId}/scores`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            playerId,
            hole,
            strokes: strokes.trim() === "" ? null : Number(strokes),
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error ?? "Failed to save score");
          return;
        }
        onRoundUpdate(data);
      } catch {
        setError("Failed to save score");
      } finally {
        setSavingKey(null);
      }
    },
    [roundId, onRoundUpdate]
  );

  const sections = buildSections(holes);
  const entryPlayers = useMemo(
    () => filterEntryPlayers(players, scorablePlayerIds),
    [players, scorablePlayerIds]
  );

  if (readOnly) {
    return (
      <div className="space-y-6">
        <ModeTabs
          mode={mode}
          onChange={setMode}
          tabs={[
            { id: "scorecard", label: "Scorecard" },
            { id: "leaderboard", label: "Leaderboard" },
          ]}
        />
        {mode === "leaderboard" ? (
          leaderboard
        ) : (
          <ScorecardGrid sections={sections} players={players} />
        )}
        <PlayerTotals players={players} holeCount={holes.length} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ModeTabs
        mode={mode}
        onChange={setMode}
        tabs={[
          { id: "enter", label: "Enter Scores" },
          { id: "scorecard", label: "Scorecard" },
          { id: "leaderboard", label: "Leaderboard" },
        ]}
      />

      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      {mode === "enter" ? (
        <ScoreEntryGrid
          sections={sections}
          players={entryPlayers}
          savingKey={savingKey}
          saveScore={(playerId, hole, strokes) => void saveScore(playerId, hole, strokes)}
        />
      ) : mode === "scorecard" ? (
        <ScorecardGrid sections={sections} players={players} />
      ) : (
        leaderboard
      )}

      <PlayerTotals players={players} holeCount={holes.length} />
    </div>
  );
}
