"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { Header } from "@/components/Header";
import { AvatarWithSash } from "@/components/AvatarWithSash";

interface UpcomingTournament {
  id: string;
  name: string;
  date: string;
  course: string;
}

interface Badge {
  id: string;
  name: string;
  earned: boolean;
  tournamentSlug?: string;
  tournamentName?: string;
}

interface MemberDetail {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  ghinNumber: string | null;
  handicapIndex: number | null;
  homeCourse: string;
  imageUrl: string | null;
  role: string;
  scgaOfficial?: boolean;
  email?: string;
  cellNumber?: string | null;
  upcomingTournaments: UpcomingTournament[];
  badges?: Badge[];
}

export default function MemberDetailPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;
  const [member, setMember] = useState<MemberDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push(`/signin?callbackUrl=/members/${id}`);
      return;
    }
    if (status !== "authenticated" || !id) return;
    fetch(`/api/members/${id}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load");
        return res.json();
      })
      .then(setMember)
      .catch(() => setError("Member not found"))
      .finally(() => setIsLoading(false));
  }, [status, router, id]);

  const handleToggleAdmin = async (checked: boolean) => {
    if (!member || member.id === session?.user?.id) return;
    setIsUpdating(true);
    setError("");
    try {
      const res = await fetch(`/api/members/${member.id}/admin`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: checked ? "admin" : "member" }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to update");
        return;
      }
      setError("");
      setMember((m) => (m ? { ...m, role: checked ? "admin" : "member" } : null));
    } catch {
      setError("Something went wrong");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleToggleScgaOfficial = async (checked: boolean) => {
    if (!member) return;
    setIsUpdating(true);
    setError("");
    try {
      const res = await fetch(`/api/members/${member.id}/admin`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scgaOfficial: checked }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to update");
        return;
      }
      setError("");
      setMember((m) => (m ? { ...m, scgaOfficial: checked } : null));
    } catch {
      setError("Something went wrong");
    } finally {
      setIsUpdating(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const isAdmin = session?.user?.role === "admin";
  const canEditAdminOptions = isAdmin && member?.id !== session?.user?.id;

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
    return null;
  }

  if (error || !member) {
    return (
      <div className="flex min-h-screen flex-col bg-stone-50">
        <Header />
        <div className="mx-auto w-full max-w-4xl flex-1 px-4 py-12">
          <p className="text-stone-600">{error || "Member not found"}</p>
          <Link
            href="/members"
            className="mt-4 inline-block text-emerald-600 hover:text-emerald-700"
          >
            ← Back to Members
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-stone-50">
      <Header />
      <div className="mx-auto w-full max-w-2xl flex-1 px-4 py-12">
        <Link
          href="/members"
          className="text-sm text-emerald-600 hover:text-emerald-700"
        >
          ← Back to Members
        </Link>

        <div className="mt-6 rounded-2xl border border-stone-200 bg-white p-8 shadow-sm">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
            <div className="shrink-0">
              <AvatarWithSash
                imageUrl={member.imageUrl}
                alt={member.fullName}
                size="2xl"
                fallback={
                  member.firstName
                    ? member.firstName[0].toUpperCase()
                    : member.lastName
                      ? member.lastName[0].toUpperCase()
                      : "?"
                }
                className="ring-2 ring-stone-300"
              />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="font-serif text-2xl font-semibold text-stone-900">
                  {member.fullName || "—"}
                </h1>
                {member.scgaOfficial && (
                  <span className="text-emerald-600">SCGA Official</span>
                )}
                {member.role === "admin" && (
                  <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-800">
                    Admin
                  </span>
                )}
              </div>
              {member.email && (
                <p className="mt-1 text-sm text-stone-500">{member.email}</p>
              )}
              {isAdmin && member.cellNumber && (
                <div className="mt-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2">
                  <p className="text-xs font-medium uppercase tracking-wide text-blue-600">
                    Admin only · Cell
                  </p>
                  <p className="mt-0.5 text-sm text-blue-900">{member.cellNumber}</p>
                </div>
              )}
              <dl className="mt-4 space-y-2">
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-stone-400">
                    Handicap Index
                  </dt>
                  <dd className="text-stone-900">
                    {member.handicapIndex != null ? member.handicapIndex : "—"}
                  </dd>
                </div>
                {member.ghinNumber && (
                  <div>
                    <dt className="text-xs font-medium uppercase tracking-wide text-stone-400">
                      GHIN Number
                    </dt>
                    <dd className="text-stone-900">{member.ghinNumber}</dd>
                  </div>
                )}
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-stone-400">
                    Home Course
                  </dt>
                  <dd className="text-stone-900">
                    {member.homeCourse || "—"}
                  </dd>
                </div>
              </dl>
              {error && (
                <p className="mt-4 text-sm text-red-600">{error}</p>
              )}
              {canEditAdminOptions && (
                <div className="mt-6 space-y-4 rounded-lg border border-stone-200 bg-stone-50 p-4">
                  <h3 className="text-sm font-medium text-stone-700">
                    Admin options
                  </h3>
                  <label className="flex cursor-pointer items-center justify-between gap-4">
                    <span className="text-sm text-stone-700">SCGA Official</span>
                    <input
                      type="checkbox"
                      checked={member.scgaOfficial ?? false}
                      onChange={(e) => handleToggleScgaOfficial(e.target.checked)}
                      disabled={isUpdating}
                      className="h-4 w-4 rounded border-stone-300 text-emerald-600 focus:ring-emerald-500"
                    />
                  </label>
                  <label className="flex cursor-pointer items-center justify-between gap-4">
                    <span className="text-sm text-stone-700">Make user admin</span>
                    <input
                      type="checkbox"
                      checked={member.role === "admin"}
                      onChange={(e) => handleToggleAdmin(e.target.checked)}
                      disabled={isUpdating}
                      className="h-4 w-4 rounded border-stone-300 text-emerald-600 focus:ring-emerald-500"
                    />
                  </label>
                </div>
              )}
            </div>
          </div>

          {(member.badges ?? []).length > 0 && (
            <div className="mt-8 border-t border-stone-200 pt-6">
              <h2 className="text-sm font-semibold text-stone-900">Badges</h2>
              <p className="mt-1 text-xs text-stone-500">
                Tournament participation and wins
              </p>
              <div className="mt-3 flex flex-wrap gap-3">
                {(member.badges ?? []).map((badge) => {
                  const isPrizeBadge = badge.id.startsWith("prize-");
                  const content = (
                    <>
                      <span className="text-base">
                        {badge.earned ? "🏆" : "🔒"}
                      </span>
                      <span className="text-sm font-medium">{badge.name}</span>
                    </>
                  );
                  const wrapperClass = `flex items-center gap-2 rounded-full px-4 py-2 ${
                    badge.earned
                      ? isPrizeBadge
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-amber-100 text-amber-800"
                      : "bg-stone-100 text-stone-400"
                  }`;
                  const title = badge.tournamentName ?? (badge.earned ? "Earned" : "Not yet earned");
                  if (badge.tournamentSlug && badge.earned) {
                    return (
                      <Link
                        key={badge.id}
                        href={`/tournaments/${badge.tournamentSlug}`}
                        className={`${wrapperClass} transition-colors hover:opacity-90`}
                        title={title}
                      >
                        {content}
                      </Link>
                    );
                  }
                  return (
                    <div
                      key={badge.id}
                      className={wrapperClass}
                      title={title}
                    >
                      {content}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {member.upcomingTournaments.length > 0 && (
            <div className="mt-8 border-t border-stone-200 pt-6">
              <h2 className="text-sm font-semibold text-stone-900">
                Upcoming Tournaments
              </h2>
              <ul className="mt-3 space-y-2">
                {member.upcomingTournaments.map((t) => (
                  <li key={t.id}>
                    <Link
                      href="/tournaments"
                      className="block rounded-lg border border-stone-200 px-4 py-3 text-sm transition-colors hover:bg-stone-50"
                    >
                      <span className="font-medium text-stone-900">{t.name}</span>
                      <span className="ml-2 text-stone-500">
                        {formatDate(t.date)} · {t.course}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
