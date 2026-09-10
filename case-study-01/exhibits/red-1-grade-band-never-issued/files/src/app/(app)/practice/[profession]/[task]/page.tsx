// Task page: the browsable library for ONE task type under ONE profession, and
// the way into a practice set.
//
// Objective tasks (Listening/Reading) run a short practice set; AI tasks
// (Writing/Speaking) run a single item. Both continue through the "Next
// exercise →" chain on the results screen, so set length is no longer the size
// of what a learner can do in a sitting.
//
// 🔴 THE LIST IS SHOWN TO A LOCKED LEARNER TOO. It used to be
// `const pool = needsPaid ? [] : await listPool(...)`, which was a correct
// paywall and a bad screen: a learner arriving under a card that says "Browse &
// practise" got a page with nothing on it to browse, and no way to tell whether
// the bank held one exercise or twenty-one. They now see the same numbered list,
// titles only and no Start button. Nothing from `payload` — no passage, no
// question, no key — is on this page in either state.

import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { hasPaidAccess } from "@/lib/billing/plans";
import { PRACTICE_SET_STEPS } from "@/lib/oet/session";
import { beginPracticeSession } from "@/lib/oet/entry";
import { taskBySlug } from "@/lib/oet/registry";
import { SUBTEST_LABEL, isPerProfession } from "@/lib/oet/types";
import { listPool } from "@/lib/oet/pool";
import { professionBySlug } from "@/lib/oet/professions";
import { ExerciseList } from "@/components/oet/ExerciseList";

async function beginAction(formData: FormData) {
  "use server";
  // Every check lives behind this one call — entitlement first, then the task,
  // then the profession. See the header of src/lib/oet/entry.ts for why there is
  // exactly one door and this page no longer holds its own copy of the guard.
  await beginPracticeSession({
    taskSlug: String(formData.get("slug") ?? ""),
    professionSlug: String(formData.get("professionSlug") ?? ""),
    itemId: String(formData.get("itemId") ?? "").trim() || null,
  });
}

export default async function TaskStartPage({
  params,
  searchParams,
}: {
  params: Promise<{ profession: string; task: string }>;
  searchParams: Promise<{ empty?: string }>;
}) {
  const user = await requireUser();
  const { profession: professionSlug, task } = await params;
  // The profession segment is part of the URL, so a wrong one must not silently
  // serve another profession's material under its name.
  const professionDef = professionBySlug(professionSlug);
  if (!professionDef) notFound();
  const { empty } = await searchParams;
  const def = taskBySlug(task);
  if (!def || !def.live) notFound();

  const isObjective = def.scoringMode === "DETERMINISTIC";
  const needsPaid = !hasPaidAccess(user);

  // 🔴 THE BROWSABLE LIST. Every exercise this learner can be given, from the
  // database, at request time — the same pool the picker draws from and the same
  // order the "Next exercise →" chain walks. Before this, the only way to reach
  // an exercise was to be handed a random one, so a bank of 21 was
  // indistinguishable from a bank of 1.
  // The profession comes from the URL segment, already validated against the
  // registry, so this page cannot show one profession's material under another's
  // name even if the learner's stored profession says otherwise.
  const profession = isPerProfession(def.subTest) ? professionDef.profession : null;
  const pool = await listPool(def.taskType, profession, user.id);
  const setSize = isObjective ? PRACTICE_SET_STEPS : 1;
  const doneCount = pool.filter((e) => e.status === "SCORED").length;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <p className="text-xs font-bold uppercase tracking-wider text-almi-accent-deep">
        AlmiOET · {SUBTEST_LABEL[def.subTest]}
      </p>
      <h1 className="text-3xl font-semibold text-almi-ink">{def.label}</h1>
      <p className="text-base text-almi-text">{def.blurb}</p>

      <div className="rounded-2xl border border-almi-bg-peach bg-almi-paper p-5 text-sm text-almi-text">
        <p>
          <span className="font-semibold text-almi-ink">Scoring:</span>{" "}
          {isObjective ? "auto-marked instantly" : "honest AI trait feedback"}, turned into a 0–500
          practice estimate and an A–E grade for {SUBTEST_LABEL[def.subTest]}.
        </p>
      </div>

      {empty && (
        <p className="rounded-xl border border-almi-coral/40 bg-almi-coral/5 px-4 py-3 text-sm text-almi-coral-deep">
          No practice items are seeded for this task yet.
        </p>
      )}

      <div className="space-y-6">
        <div className="rounded-2xl border border-almi-bg-peach bg-almi-paper p-5">
          {/* The count is `pool.length` — the length of the very list rendered
              below it, so the sentence and the list cannot disagree. */}
          <p className="text-sm text-almi-text">
            <span data-testid="pool-count-sentence" className="font-semibold text-almi-ink">
              {pool.length} {pool.length === 1 ? "exercise" : "exercises"} available
            </span>{" "}
            in {def.label}
            {doneCount > 0 ? ` · you’ve done ${doneCount}` : ""}. A practice set serves{" "}
            <span className="font-semibold text-almi-ink">
              {setSize} {setSize === 1 ? "item" : "items"}
            </span>
            , and “Next exercise →” at the end carries straight on through the list.
          </p>

          {needsPaid ? (
            <div className="mt-4 rounded-xl border border-almi-accent/40 bg-almi-accent/10 px-4 py-3 text-sm text-almi-ink">
              Practice is part of a subscription, and the 7-day trial is free.{" "}
              <a href="/pricing" className="font-semibold underline">
                See plans
              </a>{" "}
              — the 7-day trial covers all four sub-tests.
            </div>
          ) : (
            <form action={beginAction} className="mt-4">
              <input type="hidden" name="slug" value={def.slug} />
              <input type="hidden" name="professionSlug" value={professionDef.slug} />
              <button
                type="submit"
                className="inline-flex min-h-[48px] items-center justify-center rounded-full bg-almi-coral px-7 py-3 text-base font-semibold text-almi-ink hover:bg-almi-coral-deep"
              >
                Start a set of {setSize} →
              </button>
            </form>
          )}
        </div>

        {/* Locked learners get the same rows without `beginAction`, so no form
            and no button is rendered for them at all. */}
        <ExerciseList
          rows={pool}
          taskSlug={def.slug}
          professionSlug={professionDef.slug}
          beginAction={needsPaid ? undefined : beginAction}
        />
      </div>

      <p className="text-xs text-almi-text-muted">
        Original to AlmiOET — never copied from OET. Results are a practice estimate, not an official
        Occupational English Test result.
      </p>
    </div>
  );
}
