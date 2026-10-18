/**
 * F88 · DESKTOP, MOBILE AND ACCESSIBILITY OF OWNER WORKFLOWS (acceptance _handoffs AlmiVisibility_F88_ACCEPTANCE_2026-10-18.md, RR-285).
 *
 * Firing controls on fixed reports (C6: each planted breach fails its own check and no other); REAL over every report file under runs/ —
 * classification and the assistive and bad-findings-first checks on every one, and the offline render at 430 px and at desktop width of every
 * report outside the two evidence kinds (the full render of all of them is the tool's run, tools/owner-workflows.mjs). Nothing fetched or
 * written; the production trail is not written (last test).
 */
import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { classifyReports, phoneFailures, desktopFailures, assistiveFailures, badFirstFailures, badFindingsFirst, freshFailures, BAD_FIRST_TITLE, FAIL, UNLISTED, OWNER_WORKFLOWS, WRITERS } from "../src/report/owner-workflows.mjs";
import { HISTORICAL_REPORTS } from "../config/owner-workflows-historical.mjs";
import { runFiles, offlineRenderer, checkReports } from "../tools/owner-workflows.mjs";
import { CSS } from "../src/report/view.mjs";
import { spawnSync } from "node:child_process";
import { PHONE, DESKTOP } from "../src/report/owner-workflows.mjs";
import { decisionCallPaths } from "../tools/need-coverage-call-paths.mjs";
import { scanSource } from "../tools/product-boundary.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const TRAIL = join(REPO, "audit-trail", "events.jsonl");
const trailSha = () => (existsSync(TRAIL) ? createHash("sha256").update(readFileSync(TRAIL)).digest("hex") : "absent");
const TRAIL_BEFORE = trailSha();
/* only the offline renderer's own document server (127.0.0.1) may be reached; anything else is egress */
const LOCAL_FETCH = globalThis.fetch;
globalThis.fetch = (u, o) => { if (new URL(String(u)).hostname === "127.0.0.1") return LOCAL_FETCH(u, o); throw new Error("🔴 NETWORK EGRESS ATTEMPTED IN TESTS"); };

const CLEAN_MD = "# Report\n\nNOT DONE: one thing.\n\n## Details\n\n| a | b |\n|---|---|\n| 1 | 2 |\n\n[the source](https://a.example/)\n";
const all = (file, text, type, layoutPhone = { scrollWidth: 430, viewportWidth: 430 }, phoneText = "x", deskText = "x") =>
  [...phoneFailures(file, layoutPhone), ...desktopFailures(file, phoneText, deskText), ...assistiveFailures(file, text, type), ...badFirstFailures(file, text, type)].map((f) => f.failure);

test("C1 · THE WORKFLOWS ARE NAMED · FIRING CONTROL: each report file is a named kind, and one that is not is UNLISTED — reported, never dropped", () => {
  const r = classifyReports(["runs/ops/operations-report-2026-10-18.txt", "runs/audit/x-sabotage-2026-10-18T0101.txt", "runs/export/evidence.md", "runs/report/index.html", "runs/new-kind/thing.md", "runs/cost/ledger.jsonl", "src/a.mjs"]);
  assert.deepEqual(r.map((x) => [x.file.split("/")[1], x.kind]), [["ops", "OPERATIONS_REPORT"], ["audit", "SABOTAGE_EVIDENCE"], ["export", "EVIDENCE_EXPORT"], ["report", "OWNER_REPORT"], ["new-kind", UNLISTED]]);
});

test("C2 · READABLE ON A PHONE · FIRING CONTROL: content wider than the 430 px screen fails, named by file", () => {
  assert.deepEqual(phoneFailures("f", { scrollWidth: 430, viewportWidth: 430 }), []);
  assert.deepEqual(phoneFailures("f", { scrollWidth: 900, viewportWidth: 430 }).map((x) => [x.file, x.failure]), [["f", FAIL.WIDER]]);
});

test("C3 · READABLE ON A DESKTOP · FIRING CONTROL: the desktop render must show the phone render's text", () => {
  assert.deepEqual(desktopFailures("f", "a  b\nc", "a b c"), []);
  assert.deepEqual(desktopFailures("f", "a b c", "a b").map((x) => x.failure), [FAIL.TEXT_DIFFERS]);
});

test("C4 · ASSISTIVE SURFACES · FIRING CONTROL: a skipped heading level, a table with no header row, an emoji-only line and a link with no words each fail, by line", () => {
  assert.deepEqual(assistiveFailures("f", CLEAN_MD, "text/plain"), []);
  assert.deepEqual(assistiveFailures("f", "# A\n\n### C\n", "text/plain").map((x) => [x.failure, x.line]), [[FAIL.HEADING_SKIP, 3]]);
  assert.deepEqual(assistiveFailures("f", "| a | b |\n| 1 | 2 |\n", "text/plain").map((x) => x.failure), [FAIL.TABLE_HEAD]);
  assert.deepEqual(assistiveFailures("f", "status\n🔴\n", "text/plain").map((x) => [x.failure, x.line]), [[FAIL.EMOJI_ONLY, 2]]);
  assert.deepEqual(assistiveFailures("f", "see [](https://a.example/)\n", "text/plain").map((x) => x.failure), [FAIL.LINK_WORDS]);
  assert.deepEqual(assistiveFailures("f", "<h1>A</h1><h3>C</h3><table><tr><td>1</td></tr></table><a href=\"/x\"></a><span style=\"color:red\"></span>", "text/html").map((x) => x.failure), [FAIL.HEADING_SKIP, FAIL.TABLE_HEAD, FAIL.LINK_WORDS, FAIL.COLOUR_ONLY]);
});

test("C5 · BAD FINDINGS FIRST · FIRING CONTROL: a report holding a bad finding says so in its first section; a zero count is not a finding", () => {
  assert.deepEqual(badFirstFailures("f", CLEAN_MD, "text/plain"), []);
  assert.deepEqual(badFirstFailures("f", "TITLE\nintro\n\n1. FAILED RUNS: 2\n", "text/plain"), [], "the first block after the title is the first section");
  assert.deepEqual(badFirstFailures("f", "TITLE\n\nall good\nmore\n\nTOTAL 3 · PROVED 2 · NOT PROVED 1\n", "text/plain").map((x) => x.failure), [FAIL.BAD_NOT_FIRST]);
  assert.deepEqual(badFirstFailures("f", "TITLE\n\nall good\n\nTOTAL 3 · PROVED 3 · NOT PROVED 0\n", "text/plain"), [], "a zero count was read as a finding");
  assert.deepEqual(badFirstFailures("f", "# R\n\nfine\n\n## End\n\nproved 2 of 3\n", "text/plain").map((x) => x.failure), [FAIL.BAD_NOT_FIRST]);
});

test("C6 · FIRES · FIRING CONTROL: one planted copy per rule fails that check alone", () => {
  assert.deepEqual(all("f", CLEAN_MD, "text/plain"), [], "the clean report is not clean");
  const planted = {
    [FAIL.WIDER]: all("f", CLEAN_MD, "text/plain", { scrollWidth: 999, viewportWidth: 430 }),
    [FAIL.TEXT_DIFFERS]: all("f", CLEAN_MD, "text/plain", undefined, "a", "b"),
    [FAIL.HEADING_SKIP]: all("f", CLEAN_MD.replace("## Details", "#### Details"), "text/plain"),
    [FAIL.TABLE_HEAD]: all("f", CLEAN_MD.replace("|---|---|\n", ""), "text/plain"),
    [FAIL.EMOJI_ONLY]: all("f", CLEAN_MD + "\n🔴\n", "text/plain"),
    [FAIL.LINK_WORDS]: all("f", CLEAN_MD.replace("[the source]", "[]"), "text/plain"),
    [FAIL.BAD_NOT_FIRST]: all("f", CLEAN_MD.replace("NOT DONE: one thing.", "Summary.") + "\nproved 1 of 2\n", "text/plain"),
  };
  for (const [rule, got] of Object.entries(planted)) assert.deepEqual(got, [rule], `the planted breach of ${rule} failed ${JSON.stringify(got)}`);
});

test("A1 C5 · THE WRITERS' SIDE · FIRING CONTROL: a writer's text with a bad finding anywhere comes out with every bad line copied first — word for word, nothing removed; a clean text is unchanged", () => {
  const late = "F run · 2026-10-18\npopulation: 3\n\nV1 ok · PROVED\nV2 x · landed true · red false · NOT PROVED\n\nproved 2 of 3 · residue 0\n";
  assert.deepEqual(badFirstFailures("f", late, "text/plain").map((x) => x.failure), [FAIL.BAD_NOT_FIRST], "the planted report already said it first — the control cannot fire");
  const out = badFindingsFirst(late);
  assert.deepEqual(badFirstFailures("f", out, "text/plain"), [], "the writer left a bad finding after the first section");
  assert.deepEqual(assistiveFailures("f", out, "text/plain"), [], "the writer broke an assistive rule");
  assert.ok(out.endsWith(late), "the writer removed or reworded a line");
  assert.deepEqual(out.split("\n").slice(0, 3), [BAD_FIRST_TITLE, "  V2 x · landed true · red false · NOT PROVED", "  proved 2 of 3 · residue 0"]);
  /* a report that opens with a heading: the copy goes under its title, before any second heading */
  const h = badFindingsFirst("# R\n\nfine\n\n## End\n\nproved 2 of 3\n");
  assert.deepEqual([badFirstFailures("f", h, "text/plain"), h.split("\n")[0], assistiveFailures("f", h, "text/plain")], [[], "# R", []]);
  /* CONTROLS: clean, and already first — byte for byte */
  for (const t of ["ok\nproved 3 of 3 · residue 0\n", CLEAN_MD, "TITLE\nNOT DONE: x\n\nmore\n"]) assert.equal(badFindingsFirst(t), t);
});

test("A1 · HISTORICAL · FIRING CONTROL: only a file on the historical list is answered by it — the same failure in any other file is fresh, never forgiven", () => {
  const failures = [{ file: "runs/audit/old.txt", failure: FAIL.BAD_NOT_FIRST }, { file: "runs/audit/new.txt", failure: FAIL.BAD_NOT_FIRST }];
  assert.deepEqual(freshFailures(failures, [{ file: "runs/audit/old.txt" }]).map((f) => f.file), ["runs/audit/new.txt"]);
  assert.deepEqual(freshFailures(failures, []).length, 2);
  /* every historical entry names its file and the check it fails; the list holds no duplicate */
  assert.ok(HISTORICAL_REPORTS.every((h) => h.file.startsWith("runs/") && typeof h.fails === "string" && h.fails !== ""));
  assert.equal(new Set(HISTORICAL_REPORTS.map((h) => h.file)).size, HISTORICAL_REPORTS.length);
});

test("A1 C1 · EVERY KIND NAMES ITS WRITER, OR IS HISTORICAL ONLY BY NAME", () => {
  assert.deepEqual(Object.keys(WRITERS).sort(), OWNER_WORKFLOWS.map((w) => w.kind).sort());
  assert.deepEqual(Object.entries(WRITERS).filter(([, w]) => w === null).map(([k]) => k), ["OWNER_VERIFICATION"]);
});

/* ── REAL ── */
const FILES = existsSync(join(REPO, "runs")) ? runFiles(REPO) : [];
const REPORTS = classifyReports(FILES);
const HERE = REPORTS.some((r) => r.kind !== UNLISTED);
const SKIP = HERE ? false : "no report file is on this machine (runs/ is local evidence)";

test("REAL · C1 + C4 + C5: every report file under runs/ classed (UNLISTED reported by name), and the assistive and bad-findings-first checks over every listed one — each failure named by file and line", { skip: SKIP }, () => {
  const listed = REPORTS.filter((r) => r.kind !== UNLISTED);
  const failures = listed.flatMap((r) => { const t = readFileSync(join(REPO, r.file), "utf8"); return [...assistiveFailures(r.file, t, r.type), ...badFirstFailures(r.file, t, r.type)]; });
  for (const f of failures) assert.ok(f.file && (f.line !== undefined), "a failure is not named by file and line");
  /* F88 Amendment 1: a failure outside the historical list is fresh — there are none */
  assert.deepEqual(freshFailures(failures, HISTORICAL_REPORTS).map((f) => `${f.failure} ${f.file}:${f.line}`), [], "a report written outside the historical list fails a check");
  assert.ok(failures.every((f) => HISTORICAL_REPORTS.some((h) => h.file === f.file && h.fails.includes(f.failure))), "a historical file fails a check its entry does not name");
  const by = (k) => failures.filter((f) => f.failure === k).length;
  console.log(`  REAL (count-only): report files ${REPORTS.length} · listed ${listed.length} · UNLISTED ${REPORTS.length - listed.length} · historical ${HISTORICAL_REPORTS.length} · ${[...new Set(failures.map((f) => f.failure))].map((k) => `${k} ${by(k)}`).join(" · ") || "failures 0"} · fresh failures ${freshFailures(failures, HISTORICAL_REPORTS).length}`);
});

test("REAL · C2 + C3: the owner's report page, the exports, the operations report and the verification records rendered offline at 430 px and at desktop width — each failure named", { skip: SKIP }, async (t) => {
  const r = await offlineRenderer();
  if (r.unavailable) { t.skip(r.unavailable); return; }
  const some = REPORTS.filter((x) => ["OWNER_REPORT", "EVIDENCE_EXPORT", "OPERATIONS_REPORT", "OWNER_VERIFICATION"].includes(x.kind));
  let failures;
  const states = [];
  /* every render must have happened: a FAILED render reads as no layout and would pass by silence */
  const render = async (rep, text, vp) => { const out = await r.render(rep, text, vp); states.push(out.renderState); assert.ok(out.layout && typeof out.visibleText === "string", `${rep.file} did not render (${out.renderState})`); return out; };
  try { failures = await checkReports(some, { read: (f) => readFileSync(join(REPO, f), "utf8"), render }); } finally { await r.close(); }
  assert.equal(states.length, some.length * 2);
  const renderFails = failures.filter((f) => f.failure === FAIL.WIDER || f.failure === FAIL.TEXT_DIFFERS);
  for (const f of renderFails) assert.ok(f.file);
  /* F88 Amendment 1: a render failure is only ever a historical file's */
  assert.deepEqual(freshFailures(renderFails, HISTORICAL_REPORTS).map((f) => `${f.failure} ${f.file}`), [], "a report outside the historical list fails a render check");
  console.log(`  REAL (count-only): rendered ${some.length} report(s) at 430 px and desktop · ${renderFails.map((f) => `${f.failure} ${f.file}${f.detail ? ` (${f.detail})` : ""}`).join(" · ") || "render failures 0"}`);
});

/* F88 Amendment 1 · one fresh run of each report kind that has a writer, made after RR-287's writer fix (18 Oct 2026) */
const FRESH = Object.freeze([
  { kind: "OWNER_REPORT", file: "runs/report/report-2026-10-18.html", type: "text/html", how: "bin/report.mjs --out=… --confirm, a governed write to a new file (the old index.html is historical)" },
  { kind: "SABOTAGE_EVIDENCE", file: "runs/audit/f61-sabotage-2026-10-18T1755.txt", type: "text/plain", how: "a harness run with a real NOT PROVED limb, written through the shared bad-findings-first step" },
  { kind: "AUDIT_EVIDENCE", file: "runs/audit/f19-real-census-controls-rr135-2026-10-02-1792346500545.txt", type: "text/plain", how: "test/helpers/f19-census-controls.mjs, written through the shared step" },
  { kind: "OPERATIONS_REPORT", file: "runs/ops/operations-report-2026-10-18.txt", type: "text/plain", how: "its writer is unchanged by RR-287; its run of 18 Oct 2026" },
]);
const FRESH_HERE = FRESH.every((f) => existsSync(join(REPO, f.file)));

test("A1 C7 · THE REPORT PAGE'S OWN CSS · FIRING CONTROL: a 3000-character line and a wide table stay inside a 430 px screen", async (t) => {
  const r = await offlineRenderer();
  if (r.unavailable) { t.skip(r.unavailable); return; }
  try {
    const page = (css) => `<!doctype html><html><head><style>${css}</style></head><body><pre class="wrap">${"x".repeat(3000)}</pre><table><thead><tr>${"<th>column heading</th>".repeat(20)}</tr></thead></table></body></html>`;
    const ok = await r.render({ file: "f", type: "text/html" }, page(CSS), PHONE);
    assert.deepEqual(phoneFailures("f", ok.layout), [], "the report page's CSS let a long line or a wide table cut off the screen");
    /* CONTROL: without the wrap rule the same page overflows */
    const bad = await r.render({ file: "f", type: "text/html" }, page(CSS.replace("pre{white-space:pre-wrap;overflow-wrap:anywhere}", "")), PHONE);
    assert.equal(phoneFailures("f", bad.layout).length, 1, "the control cannot fire — the page fits without the rule");
  } finally { await r.close(); }
});

test("REAL · A1 · THE FRESH RUN OF EACH REPORT KIND: rendered at 430 px and at desktop width and checked — every failure named, or 0; every kind with a writer has its run; the kind with none is HISTORICAL ONLY", { skip: FRESH_HERE ? false : "the fresh runs are local evidence, not on this machine" }, async () => {
  assert.deepEqual(FRESH.map((f) => f.kind).sort(), Object.entries(WRITERS).filter(([k, w]) => w !== null && k !== "EVIDENCE_EXPORT").map(([k]) => k).sort());
  for (const f of FRESH) assert.equal(classifyReports([f.file])[0].kind, f.kind, `${f.file} is not its kind`);
  /* EVIDENCE_EXPORT: the ruling-sheet writer run without --confirm — it prints the sheet and writes nothing, no trail */
  const sheet = spawnSync(process.execPath, ["bin/row60-ruling-sheet.mjs", "--actor=actor:cc"], { cwd: REPO, encoding: "utf8" });
  assert.equal(sheet.status, 0, sheet.stderr);
  const texts = [...FRESH.map((f) => ({ ...f, text: readFileSync(join(REPO, f.file), "utf8") })), { kind: "EVIDENCE_EXPORT", file: "bin/row60-ruling-sheet.mjs (stdout)", type: "text/plain", text: sheet.stdout }];
  const failures = texts.flatMap((x) => [...assistiveFailures(x.file, x.text, x.type), ...badFirstFailures(x.file, x.text, x.type)]);
  const r = await offlineRenderer();
  if (!r.unavailable) {
    try { for (const x of texts) { const p = await r.render(x, x.text, PHONE), d = await r.render(x, x.text, DESKTOP); failures.push(...phoneFailures(x.file, p.layout), ...desktopFailures(x.file, p.visibleText, d.visibleText)); } } finally { await r.close(); }
  }
  assert.deepEqual(failures.map((f) => `${f.failure} ${f.file}`), [], "a fresh run of a report kind fails a check");
  /* the fresh harness run held a real bad finding, and says it first */
  assert.ok(texts[1].text.startsWith(BAD_FIRST_TITLE));
  console.log(`  REAL (count-only): fresh runs ${texts.length} (${texts.map((x) => x.kind).join(", ")}) · rendered ${r.unavailable ? `NOT MEASURED — ${r.unavailable}` : "at 430 px and desktop"} · failures ${failures.length} · HISTORICAL ONLY: ${Object.entries(WRITERS).filter(([, w]) => w === null).map(([k]) => k).join(", ")}`);
});

test("the judgements name no product and load no module that can make a network, process, connector or paid call — and the control fires", () => {
  const F = "src/report/owner-workflows.mjs";
  assert.deepEqual(scanSource(readFileSync(join(REPO, F), "utf8")).code, [], `${F} names a product`);
  assert.deepEqual(decisionCallPaths({ entries: [F] }).faults, []);
  const planted = decisionCallPaths({ entries: [F], read: (f) => { const t = existsSync(REPO + f) ? readFileSync(REPO + f, "utf8") : null; return f === F ? `${t}\nawait fetch(u);\n` : t; } });
  assert.deepEqual(planted.faults.map((x) => x.code), ["RAW_NETWORK_CALL"]);
});

test("the production trail was not written by this file", () => { assert.equal(trailSha(), TRAIL_BEFORE); });
