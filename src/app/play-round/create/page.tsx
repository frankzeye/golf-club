"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AdminPageShell } from "@/components/AdminPageShell";
import { CourseAutocomplete } from "@/components/CourseAutocomplete";
import {
  MemberInvitePicker,
  type MemberInviteOption,
} from "@/components/MemberInvitePicker";
import type { MemberOption } from "@/components/MemberAutocomplete";

const inputClass =
  "w-full rounded-lg border border-stone-300 px-4 py-2.5 text-stone-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500";

export default function CreatePlayRoundPage() {
  const router = useRouter();
  const [members, setMembers] = useState<MemberInviteOption[]>([]);
  const [membersLoading, setMembersLoading] = useState(true);
  const [course, setCourse] = useState("");
  const [courseId, setCourseId] = useState<string | null>(null);
  const [partners, setPartners] = useState<MemberOption[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/members")
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        const list = Array.isArray(data) ? data : [];
        setMembers(
          list.map(
            (m: {
              id: string;
              fullName: string;
              imageUrl?: string | null;
              isFavorite?: boolean;
            }) => ({
              id: m.id,
              fullName: m.fullName,
              imageUrl: m.imageUrl ?? null,
              isFavorite: m.isFavorite ?? false,
            })
          )
        );
      })
      .catch(() => setMembers([]))
      .finally(() => setMembersLoading(false));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!course.trim()) {
      setError("Choose a course to continue.");
      return;
    }

    if (partners.length === 0) {
      setError("Select at least one member to play with.");
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
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to create play round");
        return;
      }
      router.push(`/social-rounds/${data.slug}`);
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
          Pick a course and who you&apos;re playing with.
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
              Add up to three playing partners. You&apos;ll be included automatically.
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
