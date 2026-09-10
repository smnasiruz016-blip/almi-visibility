// One progress section on /account — "Produzione scritta" or "Produzione orale".
//
// Ported from AlmiPrep's /account ("Recent writing", "My speaking attempts"): a heading, a
// "Practise X →" link, then either an empty state or a list of attempts with their result.
//
// ── THE LABEL IS NOT OPTIONAL ───────────────────────────────────────────────
// Every score on this page is an ESTIMATE from a language model, not a result from the awarding
// body. The full report carries that in EstimateReport, which prints ESTIMATE_DISCLAIMER above
// the number every time. A list is exactly where that gets lost: the rows are terse and the
// disclaimer looks like clutter next to a small number.
//
// So the label is rendered per row AND once for the section. `ProgressAttempt.isEstimate` is
// typed `true` rather than `boolean` so a row cannot reach here claiming to be anything else.
//
// ── THE EMPTY STATE IS A REAL STATE ─────────────────────────────────────────
// A learner with no attempts must see a sentence explaining what would appear here and how to
// start — not a blank box that reads as a page which failed to load.

import Link from "next/link";
import { ESTIMATE_LABEL } from "@/lib/ai/schemas";
import type { ProgressAttempt } from "@/lib/progress";

const STATUS_COPY: Record<NonNullable<ProgressAttempt["score"]>["status"], string> = {
  CLEAR: "Sopra la soglia",
  BORDERLINE: "Al limite",
  BELOW: "Sotto la soglia",
};

const STATUS_CLASS: Record<NonNullable<ProgressAttempt["score"]>["status"], string> = {
  CLEAR: "text-almi-ink",
  BORDERLINE: "text-almi-coral-text",
  BELOW: "text-almi-text-muted",
};

export function ProgressSection({
  title,
  practiseHref,
  practiseLabel,
  emptyLine,
  attempts,
}: {
  title: string;
  practiseHref: string;
  practiseLabel: string;
  emptyLine: string;
  attempts: ProgressAttempt[];
}) {
  return (
    <section className="mt-8 rounded-2xl border border-almi-line bg-almi-paper p-6">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-lg font-semibold text-almi-ink">{title}</h2>
        <Link href={practiseHref} className="text-xs font-medium text-almi-link underline">
          {practiseLabel} →
        </Link>
      </div>

      {attempts.length === 0 ? (
        <p className="mt-3 text-sm text-almi-text-muted">{emptyLine}</p>
      ) : (
        <>
          <p className="mt-1 text-xs text-almi-text-muted">
            Ogni punteggio qui è una <strong className="font-semibold">stima</strong> del nostro
            strumento, non un risultato ufficiale dell&apos;ente d&apos;esame.
          </p>
          <ul className="mt-4 space-y-2 text-sm">
            {attempts.map((a) => (
              <li
                key={a.id}
                className="flex items-center justify-between gap-4 rounded-xl border border-almi-bg-peach bg-almi-bg px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="font-medium text-almi-ink">
                    {a.exam.replace(/_/g, " ")} · {a.level}
                  </p>
                  <p className="text-xs text-almi-text-muted">
                    {a.createdAt.toLocaleDateString("it-IT", { day: "numeric", month: "long", year: "numeric" })}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  {a.score ? (
                    <>
                      <p className={`font-semibold ${STATUS_CLASS[a.score.status]}`}>
                        {a.score.value}/{a.score.max}
                      </p>
                      <p className="text-xs text-almi-text-muted">
                        {STATUS_COPY[a.score.status]} · {ESTIMATE_LABEL === "ESTIMATE" ? "stima" : ESTIMATE_LABEL}
                      </p>
                    </>
                  ) : (
                    // A row whose stored evaluation carries no readable score. Saying so is
                    // better than printing a zero the learner would read as a mark of nothing.
                    <p className="text-xs text-almi-text-muted">Valutata · nessun punteggio di sezione</p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
