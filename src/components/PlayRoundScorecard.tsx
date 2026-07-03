"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AvatarWithSash } from "@/components/AvatarWithSash";
import { formatScoreToPar } from "@/lib/course-scorecard";

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
  scores: Record<string, number>;
  total: number;
  holesPlayed: number;
}

interface PlayRoundScorecardProps {
  roundId: string;
  holes: PlayRoundScorecardHole[];
  players: PlayRoundScorecardPlayer[];
  status: string;
  onRoundUpdate: (round: unknown) => void;
}

export function PlayRoundScorecard({
  roundId,
  holes,
  players,
  status,
  onRoundUpdate,
}: PlayRoundScorecardProps) {
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [error, setError] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

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

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const frontNine = holes.filter((h) => h.hole <= 9);
  const backNine = holes.filter((h) => h.hole > 9);
  const sections = [
    { label: "Front 9", holes: frontNine.length > 0 ? frontNine : holes },
    { label: "Back 9", holes: backNine },
  ].filter((section) => section.holes.length > 0);

  const parTotal = (sectionHoles: PlayRoundScorecardHole[]) =>
    sectionHoles.reduce((sum, h) => sum + h.par, 0);

  const playerSectionTotal = (
    player: PlayRoundScorecardPlayer,
    sectionHoles: PlayRoundScorecardHole[]
  ) =>
    sectionHoles.reduce((sum, hole) => sum + (player.scores[String(hole.hole)] ?? 0), 0);

  const readOnly = status === "completed";

  return (
    <div className="space-y-8">
      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      ) : null}

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
                          {readOnly ? (
                            <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-stone-50 text-stone-900">
                              {value ?? "—"}
                            </span>
                          ) : (
                            <input
                              type="number"
                              min={1}
                              max={20}
                              inputMode="numeric"
                              value={value ?? ""}
                              placeholder="—"
                              onChange={(e) => {
                                const next = e.target.value;
                                if (debounceRef.current) clearTimeout(debounceRef.current);
                                debounceRef.current = setTimeout(() => {
                                  void saveScore(player.id, hole.hole, next);
                                }, 350);
                              }}
                              className={`h-9 w-9 rounded-lg border text-center text-stone-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 ${
                                isSaving
                                  ? "border-emerald-300 bg-emerald-50"
                                  : "border-stone-200 bg-white"
                              }`}
                              aria-label={`${player.fullName} hole ${hole.hole}`}
                            />
                          )}
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
              {player.holesPlayed} of {holes.length} holes scored
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
