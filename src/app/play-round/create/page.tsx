"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AdminPageShell } from "@/components/AdminPageShell";
import { CourseAutocomplete } from "@/components/CourseAutocomplete";
import {
  MemberInvitePicker,
  type MemberInviteOption,
} from "@/components/MemberInvitePicker";
import type { MemberOption } from "@/components/MemberAutocomplete";
import {
  PlayRoundHandicapFields,
  handicapValuesToPayload,
} from "@/components/PlayRoundHandicapFields";

const inputClass =
  "w-full rounded-lg border border-stone-300 px-4 py-2.5 text-stone-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500";

function handicapFromProfile(value: number | null | undefined): string {
  return value != null ? String(value) : "";
}

export default function CreatePlayRoundPage() {
  const router = useRouter();
  const [members, setMembers] = useState<MemberInviteOption[]>([]);
  const [membersLoading, setMembersLoading] = useState(true);
  const [creatorId, setCreatorId] = useState<string | null>(null);
  const [creatorName, setCreatorName] = useState("You");
  const [creatorImageUrl, setCreatorImageUrl] = useState<string | null>(null);
  const [creatorHandicap, setCreatorHandicap] = useState<number | null>(null);
  const [course, setCourse] = useState("");
  const [courseId, setCourseId] = useState<string | null>(null);
  const [partners, setPartners] = useState<MemberOption[]>([]);
  const [handicaps, setHandicaps] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([fetch("/api/members"), fetch("/api/profile")])
      .then(async ([membersRes, profileRes]) => {
        const membersData = membersRes.ok ? await membersRes.json() : [];
        const profileData = profileRes.ok ? await profileRes.json() : null;
        const list = Array.isArray(membersData) ? membersData : [];

        setMembers(
          list.map(
            (m: {
              id: string;
              fullName: string;
              imageUrl?: string | null;
              isFavorite?: boolean;
              handicapIndex?: number | null;
            }) => ({
              id: m.id,
              fullName: m.fullName,
              imageUrl: m.imageUrl ?? null,
              isFavorite: m.isFavorite ?? false,
              handicapIndex: m.handicapIndex ?? null,
            })
          )
        );

        if (profileData?.id) {
          setCreatorId(profileData.id);
          const name = [profileData.firstName, profileData.lastName]
            .filter(Boolean)
            .join(" ");
          setCreatorName(name || "You");
          setCreatorImageUrl(profileData.imageUrl ?? null);
          setCreatorHandicap(profileData.handicapIndex ?? null);
        }
      })
      .catch(() => setMembers([]))
      .finally(() => setMembersLoading(false));
  }, []);

  const roster = useMemo(() => {
    const rows: { userId: string; fullName: string; imageUrl: string | null }[] = [];
    if (creatorId) {
      rows.push({
        userId: creatorId,
        fullName: creatorName,
        imageUrl: creatorImageUrl,
      });
    }
    for (const partner of partners) {
      const member = members.find((m) => m.id === partner.id);
      rows.push({
        userId: partner.id,
        fullName: partner.fullName,
        imageUrl: member?.imageUrl ?? null,
      });
    }
    return rows;
  }, [creatorId, creatorName, creatorImageUrl, partners, members]);

  useEffect(() => {
    if (!creatorId) return;
    setHandicaps((prev) => {
      const next: Record<string, string> = {};
      for (const row of roster) {
        const profileValue =
          row.userId === creatorId
            ? handicapFromProfile(creatorHandicap)
            : handicapFromProfile(members.find((m) => m.id === row.userId)?.handicapIndex);

        if (row.userId in prev) {
          const existing = prev[row.userId];
          next[row.userId] = existing !== "" ? existing : profileValue;
          continue;
        }
        next[row.userId] = profileValue;
      }
      return next;
    });
  }, [roster, creatorId, creatorHandicap, members]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!courseId) {
      setError("Select a course from the search results so we can load the scorecard.");
      return;
    }

    if (!course.trim()) {
      setError("Choose a course to continue.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/play-rounds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          course: course.trim(),
          courseId,
          partnerUserIds: partners.map((p) => p.id),
          playerHandicaps: handicapValuesToPayload(handicaps),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to create play round");
        return;
      }
      router.push(`/play-round/${data.slug}`);
    } catch {
      setError("Failed to create play round");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AdminPageShell pageName="Play Round" loading={membersLoading} maxWidthClass="max-w-xl">
      <Link
        href="/play-round"
        className="text-sm font-medium text-stone-600 hover:text-emerald-600"
      >
        ← Back to Play Round
      </Link>

      <div className="mt-4 rounded-2xl border border-stone-200 bg-white p-8 shadow-sm">
        <h1 className="font-serif text-2xl font-semibold text-stone-900">New Round</h1>
        <p className="mt-1 text-sm text-stone-600">
          Pick a course, add playing partners, and confirm handicaps before starting the round.
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-8">
          <div>
            <label htmlFor="course" className="block text-sm font-medium text-stone-700">
              Course
            </label>
            <div className="mt-2">
              <CourseAutocomplete
                id="course"
                value={course}
                courseId={courseId}
                onChange={(name, id) => {
                  setCourse(name);
                  setCourseId(id ?? null);
                }}
                placeholder="Search for a course"
                className={inputClass}
              />
            </div>
          </div>

          <div>
            <p className="text-sm font-medium text-stone-700">Playing with</p>
            <p className="mt-1 text-sm text-stone-500">
              Add up to three playing partners, or leave blank for a solo round. You&apos;ll be
              included automatically.
            </p>
            <div className="mt-3">
              <MemberInvitePicker
                members={members}
                selected={partners}
                onChange={setPartners}
                maxSelections={3}
              />
            </div>
          </div>

          {roster.length > 0 ? (
            <div>
              <p className="text-sm font-medium text-stone-700">Handicaps</p>
              <p className="mt-1 text-sm text-stone-500">
                Prefilled from each player&apos;s profile. Adjust for this round if needed.
              </p>
              <div className="mt-3">
                <PlayRoundHandicapFields
                  players={roster}
                  values={handicaps}
                  onChange={(userId, value) =>
                    setHandicaps((prev) => ({ ...prev, [userId]: value }))
                  }
                />
              </div>
            </div>
          ) : null}

          {error ? (
            <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </p>
          ) : null}

          <div className="flex justify-end gap-3">
            <Link
              href="/play-round"
              className="rounded-lg border border-stone-300 px-5 py-2.5 text-sm font-medium text-stone-700 hover:bg-stone-50"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              {isSubmitting ? "Creating…" : "Create Round"}
            </button>
          </div>
        </form>
      </div>
    </AdminPageShell>
  );
}
