"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { Header } from "@/components/Header";
import { AccessDenied } from "@/components/AccessDenied";
import { CourseAutocomplete } from "@/components/CourseAutocomplete";
import { AvatarWithSash } from "@/components/AvatarWithSash";

interface ProfileForm {
  firstName: string;
  lastName: string;
  cellNumber: string;
  ghinNumber: string;
  handicapIndex: string;
  homeCourse: string;
  homeCourseId: string | null;
  imageUrl: string | null;
}

interface Badge {
  id: string;
  name: string;
  earned: boolean;
  tournamentSlug?: string;
  tournamentName?: string;
}

export default function ProfilePage() {
  const { data: session, status, update } = useSession();
  const [form, setForm] = useState<ProfileForm>({
    firstName: "",
    lastName: "",
    cellNumber: "",
    ghinNumber: "",
    handicapIndex: "",
    homeCourse: "",
    homeCourseId: null,
    imageUrl: null,
  });
  const [saved, setSaved] = useState<ProfileForm | null>(null);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [scgaOfficial, setScgaOfficial] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUpdatingAdmin, setIsUpdatingAdmin] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (status !== "authenticated") return;
    fetch("/api/profile")
      .then((res) => res.json())
      .then((data) => {
        const hi = data.handicapIndex;
        setForm({
          firstName: data.firstName ?? "",
          lastName: data.lastName ?? "",
          cellNumber: data.cellNumber ?? "",
          ghinNumber: data.ghinNumber ?? "",
          handicapIndex: hi != null && hi !== "" ? String(hi) : "",
          homeCourse: data.homeCourse ?? "",
          homeCourseId: data.homeCourseId ?? null,
          imageUrl: data.imageUrl ?? null,
        });
        setSaved({
          firstName: data.firstName ?? "",
          lastName: data.lastName ?? "",
          cellNumber: data.cellNumber ?? "",
          ghinNumber: data.ghinNumber ?? "",
          handicapIndex: hi != null && hi !== "" ? String(hi) : "",
          homeCourse: data.homeCourse ?? "",
          homeCourseId: data.homeCourseId ?? null,
          imageUrl: data.imageUrl ?? null,
        });
        setBadges(data.badges ?? []);
        setScgaOfficial(data.scgaOfficial ?? false);
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, [status]);

  const handleChange = (field: keyof ProfileForm) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const hi = form.handicapIndex.trim();
      const hiNum = hi === "" ? null : parseFloat(hi);
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          cellNumber: form.cellNumber.trim() || null,
          ghinNumber: form.ghinNumber.trim() || null,
          handicapIndex: hiNum != null && !Number.isNaN(hiNum) ? hiNum : null,
          homeCourse: form.homeCourse.trim() || null,
          homeCourseId: form.homeCourseId,
        }),
      });
      if (!res.ok) throw new Error("Save failed");
      const data = await res.json();
      const hiVal = data.handicapIndex;
      setSaved((prev) => prev ? {
        ...prev,
        firstName: data.firstName ?? "",
        lastName: data.lastName ?? "",
        cellNumber: data.cellNumber ?? "",
        ghinNumber: data.ghinNumber ?? "",
        handicapIndex: hiVal != null && hiVal !== "" ? String(hiVal) : "",
        homeCourse: data.homeCourse ?? "",
        homeCourseId: data.homeCourseId ?? null,
      } : null);
    } catch {
      // TODO: Show toast or inline error
    } finally {
      setIsSaving(false);
    }
  };

  const hasChanges =
    form.firstName !== (saved?.firstName ?? "") ||
    form.lastName !== (saved?.lastName ?? "") ||
    form.cellNumber !== (saved?.cellNumber ?? "") ||
    form.ghinNumber !== (saved?.ghinNumber ?? "") ||
    form.handicapIndex !== (saved?.handicapIndex ?? "") ||
    form.homeCourse !== (saved?.homeCourse ?? "") ||
    form.homeCourseId !== (saved?.homeCourseId ?? null);

  const handleToggleScgaOfficial = async (checked: boolean) => {
    if (!session?.user?.id) return;
    setIsUpdatingAdmin(true);
    try {
      const res = await fetch(`/api/members/${session.user.id}/admin`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scgaOfficial: checked }),
      });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error ?? "Failed to update");
        return;
      }
      setScgaOfficial(checked);
    } catch {
      alert("Failed to update");
    } finally {
      setIsUpdatingAdmin(false);
    }
  };

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    try {
      const fd = new FormData();
      fd.append("photo", file);
      const res = await fetch("/api/profile/photo", {
        method: "POST",
        body: fd,
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.error ?? "Upload failed");
        return;
      }
      const data = await res.json();
      setForm((prev) => ({ ...prev, imageUrl: data.imageUrl }));
      setSaved((prev) => prev ? { ...prev, imageUrl: data.imageUrl } : null);
      await update(); // Refetch session so header thumbnail updates
    } catch {
      alert("Upload failed");
    } finally {
      setIsUploading(false);
      e.target.value = "";
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
    return <AccessDenied pageName="Your profile" />;
  }

  return (
    <div className="flex min-h-screen flex-col bg-stone-50">
      <Header />
      <div className="mx-auto max-w-xl flex-1 px-4 py-12">
      <div className="rounded-2xl border border-stone-200 bg-white p-8 shadow-sm">
        <div className="mb-8">
          <div className="flex items-center gap-2">
            <h1 className="font-serif text-2xl font-semibold text-stone-900">
              My Profile
            </h1>
            {session?.user?.role === "admin" && (
              <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-800">
                Admin
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-stone-500">
            Update your information and handicap (you or an admin can edit)
          </p>
        </div>

        <div className="mb-8">
          <label className="block text-sm font-medium text-stone-700 mb-2">
            Profile Photo
          </label>
          <div className="flex items-center gap-4">
            <div className="relative">
              <AvatarWithSash
                imageUrl={form.imageUrl}
                alt="Profile"
                size="2xl"
                fallback={
                  form.firstName
                    ? form.firstName[0].toUpperCase()
                    : form.lastName
                      ? form.lastName[0].toUpperCase()
                      : "?"
                }
                className="ring-2 ring-stone-300"
              />
              {isUploading && (
                <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-white border-t-transparent" />
                </div>
              )}
            </div>
            <div>
              <input
                type="file"
                id="photo"
                accept="image/jpeg,image/png,image/webp"
                onChange={handlePhotoChange}
                disabled={isUploading}
                className="hidden"
              />
              <label
                htmlFor="photo"
                className="cursor-pointer rounded-lg bg-stone-100 px-4 py-2.5 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {form.imageUrl ? "Change photo" : "Upload photo"}
              </label>
              <p className="mt-1 text-xs text-stone-500">
                JPEG, PNG or WebP. Max 5MB.
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label
              htmlFor="firstName"
              className="block text-sm font-medium text-stone-700"
            >
              First Name
            </label>
            <input
              id="firstName"
              type="text"
              value={form.firstName}
              onChange={handleChange("firstName")}
              className="mt-1 w-full rounded-lg border border-stone-300 px-4 py-2.5 text-stone-900 placeholder-stone-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              placeholder="John"
              autoComplete="given-name"
              autoFocus
            />
          </div>

          <div>
            <label
              htmlFor="lastName"
              className="block text-sm font-medium text-stone-700"
            >
              Last Name
            </label>
            <input
              id="lastName"
              type="text"
              value={form.lastName}
              onChange={handleChange("lastName")}
              className="mt-1 w-full rounded-lg border border-stone-300 px-4 py-2.5 text-stone-900 placeholder-stone-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              placeholder="Smith"
              autoComplete="family-name"
            />
          </div>

          <div>
            <label
              htmlFor="cellNumber"
              className="block text-sm font-medium text-stone-700"
            >
              Cell Number
            </label>
            <input
              id="cellNumber"
              type="tel"
              value={form.cellNumber}
              onChange={handleChange("cellNumber")}
              className="mt-1 w-full rounded-lg border border-stone-300 px-4 py-2.5 text-stone-900 placeholder-stone-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              placeholder="e.g. (555) 123-4567"
              autoComplete="tel"
            />
          </div>

          <div>
            <label
              htmlFor="ghinNumber"
              className="block text-sm font-medium text-stone-700"
            >
              GHIN Number
            </label>
            <p className="mt-0.5 text-xs text-stone-500">
              Your Handicap ID (optional identifier)
            </p>
            <input
              id="ghinNumber"
              type="text"
              inputMode="numeric"
              value={form.ghinNumber}
              onChange={handleChange("ghinNumber")}
              className="mt-1 w-full rounded-lg border border-stone-300 px-4 py-2.5 text-stone-900 placeholder-stone-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              placeholder="e.g. 12345678"
              maxLength={9}
            />
          </div>

          <div>
            <label
              htmlFor="handicapIndex"
              className="block text-sm font-medium text-stone-700"
            >
              Handicap Index
            </label>
            <p className="mt-0.5 text-xs text-stone-500">
              Updated manually by you or a club admin
            </p>
            <input
              id="handicapIndex"
              type="text"
              inputMode="decimal"
              value={form.handicapIndex}
              onChange={handleChange("handicapIndex")}
              className="mt-1 w-full rounded-lg border border-stone-300 px-4 py-2.5 text-stone-900 placeholder-stone-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              placeholder="e.g. 12.4"
            />
          </div>

          <div>
            <label
              htmlFor="homeCourse"
              className="block text-sm font-medium text-stone-700"
            >
              Home Course
            </label>
            <p className="mt-0.5 text-xs text-stone-500">
              Start typing to search US golf courses
            </p>
            <div className="mt-1">
              <CourseAutocomplete
                id="homeCourse"
                value={form.homeCourse}
                courseId={form.homeCourseId}
                onChange={(name, courseId) =>
                  setForm((prev) => ({ ...prev, homeCourse: name, homeCourseId: courseId ?? null }))
                }
                placeholder="e.g. Pebble Beach Golf Links"
                className="w-full rounded-lg border border-stone-300 px-4 py-2.5 text-stone-900 placeholder-stone-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div className="border-t border-stone-200 pt-6">
            <h2 className="text-sm font-semibold text-stone-900">Badges</h2>
            <p className="mt-1 text-xs text-stone-500">
              Earn badges by participating in and winning tournaments
            </p>
            <div className="mt-3 flex flex-wrap gap-3">
              {badges.map((badge) => {
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

          {session?.user?.role === "admin" && (
            <div className="space-y-4 rounded-lg border border-stone-200 bg-stone-50 p-4">
              <h3 className="text-sm font-medium text-stone-700">
                Admin options
              </h3>
              <label className="flex cursor-pointer items-center justify-between gap-4">
                <span className="text-sm text-stone-700">SCGA Official</span>
                <input
                  type="checkbox"
                  checked={scgaOfficial}
                  onChange={(e) => handleToggleScgaOfficial(e.target.checked)}
                  disabled={isUpdatingAdmin}
                  className="h-4 w-4 rounded border-stone-300 text-emerald-600 focus:ring-emerald-500"
                />
              </label>
              <label className="flex cursor-pointer items-center justify-between gap-4">
                <span className="text-sm text-stone-700">Admin</span>
                <input
                  type="checkbox"
                  checked={true}
                  disabled
                  title="Your admin status cannot be changed here"
                  className="h-4 w-4 rounded border-stone-300 text-emerald-600"
                />
              </label>
            </div>
          )}

          <div className="flex items-center justify-between border-t border-stone-200 pt-6">
            <p className="text-sm text-stone-500">
              {hasChanges ? "You have unsaved changes." : "All changes saved."}
            </p>
            <button
              type="submit"
              disabled={!hasChanges || isSaving}
              className="rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-emerald-700 disabled:opacity-50 disabled:hover:bg-emerald-600"
            >
              {isSaving ? "Saving…" : "Save Profile"}
            </button>
          </div>
        </form>
      </div>
      </div>
    </div>
  );
}
