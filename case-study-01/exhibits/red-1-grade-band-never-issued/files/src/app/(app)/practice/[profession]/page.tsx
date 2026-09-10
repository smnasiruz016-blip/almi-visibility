// One profession's material, grouped the way a real OET sitting is: Listening ·
// Reading · Writing · Speaking.
//
// Every count on this page is the learner's OWN pool, read from the database at
// request time through poolWhere() — the same filter pickItemId draws from, so a
// card cannot advertise a number the picker would not serve. Writing and Speaking
// therefore read 15, not the 180 the bank holds across twelve professions.
//
// 🔴 WHAT IS COMMON IS SAID OUT LOUD. Listening and Reading are identical for
// every profession; only Writing and Speaking are profession-specific. That is
// true of the exam, and leaving it unsaid on a page organised BY profession would
// imply twelve separate Listening banks that do not exist.

import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { hasPaidAccess } from "@/lib/billing/plans";
import { OET_TASKS, taskBySlug } from "@/lib/oet/registry";
import type { TaskDef } from "@/lib/oet/registry";
import { SUBTEST_LABEL, isPerProfession } from "@/lib/oet/types";
import { PROFESSION_LIST, professionBySlug } from "@/lib/oet/professions";
import { poolCounts, completedCounts } from "@/lib/oet/pool";
import { parseProfession, setTargetProfession } from "@/lib/oet/set-profession";
import type { OetSubTest } from "@prisma/client";

const SUBTEST_ORDER: OetSubTest[] = ["LISTENING", "READING", "WRITING", "SPEAKING"];

async function switchProfession(formData: FormData) {
  "use server";
  const user = await requireUser();
  const profession = parseProfession(formData.get("profession"));
  await setTargetProfession(user.id, profession);
  redirect("/practice");
}

function TaskCard({
  def,
  professionSlug,
  total,
  done,
}: {
  def: TaskDef;
  professionSlug: string;
  total: number;
  done: number;
}) {
  const tag = def.scoringMode === "AI" ? "AI feedback" : "Auto-marked";
  const inner = (
    <>
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-base font-semibold text-almi-ink">{def.label}</h3>
        <span className="text-xs text-almi-text-muted">{def.live ? tag : "Coming soon"}</span>
      </div>
      <p className="mt-2 text-sm text-almi-text">{def.blurb}</p>
      {def.live && (
        <p className="mt-3 flex flex-wrap items-baseline gap-x-2 text-sm">
          {/* Tagged so a gate can read this number back OUT of the rendered
              markup rather than trusting the prop that went in. `total` is
              poolCounts() for this task and this profession — see
              tests/pool-visible.test.tsx, which fails if a literal appears
              here. */}
          <span
            data-testid="task-card-count"
            data-task-type={def.taskType}
            className="font-semibold text-almi-ink"
          >
            {total} {total === 1 ? "exercise" : "exercises"}
          </span>
          <span className="text-almi-text-muted">
            {done > 0 ? `· you’ve done ${done}` : "· none done yet"}
          </span>
        </p>
      )}
      <p className="mt-3 text-sm font-semibold">
        {def.live ? (
          <span className="text-almi-coral">Browse &amp; practise →</span>
        ) : (
          <span className="text-almi-text-muted">Coming soon</span>
        )}
      </p>
    </>
  );
  return def.live ? (
    <Link
      href={`/practice/${professionSlug}/${def.slug}`}
      className="rounded-2xl border border-almi-bg-peach bg-almi-paper p-5 shadow-sm transition hover:border-almi-accent"
    >
      {inner}
    </Link>
  ) : (
    <div className="rounded-2xl border border-almi-bg-peach bg-almi-bg p-5 opacity-80">{inner}</div>
  );
}

export default async function ProfessionPracticePage({
  params,
}: {
  params: Promise<{ profession: string }>;
}) {
  const user = await requireUser();
  if (!hasPaidAccess(user)) redirect("/pricing");
  const { profession: slug } = await params;

  // ── OLD LINKS KEEP WORKING ────────────────────────────────────────────────
  // /practice/<task-slug> used to be the task page and now collides with this
  // dynamic segment. Rather than 404 a bookmark, a task slug is recognised and
  // forwarded to the same task under the learner's profession. With no
  // profession set there is nowhere honest to send them, so they choose one
  // first — the task slug is preserved in the URL they land on afterwards.
  const asTask = taskBySlug(slug);
  if (asTask) {
    const mine = user.targetProfession
      ? PROFESSION_LIST.find((p) => p.profession === user.targetProfession)
      : undefined;
    redirect(mine ? `/practice/${mine.slug}/${asTask.slug}` : "/practice");
  }

  const def = professionBySlug(slug);
  if (!def) notFound();

  // 🔴 A GET MUST NOT MUTATE. THIS PAGE WRITES NOTHING.
  //
  // It used to call setTargetProfession() here, on the reasoning that viewing a
  // profession is the same statement as choosing it. That was wrong, and the
  // consequence was concrete: opening somebody's shared /practice/dentistry link
  // silently changed YOUR profession, and the next Writing task you were served
  // came from a bank you never chose. A read that rewrites the reader's account
  // is a defect however tidy it makes the page.
  //
  // The URL is now the source of truth for what is DISPLAYED, and nothing else.
  // targetProfession changes only through an explicit POST, in one writer
  // (src/lib/oet/set-profession.ts), from a tile the learner actually clicked.
  //
  // The worry that motivated the write — that the page could show one
  // profession's material under another's name — is answered by NAMING it below
  // rather than by silently reconciling it.
  const viewing = def.profession;
  const stored = user.targetProfession ?? null;
  const viewingSomeoneElses = stored !== null && stored !== viewing;
  const storedDef = stored ? PROFESSION_LIST.find((p) => p.profession === stored) : undefined;
  const noProfessionSet = stored === null;

  const [totals, done] = await Promise.all([
    poolCounts(def.profession),
    completedCounts(user.id, def.profession),
  ]);
  const tasks = Object.values(OET_TASKS);

  return (
    <div className="space-y-8">
      <header>
        <p className="text-xs font-bold uppercase tracking-wider text-almi-accent-deep">
          AlmiOET ·{" "}
          <Link href="/practice" className="underline">
            Change profession
          </Link>
        </p>
        <h1 className="mt-1 text-3xl font-semibold text-almi-ink">{def.label}</h1>
        <p className="mt-2 max-w-2xl text-sm text-almi-text">{def.blurb}</p>
      </header>

      {/* Named, not reconciled. Plain words, always visible, no modal. */}
      {viewingSomeoneElses && storedDef && (
        <div
          data-testid="profession-mismatch-notice"
          className="rounded-xl border border-almi-accent/40 bg-almi-accent/10 px-4 py-3 text-sm text-almi-ink"
        >
          You&apos;re viewing <span className="font-semibold">{def.label}</span>. Your profession is{" "}
          <span className="font-semibold">{storedDef.label}</span> — that is what a practice set
          or a mock will draw your Writing and Speaking from until you change it.{" "}
          <Link href="/practice" className="font-semibold underline">
            Switch to {def.label}
          </Link>
          .
        </div>
      )}
      {noProfessionSet && (
        <div
          data-testid="profession-mismatch-notice"
          className="rounded-xl border border-almi-accent/40 bg-almi-accent/10 px-4 py-3 text-sm text-almi-ink"
        >
          You&apos;re viewing <span className="font-semibold">{def.label}</span>, but you
          haven&apos;t set a profession yet.{" "}
          <Link href="/practice" className="font-semibold underline">
            Choose {def.label}
          </Link>{" "}
          and your Writing and Speaking will come from it.
        </div>
      )}

      <p className="rounded-xl border border-almi-bg-peach bg-almi-paper px-4 py-3 text-sm text-almi-text">
        <span className="font-semibold text-almi-ink">
          Listening and Reading below are the same for every profession.
        </span>{" "}
        Only the Writing and Speaking material is specific to {def.label} — that is how the real OET
        is built. Each sub-test is estimated on the 0–500 scale with an A–E grade, shown as a range.
      </p>

      {SUBTEST_ORDER.map((subTest) => {
        const group = tasks.filter((t) => t.subTest === subTest);
        if (group.length === 0) return null;
        const perProfession = isPerProfession(subTest);
        return (
          <section key={subTest}>
            <div className="flex flex-wrap items-baseline gap-x-3">
              <h2 className="text-sm font-bold uppercase tracking-wider text-almi-text-muted">
                {SUBTEST_LABEL[subTest]}
              </h2>
              <span className="text-xs text-almi-text-muted">
                {perProfession ? `specific to ${def.label}` : "common to all professions"}
              </span>
            </div>
            <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {group.map((t) => (
                <TaskCard
                  key={t.taskType}
                  def={t}
                  professionSlug={def.slug}
                  total={totals[t.taskType] ?? 0}
                  done={done[t.taskType] ?? 0}
                />
              ))}
            </div>
          </section>
        );
      })}

      <section className="rounded-2xl border border-almi-accent/40 bg-almi-accent/10 p-5">
        <h2 className="text-base font-semibold text-almi-ink">Full mock test</h2>
        <p className="mt-1 text-sm text-almi-text">
          All four sub-tests in exam order, from one complete form, with {def.label} Writing and
          Speaking.
        </p>
        <Link
          href="/practice/mock"
          className="mt-4 inline-flex min-h-[44px] items-center justify-center rounded-full bg-almi-coral px-6 py-3 text-sm font-semibold text-almi-ink hover:bg-almi-coral-deep"
        >
          Start a full mock →
        </Link>
      </section>

      <form action={switchProfession}>
        <input type="hidden" name="profession" value="" />
        <button type="submit" className="text-xs font-semibold text-almi-text-muted underline">
          Clear my profession
        </button>
      </form>
    </div>
  );
}
