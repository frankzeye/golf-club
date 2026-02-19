import Link from "next/link";
import { Header } from "@/components/Header";

export default function TermsOfUsePage() {
  return (
    <div className="flex min-h-screen flex-col bg-stone-50">
      <Header />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-12">
        <Link
          href="/"
          className="text-sm text-emerald-600 hover:text-emerald-700"
        >
          ← Back
        </Link>
        <h1 className="mt-6 font-serif text-2xl font-semibold text-stone-900">
          Terms of Use
        </h1>
        <div className="mt-6 space-y-4 text-sm text-stone-600">
          <p>
            By accessing and using the Spencer&apos;s Crossing Golf Club member portal,
            you agree to these Terms of Use.
          </p>
          <p>
            You must provide accurate information when registering and maintain
            the security of your account credentials. You are responsible for
            all activity under your account.
          </p>
          <p>
            The portal and its content are for personal, non-commercial use by
            club members. You agree not to misuse the platform, harass other
            members, or violate any applicable laws.
          </p>
          <p>
            The Club reserves the right to modify these terms. Continued use of
            the portal after changes constitutes acceptance. We may suspend or
            terminate access for violations.
          </p>
          <p>
            If you have questions about these terms, please contact the club
            administration.
          </p>
        </div>
      </main>
    </div>
  );
}
