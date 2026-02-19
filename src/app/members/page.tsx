"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Header } from "@/components/Header";

interface Member {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  handicapIndex: number | null;
  homeCourse: string;
  imageUrl: string | null;
}

export default function MembersPage() {
  const { status } = useSession();
  const router = useRouter();
  const [members, setMembers] = useState<Member[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/signin?callbackUrl=/members");
      return;
    }
    if (status !== "authenticated") return;
    fetch("/api/members")
      .then((res) => res.json())
      .then((data) => setMembers(Array.isArray(data) ? data : []))
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

  return (
    <div className="flex min-h-screen flex-col bg-stone-50">
      <Header />
      <div className="mx-auto w-full max-w-4xl flex-1 px-4 py-12">
        <h1 className="font-serif text-2xl font-semibold text-stone-900">
          Members
        </h1>
        <p className="mt-1 text-sm text-stone-500">
          Club members directory
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {members.map((member) => (
            <Link
              key={member.id}
              href={`/members/${member.id}`}
              className="flex items-center gap-4 rounded-xl border border-stone-200 bg-white p-4 shadow-sm transition-colors hover:bg-stone-50"
            >
              <div className="h-14 w-14 shrink-0 overflow-hidden rounded-full bg-stone-200 ring-2 ring-stone-200">
                {member.imageUrl ? (
                  <img
                    src={member.imageUrl}
                    alt={member.fullName}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-lg font-medium text-stone-400">
                    {member.firstName
                      ? member.firstName[0].toUpperCase()
                      : member.lastName
                        ? member.lastName[0].toUpperCase()
                        : "?"}
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-stone-900">
                  {member.fullName || "—"}
                </p>
                <p className="text-sm text-stone-500">
                  Handicap:{" "}
                  {member.handicapIndex != null
                    ? member.handicapIndex
                    : "—"}
                </p>
                {member.homeCourse && (
                  <p className="text-sm text-stone-500 truncate" title={member.homeCourse}>
                    {member.homeCourse}
                  </p>
                )}
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
