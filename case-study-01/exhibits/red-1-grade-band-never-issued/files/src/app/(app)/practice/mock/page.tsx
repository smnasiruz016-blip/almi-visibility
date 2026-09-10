// Full mock start page. All four sub-tests in OET order (Listening → Reading →
// Writing → Speaking), each scored independently into its own 0–500 grade. The
// mock includes AI tasks and is built for the user's profession, so it needs a
// subscription and a chosen profession.

import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPaidAccess } from "@/lib/billing/plans";
import { beginMockSession } from "@/lib/oet/entry";

async function startMockAction() {
  "use server";
  // The entitlement check, the profession check and the session creation all
  // live in the one door — src/lib/oet/entry.ts. This page no longer keeps its
  // own copy of the guard, so it cannot drift from the other two entry points.
  await beginMockSession();
}

export default async function MockStartPage() {
  const user = await requireUser();
  const needsPaid = !hasPaidAccess(user);
  const needsProfession = !user.targetProfession;

  // Offer to resume an unfinished mock rather than always starting fresh.
  const inProgress =
    needsPaid || needsProfession
      ? null
      : await prisma.oetSession.findFirst({
          where: { userId: user.id, mode: "MOCK", status: "IN_PROGRESS" },
          orderBy: { startedAt: "desc" },
          select: { id: true, currentStep: true, targetCount: true },
        });

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <p className="text-xs font-bold uppercase tracking-wider text-almi-accent-deep">AlmiOET</p>
      <h1 className="text-3xl font-semibold text-almi-ink">Full mock</h1>
      <p className="text-base text-almi-text">
        A full-length practice run across all four sub-tests in OET order — Listening, Reading, the
        clinical-letter Writing task and two Speaking role-plays — in one sitting. Listening and
        Reading are common; Writing and Speaking come from your profession&apos;s bank.
      </p>

      <div className="rounded-2xl border border-almi-bg-peach bg-almi-paper p-5 text-sm text-almi-text">
        <p>
          At the end you get an honest 0–500 estimate and an A–E grade for each sub-test — shown as a
          range, not a single number. OET also reports an overall score (since January 2025); we
          don&apos;t estimate that one, because we won&apos;t invent a figure to sit beside real results.
        </p>
      </div>

      {needsProfession ? (
        <div className="rounded-xl border border-almi-accent/40 bg-almi-accent/10 px-4 py-3 text-sm text-almi-ink">
          Choose your healthcare profession first so the Writing and Speaking tasks match your field.{" "}
          <a href="/account" className="font-semibold underline">
            Set your profession
          </a>
          .
        </div>
      ) : needsPaid ? (
        <div className="rounded-xl border border-almi-accent/40 bg-almi-accent/10 px-4 py-3 text-sm text-almi-ink">
          The full mock includes AI feedback and is part of a subscription.{" "}
          <a href="/pricing" className="font-semibold underline">
            See plans
          </a>
          .
        </div>
      ) : (
        <div className="space-y-3">
          {inProgress && (
            <div className="rounded-xl border border-almi-teal/30 bg-almi-teal/5 px-4 py-4">
              <p className="text-sm font-semibold text-almi-ink">
                You have a mock in progress — step {inProgress.currentStep + 1} of{" "}
                {inProgress.targetCount}.
              </p>
              <Link
                href={`/practice/session/${inProgress.id}`}
                className="mt-3 inline-flex min-h-[44px] items-center justify-center rounded-full bg-almi-teal px-6 py-2.5 text-sm font-semibold text-white hover:opacity-90"
              >
                Resume mock →
              </Link>
            </div>
          )}
          <form action={startMockAction}>
            <button
              type="submit"
              className="inline-flex min-h-[48px] items-center justify-center rounded-full bg-almi-coral px-7 py-3 text-base font-semibold text-almi-ink hover:bg-almi-coral-deep"
            >
              {inProgress ? "Start a new mock →" : "Begin full mock →"}
            </button>
          </form>
        </div>
      )}

      <p className="text-xs text-almi-text-muted">
        Original to AlmiOET — never copied from OET. Results are a practice estimate, not an official
        Occupational English Test result.
      </p>
    </div>
  );
}
