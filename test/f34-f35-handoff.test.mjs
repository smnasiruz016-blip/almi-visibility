/**
 * 🔴 RR-248 · F34 → F35: where S9/S10's protection lives since RR-179 (c) / RR-180 (a) (beta-g ruling, 11 Oct: S10 YES).
 *
 * The runner builds only what F35 chose, and F35 decides a declared spec's right-to-exist on F34's check over the tenant's population
 * (src/page/action-evidence.mjs rteFor → F36 notServedPart). So a need an existing page serves is never handed to construction as
 * CREATE. Construction's own F34 call can no longer stop such a candidate; this file pins the check where it now happens.
 * test/helpers/f34-sabotage.mjs S10 proves it can fail (F35 handed an empty COMPLETE population).
 */
import test from "node:test";
import assert from "node:assert/strict";
import { decideGroupedNeeds } from "../src/page/action-evidence.mjs";
import { connectQuestions, coverageRecords } from "../src/page/demand-connection.mjs";
import { possibleCombinations } from "../src/page/page-opportunities.mjs";
import { isChosenCreate } from "../src/page/action-decision.mjs";
import { subject } from "./support/subjects.mjs";

const T = "tenant:00000000000000000000000000000f34";
const ON = "2026-10-05";
const PRODUCT = await subject("almi-oet");
const SLUG = Object.keys(PRODUCT.pageSpecs)[0];
const VARIANT = PRODUCT.pageSpecs[SLUG].variant;

function planning() {
  const combo = { [PRODUCT.axis.key]: VARIANT };
  const possible = possibleCombinations({ dimensions: [{ key: PRODUCT.axis.key, values: PRODUCT.variants, source: "the product's own descriptor", applicability: "APPLIES" }] });
  const q = { record_type: "public_question", question_id: "r1", measurement_key: "public_question:r1", recorded_at: "2026-10-01T09:00:00Z",
    value: { subject: "almi-oet", kind: "OBSERVED", original: "A question no existing page answers in any section?", sourceId: "fixture", provenance: { observerType: "SOURCE_ADAPTER_OBSERVED", seenBy: "A SOURCE ADAPTER — the text as the source holds it" } } };
  const answer = { claims: [{ claimId: "c1", states: "OTHER", source: { kind: "RELATED", name: "a related source", link: "https://related.fixture.invalid/a", readOn: "2026-10-02" }, supports: { finding: "SUPPORTS", ref: "fixture-finding" } }] };
  const conn = connectQuestions({ subject: "almi-oet", possible, records: [q], drafts: [{ questionId: "r1", combination: combo, answer }], on: ON });
  /* F91's coverage record says NONE (written over an empty COMPLETE population) — F34 on the population F35 holds must still decide */
  const cov = coverageRecords({ subject: "almi-oet", rows: conn.records, tenantId: T, population: { tenantId: T, coverageState: "COMPLETE", pages: [] }, on: ON });
  return [...conn.records, ...cov];
}

const decideOver = (pages) => {
  const rows = planning();
  const population = { tenantId: T, coverageState: "COMPLETE", pages };
  const first = decideGroupedNeeds({ tenantId: T, product: PRODUCT, population, planningRows: rows });
  const needId = first.grouped[0]?.needId;
  const against = [...pages.map((p) => p.pageId), ...Object.keys(PRODUCT.pageSpecs).filter((s) => s !== SLUG)];
  const reviews = against.map((a) => ({ needId, against: a, verdict: "DISTINCT", needsGuidance: false, ref: `review:${a}` }));
  return decideGroupedNeeds({ tenantId: T, product: PRODUCT, population, planningRows: rows, duplicationReviews: reviews });
};

test("F34→F35 · a declared spec's need an existing page SERVES is never chosen CREATE — F35 reads F34's check over the population it holds (RR-179 (c))", () => {
  /* positive control: the same need over a COMPLETE population with no page IS chosen CREATE and handed to construction */
  const open = decideOver([]);
  assert.equal(open.grouped[0]?.slug, SLUG, `the fixture need does not match the declared spec ${SLUG}`);
  assert.ok(open.compiled.forConstruction.some((d) => d.slug === SLUG && isChosenCreate(d.decision)), `control: the need was not chosen CREATE: ${JSON.stringify(open.groupedNeeds[0]?.actions ?? open.groupedNeeds[0]?.missing)}`);
  /* the protection: a page whose headline names the intent serves it — F34 KEEP, F36 FAIL, no CREATE reaches construction */
  const served = decideOver([{ pageId: "p-served", tenantId: T, html: `<h1>${VARIANT}</h1>` }]);
  assert.deepEqual(served.compiled.forConstruction.filter((d) => d.slug === SLUG && isChosenCreate(d.decision)), [], "a need an existing page serves was handed to construction as CREATE");
});
