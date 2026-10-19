/**
 * F76 · Controlled draft and publishing (acceptance _handoffs AlmiVisibility_F76_ACCEPTANCE_2026-10-19.md; RR-291, light proof; owner answer
 * Q6). C1–C4 with firing controls; REAL on the client's own publication record and stored builds (count-only). The census names the one
 * existing path that drafts every declared page of a product at once (bin/build-page.mjs --all-slugs, owner ruling of 14 Sep 2026): C2's
 * "no generate-all path" is NOT proved while it stands — an owner question (RR-291).
 */
import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { planCohort, rollback, sitemapXml, submissionState, PUBLISH_COHORT_CAP, SUBMISSION } from "../src/page/publishing-control.mjs";
import { rootIndexFor } from "../src/tenancy/resolver.mjs";
import { lookupStore } from "../src/tenancy/root-registry.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const ok = (p) => ({ pageId: p, approvedBy: "owner", on: "2026-10-19", decision: "d" });

test("C1 · a page publishes only with its own approval record", () => {
  assert.equal(planCohort({ pages: ["a", "b"], approvals: [ok("a"), ok("b")] }).state, "MAY_PUBLISH");
  /* FIRING CONTROLS: one page without its own approval, and an approval missing its decision, each refuse the cohort, named */
  assert.deepEqual(planCohort({ pages: ["a", "b"], approvals: [ok("a")] }).refusals, ["b: no approval record of its own"]);
  assert.equal(planCohort({ pages: ["a"], approvals: [{ ...ok("a"), decision: "" }] }).state, "REFUSED");
});

test("C2 · a cohort is capped and names its pages — no publish-all; the census names the one draft-all path", () => {
  const many = Array.from({ length: PUBLISH_COHORT_CAP + 1 }, (_, i) => `p${i}`);
  assert.match(planCohort({ pages: many, approvals: many.map(ok) }).refusals[0], /over its cap/);
  assert.match(planCohort({ pages: [], approvals: [] }).refusals[0], /no publish-all/);
  assert.match(planCohort({ pages: ["a", "b"], approvals: [ok("a"), ok("b")], cap: 1 }).refusals[0], /cap of 1/);
  /* CENSUS: the paths that act on every page at once — exactly the one known draft path, and no publish path */
  const files = (d) => readdirSync(join(REPO, d), { recursive: true }).filter((f) => /\.mjs$/.test(String(f))).map((f) => join(d, String(f)).replace(/\\/g, "/"));
  const all = [...files("bin"), ...files("src")].filter((f) => /--all-slugs|publishAll|generateAll|--publish-all|--all-pages/.test(readFileSync(join(REPO, f), "utf8")));
  assert.deepEqual(all.filter((f) => /publish/i.test(f)), [], "a publish path acts on every page at once");
  assert.deepEqual(all.filter((f) => f.startsWith("bin/")), ["bin/build-page.mjs"], "a new generate-all path");
});

test("C3 · rollback restores the previous version byte for byte", () => {
  const r = rollback([{ html: "<p>v1</p>", versionId: "1" }, { html: "<p>v2 ü</p>", versionId: "2" }]);
  assert.deepEqual([r.state, r.html, r.restoredFrom], ["RESTORED", "<p>v1</p>", "1"]);
  /* FIRING CONTROL: one version only — nothing to restore */
  assert.equal(rollback([{ html: "x" }]).state, "REFUSED");
});

test("C4 · without the client's own connection nothing is submitted; the sitemap is written", () => {
  assert.equal(submissionState(null).state, SUBMISSION.NOT_CONNECTED);
  assert.equal(submissionState({ state: "CONNECTED" }).state, SUBMISSION.NOT_CONNECTED, "a connection with no connector id");
  assert.equal(submissionState({ state: "CONNECTED", connectorId: "c" }).state, SUBMISSION.CONNECTED);
  const x = sitemapXml(["https://s.example/b", "https://s.example/a", "https://s.example/a"]);
  assert.equal((x.match(/<url>/g) ?? []).length, 2);
  assert.ok(x.indexOf("/a<") < x.indexOf("/b<"));
});

const BATCH = "rr254-test-pages-2026-10-12";
const HERE = existsSync(join(lookupStore(rootIndexFor(process.env), "RESEARCH").dir, BATCH, "published-pages-2026-10-16.json"));
test("REAL · C1, C3, C4 · the client's own publication record, stored builds and connection", { skip: HERE ? false : "the declared batch is not on this machine" }, () => {
  const r = spawnSync(process.execPath, ["bin/visibility-parts.mjs", "--part=publishing", "--subject=almi-oet", `--research-batch=${BATCH}`, "--tenant=tenant:93b991d5afa33b16ccb9166b249593b6", "--actor=actor:cc"], { cwd: REPO, encoding: "utf8" });
  assert.equal(r.status, 0, r.stderr);
  const n = Number(/cohort\s+(\d+) page\(s\)/.exec(r.stdout)?.[1]);
  assert.ok(n >= 1, "EMPTY real population");
  assert.match(r.stdout, /→ MAY_PUBLISH/);
  assert.match(r.stdout, new RegExp(`C3 rollback\\s+${n} of ${n} page\\(s\\) restored byte for byte`));
  assert.match(r.stdout, /C4 submission\s+NOT CONNECTED/);
  console.log(`  REAL: ${r.stdout.split(/\r?\n/).slice(1, 4).map((l) => l.trim().slice(0, 140)).join(" | ")}`);
});
