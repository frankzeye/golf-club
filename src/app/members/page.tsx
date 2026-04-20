"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Header } from "@/components/Header";
import { AvatarWithSash } from "@/components/AvatarWithSash";

interface Member {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  handicapIndex: number | null;
  homeCourse: string;
  imageUrl: string | null;
  scgaOfficial?: boolean;
}

export default function MembersPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const isAdmin = session?.user?.role === "admin";
  const [members, setMembers] = useState<Member[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/signin?callbackUrl=/members");
      return;
    }
    if (status !== "authenticated") return;
    fetch("/api/members")
      .then((res) => res.json())
      .then((data) => {
        const list = Array.isArray(data) ? data : [];
        list.sort((a, b) => {
          const aHasName = a.firstName && a.firstName.trim().length > 0;
          const bHasName = b.firstName && b.firstName.trim().length > 0;
          if (aHasName && !bHasName) return -1;
          if (!aHasName && bHasName) return 1;
          return (a.fullName || "").localeCompare(b.fullName || "");
        });
        setMembers(list);
      })
      .catch(() => setMembers([]))
      .finally(() => setIsLoading(false));
  }, [status, router]);

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

  const handleExportCsv = async () => {
    setExporting(true);
    try {
      const res = await fetch("/api/members/export");
      if (!res.ok) return;
      const blob = await res.blob();
      const dispo = res.headers.get("Content-Disposition");
      const match = dispo?.match(/filename="([^"]+)"/);
      const name = match?.[1] ?? `members-${new Date().toISOString().slice(0, 10)}.csv`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = name;
      a.rel = "noopener";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-stone-50">
      <Header />
      <div className="mx-auto w-full max-w-4xl flex-1 px-4 py-12">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="font-serif text-2xl font-semibold text-stone-900">
              Members
            </h1>
            <p className="mt-1 text-sm text-stone-500">
              Club members directory
            </p>
          </div>
          {isAdmin && members.length > 0 && (
            <button
              type="button"
              onClick={handleExportCsv}
              disabled={exporting}
              className="shrink-0 rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50 disabled:opacity-50"
            >
              {exporting ? "Preparing…" : "Download CSV"}
            </button>
          )}
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {members.map((member) => (
            <Link
              key={member.id}
              href={`/members/${member.id}`}
              className="flex items-center gap-4 rounded-xl border border-stone-200 bg-white p-4 shadow-sm transition-colors hover:bg-stone-50"
            >
              <AvatarWithSash
                imageUrl={member.imageUrl}
                alt={member.fullName}
                size="xl"
                fallback={
                  member.firstName
                    ? member.firstName[0].toUpperCase()
                    : member.lastName
                      ? member.lastName[0].toUpperCase()
                      : "?"
                }
                className="ring-2 ring-stone-200"
              />
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-x-1.5 font-medium text-stone-900">
                  <span className="truncate">{member.fullName || "—"}</span>
                  {member.scgaOfficial && (
                    <span className="shrink-0 text-emerald-600">SCGA Official</span>
                  )}
                </p>
                <p className="text-sm text-stone-500">
                  Handicap:{" "}
                  {member.handicapIndex != null
                    ? member.handicapIndex
                    : "—"}
                </p>
              </div>
            </Link>
          ))}
        </div>

        {members.length === 0 && (
          <p className="mt-8 text-center text-stone-500">
            No members yet.{" "}
            <Link href="/signup" className="text-emerald-600 hover:text-emerald-700">
              Create an account
            </Link>{" "}
            to get started.
          </p>
        )}
      </div>
    </div>
  );
}
