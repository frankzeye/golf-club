import Link from "next/link";
import { Header } from "@/components/Header";

type AccessDeniedProps = {
  pageName?: string;
};

export function AccessDenied({ pageName }: AccessDeniedProps) {
  return (
    <div className="flex min-h-screen flex-col bg-stone-50">
      <Header />
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-12">
        <div className="rounded-2xl border border-stone-200 bg-white p-8 text-center shadow-sm">
          <h1 className="font-serif text-2xl font-semibold text-stone-900">
            Access denied
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-stone-600">
            {pageName
              ? `${pageName} is for members only.`
              : "This page is for members only."}{" "}
            Create an account to join Spencer&apos;s Crossing Golf Club.
          </p>
          <div className="mt-6 flex flex-col gap-3">
            <Link
              href="/signup"
              className="rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-emerald-700"
            >
              Create Account
            </Link>
            <Link
              href="/signin"
              className="text-sm font-medium text-stone-600 hover:text-emerald-600"
            >
              Already have an account? Sign in
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
