/**
 * F30 · Scheduled recrawl and change detection, F83 · Experiment and change-impact, F85 · Controlled scaling and backpressure (acceptances
 * _handoffs AlmiVisibility_F30/F83/F85_ACCEPTANCE_2026-10-19.md; RR-291, light proof). Fixtures with firing controls; F30 REAL on two stored
 * crawls of the same check (count-only).
 */
import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { diffRuns, crawlItem, beforeAfter, causeClaimsWithoutControl, nextCohort, CHANGE_RULE } from "../src/report/change-and-scale.mjs";
import { rootIndexFor } from "../src/tenancy/resolver.mjs";
import { lookupStore } from "../src/tenancy/root-registry.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const it = (key, sha, status = 200) => ({ key, status, final_url: key, content_sha256: sha });

test("F30 C1–C2 · against the last run of the same check: added, removed and changed named under the recorded rule; unchanged suppressed", () => {
  const d = diffRuns([it("a", "1"), it("b", "2"), it("c", "3")], [it("a", "1"), it("b", "9"), it("d", "4")]);
  assert.deepEqual([d.added, d.removed, d.changed.map((c) => [c.key, c.fields]), d.unchanged], [["d"], ["c"], [["b", ["content_sha256"]]], 1]);
  assert.equal(d.rule, CHANGE_RULE.id);
  /* FIRING CONTROLS: an identical pair gives 0 changes; a status change alone is named */
  assert.equal(diffRuns([it("a", "1")], [it("a", "1")]).changed.length, 0);
  assert.deepEqual(diffRuns([it("a", "1")], [it("a", "1", 404)]).changed[0].fields, ["status"]);
  /* one run alone claims no change */
  assert.equal(diffRuns([], [it("a", "1")]).state, "NO_PREVIOUS_RUN");
  assert.deepEqual(crawlItem({ target: { ref: "u" }, observed_at: "t", value: { status: 200, final_url: "u" }, content_sha256: "s" }), { key: "u", at: "t", status: 200, final_url: "u", content_sha256: "s" });
});

test("F83 C1–C2 · before and after dated and paired; never \"caused\" without a control group", () => {
  const p = beforeAfter({ metric: "clicks", before: { value: 1, date: "2026-10-01" }, after: { value: 4, date: "2026-11-01" } });
  assert.equal(p.delta, 3);
  assert.deepEqual(causeClaimsWithoutControl([p.line]), []);
  assert.match(p.line, /no cause is claimed/);
  assert.equal(beforeAfter({ metric: "m", before: { value: 1 }, after: { value: 2, date: "2026-10-01" } }).state, "REFUSED");
  /* FIRING CONTROL: a line claiming cause without a control group is caught */
  assert.equal(causeClaimsWithoutControl(["clicks rose because of the new page"]).length, 1);
  const c = beforeAfter({ metric: "clicks", before: { value: 1, date: "2026-10-01" }, after: { value: 4, date: "2026-11-01" }, control: { before: 1, after: 1 } });
  assert.deepEqual(causeClaimsWithoutControl([c.line]), []);
});

test("F85 C1–C2 · the next cohort waits for the last one's threshold; a failed cohort sets PAUSED", () => {
  assert.equal(nextCohort([]).state, "MAY_START");
  assert.equal(nextCohort([{ cohortId: "c1", startedOn: "2026-10-01", threshold: 5, result: 6 }]).state, "MAY_START");
  /* FIRING CONTROLS */
  assert.equal(nextCohort([{ cohortId: "c1", startedOn: "2026-10-01", threshold: 5 }]).state, "REFUSED");
  assert.equal(nextCohort([{ cohortId: "c1", startedOn: "2026-10-01", threshold: 5, result: 6 }, { cohortId: "c2", startedOn: "2026-10-09", threshold: 5, result: 2 }]).state, "PAUSED");
});

const R = lookupStore(rootIndexFor(process.env), "RESEARCH").dir;
const HERE = existsSync(join(R, "f19-compliant-run-2026-10-02", "crawl.jsonl")) && existsSync(join(R, "rr105-bounded-collection-2026-09-30", "crawl.jsonl"));
test("REAL · F30 C3 · two stored crawls of the same check compared; only changed pages listed, unchanged suppressed", { skip: HERE ? false : "the two crawls are not on this machine" }, () => {
  const r = spawnSync(process.execPath, ["bin/visibility-parts.mjs", "--part=changes", "--subject=almi-oet", "--research-batch=f19-compliant-run-2026-10-02", "--compare-batch=rr105-bounded-collection-2026-09-30", "--tenant=tenant:93b991d5afa33b16ccb9166b249593b6", "--actor=actor:cc"], { cwd: REPO, encoding: "utf8" });
  assert.equal(r.status, 0, r.stderr);
  const m = /added (\d+) · removed (\d+) · changed (\d+) · unchanged (\d+) \(suppressed\)/.exec(r.stdout);
  assert.ok(m, r.stdout);
  const compared = Number(m[3]) + Number(m[4]);
  assert.ok(compared >= 1, "EMPTY real population: nothing compared");
  assert.equal((r.stdout.match(/\n {4}CHANGED /g) ?? []).length, Number(m[3]), "an unchanged page was listed");
  console.log(`  REAL: ${r.stdout.split(/\r?\n/).slice(1, 4).map((l) => l.trim()).join(" | ")}`);
});
