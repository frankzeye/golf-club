"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { Header } from "@/components/Header";

type AdminPageShellProps = {
  pageName: string;
  children: React.ReactNode;
  loading?: boolean;
  maxWidthClass?: string;
};

export function AdminPageShell({
  pageName,
  children,
  loading = false,
  maxWidthClass = "max-w-4xl",
}: AdminPageShellProps) {
  const { data: session, status } = useSession();
  const isAdmin = session?.user?.role === "admin";

  if (status === "loading" || loading) {
    return (
      <div className="flex min-h-screen flex-col bg-stone-50">
        <Header />
        <div className={`mx-auto w-full ${maxWidthClass} flex-1 px-4 py-12 text-center text-stone-500`}>
          Loading…
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex min-h-screen flex-col bg-stone-50">
        <Header />
        <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-12">
          <div className="rounded-2xl border border-stone-200 bg-white p-8 text-center shadow-sm">
            <h1 className="font-serif text-2xl font-semibold text-stone-900">Sign in required</h1>
            <p className="mt-3 text-sm text-stone-600">
              {pageName} is for club admins. Sign in with an admin account to continue.
            </p>
            <Link
              href="/signin"
              className="mt-6 inline-block rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-emerald-700"
            >
              Sign in
            </Link>
          </div>
        </main>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex min-h-screen flex-col bg-stone-50">
        <Header />
        <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-12">
          <div className="rounded-2xl border border-stone-200 bg-white p-8 text-center shadow-sm">
            <h1 className="font-serif text-2xl font-semibold text-stone-900">Access denied</h1>
            <p className="mt-3 text-sm text-stone-600">
              {pageName} is only available to club admins.
            </p>
            <Link
              href="/"
              className="mt-6 inline-block text-sm font-medium text-emerald-600 hover:text-emerald-700"
            >
              ← Back to home
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-stone-50">
      <Header />
      <div className={`mx-auto w-full ${maxWidthClass} flex-1 px-4 py-12`}>{children}</div>
    </div>
  );
}
