/**
 * 🔴 ITEM 48 — THE LIVE HALF: EVERY ISSUE WRITER IS STILL WIRED TO appendIfNew.
 *
 * TWO LAYERS, AND NEITHER IS ENOUGH ALONE:
 *   - the RECORDED double runs (`runs/audit/idempotency-double-run-*.json`,
 *     pinned in duplicate-writers.test.mjs) prove the writers WORKED, once, for
 *     real. But that test reads a FILE: if a writer stopped calling appendIfNew
 *     tomorrow, the file would still say zero duplicates.
 *   - THIS census reads the CODE, on every commit, in milliseconds: it proves
 *     every writer is STILL WIRED. It cannot prove the dedupe works — the store
 *     tests and the recorded runs do that.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { issueWriterCensus } from "../tools/issue-writer-census.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const real = issueWriterCensus();

test("🔴 every issue writer found in the code persists through appendIfNew — the build fails if one does not", () => {
  assert.deepEqual(
    real.failures.map((f) => `${f.file}: call=${f.callsIfNew} undeclared=${f.undeclared.map((u) => `:${u.line} ${u.text}`).join(" | ")}`),
    [],
  );
});

/**
 * The population is FOUND, and pinned here only so that a NEW writer is seen by
 * a human: a writer not in this list still has to pass the test above.
 */
test("🔴 the population is found from the code, not listed — and today it is SEVEN writers", () => {
  assert.ok(real.scanned > 80, `only ${real.scanned} modules scanned`);
  /* bin/audit.mjs's writing moved into src/audit/run-audit.mjs (injectable resolver, 13 Sep 2026) and the census
   * followed it there by construction. 🔴 ROUTING BROUGHT THE COMMIT BACK, 23 September 2026: the bin now makes
   * the governed decision about committing what the run collected, so the census sees BOTH — which is right, and
   * is why the population is seven rather than six. It is found, not listed: all seven pass the wiring test
   * above, and a new writer that did not would fail there regardless of this list. */
  assert.deepEqual(real.population.map((p) => p.file), [
    "bin/audit-content.mjs",
    "bin/audit-technical.mjs",
    "bin/audit.mjs",
    "bin/supersede-noindex.mjs",
    "bin/supply-labels.mjs",
    "src/audit/run-audit.mjs",
    "subjects/almi-oet/tools/verification-issues.mjs",
  ]);
});

test("the one declared non-issue write is checked against its own file, not trusted", () => {
  const sn = real.population.find((p) => p.file === "bin/supersede-noindex.mjs");
  assert.equal(sn.otherWrites.length, 1);
  assert.equal(sn.otherWrites[0].declared, true);
  /* 🔴 ROUTING CHANGED HOW IT IS SPELLED, NOT WHAT IT IS. The state-change append used to read
   * `store.appendAllWithoutDedupe(changes)` directly; it now names the discipline and the boundary performs it.
   * The exemption still describes a real non-issue write and is still checked against this file's own source —
   * the control below still fails it the moment the thing it relies on is removed. */
  assert.match(sn.otherWrites[0].text, /appendAllWithoutDedupe\(changes\)|APPEND_ALL_WITHOUT_DEDUPE/);
});

/* ---- CONTROLS: the census must be able to fail -------------------------- */

const src = (file, text) => ({ sources: [{ file, text }] });

test("🔴 CONTROL: a writer that builds issues and persists with a bare append FAILS", () => {
  const r = issueWriterCensus(src("bin/new-audit.mjs", 'import { makeIssue } from "../src/evidence/records.mjs";\nconst store = createJsonlStore(out);\nstore.append(makeIssue(x));\n'));
  assert.equal(r.population.length, 1);
  assert.equal(r.failures.length, 1);
  assert.equal(r.failures[0].callsIfNew, false);
});

test("🔴 CONTROL: the RENAMED unsafe verb is caught too — a rename is not a way out of the census", () => {
  const r = issueWriterCensus(src("bin/renamed.mjs", 'import { makeIssue } from "../src/evidence/records.mjs";\nconst store = createJsonlStore(out);\nstore.appendIfNew(makeIssue(a));\nstore.appendWithoutDedupe(makeIssue(b));\n'));
  assert.equal(r.failures.length, 1);
  assert.equal(r.failures[0].undeclared.length, 1);
});

test("🔴 the store no longer offers a bare append — the unsafe verb carries its warning in its name", async () => {
  const { STORE_INTERFACE } = await import("../src/evidence/store.mjs");
  assert.ok(!STORE_INTERFACE.includes("append") && !STORE_INTERFACE.includes("appendAll"));
  assert.ok(STORE_INTERFACE.includes("appendWithoutDedupe") && STORE_INTERFACE.includes("appendAllWithoutDedupe"));
  const text = readFileSync(`${REPO}tools/issue-writer-census.mjs`, "utf8");
  assert.match(text, /CLOSED \(13 September 2026\) — "a store passed in from another module"/);
  assert.match(text, /OPEN — a writer reached through DYNAMIC DISPATCH/);
  assert.match(text, /OPEN — issues BUILT somewhere this file cannot see imported/);
});

test("🔴 CONTROL: a COMMENT that names appendIfNew is not a call", () => {
  const r = issueWriterCensus(src("bin/liar.mjs", 'import { THIN } from "../src/audit/content-checks.mjs";\nconst store = createJsonlStore(out);\n// store.appendIfNew(f)\nstore.append(await THIN.run(x));\n'));
  assert.equal(r.failures.length, 1);
});

test("🔴 CONTROL: an issue writer that ALSO overwrites a file with writeFileSync FAILS, even with an appendIfNew call", () => {
  const r = issueWriterCensus(src("bin/mixed.mjs", 'import { makeIssue } from "../src/evidence/records.mjs";\nstore.appendIfNew(makeIssue(a));\nwriteFileSync(out, JSON.stringify(all), "utf8");\n'));
  assert.equal(r.failures.length, 1);
  assert.equal(r.failures[0].undeclared.length, 1);
});

test("🔴 CONTROL: a declared exemption whose PROOF no longer holds is not honoured", () => {
  const text = readFileSync(`${REPO}bin/supersede-noindex.mjs`, "utf8").replace(/changes\.push\(\s*makeIssueStateChange\(/, "changes.push((");
  const r = issueWriterCensus(src("bin/supersede-noindex.mjs", text));
  assert.equal(r.failures.length, 1, "an exemption survived after the thing it relied on was removed");
});

/* RR-195: a SPLIT writer — issues built in one module, persisted by an entry point — is declared by name, and an undeclared one FAILS */
test("RR-195 · the split writer bin/t2-reassess.mjs is DECLARED, its proof holds in its own file, and the real census has no undeclared issue writer", async () => {
  const { DECLARED_SPLIT_WRITERS } = await import("../tools/issue-writer-census.mjs");
  const real = issueWriterCensus();
  /* bin/instrument-disagreement.mjs: a PRE-EXISTING split writer this rule found on its first run, declared beside it */
  assert.deepEqual(real.split.map((s) => [s.file, s.declared, s.proved]), [["bin/instrument-disagreement.mjs", true, true], ["bin/t2-reassess.mjs", true, true]]);
  assert.deepEqual(DECLARED_SPLIT_WRITERS.map((d) => d.file).sort(), ["bin/instrument-disagreement.mjs", "bin/t2-reassess.mjs"]);
  assert.deepEqual(real.failures, []);
});

test("RR-195 · CONTROL: an UNDECLARED entry point that names a governed *ISSUES action FAILS — and a declared one whose proof no longer holds fails too", () => {
  const planted = 'import { governedStoreAppend } from "../src/governance/governed-run.mjs";\nexecuteGovernedWrite(governedStoreAppend({ store, records, action: "APPEND_PLANTED_ISSUES", discipline: "APPEND_IF_NEW" }));';
  const r = issueWriterCensus({ sources: [{ file: "bin/planted-writer.mjs", text: planted }] });
  assert.deepEqual(r.failures.map((f) => [f.file, f.undeclared[0].text]), [["bin/planted-writer.mjs", "UNDECLARED_ISSUE_WRITER"]]);
  const unproved = readFileSync(`${REPO}bin/t2-reassess.mjs`, "utf8").replace(/discipline: "APPEND_IF_NEW"/g, 'discipline: "APPEND_ALL_WITHOUT_DEDUPE"');
  const u = issueWriterCensus({ sources: [{ file: "bin/t2-reassess.mjs", text: unproved }] });
  assert.deepEqual(u.failures.map((f) => [f.file, f.undeclared[0].text]), [["bin/t2-reassess.mjs", "UNPROVED_SPLIT_WRITER"]]);
});

test("CONTROL: a lawful writer passes, and a module that builds issues but writes nothing is not a writer", () => {
  const ok = issueWriterCensus(src("bin/good.mjs", 'import { makeIssue } from "../src/evidence/records.mjs";\nconst store = createJsonlStore(out);\nstore.appendIfNew(makeIssue(a));\n'));
  assert.deepEqual(ok.failures, []);
  const builder = issueWriterCensus(src("src/audit/builder.mjs", 'import { makeIssue } from "../evidence/records.mjs";\nexport const build = (a) => makeIssue(a);\n'));
  assert.deepEqual(builder.population, []);
});
