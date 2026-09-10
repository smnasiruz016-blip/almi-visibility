import type { Metadata } from "next";
import Link from "next/link";
import { OET_TASKS } from "@/lib/oet/registry";
import { SUBTEST_LABEL } from "@/lib/oet/types";
import { PROFESSION_LIST } from "@/lib/oet/professions";
import { BELOW_PUBLISHED_BANDS, formatRange, fractionToEstimate } from "@/lib/oet/scale";
import type { OetSubTest } from "@prisma/client";
import { TestimonialsSection } from "@/components/reviews/TestimonialsSection";
import { GlobalHeader } from "@/components/GlobalHeader";

// Re-render hourly so newly approved testimonials appear without a redeploy.
export const revalidate = 3600;

// Homepage self-brands. `absolute` opts out of the root layout's title
// template so the brand appears exactly once.
export const metadata: Metadata = {
  title: {
    absolute: "OET Practice Test — Clear or Borderline | AlmiOET",
  },
  description:
    "OET practice on the real 0–500 scale with an A–E grade per sub-test — see if you're Clear or Borderline before exam day. All 12 healthcare professions. Original material.",
  openGraph: {
    title: "AlmiOET — honest Occupational English Test practice for healthcare",
    description:
      "Original practice on the real 0–500 scale, with an A–E grade per sub-test shown as a range, not an inflated number.",
  },
};

const SUBTEST_ORDER: OetSubTest[] = ["LISTENING", "READING", "WRITING", "SPEAKING"];

const PROMISES = [
  {
    title: "Built around the real OET",
    detail:
      "Four sub-tests on the real 0–500 scale with an A–E grade each — Listening and Reading common to every profession, Writing and Speaking specific to yours.",
  },
  {
    title: "Honest estimates, shown as ranges",
    detail:
      "We never invent a precise OET number. You see each sub-test as a range with the most-likely grade — because honest prep means showing the uncertainty.",
  },
  {
    title: "Original material",
    detail: "Every consultation, text, case note and role-play is written from scratch — never copied from OET.",
  },
  {
    title: "Feedback you can act on",
    detail:
      "AI feedback on your clinical letter and role-play points to what to fix next — against the real OET criteria, constructive and never inflated.",
  },
] as const;

const PRICING_LINES = [
  "Honest AI feedback on the Writing letter and Speaking role-play",
  "Auto-marked Listening and Reading practice on every attempt",
  "A 0–500 estimate and A–E grade per sub-test, shown as ranges",
  "All 12 professions — Nursing, Medicine, Pharmacy and more",
  "Original practice material — never copied from OET",
  "$12/month with a 7-day free trial, cancel anytime",
] as const;

const FAQ = [
  {
    q: "How is the Occupational English Test scored?",
    a: "Each of the four sub-tests (Listening, Reading, Writing, Speaking) is scored from 0 to 500 in 10-point steps, mapped to a grade from A to E. Since January 2025 OET also reports an overall score alongside them, and most regulators still set their requirement per sub-test — commonly Grade B (350). AlmiOET estimates each sub-test from your practice and shows it as a range with the most-likely grade; we do not calculate an overall, because we would rather show you nothing than a number we invented.",
  },
  {
    q: "What grade do I need?",
    a: "Most regulators ask for Grade B (a score of 350) in each sub-test, but requirements differ by country and profession. AlmiOET shows where your practice sits relative to that benchmark — but always confirm the exact score you need with your own regulator.",
  },
  {
    q: "Is AlmiOET practice copied from OET?",
    a: "No. Every consultation, reading text, case note and role-play is original, written from scratch to mirror the real task types. We never copy or reproduce OET's material.",
  },
  {
    q: "Which professions are covered?",
    a: "All 12 OET professions: Nursing, Medicine, Dentistry, Dietetics, Occupational Therapy, Optometry, Pharmacy, Physiotherapy, Podiatry, Radiography, Speech Pathology and Veterinary Science. Listening and Reading are shared; Writing and Speaking are specific to your profession.",
  },
  {
    q: "Is my AlmiOET score my real OET result?",
    a: "No. It's a practice estimate to guide your prep. Your real grade comes only from an official Occupational English Test — confirm requirements with your regulator.",
  },
  {
    q: "How much does AlmiOET cost?",
    a: "$12 per month after a 7-day free trial, monthly only, cancel anytime. The trial needs a card and gives you all four sub-tests; during the trial, AI feedback is limited to 2 Writing and 2 Speaking evaluations. Cancel before day 7 and you are not charged.",
  },
] as const;

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQ.map((f) => ({
    "@type": "Question",
    name: f.q,
    acceptedAnswer: { "@type": "Answer", text: f.a },
  })),
};

// Illustrative sample — clearly labelled, never a real user, never a real OET score.
//
// 🔴 DERIVED FROM THE SCORING ENGINE, NOT HAND-COPIED FROM IT.
//
// This used to be four hard-coded strings: "350–450"/"B" and "280–400"/"C+".
// They matched fractionToEstimate() on the day someone typed them and nothing
// bound them to it afterwards, so a change to BUCKETS or GRADE_FLOORS would have
// left the homepage advertising numbers the product no longer produces — silently,
// with no gate able to see it. That is the same failure as a comment claiming a
// number is verified: a copy that looks authoritative and answers to nothing.
//
// Now each row is whatever fractionToEstimate() actually returns for its fraction.
// The fractions were chosen so the RENDERED PAGE IS UNCHANGED by this edit:
//
//     0.85 → [350, 450] midpoint 400 → Grade B    ("350–450 · B")
//     0.75 → [280, 400] midpoint 340 → Grade C+   ("280–400 · C+")
//
// If the engine changes, this card changes with it. That is the point.
const SAMPLE_FRACTIONS: { name: string; fraction: number }[] = [
  { name: "Listening", fraction: 0.85 },
  { name: "Reading", fraction: 0.85 },
  { name: "Writing", fraction: 0.75 },
  { name: "Speaking", fraction: 0.85 },
];

const SAMPLE = SAMPLE_FRACTIONS.map(({ name, fraction }) => {
  const estimate = fractionToEstimate(fraction);
  return {
    name,
    range: formatRange([estimate.lo, estimate.hi]),
    // null means the midpoint sits below every band OET publishes. The sample
    // card obeys the same rule as a real result rather than printing a letter.
    grade: estimate.grade ?? BELOW_PUBLISHED_BANDS,
  };
});

function ScoreMockup() {
  return (
    <div className="relative mx-auto w-full max-w-sm">
      <div className="rounded-3xl border border-almi-bg-peach bg-almi-paper p-6 shadow-xl">
        <div className="flex items-center justify-between">
          <p className="text-xs font-bold uppercase tracking-wider text-almi-text-muted">Sample estimate</p>
          <span className="rounded-full bg-almi-bg-peach px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-almi-ink">Sample</span>
        </div>
        <ul className="mt-4 space-y-2.5">
          {SAMPLE.map((s) => (
            <li key={s.name} className="flex items-baseline justify-between text-sm">
              <span className="font-medium text-almi-ink">{s.name}</span>
              <span className="font-semibold text-almi-coral-deep">
                {s.range} · {s.grade}
              </span>
            </li>
          ))}
        </ul>
        <div className="mt-4 rounded-xl border border-almi-bg-peach bg-almi-bg px-4 py-3">
          <p className="text-xs text-almi-text-muted">
            A range and grade per sub-test — never one inflated number, and never an overall we invented.
          </p>
        </div>
      </div>
      <p className="mt-2 text-center text-xs text-almi-text-muted">Illustrative example — not a real score.</p>
    </div>
  );
}

export default function Home() {
  return (
    <div className="flex flex-1 flex-col bg-almi-bg text-almi-text">
      {/* 🔴 SIGNED-OUT ON PURPOSE, AND THIS IS THE TRADE-OFF NAMED.
          This page is `○ (Static)` and the `export const revalidate = 3600`
          above is a deliberate hourly ISR. Reading the session for the header —
          here or in the root layout — would make that line do nothing and turn
          the marketing homepage into a function invocation, with a
          prisma.review.findMany, on every visit. So a signed-in learner sees the
          signed-out nav here and only here (plus /forgot-password and the 404).
          Every page a learner actually practises on is already dynamic and gets
          the real one. */}
      <GlobalHeader user={null} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />

      {/* Hero */}
      <section className="relative isolate overflow-hidden bg-gradient-to-br from-almi-bg via-almi-bg to-almi-bg-peach px-6 pt-16 pb-20 sm:pt-20">
        <div aria-hidden className="pointer-events-none absolute -right-16 -top-16 z-0 h-96 w-96 rounded-full bg-almi-accent/20 blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute -bottom-16 -left-16 z-0 h-80 w-80 rounded-full bg-almi-coral/10 blur-3xl" />
        <div className="relative z-10 mx-auto grid max-w-6xl items-center gap-12 md:grid-cols-2">
          <div>
            <p className="text-sm font-bold uppercase tracking-widest text-almi-accent-deep">AlmiOET · Occupational English Test</p>
            <h1 className="mt-4 text-balance text-4xl font-semibold leading-[1.08] text-almi-ink sm:text-5xl">
              Practise the OET for healthcare with <span className="text-almi-coral">honest AI feedback.</span>
            </h1>
            <p className="mt-5 text-lg text-almi-text">
              Original practice on the real 0–500 scale, with an A–E grade for each sub-test — and Writing
              and Speaking tailored to your profession, so you know what to work on next.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                href="/signup"
                className="inline-flex min-h-[48px] items-center justify-center rounded-full bg-almi-coral px-7 py-3 text-base font-semibold text-almi-ink hover:bg-almi-coral-deep focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-almi-coral/30"
              >
                Start 7-day free trial
              </Link>
              <Link href="/login" className="text-sm font-medium text-almi-coral hover:underline">
                Already have an account? Log in →
              </Link>
            </div>
            <p className="mt-4 text-sm text-almi-text-muted">
              $12/month after a 7-day free trial, cancel anytime · All four sub-tests · Original material, never copied from OET
            </p>
          </div>
          <ScoreMockup />
        </div>
      </section>

      {/* Honest hook */}
      <section className="border-t border-almi-bg-peach bg-almi-paper px-6 py-16">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-center text-3xl font-semibold text-almi-ink">An honest estimate, not a fake score</h2>
          <p className="mt-5 text-base text-almi-text">
            The Occupational English Test grades each sub-test from 0 to 500 with a letter from A to E.
            The exact raw-to-score conversion is the test owner&apos;s and varies by test form — so anyone
            promising you a precise number from practice is guessing. AlmiOET does the honest thing
            instead: we estimate each sub-test from your practice and show it as a range with the
            most-likely grade, relative to the Grade B (350) benchmark most regulators ask for.
          </p>
          <p className="mt-4 text-base text-almi-text">
            One principle runs through it: <strong className="text-almi-ink">tell you the truth.</strong> Honest
            feedback, original material, and a clear read on what to work on next.
          </p>
        </div>
      </section>

      {/* Sub-test cards */}
      <section className="px-6 py-16">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-center text-3xl font-semibold text-almi-ink">The four OET sub-tests</h2>
          <p className="mx-auto mt-3 max-w-2xl text-center text-base text-almi-text-muted">
            Listening and Reading are common to every profession. Writing and
            Speaking are graded with honest AI feedback against the real OET criteria.
          </p>
          <ul className="mt-10 grid gap-4 md:grid-cols-2">
            {SUBTEST_ORDER.map((subTest) => {
              const parts = Object.values(OET_TASKS).filter((t) => t.subTest === subTest);
              const isAi = parts.some((t) => t.scoringMode === "AI");
              return (
                <li key={subTest} className="flex h-full flex-col rounded-2xl border border-almi-bg-peach bg-almi-paper p-6">
                  <div className="flex items-baseline justify-between gap-3">
                    <h3 className="text-lg font-semibold text-almi-ink">{SUBTEST_LABEL[subTest]}</h3>
                    <span className="text-xs text-almi-text-muted">{isAi ? "AI feedback" : "Auto-marked"}</span>
                  </div>
                  <p className="mt-2 flex-1 text-sm text-almi-text">{parts[0]?.blurb}</p>
                  <span className="mt-3 text-xs text-almi-text-muted">
                    {parts.length} {parts.length === 1 ? "task" : "parts"} · 0–500 scale, A–E grade
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      {/* Professions */}
      <section className="border-t border-almi-bg-peach bg-almi-bg-peach/40 px-6 py-16">
        <div className="mx-auto max-w-4xl">
          <h2 className="text-center text-3xl font-semibold text-almi-ink">All 12 healthcare professions</h2>
          <p className="mx-auto mt-3 max-w-2xl text-center text-base text-almi-text-muted">
            Choose your profession and your Writing and Speaking practice matches your field.
          </p>
          <ul className="mt-8 flex flex-wrap justify-center gap-2">
            {PROFESSION_LIST.map((p) => (
              <li key={p.profession} className="rounded-full border border-almi-bg-peach bg-almi-paper px-4 py-1.5 text-sm text-almi-ink">
                {p.label}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Why honest */}
      <section className="px-6 py-16">
        <div className="mx-auto max-w-4xl">
          <h2 className="text-center text-3xl font-semibold text-almi-ink">Honest scoring on the real scale</h2>
          <ul className="mt-10 grid gap-4 sm:grid-cols-2">
            {PROMISES.map((p) => (
              <li key={p.title} className="flex items-start gap-3 rounded-2xl border border-almi-bg-peach bg-almi-paper p-5">
                <span aria-hidden className="mt-0.5 flex-shrink-0 select-none font-bold text-almi-teal">✓</span>
                <p className="text-sm text-almi-text">
                  <span className="font-semibold text-almi-ink">{p.title}</span>
                  {" — "}
                  {p.detail}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Pricing */}
      <section className="border-t border-almi-bg-peach bg-almi-paper px-6 py-16">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-3xl font-semibold text-almi-ink">Simple, honest pricing</h2>
          <p className="mt-3 text-xl font-semibold text-almi-ink">$12/month — 7-day free trial, cancel anytime.</p>
          <ul className="mx-auto mt-6 max-w-xl space-y-2 text-left text-sm text-almi-text">
            {PRICING_LINES.map((line) => (
              <li key={line} className="flex items-start gap-2">
                <span aria-hidden className="mt-0.5 flex-shrink-0 select-none font-bold text-almi-teal">✓</span>
                <span>{line}</span>
              </li>
            ))}
          </ul>
          <div className="mt-8">
            <Link href="/signup" className="inline-flex min-h-[48px] items-center justify-center rounded-full bg-almi-coral px-7 py-3 text-base font-semibold text-almi-ink hover:bg-almi-coral-deep">
              Start 7-day free trial
            </Link>
          </div>
          <p className="mt-4 text-sm text-almi-text-muted">
            <Link href="/pricing" className="underline hover:text-almi-ink">See full pricing</Link>
          </p>
        </div>
      </section>

      {/* FAQ */}
      <section className="px-6 py-16">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-center text-3xl font-semibold text-almi-ink">Common questions</h2>
          <dl className="mt-10 space-y-6">
            {FAQ.map((f) => (
              <div key={f.q} className="rounded-2xl border border-almi-bg-peach bg-almi-bg p-6">
                <dt className="text-lg font-semibold text-almi-ink">{f.q}</dt>
                <dd className="mt-2 text-sm text-almi-text">{f.a}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* Testimonials (renders only when 3+ approved reviews exist) */}
      <TestimonialsSection />

      {/* Final CTA */}
      <section className="border-t border-almi-bg-peach bg-almi-paper px-6 py-16">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-semibold text-almi-ink">Practise honestly. Walk in ready.</h2>
          <p className="mt-3 text-base text-almi-text">
            Real OET sub-tests, honest per-sub-test estimates, original material — for $12/month with a
            7-day free trial.
          </p>
          <div className="mt-8">
            <Link href="/signup" className="inline-flex min-h-[48px] items-center justify-center rounded-full bg-almi-coral px-7 py-3 text-base font-semibold text-almi-ink hover:bg-almi-coral-deep">
              Start 7-day free trial
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
