"use client";

import { AvatarWithSash } from "@/components/AvatarWithSash";

export interface PlayRoundHandicapPlayer {
  userId: string;
  fullName: string;
  imageUrl?: string | null;
}

interface PlayRoundHandicapFieldsProps {
  players: PlayRoundHandicapPlayer[];
  values: Record<string, string>;
  onChange: (userId: string, value: string) => void;
}

const inputClass =
  "w-24 rounded-lg border border-stone-300 px-3 py-2 text-center text-stone-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500";

export function PlayRoundHandicapFields({
  players,
  values,
  onChange,
}: PlayRoundHandicapFieldsProps) {
  if (players.length === 0) return null;

  return (
    <div className="space-y-3">
      {players.map((player) => (
        <div
          key={player.userId}
          className="flex items-center gap-3 rounded-xl border border-stone-200 bg-stone-50/50 px-4 py-3"
        >
          <AvatarWithSash
            imageUrl={player.imageUrl ?? null}
            alt={player.fullName}
            size="sm"
            fallback={player.fullName[0]?.toUpperCase() ?? "?"}
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-stone-900">{player.fullName}</p>
            <p className="text-xs text-stone-500">Handicap index</p>
          </div>
          <input
            type="number"
            min={0}
            max={54}
            step={0.1}
            inputMode="decimal"
            value={values[player.userId] ?? ""}
            onChange={(e) => onChange(player.userId, e.target.value)}
            placeholder="—"
            className={inputClass}
            aria-label={`${player.fullName} handicap index`}
          />
        </div>
      ))}
    </div>
  );
}

export function handicapValuesToPayload(
  values: Record<string, string>
): Record<string, number | null> {
  const payload: Record<string, number | null> = {};
  for (const [userId, raw] of Object.entries(values)) {
    const trimmed = raw.trim();
    if (trimmed === "") {
      payload[userId] = null;
      continue;
    }
    const n = Number(trimmed);
    if (Number.isFinite(n) && n >= 0 && n <= 54) {
      payload[userId] = n;
    }
  }
  return payload;
}
