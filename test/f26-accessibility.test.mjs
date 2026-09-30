/**
 * F26 · ACCESSIBILITY ASSESSMENT (acceptance _handoffs b1a94e7, RR-95).
 *
 * Every expected count below is written by hand from its fixture. Real stored bodies are read, never written; planted defects are made
 * on in-memory copies. Nothing is fetched or rendered; the production trail is not written (last test).
 */
import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { spawnSync, execFileSync } from "node:child_process";

import { assessPage, assessAccessibility, scannable, MACHINE_CHECKS, PERSON_ITEMS, NOT_MEASURED_CRITERIA, VERDICT } from "../src/audit/accessibility.mjs";
import { readClientAccessibility } from "../src/audit/accessibility-reader.mjs";
import { readTenantPartition, readPartitionBodies } from "../src/crawl/batch-partition.mjs";
import { BATCH_ID } from "../src/crawl/observation-batch.mjs";
import { decisionCallPaths } from "../tools/need-coverage-call-paths.mjs";
import { createTenantResolver } from "../src/tenancy/resolver.mjs";
import { resolveSide } from "../src/tenancy/scope.mjs";
import { RESOURCES } from "../src/tenancy/scoped-run.mjs";
import { declaredWorld, FIXTURE_TENANT } from "./helpers/declared-world.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const TRAIL = join(REPO, "audit-trail", "events.jsonl");
const trailSha = () => (existsSync(TRAIL) ? createHash("sha256").update(readFileSync(TRAIL)).digest("hex") : "absent");
const TRAIL_BEFORE = trailSha();

const doc = (body, head = "<title>A page</title>", lang = ' lang="en"') => `<!doctype html><html${lang}><head>${head}</head><body>${body}</body></html>`;
const clientBodies = () => {
  const resolve = createTenantResolver();
  const t = resolveSide(resolve, RESOURCES.subject("almi-oet")).tenantId;
  const part = readTenantPartition({ batchId: BATCH_ID, tenantId: t, resolve });
  return { resolve, tenantId: t, bodies: [...readPartitionBodies({ batchId: BATCH_ID, observationIds: part.observationIds }).values()] };
};

/* ================= C1 — machine-checked findings ================= */

test("C1 · every declared machine check fires on its failing fixture and stays quiet on its clean one", () => {
  const cases = [
    ["img-alt", doc('<img src="a.png">'), doc('<img src="a.png" alt="A chart">')],
    ["page-title", doc("", "<title>  </title>"), doc("")],
    ["page-lang", doc("", undefined, ""), doc("")],
    ["link-name", doc('<a href="/x"> </a>'), doc('<a href="/x">Read more about fees</a>')],
    ["button-name", doc("<button></button>"), doc('<button aria-label="Close"></button>')],
    ["frame-name", doc('<iframe src="/v"></iframe>'), doc('<iframe src="/v" title="Video"></iframe>')],
  ];
  assert.deepEqual(cases.map((c) => c[0]), MACHINE_CHECKS.map((c) => c.id), "a declared check has no proof, or a proof names no check");
  for (const [id, bad, good] of cases) {
    assert.equal(assessPage(bad).machine[id], 1, `${id} did not fire on its failing fixture`);
    assert.equal(assessPage(good).machine[id], 0, `${id} fired on its clean fixture`);
  }
  /* named by an image's alternative, by aria-labelledby, and hidden elements, are not failures */
  assert.equal(assessPage(doc('<a href="/x"><img src="i" alt="Home"></a>')).machine["link-name"], 0);
  assert.equal(assessPage(doc('<span id="l">Next page</span><a href="/x" aria-labelledby="l"></a>')).machine["link-name"], 0);
  assert.equal(assessPage(doc('<img src="a.png" aria-hidden="true">')).machine["img-alt"], 0);
  /* markup inside script, style, template or a comment is never read as a page element */
  assert.equal(assessPage(doc('<script>var s = "<img src=x>";</script><!-- <a href="/y"></a> --><template><button></button></template>')).failures, 0);
});

test("C1 · FIRING CONTROL on REAL stored bodies: a planted defect in a real body is found; a missing or truncated body is NOT MEASURED", () => {
  const { bodies } = clientBodies();
  assert.ok(bodies.length > 0, "EMPTY population of stored bodies");
  const b = bodies[0];
  const base = assessPage(b).machine;
  const planted = assessPage(b.replace(/<body\b[^>]*>/i, (m) => `${m}<a href="/x"></a><button></button><iframe src="/y"></iframe><img src="z">`)).machine;
  for (const id of ["link-name", "button-name", "frame-name", "img-alt"]) assert.equal(planted[id], base[id] + 1, `${id} missed a defect planted in a real body`);
  assert.equal(assessPage(b.replace(/(<html\b[^>]*?)\slang\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/i, "$1")).machine["page-lang"], 1, "a real body with its language removed was not found");
  const a = assessAccessibility([{ pageId: "p1", html: b, truncated: true }, { pageId: "p2", html: null }]);
  assert.deepEqual(a.rows.map((r) => [r.verdict, r.missing]), [[VERDICT.NOT_MEASURED, "an untruncated stored body"], [VERDICT.NOT_MEASURED, "a stored body"]], "a missing or truncated body yielded a result");
  assert.equal(a.machineChecked.pagesChecked, 0);
});

/* ================= C2 — needs a person, kept apart ================= */

test("C2 · what only a person can judge is counted in its own population — never judged, never added to the machine count", () => {
  const p = assessPage(doc('<img src="a" alt="Chart of fees"><img src="b" alt=""><svg viewBox="0 0 1 1"></svg><svg aria-hidden="true"></svg><a href="/x">Fees</a><button>Go</button><iframe src="/v" title="Video"></iframe>'));
  /* the hidden svg is a decorative CLAIM, located for a person — never dropped */
  assert.deepEqual(p.person, { "alt-adequate": 1, "decorative-claim": 2, "graphic-alternative": 1, "title-descriptive": 1, "name-adequate": 3 });
  assert.equal(p.failures, 0, "a needs-a-person item was counted as a machine failure");
  assert.deepEqual(Object.keys(p.person), PERSON_ITEMS.map((x) => x.id));
  const a = assessAccessibility([{ pageId: "p", html: doc('<img src="a" alt="x"><img src="b">') }]);
  assert.deepEqual([a.machineChecked.instances["img-alt"], a.needsAPerson.items["alt-adequate"]], [1, 1], "the two populations were merged");
  assert.ok(!("score" in a) && !("total" in a), "the two populations were combined into one number");
});

/* ================= C3 — not measured, named ================= */

test("C3 · every render- or interaction-dependent criterion is NOT MEASURED with its missing fact named, and the exclusion is stated", () => {
  for (const c of NOT_MEASURED_CRITERIA) assert.ok(c.criterion && c.missing, "a NOT MEASURED criterion names no missing fact");
  assert.ok(NOT_MEASURED_CRITERIA.some((c) => /Contrast/.test(c.criterion)) && NOT_MEASURED_CRITERIA.some((c) => /Keyboard/.test(c.criterion)) && NOT_MEASURED_CRITERIA.some((c) => /script/.test(c.criterion)));
  assert.ok(!MACHINE_CHECKS.some((m) => NOT_MEASURED_CRITERIA.some((n) => n.criterion === m.criterion)), "a render-dependent criterion is reported as machine-checked");
  const a = assessAccessibility([{ pageId: "p", html: doc("") }]);
  assert.match(a.notMeasured.excludes, /script-inserted content.*styles.*interaction/);
});

/* ================= C4 — no pass from a scan ================= */

test("C4 · FIRING CONTROL: a page with no machine-found failure is COULD-NOT-PROVE, never PROVED; one failure makes it DISPROVED", () => {
  const clean = assessAccessibility([{ pageId: "p", html: doc('<a href="/x">Fees</a>') }]);
  assert.deepEqual(clean.verdicts, { [VERDICT.COULD_NOT_PROVE]: 1 }, "a clean automated result became a pass");
  assert.ok(!Object.values(VERDICT).includes("PROVED"), "the assessment can say PROVED");
  assert.deepEqual(assessAccessibility([{ pageId: "p", html: doc('<a href="/x"></a>') }]).verdicts, { [VERDICT.DISPROVED]: 1 });
  assert.equal(clean.machineChecked.checks, MACHINE_CHECKS.length, "a zero count does not name the checks it covers");
});

/* ================= REAL ================= */

test("REAL · the client's stored pages: three populations recorded separately, every page COULD-NOT-PROVE or DISPROVED, none PROVED", () => {
  const { resolve, tenantId } = clientBodies();
  const r = readClientAccessibility({ tenantId, resolve });
  const a = r.assessment;
  assert.ok(a.rows.length > 0, "EMPTY page population");
  assert.equal(Object.values(a.verdicts).reduce((x, y) => x + y, 0), a.rows.length, "a page has no verdict, or two");
  assert.ok(!("PROVED" in a.verdicts));
  assert.match(r.bound, /stored bodies, NOT rendered pages — excludes script-inserted content/);
  console.log(`  REAL (count-only): ${r.bound} | ${JSON.stringify({ machine: a.machineChecked, person: a.needsAPerson.items, notMeasuredCriteria: a.notMeasured.criteria.length, pagesWithoutABody: a.notMeasured.pagesWithoutABody, verdicts: a.verdicts })}`);
});

/* ================= C5 — recorded data only, this client ================= */

test("C5 · THE ENTRY POINT: in a declared world it prints this tenant's three populations with its bound, and writes nothing", () => {
  const before = execFileSync("git", ["-C", REPO, "status", "--porcelain"], { encoding: "utf8" });
  const WORLD = declaredWorld();
  try {
    const env = WORLD.envWith();
    const ok = spawnSync(process.execPath, WORLD.argv(["bin/accessibility.mjs"]), { cwd: REPO, encoding: "utf8", env });
    assert.equal(ok.status, 0, ok.stdout + ok.stderr);
    const r = readClientAccessibility({ tenantId: FIXTURE_TENANT, resolve: createTenantResolver({ env }), env });
    assert.match(ok.stdout, /bound\s+recorded data only · \d+ page\(s\)/);
    assert.match(ok.stdout, new RegExp(`MACHINE-CHECKED\\s+${MACHINE_CHECKS.length} checks over ${r.assessment.machineChecked.pagesChecked} page`), "the entry point printed another tenant's pages");
    assert.match(ok.stdout, /NEEDS A PERSON .* never added to the machine count/);
    assert.match(ok.stdout, /an automated scan never proves accessibility; no page reads PROVED/);
    assert.doesNotMatch(ok.stdout + ok.stderr, /https?:\/\//, "the entry point printed a URL");
  } finally { WORLD.cleanup(); }
  assert.equal(execFileSync("git", ["-C", REPO, "status", "--porcelain"], { encoding: "utf8" }), before, "the entry point wrote into the repository");
});

test("C5 · the assessment and its reader load no module that can make a network, process, connector or paid call — and it fires", () => {
  const entries = ["src/audit/accessibility.mjs", "src/audit/accessibility-reader.mjs"];
  assert.deepEqual(decisionCallPaths({ entries }).faults, []);
  const planted = decisionCallPaths({ entries, read: (f) => { const t = existsSync(REPO + f) ? readFileSync(REPO + f, "utf8") : null; return f === entries[0] ? `${t}\nawait fetch(u);\n` : t; } });
  assert.deepEqual(planted.faults.map((x) => x.code), ["RAW_NETWORK_CALL"]);
});

test("the production trail was not written by this file", () => {
  assert.equal(trailSha(), TRAIL_BEFORE);
});
