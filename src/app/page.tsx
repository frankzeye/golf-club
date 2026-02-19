import Link from "next/link";
import { Header } from "@/components/Header";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export default async function Home() {
  const session = await getServerSession(authOptions);
  const isLoggedIn = !!session;

  return (
    <div className="flex min-h-screen flex-col bg-stone-50">
      <Header />
      <main className="mx-auto flex max-w-4xl flex-1 flex-col items-center justify-center px-4 py-16">
        <div className="text-center">
          <h2 className="font-serif text-3xl font-semibold text-stone-900 sm:text-4xl">
            Welcome to your club
          </h2>
          <p className="mt-3 max-w-md text-stone-600">
            Connect with fellow members, manage your handicap, and stay in the
            loop with club news and events.
          </p>
          <Link
            href={isLoggedIn ? "/profile" : "/signup"}
            className="mt-8 inline-block rounded-lg bg-emerald-600 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-emerald-700"
          >
            {isLoggedIn ? "My Profile" : "Create an account"}
          </Link>
        </div>
      </main>
    </div>
  );
}
