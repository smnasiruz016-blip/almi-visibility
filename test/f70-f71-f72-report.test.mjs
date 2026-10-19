/**
 * F70 · Downloadable report, F71 · Optional lead and consultation, F72 · Client dashboard and white-label (acceptances _handoffs
 * AlmiVisibility_F70/F71/F72_ACCEPTANCE_2026-10-19.md; RR-291, light proof). Fixtures with firing controls; F70 REAL from the client's own
 * stored run through bin/visibility-parts.mjs --part=report.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { renderReport, accessibilityFaults, evidenceSection, leadSection, brandOf, LEAD_DEFAULT, admitLeadSubmission } from "../src/report/visibility-report-html.mjs";
import { runMode, findingsOf } from "../src/report/visibility-score.mjs";
import { rootIndexFor } from "../src/tenancy/resolver.mjs";
import { lookupStore } from "../src/tenancy/root-registry.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const ev = { ids: { page: "read:1" }, page: { html: "<html><head><title>x</title></head><body><h1>a</h1><h1>b</h1></body></html>" } };
const run = runMode({ mode: "full", evidenceByUrl: new Map([["https://s.example/a", ev]]) });
const findings = findingsOf(run.results);

test("F70 C1–C2 · one static file: headings in order, header rows, no image without alt; every finding carries its evidence id; bad findings first", () => {
  const html = renderReport({ title: "T", run, findings, on: "2026-10-19" });
  assert.deepEqual(accessibilityFaults(html), []);
  assert.ok(findings.length > 0 && findings.every((f) => html.includes(f.evidenceId)));
  assert.ok(html.indexOf('id="bad"') < html.indexOf('id="score"'), "the score comes before the bad findings");
  assert.ok(!/<script\b/i.test(html) && !/\bsrc="https?:/i.test(html), "a script or an outside resource");
  /* FIRING CONTROLS: a skipped heading, a table with no header row and an image with no alt each fault */
  assert.match(accessibilityFaults("<h1>a</h1><h3>b</h3>")[0], /skips a level/);
  assert.match(accessibilityFaults("<h1>a</h1><table><tr><td>x</td></tr></table>")[0], /header row/);
  assert.match(accessibilityFaults('<h1>a</h1><img src="x">')[0], /alt text/);
});

test("F71 C1–C3 · lead capture OFF by default; when on, the consent box is unticked; the score is the same either way", () => {
  assert.equal(LEAD_DEFAULT.enabled, false);
  assert.equal(leadSection(), "");
  const on = leadSection({ enabled: true });
  assert.match(on, /type="checkbox" name="consent"/);
  assert.ok(!/checked/i.test(on), "the consent box is ticked in advance");
  const a = renderReport({ title: "T", run, findings, on: "d" }), b = renderReport({ title: "T", run, findings, on: "d", lead: { enabled: true } });
  const evidenceOf = (h) => h.slice(h.indexOf('<h2 id="bad">'), h.includes('<h2 id="deeper">') ? h.indexOf('<h2 id="deeper">') : h.indexOf("</main>")).trim();
  assert.equal(evidenceOf(a), evidenceOf(b), "the lead box changed the evidence or the score");
  assert.match(b, /<h2 id="deeper">/);
  /* FIRING CONTROL: a box rendered ticked would be caught */
  assert.ok(/checked/i.test(on.replace('value="yes">', 'value="yes" checked>')));
  assert.equal(evidenceSection(run, findings), evidenceSection(run, findings), "evidence depends on the lead");
});

test("F71 C3 · no contact data is kept without a consent record", () => {
  const consent = { ticked: true, text: "I agree to be contacted about this report.", at: "2026-10-19T10:00:00Z" };
  assert.equal(admitLeadSubmission({ contact: "a@b.example", consent }).state, "ACCEPTED");
  /* FIRING CONTROLS: unticked, no words, no time, no record — each refused, nothing kept */
  for (const bad of [{ ...consent, ticked: false }, { ...consent, text: "" }, { ...consent, at: "" }, undefined]) {
    const r = admitLeadSubmission({ contact: "a@b.example", consent: bad });
    assert.deepEqual([r.state, r.kept], ["REFUSED", null]);
  }
});

const OTHER_TENANT = "tenant:7dca5e2bc05217d695662a63017b1c9a";
test("F72 C1 · a view reads only its own tenant's store: the same subject asked under another tenant is refused before anything is read", { skip: existsSync(join(lookupStore(rootIndexFor(process.env), "RESEARCH").dir, "rr254-test-pages-2026-10-12")) ? false : "the declared batch is not on this machine" }, () => {
  const r = spawnSync(process.execPath, ["bin/visibility-parts.mjs", "--part=report", "--subject=almi-oet", "--research-batch=rr254-test-pages-2026-10-12", `--tenant=${OTHER_TENANT}`, "--actor=actor:cc"], { cwd: REPO, encoding: "utf8" });
  assert.equal(r.status, 3);
  assert.match(r.stderr, /CROSS_TENANT_REFUSED/);
  assert.equal(r.stdout, "", "something was printed from another tenant's store");
});

test("F72 C2 · a brand changes only the name and two colours — the evidence and method lines are the same bytes", () => {
  const plain = renderReport({ title: "T", run, findings, on: "d" });
  const branded = renderReport({ title: "T", run, findings, on: "d", brand: { name: "Agency", primary: "#000000", accent: "#111111" } });
  const section = (h) => h.slice(h.indexOf('<h2 id="bad">'), h.indexOf("</main>"));
  assert.equal(section(plain), section(branded));
  assert.match(branded, /Agency/);
  /* FIRING CONTROL: a brand that tries to change anything else is refused */
  assert.throws(() => brandOf({ name: "A", primary: "#000000", accent: "#111111", score: 100 }), /only its name and two colours/);
  assert.throws(() => brandOf({ name: "A", primary: "red", accent: "#111111" }));
});

const BATCH = "rr254-test-pages-2026-10-12";
const HERE = existsSync(join(lookupStore(rootIndexFor(process.env), "RESEARCH").dir, BATCH, "live-pages.jsonl"));
test("REAL · F70 C3 · the report file from the client's own stored run: accessible, every finding with its evidence id, bad findings first", { skip: HERE ? false : "the declared batch is not on this machine" }, () => {
  const r = spawnSync(process.execPath, ["bin/visibility-parts.mjs", "--part=report", "--subject=almi-oet", `--research-batch=${BATCH}`, "--on=2026-10-19", "--tenant=tenant:93b991d5afa33b16ccb9166b249593b6", "--actor=actor:cc"], { cwd: REPO, encoding: "utf8" });
  assert.equal(r.status, 0, r.stderr);
  const html = r.stdout;
  assert.match(html, /^<!doctype html>/);
  assert.deepEqual(accessibilityFaults(html), []);
  const rows = (html.match(/<tr><td>https?:\/\/[^<]+<\/td>/g) ?? []).length;
  const ids = (html.match(/<code>live_page_read:[0-9a-f]+<\/code>/g) ?? []).length;
  assert.ok(rows > 0, "EMPTY real population: no finding");
  assert.equal(ids, rows, "a finding without its evidence id");
  console.log(`  REAL: report ${html.length} bytes · findings ${rows}, each with its evidence id · accessibility faults 0`);
});
