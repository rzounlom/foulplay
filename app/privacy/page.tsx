import type { Metadata } from "next";
import { LegalDraftBanner } from "@/components/legal/draft-banner";

export const metadata: Metadata = {
  title: "Privacy Policy (Draft) — FoulPlay",
  description: "Draft privacy policy for FoulPlay. Owner and legal review required.",
  robots: { index: false, follow: false },
};

export default function PrivacyPage() {
  return (
    <article className="mx-auto w-full max-w-3xl px-4 py-10 text-sm leading-6 text-neutral-200 space-y-6">
      <LegalDraftBanner />
      <header className="space-y-2">
        <h1 className="text-3xl font-bold text-white">Privacy Policy</h1>
        <p className="text-neutral-400">
          Draft dated 23 November 2026. Last reviewed: not yet. Operator: Zoun
          Media / FoulPlay (owner contact to be confirmed).
        </p>
      </header>

      <section className="space-y-2">
        <h2 className="text-xl font-semibold text-white">What this product is</h2>
        <p>
          FoulPlay is a real-time social card game played while watching football
          or basketball. Players sign in, join a private room, submit cards when
          on-screen events happen, vote, and score points. Party mode includes
          honor-system drinking suggestions. FoulPlay does not sell alcohol and
          does not involve gambling or cash prizes.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-semibold text-white">Information we collect</h2>
        <p>Based on the current application and database schema:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>
            <strong>Account:</strong> Clerk authentication identifiers, display
            name, and email address as provided by Clerk.
          </li>
          <li>
            <strong>Profile:</strong> optional nickname, game counts, points
            totals, tour preference, and self-reported 21+ confirmation with a
            timestamp.
          </li>
          <li>
            <strong>Gameplay:</strong> rooms, players, card instances,
            submissions, votes, scores, chat messages, and rematch state.
          </li>
          <li>
            <strong>Billing:</strong> Stripe customer and subscription
            identifiers, plan status, Game Night pass expiry, and lifetime
            access flags. Card numbers are handled by Stripe, not stored in
            FoulPlay&apos;s database.
          </li>
          <li>
            <strong>Product analytics:</strong> named events (for example room
            created, game started, paywall shown) stored in our database and,
            if configured, posted to an analytics webhook.
          </li>
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-semibold text-white">Processors we use</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li>Clerk — authentication and account sessions</li>
          <li>Neon / PostgreSQL — application data</li>
          <li>Ably — realtime room events</li>
          <li>Upstash QStash — delayed auto-accept jobs</li>
          <li>Stripe — payments and customer portal</li>
          <li>Vercel — hosting (if production is deployed there)</li>
        </ul>
        <p className="text-amber-200">
          [OWNER REVIEW] Confirm each vendor&apos;s data-processing terms and
          whether a DPA is in place.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-semibold text-white">How we use information</h2>
        <p>
          To operate the game, authenticate users, enforce free-hosting limits,
          process host upgrades, send realtime updates, auto-accept timed votes,
          and understand product usage. We do not sell personal information.
          [OWNER REVIEW] Confirm advertising/partner-strip data sharing, if any.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-semibold text-white">Retention</h2>
        <p>
          Gameplay records currently remain until deleted by operators. There is
          no automated retention schedule in the application today.
        </p>
        <p className="text-amber-200">
          [OWNER REVIEW] Decide how long rooms, chat, analytics, and billing
          identifiers are kept.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-semibold text-white">Account deletion</h2>
        <p>
          The product does not currently include an in-app &quot;delete my
          account&quot; button. Clerk may allow users to delete their Clerk
          account. FoulPlay database rows are not automatically purged when a
          Clerk account is deleted.
        </p>
        <p className="text-amber-200">
          [OWNER REVIEW] Provide a deletion request email and a process to
          remove Clerk + database records. Do not publish this policy as final
          until that process exists.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-semibold text-white">Cookies and similar tech</h2>
        <p>
          Clerk session cookies keep you signed in. We do not currently use a
          separate advertising cookie banner. [OWNER REVIEW] If analytics or ads
          expand, update this section.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-semibold text-white">Children</h2>
        <p>
          FoulPlay is not directed at children under 13. Drinking modes require
          a self-reported confirmation that the user is 21 or older. We do not
          independently verify government ID.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-semibold text-white">Contact</h2>
        <p className="text-amber-200">
          [OWNER REVIEW] Add a privacy contact email before production.
        </p>
      </section>
    </article>
  );
}
