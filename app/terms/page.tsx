import type { Metadata } from "next";
import { LegalDraftBanner } from "@/components/legal/draft-banner";

export const metadata: Metadata = {
  title: "Terms of Service (Draft) — FoulPlay",
  description: "Draft terms of service for FoulPlay. Owner and legal review required.",
  robots: { index: false, follow: false },
};

export default function TermsPage() {
  return (
    <article className="mx-auto w-full max-w-3xl px-4 py-10 text-sm leading-6 text-neutral-200 space-y-6">
      <LegalDraftBanner />
      <header className="space-y-2">
        <h1 className="text-3xl font-bold text-white">Terms of Service</h1>
        <p className="text-neutral-400">
          Draft dated 23 November 2026. Not legally approved. Operator entity,
          governing law, and contact email still need owner review.
        </p>
      </header>

      <section className="space-y-2">
        <h2 className="text-xl font-semibold text-white">The service</h2>
        <p>
          FoulPlay is a social, real-time card game for private watch parties.
          You create or join a room, receive cards describing sports events, tap
          a card when that event happens, and other players accept or reject it.
          Accepted cards award points. The host ends the game. A rematch
          (&quot;Run It Back&quot;) may start a new lobby.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-semibold text-white">Eligibility and age</h2>
        <p>
          You must be able to form a contract in your jurisdiction. Before
          playing, you are asked to confirm whether you are 21 or older. If you
          are under 21, the product is intended to limit you to non-drinking
          (points-only) mode. Age is self-reported; FoulPlay does not check
          identification.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-semibold text-white">Alcohol</h2>
        <p>
          Party mode may display drinking-penalty suggestions. Those suggestions
          are optional, honor-system, and not a sale of alcohol. Do not drink if
          you are under 21, pregnant, or if drinking would be unsafe or illegal
          for you. Never drink and drive. FoulPlay is not responsible for
          alcohol consumption by players.
        </p>
        <p className="text-amber-200">
          [OWNER REVIEW] Confirm this alcohol disclaimer with counsel before
          production.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-semibold text-white">Accounts</h2>
        <p>
          You sign in with Clerk. You are responsible for activity on your
          account. Do not harass other players, cheat by exploiting bugs, or
          attempt to access rooms, APIs, or data you are not authorized to use.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-semibold text-white">Hosting limits and billing</h2>
        <p>
          Free hosts may create a limited number of private games per day and
          rooms have a free player cap. Premium hosting (Game Night Pass $2.99,
          monthly $7.99, lifetime $79.99) is charged by Stripe when enabled.
          Players joining a room do not pay to play; the host may upgrade.
          Subscriptions can be managed through the Stripe customer portal when
          configured. Refunds: [OWNER REVIEW].
        </p>
        <p>
          Live billing is not enabled until the production go/no-go checklist
          passes. Test-mode purchases are not real charges.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-semibold text-white">Acceptable use</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li>No illegal activity, including providing alcohol to minors.</li>
          <li>No scraping, load-testing, or attacking production systems.</li>
          <li>No impersonation of other players or the operator.</li>
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-semibold text-white">Disclaimers</h2>
        <p>
          The service is provided as-is. Sports events, card definitions, and
          scores are for entertainment. Realtime delivery depends on third
          parties (Clerk, Ably, Stripe, QStash, hosting) and may fail.
        </p>
        <p className="text-amber-200">
          [OWNER REVIEW] Add limitation of liability, indemnity, governing law,
          and dispute resolution.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-semibold text-white">Changes</h2>
        <p>
          We may update these terms. Material changes should be posted on this
          page with a new date. [OWNER REVIEW] Confirm notice method.
        </p>
      </section>
    </article>
  );
}
