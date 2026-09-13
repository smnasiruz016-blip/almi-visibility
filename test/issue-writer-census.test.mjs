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
test("🔴 the population is found from the code, not listed — and today it is SIX writers", () => {
  assert.ok(real.scanned > 80, `only ${real.scanned} modules scanned`);
  assert.deepEqual(real.population.map((p) => p.file), [
    "bin/audit-content.mjs",
    "bin/audit-technical.mjs",
    "bin/audit.mjs",
    "bin/supersede-noindex.mjs",
    "bin/supply-labels.mjs",
    "bin/verification-issues.mjs",
  ]);
});

test("the one declared non-issue write is checked against its own file, not trusted", () => {
  const sn = real.population.find((p) => p.file === "bin/supersede-noindex.mjs");
  assert.equal(sn.otherWrites.length, 1);
  assert.equal(sn.otherWrites[0].declared, true);
  assert.match(sn.otherWrites[0].text, /appendAll\(changes\)/);
});

/* ---- CONTROLS: the census must be able to fail -------------------------- */

const src = (file, text) => ({ sources: [{ file, text }] });

test("🔴 CONTROL: a writer that builds issues and persists with a bare append FAILS", () => {
  const r = issueWriterCensus(src("bin/new-audit.mjs", 'import { makeIssue } from "../src/evidence/records.mjs";\nconst store = createJsonlStore(out);\nstore.append(makeIssue(x));\n'));
  assert.equal(r.population.length, 1);
  assert.equal(r.failures.length, 1);
  assert.equal(r.failures[0].callsIfNew, false);
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

test("CONTROL: a lawful writer passes, and a module that builds issues but writes nothing is not a writer", () => {
  const ok = issueWriterCensus(src("bin/good.mjs", 'import { makeIssue } from "../src/evidence/records.mjs";\nconst store = createJsonlStore(out);\nstore.appendIfNew(makeIssue(a));\n'));
  assert.deepEqual(ok.failures, []);
  const builder = issueWriterCensus(src("src/audit/builder.mjs", 'import { makeIssue } from "../evidence/records.mjs";\nexport const build = (a) => makeIssue(a);\n'));
  assert.deepEqual(builder.population, []);
});
