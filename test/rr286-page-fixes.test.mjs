/**
 * RR-286 task 1 · the page fixes the builder now carries: every comparison-table cell with its claim's checked date (F54 C3), and a page's
 * related links from the batch's filed link plan (F94's rule). Firing controls on the builder's own render; REAL over the batch's latest
 * builds of the 12 published guides. Nothing published; the production trail is not written (last test).
 */
import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { renderJoined, comparisonTables, STRUCTURE } from "../src/page/joined-page.mjs";
import { provenanceCheck } from "../src/page/answer-readiness.mjs";
import { rootIndexFor } from "../src/tenancy/resolver.mjs";
import { lookupStore } from "../src/tenancy/root-registry.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const TRAIL = join(REPO, "audit-trail", "events.jsonl");
const trailSha = () => (existsSync(TRAIL) ? createHash("sha256").update(readFileSync(TRAIL)).digest("hex") : "absent");
const TRAIL_BEFORE = trailSha();

const items = [{ needKey: "k1", needId: "need:1", heading: { wording: "Q?" }, questions: [], claims: [{ claimId: "c1", text: "The fee is 100 units.", source: "Body", link: "https://b.example/x", readOn: "2026-10-15" }], statements: [] }];

test("a comparison-table cell carries its claim's checked date; a cell whose claim has no date shows none (never an invented one)", () => {
  const t = comparisonTables({ tables: [{ need: "k1", caption: "Fees", columns: ["", "Fee"], rows: [{ label: "A", cells: [{ claimId: "c1", value: "100 units" }] }] }], items });
  assert.equal(t.shown[0].rows[0].cells[0].readOn, "2026-10-15");
  const html = renderJoined({ title: "T", stamp: "TEST", items, tables: t.shown });
  assert.match(html, new RegExp(`<td>100 units <a class="src"[^>]*>${STRUCTURE.source}: Body</a><span class="src"> · ${STRUCTURE.checked} 2026-10-15</span></td>`));
  const noDate = comparisonTables({ tables: [{ need: "k1", caption: "Fees", columns: ["", "Fee"], rows: [{ label: "A", cells: [{ claimId: "c1", value: "100 units" }] }] }], items: [{ ...items[0], claims: [{ ...items[0].claims[0], readOn: null }] }] });
  const noDateItems = [{ ...items[0], claims: [{ ...items[0].claims[0], readOn: null }] }];
  assert.doesNotMatch(renderJoined({ title: "T", stamp: "TEST", items: noDateItems, tables: noDate.shown }), new RegExp(`${STRUCTURE.checked} `));
});

test("the related links render with words, relative to the client's site — and none when the plan names none", () => {
  const html = renderJoined({ title: "T", stamp: "TEST", items: [], related: [{ href: "/guides", label: "All guides" }, { href: "/guides/x", label: "Guide X" }] });
  assert.match(html, /<section class="related"><h2>Related guides<\/h2><ul><li><a href="\/guides">All guides<\/a><\/li><li><a href="\/guides\/x">Guide X<\/a><\/li><\/ul><\/section>/);
  assert.doesNotMatch(renderJoined({ title: "T", stamp: "TEST", items: [] }), /class="related"/);
});

const BATCH = join(lookupStore(rootIndexFor(process.env), "RESEARCH").dir, "rr254-test-pages-2026-10-12");
const HERE = existsSync(join(BATCH, "internal-links-2026-10-18.json")) && existsSync(join(BATCH, "joined-pages-local-2026-10-18.jsonl"));
test("REAL · the batch's latest builds of the 12 published guides: every fact with its source and checked date (F54 provenance PASS), and the related links of the filed plan", { skip: HERE ? false : "the declared batch is not on this machine" }, () => {
  /* the local builds are kept in their own file: the batch's joined-pages store keeps the published builds as each page's latest */
  const rowsOf = (f) => readFileSync(join(BATCH, f), "utf8").split(/\r?\n/).filter(Boolean).map((l) => JSON.parse(l)).filter((r) => r.record_type === "joined_page_draft");
  const published = new Set(rowsOf("joined-pages.jsonl").filter((r) => r.publishedUrl).map((r) => r.value));
  const latest = new Map(rowsOf("joined-pages-local-2026-10-18.jsonl").map((r) => [r.value, r]));
  const plan = JSON.parse(readFileSync(join(BATCH, "internal-links-2026-10-18.json"), "utf8")).pages;
  assert.equal(published.size, 12);
  for (const v of published) {
    const b = latest.get(v);
    assert.equal(provenanceCheck(b.html).state, "PASS", `${v}: a fact lacks its source or checked date`);
    for (const l of plan[v]) assert.ok(b.html.includes(`<a href="${l.href}">`), `${v}: the planned link ${l.href} is not on the page`);
  }
  console.log(`  REAL (count-only): pages 12 · provenance PASS 12 · planned links on their pages ${[...published].reduce((s, v) => s + plan[v].length, 0)}`);
});

test("the production trail was not written by this file", () => { assert.equal(trailSha(), TRAIL_BEFORE); });
