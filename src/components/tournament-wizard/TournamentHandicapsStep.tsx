"use client";

import { useState } from "react";

import { AvatarWithSash } from "@/components/AvatarWithSash";

interface RegisteredUser {
  id: string;
  registrationId: string;
  fullName: string;
  imageUrl: string | null;
  handicapIndex: number | null;
}

interface TournamentHandicapsStepProps {
  tournamentId: string;
  registeredUsers: RegisteredUser[];
  onSaved?: () => void;
}

export function TournamentHandicapsStep({
  tournamentId,
  registeredUsers,
  onSaved,
}: TournamentHandicapsStepProps) {
  const [drafts, setDrafts] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      registeredUsers.map((user) => [
        user.registrationId,
        user.handicapIndex != null ? String(user.handicapIndex) : "",
      ])
    )
  );
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function saveHandicap(registrationId: string) {
    const raw = drafts[registrationId]?.trim() ?? "";
    const current = registeredUsers.find((user) => user.registrationId === registrationId);
    const currentRaw =
      current?.handicapIndex != null ? String(current.handicapIndex) : "";
    if (raw === currentRaw) return;

    setSavingId(registrationId);
    setError("");
    setSuccess("");
    try {
      const res = await fetch(
        `/api/tournaments/${tournamentId}/registrations/${registrationId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            handicapIndex: raw === "" ? null : Number(raw),
          }),
        }
      );
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to save handicap");
        return;
      }
      setSuccess("Handicaps updated.");
      onSaved?.();
    } catch {
      setError("Failed to save handicap");
    } finally {
      setSavingId(null);
    }
  }

  if (registeredUsers.length === 0) {
    return (
      <p className="text-sm text-stone-500">
        Register players before setting tournament handicaps.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-stone-500">
        Confirm or override each player&apos;s handicap for this tournament. Changes save when you
        leave the field.
      </p>
      {error ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      ) : null}
      {success ? (
        <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{success}</p>
      ) : null}
      <div className="space-y-2">
        {registeredUsers.map((user) => (
          <div
            key={user.registrationId}
            className="flex items-center justify-between gap-3 rounded-lg border border-stone-200 px-3 py-2"
          >
            <div className="flex min-w-0 items-center gap-2">
              <AvatarWithSash
                imageUrl={user.imageUrl}
                alt={user.fullName}
                size="sm"
                fallback={user.fullName[0]?.toUpperCase() ?? "?"}
              />
              <span className="truncate text-sm font-medium text-stone-900">{user.fullName}</span>
            </div>
            <label className="flex shrink-0 items-center gap-1.5 text-xs text-stone-600">
              <span className="font-medium">HCP</span>
              <input
                type="number"
                min={0}
                max={54}
                step={0.1}
                value={drafts[user.registrationId] ?? ""}
                onChange={(e) =>
                  setDrafts((prev) => ({
                    ...prev,
                    [user.registrationId]: e.target.value,
                  }))
                }
                onBlur={() => void saveHandicap(user.registrationId)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    void saveHandicap(user.registrationId);
                  }
                }}
                disabled={savingId === user.registrationId}
                className="w-20 rounded border border-stone-300 px-2 py-1 text-sm text-stone-900"
              />
            </label>
          </div>
        ))}
      </div>
    </div>
  );
}
