"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { AvatarWithSash } from "@/components/AvatarWithSash";
import { ClubLogo } from "@/components/ClubLogo";

const NAV_LINKS = [
  { href: "/tournaments", label: "Tournaments" },
  { href: "/social-rounds", label: "Social Rounds" },
  { href: "/tee-times", label: "Tee Times" },
  { href: "/surveys", label: "Surveys" },
  { href: "/members", label: "Members" },
] as const;

const linkClass =
  "text-sm font-medium text-stone-600 hover:text-emerald-600";

const mobileLinkClass =
  "block rounded-lg px-3 py-2.5 text-sm font-medium text-stone-700 hover:bg-stone-50 hover:text-emerald-600";

export function Header() {
  const { data: session, status } = useSession();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        mobileMenuRef.current &&
        !mobileMenuRef.current.contains(e.target as Node)
      ) {
        setMobileMenuOpen(false);
      }
      if (
        profileMenuRef.current &&
        !profileMenuRef.current.contains(e.target as Node)
      ) {
        setProfileMenuOpen(false);
      }
    };
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!mobileMenuOpen) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileMenuOpen(false);
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [mobileMenuOpen]);

  const closeMobileMenu = () => setMobileMenuOpen(false);

  const isAdmin = session?.user?.role === "admin";
  const navLinks = NAV_LINKS.filter(
    (item) => item.href !== "/social-rounds" || isAdmin
  );
  const showSignedIn = status === "authenticated" && !!session;

  return (
    <header className="relative border-b border-stone-200 bg-white">
      <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4">
        <Link href="/" className="flex items-center hover:opacity-90">
          <ClubLogo />
        </Link>

        {status === "loading" ? (
          <>
            <nav className="hidden items-center gap-6 md:flex">
              {navLinks.map((item) => (
                <Link key={item.href} href={item.href} className={linkClass}>
                  {item.label}
                </Link>
              ))}
              <Link href="/signin" className={linkClass}>
                Sign in
              </Link>
              <Link
                href="/signup"
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
              >
                Create Account
              </Link>
            </nav>
            <div className="md:hidden">
              <button
                type="button"
                onClick={() => setMobileMenuOpen((o) => !o)}
                className="flex h-10 w-10 items-center justify-center rounded-lg border border-stone-200 text-stone-600 hover:bg-stone-50 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                aria-expanded={mobileMenuOpen}
                aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
              >
                <MenuIcon open={mobileMenuOpen} />
              </button>
            </div>
          </>
        ) : (
          <>
            {/* Desktop navigation */}
            <nav className="hidden items-center gap-6 md:flex">
              {navLinks.map((item) => (
                <Link key={item.href} href={item.href} className={linkClass}>
                  {item.label}
                </Link>
              ))}
              {showSignedIn ? (
                <div className="relative" ref={profileMenuRef}>
                  <button
                    type="button"
                    onClick={() => setProfileMenuOpen((o) => !o)}
                    className="flex h-9 w-9 overflow-hidden rounded-full border-2 border-stone-200 ring-2 ring-transparent transition-colors hover:ring-stone-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    aria-expanded={profileMenuOpen}
                    aria-haspopup="true"
                    aria-label="Account menu"
                  >
                    <AvatarWithSash
                      imageUrl={session.user?.image ?? null}
                      alt="Profile"
                      fill
                      fallback={
                        session.user?.name?.[0]?.toUpperCase() ?? "?"
                      }
                    />
                  </button>
                  {profileMenuOpen && (
                    <div className="absolute right-0 top-full z-10 mt-2 w-48 rounded-lg border border-stone-200 bg-white py-1 shadow-lg">
                      <Link
                        href="/profile"
                        className="block px-4 py-2 text-sm text-stone-700 hover:bg-stone-50"
                        onClick={() => setProfileMenuOpen(false)}
                      >
                        My Profile
                      </Link>
                      <button
                        onClick={() => {
                          setProfileMenuOpen(false);
                          signOut({ callbackUrl: "/" });
                        }}
                        className="block w-full px-4 py-2 text-left text-sm text-stone-700 hover:bg-stone-50"
                      >
                        Sign out
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <Link href="/signin" className={linkClass}>
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

            {/* Mobile hamburger */}
            <div className="md:hidden" ref={mobileMenuRef}>
              <button
                type="button"
                onClick={() => setMobileMenuOpen((o) => !o)}
                className="flex h-10 w-10 items-center justify-center rounded-lg border border-stone-200 text-stone-600 hover:bg-stone-50 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                aria-expanded={mobileMenuOpen}
                aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
              >
                <MenuIcon open={mobileMenuOpen} />
              </button>

              {mobileMenuOpen && (
                <div className="absolute left-0 right-0 top-full z-20 border-b border-stone-200 bg-white shadow-lg">
                  <nav className="mx-auto flex max-w-4xl flex-col gap-1 px-4 py-3">
                    {navLinks.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={mobileLinkClass}
                        onClick={closeMobileMenu}
                      >
                        {item.label}
                      </Link>
                    ))}
                    <div className="my-2 border-t border-stone-200" />
                    {showSignedIn ? (
                      <>
                        <Link
                          href="/profile"
                          className={mobileLinkClass}
                          onClick={closeMobileMenu}
                        >
                          My Profile
                        </Link>
                        <button
                          type="button"
                          onClick={() => {
                            closeMobileMenu();
                            signOut({ callbackUrl: "/" });
                          }}
                          className={`${mobileLinkClass} w-full text-left`}
                        >
                          Sign out
                        </button>
                      </>
                    ) : (
                      <>
                        <Link
                          href="/signin"
                          className={mobileLinkClass}
                          onClick={closeMobileMenu}
                        >
                          Sign in
                        </Link>
                        <Link
                          href="/signup"
                          className="mt-1 block rounded-lg bg-emerald-600 px-3 py-2.5 text-center text-sm font-medium text-white hover:bg-emerald-700"
                          onClick={closeMobileMenu}
                        >
                          Create Account
                        </Link>
                      </>
                    )}
                  </nav>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </header>
  );
}

function MenuIcon({ open }: { open: boolean }) {
  return (
    <svg
      className="h-5 w-5"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      aria-hidden
    >
      {open ? (
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M6 18L18 6M6 6l12 12"
        />
      ) : (
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
        />
      )}
    </svg>
  );
}
