"use client";

import { useMemo, useState } from "react";

export interface MemberOption {
  id: string;
  fullName: string;
}

interface AdminRegisterMemberFormProps {
  tournamentId: string;
  members: MemberOption[];
  hasBuyIn: boolean;
  isFull: boolean;
  onSuccess: () => void;
  onError: (message: string) => void;
}

export function AdminRegisterMemberForm({
  tournamentId,
  members,
  hasBuyIn,
  isFull,
  onSuccess,
  onError,
}: AdminRegisterMemberFormProps) {
  const [userId, setUserId] = useState("");
  const [markAsPaid, setMarkAsPaid] = useState(false);
  const [search, setSearch] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  const filteredMembers = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return members;
    return members.filter((m) => m.fullName.toLowerCase().includes(query));
  }, [members, search]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;
    setIsAdding(true);
    onError("");
    try {
      const res = await fetch(`/api/tournaments/${tournamentId}/registrations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, markAsPaid }),
      });
      const data = await res.json();
      if (!res.ok) {
        onError(data.error ?? "Failed to register member");
        return;
      }
      setUserId("");
      setMarkAsPaid(false);
      setSearch("");
      onSuccess();
    } catch {
      onError("Failed to register member");
    } finally {
      setIsAdding(false);
    }
  };

  if (isFull) {
    return (
      <p className="text-sm text-stone-600">
        Tournament is full — remove a registration below to add someone else.
      </p>
    );
  }

  if (members.length === 0) {
    return (
      <p className="text-sm text-stone-600">
        All club members are already registered.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label
          htmlFor="admin-member-search"
          className="block text-xs font-medium text-stone-600"
        >
          Search members
        </label>
        <input
          id="admin-member-search"
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Type a name…"
          className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
        />
      </div>
      <div>
        <label
          htmlFor="admin-member-select"
          className="block text-xs font-medium text-stone-600"
        >
          Member
        </label>
        <select
          id="admin-member-select"
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
          className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
        >
          <option value="">— Select member —</option>
          {filteredMembers.map((m) => (
            <option key={m.id} value={m.id}>
              {m.fullName}
            </option>
          ))}
        </select>
        {search.trim() && filteredMembers.length === 0 && (
          <p className="mt-1 text-xs text-stone-500">No members match that search.</p>
        )}
      </div>
      {hasBuyIn && (
        <label className="flex items-center gap-2 text-sm text-stone-700">
          <input
            type="checkbox"
            checked={markAsPaid}
            onChange={(e) => setMarkAsPaid(e.target.checked)}
            className="rounded border-stone-300 text-emerald-600 focus:ring-emerald-500"
          />
          Mark as paid
        </label>
      )}
      <button
        type="submit"
        disabled={isAdding || !userId}
        className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
      >
        {isAdding ? "Registering…" : "Register member"}
      </button>
    </form>
  );
}
