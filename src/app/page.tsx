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
          <img
            src="/logo-welcome.png"
            alt="Spencer's Crossing Golf Club"
            className="mx-auto max-w-sm sm:max-w-md"
          />
          <p className="mt-3 max-w-md text-stone-600">
            Create an account in order to register for our next tournament!
          </p>
          <Link
            href={isLoggedIn ? "/profile" : "/signup"}
            className="mt-8 inline-block rounded-lg bg-emerald-600 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-emerald-700"
          >
            {isLoggedIn ? "My Profile" : "Create Account"}
          </Link>
        </div>
      </main>
    </div>
  );
}
