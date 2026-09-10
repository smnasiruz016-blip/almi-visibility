// Session driver: walks the user through a practice set or the full mock.
// IN_PROGRESS step → composer; SCORED step → per-step result + advance; all
// steps done → the aggregate result. Advancing is an explicit server action.

import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getSessionView, advanceSession } from "@/lib/oet/session";
import { continuePracticeChain } from "@/lib/oet/entry";
import { chainView, libraryHrefFor } from "@/lib/oet/chain";
import { OET_TASKS } from "@/lib/oet/registry";
import { speakingPrepPolicy } from "@/lib/oet/prep-policy";
import { OetComposer } from "@/components/oet/composer-map";
import { ExamChrome } from "@/components/oet/ExamChrome";
import { ExamPageRail } from "@/components/oet/ExamPageRail";
import { ExamNav } from "@/components/oet/ExamNav";
import { isSealedSection, sealedSectionNotice } from "@/lib/oet/section-rules";
import { OetResult } from "@/components/oet/OetResult";
import { OetSessionResult } from "@/components/oet/OetSessionResult";
import { ChainNext } from "@/components/oet/ChainNext";
import type { OetTaskType } from "@prisma/client";

// Strip any server-only answer key before sending the payload to the client.
// Objective items keep their questions/gaps but lose the `answer` field; audio
// scripts never go to the client (audio is fetched server-side).
function sanitizePayload(taskType: OetTaskType, payload: unknown): unknown {
  const p = payload as Record<string, unknown>;
  if (taskType === "LISTENING_PART_A") {
    const gaps = (p.gaps as { id: string; label: string }[] | undefined) ?? [];
    return { gaps: gaps.map((g) => ({ id: g.id, label: g.label })) };
  }
  if (taskType === "LISTENING_PART_B" || taskType === "LISTENING_PART_C") {
    const questions = (p.questions as { id: string; stem: string; options: unknown[] }[] | undefined) ?? [];
    return { questions: questions.map((q) => ({ id: q.id, stem: q.stem, options: q.options })) };
  }
  if (taskType === "READING_PART_A") {
    const questions = (p.questions as { id: string; stem: string; options?: unknown[] }[] | undefined) ?? [];
    return {
      texts: p.texts,
      questions: questions.map((q) => ({ id: q.id, stem: q.stem, options: q.options })),
    };
  }
  if (taskType === "READING_PART_B" || taskType === "READING_PART_C") {
    const questions = (p.questions as { id: string; stem: string; options: unknown[] }[] | undefined) ?? [];
    return {
      passages: p.passages,
      questions: questions.map((q) => ({ id: q.id, stem: q.stem, options: q.options })),
    };
  }
  if (taskType === "SPEAKING_ROLEPLAY") {
    // The candidate sees their own card, not the patient's hidden concern —
    // drawing that out is part of the task and what the grader scores.
    const { patientConcern: _omit, ...rest } = p as { patientConcern?: unknown };
    void _omit;
    return rest;
  }
  // Writing payloads carry no objective answer key.
  return payload;
}

export default async function SessionPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const user = await requireUser();
  const { sessionId } = await params;
  const session = await getSessionView(sessionId, user.id);
  if (!session) notFound();

  if (session.status === "COMPLETED") {
    // 🔴 THE CHAIN. A finished practice set now offers the NEXT exercise in the
    // same pool, in the same order the list page numbers them, instead of
    // dead-ending on a link back to the library. A mock has no single task type
    // to continue within, so it gets no chain and keeps its old ending.
    //
    // Everything here is read from the database at request time: the total, the
    // position, the title. Nothing on this screen is a literal.
    const chain =
      session.mode === "PRACTICE_SET" && session.attempts.length > 0
        ? await chainView({
            taskType: session.attempts[0].taskType,
            profession: session.profession,
            userId: user.id,
            excludeIds: session.attempts.map((a) => a.itemId),
            userProfession: user.targetProfession ?? null,
          })
        : null;

    async function continueChain(formData: FormData) {
      "use server";
      // The form carries a session id and, for the explicit start-over, a flag.
      // It carries no item id: which exercise comes next is decided server-side
      // from the session row, and the entitlement check runs first — see
      // src/lib/oet/entry.ts.
      await continuePracticeChain(sessionId, {
        restart: String(formData.get("restart") ?? "") === "1",
      });
    }

    return (
      <OetSessionResult
        session={session}
        attempts={session.attempts}
        chain={chain}
        continueAction={continueChain}
      />
    );
  }

  const current = session.attempts.find((a) => a.sessionStep === session.currentStep);
  if (!current) notFound();

  const def = OET_TASKS[current.taskType];
  // The set length is stated as a set length, not left to be inferred. "Step 1 of
  // 3" alone reads as "there are 3 of these in total" when the bank holds 21.
  const stepLabel = `Step ${session.currentStep + 1} of ${session.targetCount}`;
  // Link back to the library UNDER a profession segment. Shared sub-tests
  // (Listening/Reading) carry no profession on the session, so the link borrows
  // the learner's own — the list is identical for every profession — instead of
  // dropping them on the chooser. libraryHrefFor is the same function the
  // results screen and the chain use, so all three point at one page.
  const libraryHref = libraryHrefFor(
    current.taskType,
    session.profession,
    user.targetProfession ?? null,
  );
  const setLabel =
    session.mode === "MOCK"
      ? `${session.targetCount} items in this mock`
      : `${session.targetCount} ${session.targetCount === 1 ? "item" : "items"} in this set`;
  const isLast = session.currentStep + 1 >= session.targetCount;

  if (current.status === "SCORED") {
    async function advance() {
      "use server";
      const u = await requireUser();
      await advanceSession(sessionId, u.id);
      redirect(`/practice/session/${sessionId}`);
    }

    // 🔴 THE CHAIN REACHES THE END OF EVERY ITEM, NOT ONLY THE END OF A SET.
    //
    // PRACTICE_SET_STEPS is 3, so until now "Next exercise →" appeared after
    // THREE completed items — the feature built to let a learner walk the
    // library was itself three exercises away. Nasir hit exactly that:
    // "i think need to fill and submit the test to be able to click next."
    //
    // The set flow below is untouched: "Next step →" / "See results →" stay the
    // primary action and PRACTICE_SET_STEPS stays at 3. This is an ADDITIONAL
    // exit, and it is the same component, the same server action and the same
    // entitlement check as the one on the set result.
    //
    // A mock is excluded: its plan spans four sub-tests, so there is no single
    // task pool to continue within.
    const stepChain =
      session.mode === "PRACTICE_SET"
        ? await chainView({
            taskType: current.taskType,
            profession: session.profession,
            userId: user.id,
            // Everything this session has served so far. Steps beyond the
            // current one do not exist yet, so leaving mid-set strands nothing.
            excludeIds: session.attempts.map((a) => a.itemId),
            userProfession: user.targetProfession ?? null,
          })
        : null;

    async function continueChainFromStep(formData: FormData) {
      "use server";
      await continuePracticeChain(sessionId, {
        restart: String(formData.get("restart") ?? "") === "1",
      });
    }

    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <p className="text-xs font-bold uppercase tracking-wider text-almi-text-muted">{stepLabel}</p>
        <OetResult def={def} item={current.item} attempt={current} variant="step" />
        <form action={advance}>
          <button
            type="submit"
            data-testid="advance-set-button"
            className="inline-flex min-h-[48px] items-center justify-center rounded-full bg-almi-coral px-7 py-3 text-base font-semibold text-almi-ink hover:bg-almi-coral-deep"
          >
            {isLast ? "See results →" : "Next step →"}
          </button>
        </form>
        {stepChain && (
          <ChainNext chain={stepChain} continueAction={continueChainFromStep} tone="secondary" />
        )}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header>
        <p className="text-xs font-bold uppercase tracking-wider text-almi-accent-deep">
          {def.label} · {stepLabel}
        </p>
        <p className="mt-1 text-xs text-almi-text-muted">
          {setLabel}. Your full library is on the{" "}
          <a href={libraryHref} className="font-medium underline">
            {def.label}
          </a>{" "}
          page.
        </p>
        <h1 data-testid="session-item-title" className="mt-1 text-2xl font-semibold text-almi-ink">
          {current.item.title}
        </h1>
      </header>
      <ExamChrome
        sectionLabel={def.label}
        pageNumber={session.currentStep + 1}
        pageCount={session.targetCount}
        onFinishHref={libraryHref}
        rail={
          <ExamPageRail pageNumber={session.currentStep + 1} pageCount={session.targetCount} />
        }
        nav={
          <ExamNav
            sealedNotice={
              isSealedSection(current.taskType) ? sealedSectionNotice(def.label) : undefined
            }
          />
        }
      >
      <OetComposer
        attemptId={current.id}
        taskType={current.taskType}
        prompt={current.item.prompt}
        payload={sanitizePayload(current.taskType, current.item.payload)}
        // Derived from the session row, never decided here. MOCK = mandatory
        // preparation; PRACTICE_SET = skippable with the explanation shown. An
        // unrecognised mode falls back to mandatory. See prep-policy.ts.
        allowSkipPreparation={speakingPrepPolicy(session).allowSkip}
        // The server's clock, as an ISO string. The countdown renders from this
        // so a reload recomputes the time left instead of restarting it.
        deadlineAt={current.deadlineAt ? current.deadlineAt.toISOString() : null}
      />
      </ExamChrome>
    </div>
  );
}
