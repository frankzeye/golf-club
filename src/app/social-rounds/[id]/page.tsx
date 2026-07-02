"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Header } from "@/components/Header";
import { AccessDenied } from "@/components/AccessDenied";
import { AvatarWithSash } from "@/components/AvatarWithSash";
import { MemberInvitePicker, type MemberInviteOption } from "@/components/MemberInvitePicker";
import { memberProfileHref } from "@/lib/member-slug";
import { formatStartTime } from "@/lib/tournament-time";
import { formatTimeOfDay } from "@/lib/outing-slug";

interface Participant {
  id: string;
  slug: string;
  fullName: string;
  imageUrl: string | null;
  scgaOfficial?: boolean;
  role: string;
  status: string;
}

interface OutingDetail {
  id: string;
  slug: string;
  playerCount: number;
  course: string;
  hasBookedTime: boolean;
  date: string | null;
  startTime: string | null;
  timeOfDay: string | null;
  hasWager: boolean;
  wagerDetails: string | null;
  status: string;
  participantCount: number;
  isParticipant: boolean;
  isInvited: boolean;
  isCreator: boolean;
  participants: Participant[];
  creator: Participant;
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return "Date TBD";
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function ParticipantList({
  participants,
  subtitle,
  showRemove,
  onRemove,
  removingId,
  removeLabel,
}: {
  participants: Participant[];
  subtitle: (p: Participant) => string;
  showRemove?: boolean;
  onRemove?: (p: Participant) => void;
  removingId?: string | null;
  removeLabel?: (p: Participant) => string;
}) {
  if (participants.length === 0) return null;

  return (
    <ul className="mt-3 space-y-2">
      {participants.map((p) => (
        <li
          key={p.id}
          className="flex items-center gap-3 rounded-lg border border-stone-200 bg-white px-4 py-3"
        >
          <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full">
            <AvatarWithSash
              imageUrl={p.imageUrl}
              alt={p.fullName}
              fill
              fallback={p.fullName[0]?.toUpperCase() ?? "?"}
            />
          </div>
          <div className="min-w-0 flex-1">
            <Link
              href={memberProfileHref(p)}
              className="font-medium text-stone-900 hover:text-emerald-700"
            >
              {p.fullName}
            </Link>
            <p className="text-xs text-stone-500">{subtitle(p)}</p>
          </div>
          {showRemove && onRemove && p.role !== "organizer" ? (
            <button
              type="button"
              onClick={() => onRemove(p)}
              disabled={removingId === p.id}
              className="shrink-0 rounded-lg border border-stone-300 px-3 py-1.5 text-xs font-medium text-stone-600 hover:bg-stone-50 disabled:opacity-50"
            >
              {removingId === p.id
                ? p.status === "invited"
                  ? "Cancelling…"
                  : "Removing…"
                : removeLabel?.(p) ?? (p.status === "invited" ? "Cancel invite" : "Remove")}
            </button>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

export default function OutingDetailPage() {
  const params = useParams();
  const id = params?.id as string;
  const { data: session, status } = useSession();
  const [outing, setOuting] = useState<OutingDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [isJoining, setIsJoining] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const [joinError, setJoinError] = useState("");
  const [leaveError, setLeaveError] = useState("");
  const [members, setMembers] = useState<MemberInviteOption[]>([]);
  const [pendingInvites, setPendingInvites] = useState<MemberInviteOption[]>([]);
  const [pendingConfirmed, setPendingConfirmed] = useState<MemberInviteOption[]>([]);
  const [inviteError, setInviteError] = useState("");
  const [inviteSuccess, setInviteSuccess] = useState("");
  const [isSendingInvites, setIsSendingInvites] = useState(false);
  const [confirmedError, setConfirmedError] = useState("");
  const [confirmedSuccess, setConfirmedSuccess] = useState("");
  const [isAddingConfirmed, setIsAddingConfirmed] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [removeError, setRemoveError] = useState("");

  const loadOuting = () => {
    if (!id) return;
    setLoadError("");
    fetch(`/api/social-rounds/${id}`)
      .then((res) => {
        if (!res.ok) throw new Error("Outing not found");
        return res.json();
      })
      .then(setOuting)
      .catch((err) => {
        setLoadError(err?.message ?? "Failed to load outing");
        setOuting(null);
      })
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    if (status !== "authenticated" || !id) return;
    loadOuting();
  }, [status, id]);

  useEffect(() => {
    if (status !== "authenticated") return;
    fetch("/api/members")
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        const list = Array.isArray(data) ? data : [];
        setMembers(
          list.map((m: { id: string; fullName: string; imageUrl?: string | null; isFavorite?: boolean }) => ({
            id: m.id,
            fullName: m.fullName,
            imageUrl: m.imageUrl ?? null,
            isFavorite: m.isFavorite ?? false,
          }))
        );
      })
      .catch(() => setMembers([]));
  }, [status]);

  const handleJoin = async () => {
    if (!id) return;
    setJoinError("");
    setIsJoining(true);
    try {
      const res = await fetch(`/api/social-rounds/${id}`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setJoinError(data.error ?? "Failed to join outing");
        return;
      }
      loadOuting();
    } catch {
      setJoinError("Failed to join outing");
    } finally {
      setIsJoining(false);
    }
  };

  const handleLeave = async () => {
    if (!id || !outing) return;
    const message = outing.isInvited
      ? "Decline this invite? You can join later if spots are still open."
      : "Are you sure you want to leave this outing?";
    if (!window.confirm(message)) return;

    setLeaveError("");
    setIsLeaving(true);
    try {
      const res = await fetch(`/api/social-rounds/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        setLeaveError(data.error ?? "Failed to leave outing");
        return;
      }
      loadOuting();
    } catch {
      setLeaveError("Failed to leave outing");
    } finally {
      setIsLeaving(false);
    }
  };

  const handleSendInvites = async () => {
    if (!id || pendingInvites.length === 0) return;
    setInviteError("");
    setInviteSuccess("");
    setIsSendingInvites(true);
    try {
      const res = await fetch(`/api/social-rounds/${id}/invites`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inviteUserIds: pendingInvites.map((m) => m.id),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setInviteError(data.error ?? "Failed to send invites");
        return;
      }
      setInviteSuccess(data.message ?? "Invites sent");
      setPendingInvites([]);
      loadOuting();
    } catch {
      setInviteError("Failed to send invites");
    } finally {
      setIsSendingInvites(false);
    }
  };

  const handleAddConfirmed = async () => {
    if (!id || pendingConfirmed.length === 0) return;
    setConfirmedError("");
    setConfirmedSuccess("");
    setIsAddingConfirmed(true);
    try {
      const res = await fetch(`/api/social-rounds/${id}/participants`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userIds: pendingConfirmed.map((m) => m.id),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setConfirmedError(data.error ?? "Failed to add players");
        return;
      }
      setConfirmedSuccess(data.message ?? "Players added");
      setPendingConfirmed([]);
      loadOuting();
    } catch {
      setConfirmedError("Failed to add players");
    } finally {
      setIsAddingConfirmed(false);
    }
  };

  const handleRemovePlayer = async (participant: Participant) => {
    if (!id) return;
    const isInvite = participant.status === "invited";
    const message = isInvite
      ? `Cancel the invite for ${participant.fullName}?`
      : `Remove ${participant.fullName} from this outing? They will no longer be listed as confirmed.`;
    if (!window.confirm(message)) {
      return;
    }

    setRemoveError("");
    setRemovingId(participant.id);
    try {
      const res = await fetch(`/api/social-rounds/${id}/participants`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: participant.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        setRemoveError(
          data.error ?? (isInvite ? "Failed to cancel invite" : "Failed to remove player")
        );
        return;
      }
      loadOuting();
    } catch {
      setRemoveError(isInvite ? "Failed to cancel invite" : "Failed to remove player");
    } finally {
      setRemovingId(null);
    }
  };

  if (status === "loading" || (status === "authenticated" && isLoading)) {
    return (
      <div className="flex min-h-screen flex-col bg-stone-50">
        <Header />
        <div className="flex flex-1 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
        </div>
      </div>
    );
  }

  if (status === "unauthenticated") {
    return <AccessDenied pageName="Social Rounds" />;
  }

  if (loadError || !outing) {
    return (
      <div className="flex min-h-screen flex-col bg-stone-50">
        <Header />
        <div className="mx-auto w-full max-w-4xl flex-1 px-4 py-12 text-center">
          <p className="text-stone-600">{loadError || "Outing not found"}</p>
          <Link
            href="/social-rounds"
            className="mt-4 inline-block text-sm font-medium text-emerald-600 hover:text-emerald-700"
          >
            ← Back to Social Rounds
          </Link>
        </div>
      </div>
    );
  }

  const spotsLeft = outing.playerCount - outing.participantCount;
  const isFull = spotsLeft <= 0;
  const canJoin =
    !outing.isParticipant &&
    !outing.isInvited &&
    !isFull &&
    outing.status !== "cancelled";
  const canAcceptInvite =
    outing.isInvited && !isFull && outing.status !== "cancelled";
  const canLeave = outing.isParticipant || outing.isInvited;

  const scheduleLabel = outing.hasBookedTime
    ? `${formatDate(outing.date)}${outing.startTime ? ` at ${formatStartTime(outing.startTime) ?? outing.startTime}` : ""}`
    : [
        outing.date ? formatDate(outing.date) : "Date TBD",
        outing.timeOfDay ? formatTimeOfDay(outing.timeOfDay) : null,
      ]
        .filter(Boolean)
        .join(" · ");

  const confirmedPlayers = outing.participants.filter((p) => p.status === "confirmed");
  const invitedPlayers = outing.participants.filter((p) => p.status === "invited");
  const participantIds = outing.participants.map((p) => p.id);
  const confirmedIds = confirmedPlayers.map((p) => p.id);
  const canManagePlayers = outing.isCreator && outing.status !== "cancelled";

  return (
    <div className="flex min-h-screen flex-col bg-stone-50">
      <Header />
      <div className="mx-auto w-full max-w-4xl flex-1 px-4 py-12">
        <Link
          href="/social-rounds"
          className="text-sm font-medium text-stone-500 hover:text-emerald-600"
        >
          ← Social Rounds
        </Link>

        <div className="mt-4 rounded-xl border border-stone-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="font-serif text-2xl font-semibold text-stone-900">
                {outing.course}
              </h1>
              <p className="mt-2 text-stone-600">{scheduleLabel}</p>
            </div>
            <span
              className={`shrink-0 self-start rounded-full px-3 py-1 text-sm font-medium ${
                isFull
                  ? "bg-stone-100 text-stone-600"
                  : "bg-emerald-50 text-emerald-700"
              }`}
            >
              {outing.participantCount}/{outing.playerCount} players
            </span>
          </div>

          <dl className="mt-6 grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-stone-500">
                Organizer
              </dt>
              <dd className="mt-1">
                <Link
                  href={memberProfileHref(outing.creator)}
                  className="text-sm font-medium text-emerald-700 hover:text-emerald-800"
                >
                  {outing.creator.fullName}
                </Link>
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-stone-500">
                Tee time
              </dt>
              <dd className="mt-1 text-sm text-stone-900">
                {outing.hasBookedTime ? "Booked" : "Not booked yet"}
              </dd>
            </div>
            {outing.hasWager && (
              <div className="sm:col-span-2">
                <dt className="text-xs font-medium uppercase tracking-wide text-stone-500">
                  Wager
                </dt>
                <dd className="mt-1 text-sm text-stone-900">
                  {outing.wagerDetails ?? "Yes"}
                </dd>
              </div>
            )}
          </dl>

          {canLeave && (
            <div className="mt-6 border-t border-stone-100 pt-6">
              {leaveError && (
                <p className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {leaveError}
                </p>
              )}
              <button
                type="button"
                onClick={handleLeave}
                disabled={isLeaving}
                className="rounded-lg border border-stone-300 bg-white px-5 py-2.5 text-sm font-medium text-stone-700 hover:bg-stone-50 disabled:opacity-50"
              >
                {isLeaving
                  ? "Leaving…"
                  : outing.isInvited
                    ? "Decline invite"
                    : "Leave outing"}
              </button>
            </div>
          )}

          {canAcceptInvite && (
            <div className="mt-6 border-t border-stone-100 pt-6">
              {joinError && (
                <p className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {joinError}
                </p>
              )}
              <button
                type="button"
                onClick={handleJoin}
                disabled={isJoining}
                className="rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                {isJoining ? "Accepting…" : "Accept invite"}
              </button>
            </div>
          )}

          {canJoin && (
            <div className="mt-6 border-t border-stone-100 pt-6">
              {joinError && (
                <p className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {joinError}
                </p>
              )}
              <button
                type="button"
                onClick={handleJoin}
                disabled={isJoining}
                className="rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                {isJoining ? "Joining…" : `Join this outing (${spotsLeft} spot${spotsLeft === 1 ? "" : "s"} left)`}
              </button>
            </div>
          )}

        </div>

        {(confirmedPlayers.length > 0 || canManagePlayers) && (
          <section className="mt-8">
            <h2 className="font-serif text-lg font-semibold text-stone-900">
              Confirmed players
            </h2>
            {removeError ? (
              <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {removeError}
              </p>
            ) : null}
            {confirmedPlayers.length > 0 ? (
              <ParticipantList
                participants={confirmedPlayers}
                subtitle={(p) => (p.role === "organizer" ? "Organizer" : "Confirmed")}
                showRemove={canManagePlayers}
                onRemove={handleRemovePlayer}
                removingId={removingId}
              />
            ) : (
              <p className="mt-2 text-sm text-stone-500">No confirmed players yet.</p>
            )}
          </section>
        )}

        {invitedPlayers.length > 0 && (
          <section className="mt-8">
            <h2 className="font-serif text-lg font-semibold text-stone-900">
              Invited
            </h2>
            <p className="mt-1 text-sm text-stone-500">
              Waiting for these members to accept.
            </p>
            <ParticipantList
              participants={invitedPlayers}
              subtitle={() => "Invited"}
              showRemove={canManagePlayers}
              onRemove={handleRemovePlayer}
              removingId={removingId}
            />
          </section>
        )}

        {canManagePlayers && (
          <section className="mt-8 rounded-xl border border-stone-200 bg-white p-6 shadow-sm">
            <h2 className="font-serif text-lg font-semibold text-stone-900">
              Invite more players
            </h2>
            <p className="mt-1 text-sm text-stone-500">
              Tap a favorite or search for members to send more invites.
            </p>
            <div className="mt-5">
              <MemberInvitePicker
                members={members}
                selected={pendingInvites}
                onChange={setPendingInvites}
                excludeIds={participantIds}
              />
            </div>
            {inviteError && (
              <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {inviteError}
              </p>
            )}
            {inviteSuccess && (
              <p className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                {inviteSuccess}
              </p>
            )}
            <button
              type="button"
              onClick={handleSendInvites}
              disabled={pendingInvites.length === 0 || isSendingInvites}
              className="mt-4 rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              {isSendingInvites
                ? "Sending…"
                : pendingInvites.length === 0
                  ? "Select members to invite"
                  : `Send ${pendingInvites.length} invite${pendingInvites.length === 1 ? "" : "s"}`}
            </button>
          </section>
        )}

        {canManagePlayers && !isFull && (
          <section className="mt-8 rounded-xl border border-stone-200 bg-white p-6 shadow-sm">
            <h2 className="font-serif text-lg font-semibold text-stone-900">
              Add confirmed players
            </h2>
            <p className="mt-1 text-sm text-stone-500">
              Add members directly to the outing without sending an invite.
            </p>
            <div className="mt-5">
              <MemberInvitePicker
                members={members}
                selected={pendingConfirmed}
                onChange={setPendingConfirmed}
                excludeIds={confirmedIds}
              />
            </div>
            {confirmedError && (
              <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {confirmedError}
              </p>
            )}
            {confirmedSuccess && (
              <p className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                {confirmedSuccess}
              </p>
            )}
            <button
              type="button"
              onClick={handleAddConfirmed}
              disabled={pendingConfirmed.length === 0 || isAddingConfirmed}
              className="mt-4 rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              {isAddingConfirmed
                ? "Adding…"
                : pendingConfirmed.length === 0
                  ? "Select members to add"
                  : `Add ${pendingConfirmed.length} confirmed player${pendingConfirmed.length === 1 ? "" : "s"}`}
            </button>
          </section>
        )}
      </div>
    </div>
  );
}
