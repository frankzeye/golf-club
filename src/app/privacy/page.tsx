import Link from "next/link";
import { Header } from "@/components/Header";

export default function PrivacyPolicyPage() {
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
          Privacy Policy
        </h1>
        <div className="mt-6 space-y-4 text-sm text-stone-600">
          <p>
            Spencer&apos;s Crossing Golf Club (&quot;we&quot;, &quot;our&quot;, or &quot;the Club&quot;) is committed
            to protecting your privacy. This policy explains how we collect,
            use, and safeguard your personal information when you use our member
            portal.
          </p>
          <p>
            We collect information you provide when creating an account, updating
            your profile, and participating in club activities. We use this
            information to operate the portal, communicate with members, and
            manage tournaments and events.
          </p>
          <p>
            We do not sell your personal information. We may share information
            with service providers who assist in operating the portal, and we
            may disclose information when required by law.
          </p>
          <p>
            If you have questions about this policy, please contact the club
            administration.
          </p>
        </div>
      </main>
    </div>
  );
}
