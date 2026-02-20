"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { AvatarWithSash } from "@/components/AvatarWithSash";

export function Header() {
  const { data: session, status } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  return (
    <header className="border-b border-stone-200 bg-white">
      <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4">
        <Link
          href="/"
          className="flex items-center hover:opacity-90"
        >
          <img
            src="/logo.png"
            alt="Spencer's Crossing Golf Club"
            className="h-10 w-auto"
          />
        </Link>
        <nav className="flex items-center gap-6">
          {status === "loading" ? (
            <span className="text-sm text-stone-400">Loading…</span>
          ) : session ? (
            <>
              <Link
                href="/tournaments"
                className="text-sm font-medium text-stone-600 hover:text-emerald-600"
              >
                Tournaments
              </Link>
              <Link
                href="/members"
                className="text-sm font-medium text-stone-600 hover:text-emerald-600"
              >
                Members
              </Link>
              <div className="relative" ref={menuRef}>
                <button
                  type="button"
                  onClick={() => setMenuOpen((o) => !o)}
                  className="flex h-9 w-9 overflow-hidden rounded-full border-2 border-stone-200 ring-2 ring-transparent transition-colors hover:ring-stone-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  aria-expanded={menuOpen}
                  aria-haspopup="true"
                >
                  <AvatarWithSash
                    imageUrl={session.user?.image ?? null}
                    alt="Profile"
                    size="md"
                    fallback={session.user?.name?.[0]?.toUpperCase() ?? "?"}
                    className="h-full w-full"
                  />
                </button>
                {menuOpen && (
                  <div className="absolute right-0 top-full z-10 mt-2 w-48 rounded-lg border border-stone-200 bg-white py-1 shadow-lg">
                    <Link
                      href="/profile"
                      className="block px-4 py-2 text-sm text-stone-700 hover:bg-stone-50"
                      onClick={() => setMenuOpen(false)}
                    >
                      My Profile
                    </Link>
                    <button
                      onClick={() => {
                        setMenuOpen(false);
                        signOut({ callbackUrl: "/" });
                      }}
                      className="block w-full px-4 py-2 text-left text-sm text-stone-700 hover:bg-stone-50"
                    >
                      Sign out
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <Link
                href="/signin"
                className="text-sm font-medium text-stone-600 hover:text-emerald-600"
              >
                Sign in
              </Link>
              <Link
                href="/signup"
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
              >
                Create Account
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
