/**
 * THE RUNNER — every detector over a supplied evidence bundle, into ONE immutable findings output.
 *
 * 🔴 IT KNOWS NOTHING ABOUT WHAT IT IS EXAMINING. It takes a bundle of generic evidence, runs the
 * six comparisons, and writes down what came back. No subject list, no expected classes, no labels,
 * no counts. Whatever this is pointed at, it does the same thing.
 *
 * 🔴 A DETECTOR THAT THROWS IS RECORDED, NOT SWALLOWED. A crash is a result — a class about which
 * nothing is known — and it is written into the output as such. Letting an exception escape would
 * leave a shorter output that still looked complete, which is the most dangerous shape of all: an
 * examination that scores well because it stopped early.
 */
import { assertOutcomes, unknown, notApplicable } from "./outcome.mjs";
import { detectClaimVsProducer } from "./claim-producer.mjs";
import { detectClaimVsRegistry } from "./claim-registry.mjs";
import { detectDeclaredVsServed } from "./declared-served.mjs";
import { detectSitemapVsObserved } from "./sitemap-observed.mjs";
import { detectCountVsData } from "./count-data.mjs";
import { detectSourceLinkVsRendered } from "./link-render.mjs";

/** The six capabilities, each bound to the slice of the bundle it reads. Order is fixed so two runs diff. */
export const DETECTORS = Object.freeze([
  Object.freeze({ key: "A", name: "claim-vs-producer", run: (b) => detectClaimVsProducer(b.claimProducer) }),
  Object.freeze({ key: "B", name: "claim-vs-source-registry", run: (b) => detectClaimVsRegistry(b.claimRegistry) }),
  Object.freeze({ key: "C", name: "declared-vs-served", run: (b) => detectDeclaredVsServed(b.declaredServed) }),
  Object.freeze({ key: "D", name: "sitemap-vs-observed", run: (b) => detectSitemapVsObserved(b.sitemapObserved) }),
  Object.freeze({ key: "E", name: "rendered-count-vs-data", run: (b) => detectCountVsData(b.countData) }),
  Object.freeze({ key: "F", name: "source-link-vs-rendered-link", run: (b) => detectSourceLinkVsRendered(b.linkRender) }),
]);

/**
 * Run every detector. Returns `{ runAt, detectors: [{key, name, outcomes}] }`.
 *
 * `runAt` is DECLARED by the caller — a date is a measurement, and a runner that stamps its own
 * clock produces a different output for the same evidence every time, which cannot be hashed.
 */
export function runDetectors({ bundle, runAt } = {}) {
  if (bundle === undefined || bundle === null || typeof bundle !== "object") {
    throw new TypeError("runDetectors({bundle}): a bundle is required — there is no empty default, because an empty run would report six silent detectors as a clean sweep");
  }
  if (typeof runAt !== "string" || !/^\d{4}-\d{2}-\d{2}T/.test(runAt)) {
    throw new TypeError(`runAt must be a declared ISO timestamp, got ${JSON.stringify(runAt)} — the runner does not read a clock`);
  }

  const detectors = DETECTORS.map(({ key, name, run }) => {
    let outcomes;
    try {
      outcomes = assertOutcomes(run(bundle) ?? [], { detector: name });
      if (outcomes.length === 0) {
        /* 🔴 AN EMPTY RESULT IS NOT A CLEAN RESULT. A detector handed nothing to examine has
         * measured nothing, and must say so in the output rather than contribute silence. */
        outcomes = [unknown({ detector: name, subject: "(no subject supplied)", reasonCode: "INPUT_ABSENT", detail: "the bundle carried no input for this detector, so it examined nothing" })];
      }
    } catch (e) {
      outcomes = [unknown({ detector: name, subject: "(detector threw)", reasonCode: "INPUT_UNREADABLE", detail: `the detector threw: ${e.message}` })];
    }

    /* 🔴 EVERY PAGE GETS A DISPOSITION FROM EVERY COMPARATOR, OR IT WOULD SIMPLY BE ABSENT.
     *
     * A page this comparator produced nothing about was not examined by it — and a page nobody
     * examined must never be readable as clean. It is recorded as NOT_APPLICABLE, which is unscored
     * but VISIBLE, rather than left out of the findings where silence would do the work of a pass.
     *
     * This is the fourth disposition doing its job: "nothing of this kind is on this page" is a true
     * statement about a control that neither fails it nor earns it a tick, and it is emitted here
     * rather than collapsed into UNKNOWN — which under Amendment 2 would fail every control. */
    const seen = new Set(outcomes.map((o) => o.subject));
    const pageSubjects = Array.isArray(bundle.pageSubjects) ? bundle.pageSubjects : [];
    for (const subject of pageSubjects) {
      if (seen.has(subject)) continue;
      outcomes.push(notApplicable({
        detector: name, subject, reasonCode: "NO_CANDIDATE_OF_THIS_KIND",
        examined: [`the page was in the examined population of ${pageSubjects.length}`, `${name} discovered no candidate of its kind on it`],
        summary: "examined, and it carries nothing of the kind this comparator judges",
      }));
    }
    return Object.freeze({ key, name, outcomes: Object.freeze(outcomes) });
  });

  return Object.freeze({ runAt, detectors: Object.freeze(detectors) });
}

/**
 * The findings output, canonically serialised so the same evidence hashes the same on any machine.
 * Sorted, LF, no clock beyond the declared `runAt`.
 */
export function serialiseFindings(result) {
  const rows = [];
  for (const d of result.detectors) {
    for (const o of d.outcomes) {
      rows.push({
        detectorKey: d.key,
        detector: o.detector,
        subject: o.subject,
        outcome: o.outcome,
        defectClass: o.defectClass ?? null,
        reasonCode: o.reasonCode ?? null,
        summary: o.summary ?? null,
        detail: o.detail ?? null,
        evidence: o.evidence ? [...o.evidence] : null,
        checked: o.checked ? [...o.checked] : null,
        examined: o.examined ? [...o.examined] : null,
      });
    }
  }
  rows.sort((a, b) => (a.detectorKey + a.subject).localeCompare(b.detectorKey + b.subject));
  return JSON.stringify({ runAt: result.runAt, rows }, null, 2) + "\n";
}
