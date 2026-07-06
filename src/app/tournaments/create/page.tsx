"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { Header } from "@/components/Header";
import { TournamentCreateWizard } from "@/components/tournament-wizard/TournamentCreateWizard";

export default function CreateTournamentPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const isAdmin = session?.user?.role === "admin";

  useEffect(() => {
    if (status === "loading") return;
    if (!isAdmin) router.replace("/tournaments");
  }, [status, isAdmin, router]);

  if (status === "loading" || !isAdmin) {
    return (
      <div className="flex min-h-screen flex-col bg-stone-50">
        <Header />
        <main className="flex flex-1 items-center justify-center">
          <p className="text-stone-500">Loading…</p>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-stone-50">
      <Header />
      <main className="flex-1 px-4 py-8">
        <TournamentCreateWizard />
      </main>
    </div>
  );
}
