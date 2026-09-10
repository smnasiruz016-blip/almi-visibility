// Privacy page.
//
// This product stores learner accounts and performance records and had no privacy policy at all.
//
// ── WHY THERE ARE NO BUTTONS ON THIS PAGE ───────────────────────────────────
// The obvious way to satisfy a privacy check is a "Download my data" and a "Delete my account"
// button. Neither exists in this app: there is no export route and no self-serve deletion route,
// and adding a button that opens a mailto: while looking like a product feature would be worse
// than having nothing — it would be a claim about a capability the product does not have, on the
// one page whose entire purpose is to be accurate about that.
//
// So the page states the real mechanism: email a named address, and what happens when you do.
// If a self-serve path is built later, this page changes WITH it, not before it.
//
// Every statement below was read off the schema and the code, not drafted from a template:
// the field list is prisma/schema.prisma's User + ItalianAttempt, "we never see your card" is
// true because checkout is Stripe-hosted and this app stores only stripeCustomerId /
// stripeSubscriptionId, and the retention line describes onDelete: Cascade, which is what the
// schema actually declares.

import type { Metadata } from "next";
import Link from "next/link";
import { canonical } from "@/lib/site";

export const metadata: Metadata = {
  title: "Privacy",
  description:
    "What AlmiItalian stores about you, why, how long for, and how to get it deleted. Plain list, no dark patterns.",
  alternates: { canonical: canonical("/privacy") },
};

const CONTACT = "almiworld@almiworld.com";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-10">
      <h2 className="text-xl font-semibold text-almi-ink">{title}</h2>
      <div className="mt-3 space-y-3 text-almi-text">{children}</div>
    </section>
  );
}

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <p className="text-xs font-semibold uppercase tracking-widest text-almi-coral-text">AlmiItalian</p>
      <h1 className="mt-3 text-3xl font-bold text-almi-ink">Privacy</h1>
      <p className="mt-4 text-almi-text">
        What we store, why we store it, and how to have it removed. If anything here does not
        match what the product actually does, that is a bug — tell us and we will fix the product
        or the page.
      </p>

      <Section title="What we store">
        <p>When you create an account:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>Your email address, and your name if you give us one.</li>
          <li>A one-way hash of your password. We cannot read your password, and neither can anyone who obtains the database.</li>
          <li>Whether your email is verified, and the exam you said you are preparing for.</li>
        </ul>
        <p>When you practise:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>Which items you attempted, the answers you gave, and the practice read-out we produced.</li>
          <li>When each attempt happened.</li>
        </ul>
        <p>When you record a speaking answer:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            The audio clip itself. It is uploaded to our file storage so you can play your own
            attempt back, and it is <strong>deleted after 30 days</strong>.
          </li>
          <li>
            A text transcript of what you said. Producing it means sending the clip to a
            third-party speech-to-text service. The transcript is kept with your attempt after
            the clip is gone, because the transcript is what the feedback refers to.
          </li>
          <li>
            The written feedback we generate from that transcript. It is an estimate produced by
            a language model, not an official mark.
          </li>
        </ul>
        <p>
          Listening clips you hear during practice are the same shared exam files for everyone.
          They are not recordings of you and nothing about them is stored against your account.
        </p>
        <p>If you subscribe:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>Your Stripe customer and subscription identifiers, your subscription status, and when the current period ends.</li>
          <li>
            <strong className="text-almi-ink">Not your card.</strong> Payment happens on Stripe&rsquo;s own
            checkout page. Card numbers never reach our servers, so we could not store them if we wanted to.
          </li>
        </ul>
      </Section>

      <Section title="What we do not do">
        <ul className="list-disc space-y-1 pl-5">
          <li>We do not sell or rent your data.</li>
          <li>We do not run advertising or third-party tracking pixels on this site.</li>
          <li>We do not use your practice answers to train models.</li>
          <li>
            We do not send marketing email. The only email we send is transactional: verification,
            password reset, and billing notices.
          </li>
        </ul>
      </Section>

      <Section title="Who else touches it">
        <ul className="list-disc space-y-1 pl-5">
          <li><strong className="text-almi-ink">Neon</strong> — the database that stores everything listed above.</li>
          <li><strong className="text-almi-ink">Vercel</strong> — hosts the site and serves requests.</li>
          <li><strong className="text-almi-ink">Stripe</strong> — takes payment and holds the card details we never see.</li>
          <li><strong className="text-almi-ink">Resend</strong> — delivers the transactional emails.</li>
        </ul>
        <p>
          Each is a processor acting on our instructions. We do not hand your data to anyone else.
        </p>
      </Section>

      <Section title="How long we keep it">
        <p>
          Your account and practice history stay until you ask us to delete them. When an account
          is deleted, its attempts, practice sessions and sign-in sessions are removed with it —
          that removal is enforced by the database, not by a script someone has to remember to run.
        </p>
        <p>
          Sign-in sessions expire on their own. Email verification and password-reset links are
          short-lived and single-use.
        </p>
      </Section>

      <Section title="Getting a copy, or getting it deleted">
        <p>
          There is no self-serve button for either yet, and we would rather say so than show you a
          control that does not work. Email{" "}
          <a className="text-almi-ink underline decoration-almi-coral underline-offset-4" href={`mailto:${CONTACT}`}>
            {CONTACT}
          </a>{" "}
          from the address on your account and say which you want.
        </p>
        <ul className="list-disc space-y-1 pl-5">
          <li><strong className="text-almi-ink">A copy</strong> — we send you everything listed on this page that belongs to your account.</li>
          <li><strong className="text-almi-ink">Deletion</strong> — we remove the account and everything attached to it. This cannot be undone.</li>
          <li>You can also ask us to correct anything that is wrong.</li>
        </ul>
        <p>
          If you have an active subscription, cancel it first from{" "}
          <Link className="text-almi-ink underline decoration-almi-coral underline-offset-4" href="/account">
            your account page
          </Link>{" "}
          — deleting the account here does not cancel billing at Stripe, and we will not quietly
          keep charging a deleted account.
        </p>
      </Section>

      <Section title="Cookies">
        <p>
          One cookie, for sign-in. It holds a session token, nothing about you, and it is what
          keeps you logged in between pages. There are no analytics or advertising cookies, which
          is why this site has no cookie banner asking you to accept any.
        </p>
      </Section>

      <Section title="Children">
        <p>
          AlmiItalian is built for adults preparing for CILS and CELI. We do not knowingly create
          accounts for children under 16. If you believe we hold data for one, email{" "}
          <a className="text-almi-ink underline decoration-almi-coral underline-offset-4" href={`mailto:${CONTACT}`}>
            {CONTACT}
          </a>{" "}
          and we will remove it.
        </p>
      </Section>

      <p className="mt-12 text-xs text-almi-text-muted">
        Questions about any of this go to{" "}
        <a className="underline" href={`mailto:${CONTACT}`}>{CONTACT}</a>.
      </p>
    </main>
  );
}
