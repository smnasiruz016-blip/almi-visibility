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
import { subjectRef, refLabel } from "./subject.mjs";
import { evidenceEdge, bindSubject, effectiveOutcome } from "./binding.mjs";
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
export function runDetectors({ bundle, runAt, tenantId } = {}) {
  if (bundle === undefined || bundle === null || typeof bundle !== "object") {
    throw new TypeError("runDetectors({bundle}): a bundle is required — there is no empty default, because an empty run would report six silent detectors as a clean sweep");
  }
  if (typeof runAt !== "string" || !/^\d{4}-\d{2}-\d{2}T/.test(runAt)) {
    throw new TypeError(`runAt must be a declared ISO timestamp, got ${JSON.stringify(runAt)} — the runner does not read a clock`);
  }
  /* 🔴 THE TENANT IS DECLARED BY THE CALLER AND HAS NO DEFAULT. A run with no tenant cannot isolate
   * anything, and "the usual tenant" is exactly the assumption that lets one tenant's evidence reach
   * another's subject. Absent, every envelope below binds INVALID and nothing leaves as a finding. */
  const tenant = typeof tenantId === "string" && tenantId.trim() !== "" ? tenantId : null;

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
    /* 🔴 THE ONE SHARED INTEGRATION POINT. Every A–F result leaves through here and nowhere else,
     * so the envelope cannot be bypassed by a detector, present or future. */
    const enveloped = outcomes.map((o) => envelopeOf({ detectorKey: key, detectorName: name, outcome: o, tenant, bundle }));
    return Object.freeze({ key, name, outcomes: Object.freeze(enveloped) });
  });

  return Object.freeze({ runAt, tenantId: tenant, detectors: Object.freeze(detectors) });
}

/**
 * 🔴 WRAP ONE RESULT — AND REFUSE TO LET AN UNBOUND ONE LEAVE AS A FINDING.
 *
 * The subject is read from what the run already holds, never invented. A page subject is one of the
 * bundle's own captured pages; anything else is a SOURCE_ARTIFACT, which is a real thing to have
 * found and NOT a page-level finding. That distinction is the Case Study's whole lesson: thousands
 * of results attached to file paths while the pages under examination drew nothing, and no part of
 * the engine could tell the two apart.
 */
function envelopeOf({ detectorKey, detectorName, outcome, tenant, bundle }) {
  const pages = Array.isArray(bundle.pageSubjects) ? bundle.pageSubjects : [];
  let candidates = [];
  let edges = [];

  /* 🔴 A SUPPLIER MAY DECLARE THE BINDING IT DERIVED FROM ITS OWN MATERIAL — and it is still judged.
   *
   * An adapter reading a real external subject can see relationships this runner cannot: a citation
   * the subject's own page spec carries into its own registry, for instance. It hands those over
   * here. What it CANNOT do is assert the verdict: `bindSubject` below re-judges every candidate and
   * edge it was given, so a malformed edge, a cross-tenant edge or two competing candidates end as
   * INVALID or AMBIGUOUS exactly as if this runner had derived them. A supplied binding is evidence
   * offered, never a conclusion accepted. */
  const supplied = bundle.subjectBindings && typeof bundle.subjectBindings === "object" ? bundle.subjectBindings[outcome.subject] : null;
  if (tenant !== null && supplied) {
    candidates = Array.isArray(supplied.candidates) ? supplied.candidates : [];
    edges = Array.isArray(supplied.edges) ? supplied.edges : [];
    const binding = bindSubject({ tenantId: tenant, candidates, edges });
    return envelope({ detectorKey, detectorName, outcome, tenant, binding });
  }

  if (tenant !== null) {
    try {
      if (pages.includes(outcome.subject)) {
        const page = subjectRef({ type: "PAGE", tenantId: tenant, identityKind: "CANONICAL_URL", identity: outcome.subject, locator: outcome.subject });
        candidates = [page];
        edges = [evidenceEdge({
          from: page, to: page, edgeType: "BELONGS_TO_TENANT", tenantId: tenant,
          method: "the page is one of the captured pages this run was given",
          artifact: `bundle.pageSubjects (${pages.length} page(s))`,
          reason: "a captured page carries its own canonical URL as a stable identity, and the run declares the tenant it was captured for",
        })];
      } else if (typeof outcome.subject === "string" && outcome.subject.trim() !== "") {
        /* A real artefact, named, with no edge to a page. It stays visible as a candidate and binds
         * UNBOUND — which is why it can never be reported as a page-level finding. */
        candidates = [subjectRef({ type: "SOURCE_ARTIFACT", tenantId: tenant, identityKind: "PATH_AT_COMMIT", identity: outcome.subject, locator: outcome.subject })];
        edges = [];
      }
    } catch {
      candidates = [];
      edges = [];
    }
  }

  const binding = bindSubject({ tenantId: tenant, candidates, edges });
  return envelope({ detectorKey, detectorName, outcome, tenant, binding });
}

/** One envelope, built from a judged binding. The single place the four states become an outcome. */
function envelope({ detectorKey, detectorName, outcome, tenant, binding }) {
  const effective = effectiveOutcome(outcome.outcome, binding.state);
  return Object.freeze({
    ...outcome,
    outcome: effective.outcome,
    detectorId: detectorKey,
    detectorName,
    detectorOutcome: outcome.outcome,
    tenantId: tenant,
    primarySubject: binding.subject ? refLabel(binding.subject) : null,
    primarySubjectType: binding.subject ? binding.subject.type : null,
    bindingState: binding.state,
    bindingReason: binding.reason,
    bindingDetail: binding.detail,
    bindingCandidates: Object.freeze([...binding.candidates]),
    evidenceEdges: Object.freeze(binding.edges.map((e) => ({ edgeType: e.edgeType, from: refLabel(e.from), to: refLabel(e.to), method: e.method, artifact: e.artifact, reason: e.reason }))),
    coverageReason: effective.reason,
  });
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
        detectorOutcome: o.detectorOutcome ?? null,
        tenantId: o.tenantId ?? null,
        primarySubject: o.primarySubject ?? null,
        primarySubjectType: o.primarySubjectType ?? null,
        bindingState: o.bindingState ?? null,
        bindingReason: o.bindingReason ?? null,
        coverageReason: o.coverageReason ?? null,
        evidenceEdges: o.evidenceEdges ? [...o.evidenceEdges] : null,
      });
    }
  }
  rows.sort((a, b) => (a.detectorKey + a.subject).localeCompare(b.detectorKey + b.subject));
  return JSON.stringify({ runAt: result.runAt, tenantId: result.tenantId ?? null, rows }, null, 2) + "\n";
}
