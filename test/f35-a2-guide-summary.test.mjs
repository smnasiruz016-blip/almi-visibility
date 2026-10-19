/**
 * F35 · ACCEPTANCE AMENDMENT 2 (RR-287, beta-g decision A) · C3 AS AMENDED 2 — no duplicate between a combination's own page and a guide.
 * A combination F91's plan gives its OWN page (DEMAND or OPPORTUNITY) carries the FULL answer there; the existing guide that covers it keeps
 * only a 1–2 line summary and a link (IMPROVE + LINK, recommendations); a MERGED combination is a section of its larger page, never CREATE.
 * Firing controls on fixtures; REAL over F91's real plan of the batch (src/page/page-plan.mjs) and its published guides. Nothing fetched or
 * written; the live guides are not changed; the production trail is not written (last test).
 */
import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { decideGroupedNeed, guideObligations, GUIDE_KEEPS, OWN_PAGE, DUPLICATION, DECISION } from "../src/page/action-decision.mjs";
import { planPages } from "../src/page/page-plan.mjs";
import { rootIndexFor } from "../src/tenancy/resolver.mjs";
import { lookupStore } from "../src/tenancy/root-registry.mjs";
import { scanSource } from "../tools/product-boundary.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const TRAIL = join(REPO, "audit-trail", "events.jsonl");
const trailSha = () => (existsSync(TRAIL) ? createHash("sha256").update(readFileSync(TRAIL)).digest("hex") : "absent");
const TRAIL_BEFORE = trailSha();
globalThis.fetch = () => { throw new Error("🔴 NETWORK EGRESS ATTEMPTED IN TESTS"); };

const NEED = { needId: "n1", pageCandidate: "alpha-xland", questions: 3, tier: "T1", centralSupported: true };
const COVERED = { coverage: "FULL", measurement_key: "cov:n1", pages: [{ pageId: "https://s.example/alpha" }] };
const PARTIAL = { ...COVERED, coverage: "PARTIAL" };
const NONE = { coverage: "NONE", measurement_key: "cov:n1", pages: [] };
const RTE = { outcome: "ESTABLISHED", reason: "rte:n1", parts: {} };
const NO_COMP = { state: DUPLICATION.NO_COMPARISON, ref: "d1" };
const DUP_GUIDE = { state: DUPLICATION.DUPLICATE, against: "https://s.example/alpha", ref: "rev:1" };
const go = (over = {}) => decideGroupedNeed({ need: NEED, coverage: COVERED, rightToExist: RTE, duplication: NO_COMP, ...over });
const actionsOf = (d) => d.actions.map((a) => a.action);

test("A2 C3 · OWN PAGE · FIRING CONTROL: a combination the plan gives its own page is CREATED with the full answer, and the guide that covers it keeps only a summary and a link — never a second full answer", () => {
  for (const label of OWN_PAGE) {
    for (const coverage of [COVERED, PARTIAL]) {
      const d = go({ coverage, duplication: DUP_GUIDE, plan: { label, page: "alpha × xland" } });
      assert.deepEqual([d.decision, actionsOf(d), d.label], [DECISION.CHOSEN, ["CREATE"], label], `${label}/${coverage.coverage}: the own page was not created`);
      assert.ok(Array.isArray(d.guides), "an own page was created with no covering guide told to keep only a summary and a link");
      assert.deepEqual(d.guides.map((g) => [g.pageId, g.actions.map((a) => a.action), g.keeps]), [["https://s.example/alpha", ["IMPROVE", "LINK"], GUIDE_KEEPS]], "the covering guide was not told to keep only a summary and a link");
      assert.ok(d.guides.every((g) => g.actions.every((a) => a.standing === "RECOMMENDATION" && a.evidence.includes("alpha × xland"))));
    }
  }
  /* CONTROL: the same need with no plan label is KEPT or a section, as Amendment 1 decides — the full answer is not made twice */
  assert.deepEqual(actionsOf(go()), ["KEEP"]);
  assert.deepEqual(actionsOf(go({ coverage: PARTIAL })), ["ADD SECTION"]);
});

test("A2 C3 · MERGED · FIRING CONTROL: a combination the plan MERGES is a section of its larger page — never its own page, even with every CREATE limb met", () => {
  const d = go({ coverage: NONE, plan: { label: "MERGED", target: "beta × xland" } });
  assert.deepEqual([actionsOf(d), d.into], [["ADD SECTION"], "beta × xland"], "a MERGED combination got its own page");
  assert.ok(d.actions[0].evidence.includes("beta × xland"));
  /* CONTROL: the same need with no plan label and coverage NONE is CREATED (Amendment 1's rule, unchanged) */
  assert.deepEqual(actionsOf(go({ coverage: NONE })), ["CREATE"]);
});

test("A2 C3 · THE OTHER LIMBS STILL BIND: an own page is never created without its right-to-exist, its supported central answer, or against a duplicate of a page that does not cover it", () => {
  const plan = { label: "DEMAND", page: "alpha × xland" };
  assert.equal(go({ plan, rightToExist: { outcome: "NOT_ESTABLISHED", reason: "x", parts: {} } }).decision, DECISION.CANNOT_DECIDE, "an own page was created without its right to exist");
  assert.equal(decideGroupedNeed({ need: { ...NEED, centralSupported: false }, coverage: COVERED, rightToExist: RTE, duplication: NO_COMP, plan }).decision, DECISION.CANNOT_DECIDE, "an own page was created without a supported central answer");
  assert.deepEqual(actionsOf(go({ plan, duplication: { ...DUP_GUIDE, against: "https://s.example/other" } })), ["CONNECT"], "a duplicate of a page that does not cover the need was answered by a summary");
});

const PLAN = planPages({
  primaries: [{ value: "a", aliases: ["alpha"], page: "https://s.example/alpha" }, { value: "b", aliases: ["beta"], page: null }],
  secondaries: [{ value: "x", aliases: ["xland"], bodies: ["X Board"] }, { value: "y", aliases: ["yland"], bodies: ["Y Board"] }],
  claims: [{ claimId: "c1", primary: "a", body: "X Board", text: "Alpha needs grade B." }, { claimId: "c2", primary: "a", body: "Y Board", text: "Alpha needs grade B." }],
  records: [{ record_type: "search_phrase", measurement_key: "search_phrase:p1", phrase_id: "p1", phrase: "alpha in xland", source: "SEARCH_CONSOLE", label: "OBSERVED", date: "2026-10-18" }],
});
test("A2 C3 · OVER A WHOLE PLAN · FIRING CONTROL: every own page names its guide's summary and link; every MERGED combination is a section; a primary with no page is named, never filled", () => {
  const o = guideObligations({ plan: PLAN, guideOf: (v) => (v === "a" ? "https://s.example/alpha" : null) });
  assert.deepEqual(o.rows.map((r) => [r.combination, r.label, r.guide ?? r.into ?? null]), [["a × x", "DEMAND", "https://s.example/alpha"], ["a × y", "MERGED", "a × x"], ["b × x", "NOT MEASURED", null], ["b × y", "NOT MEASURED", null]]);
  assert.deepEqual(o.rows[0].guideActions.map((a) => a.action), ["IMPROVE", "LINK"]);
  assert.deepEqual({ ...o.counts }, { combinations: 4, ownPages: 1, guideSummaries: 1, noGuide: 0, sections: 1, guides: 1 });
  assert.equal(o.liveGuidesChanged, 0);
  assert.equal(guideObligations({ plan: { measured: false, missing: "x" } }).measured, false);
});

/* ── REAL ── */
const BATCH = join(lookupStore(rootIndexFor(process.env), "RESEARCH").dir, "rr254-test-pages-2026-10-12");
const HERE = existsSync(join(BATCH, "page-plan-inputs-2026-10-18.json")) && existsSync(join(BATCH, "search-console-exports.jsonl"));
test("REAL · F91's real plan: every own page's guide keeps only a summary and a link; every MERGED combination is a section; nothing is CREATED twice", { skip: HERE ? false : "the declared batch is not on this machine" }, () => {
  const json = (f) => JSON.parse(readFileSync(join(BATCH, f), "utf8"));
  const rows = (f) => (existsSync(join(BATCH, f)) ? readFileSync(join(BATCH, f), "utf8").split(/\r?\n/).filter(Boolean).map((l) => JSON.parse(l)) : []);
  const inputs = json("page-plan-inputs-2026-10-18.json");
  const published = [...new Map(rows("joined-pages.jsonl").filter((r) => r.record_type === "joined_page_draft" && r.publishedUrl).map((r) => [r.value, r])).values()];
  const primaries = inputs.primary.values.map((p) => ({ ...p, page: published.find((x) => x.value === p.value)?.publishedUrl ?? null }));
  const claims = json("page-drafts.json").pages.flatMap((p) => p.needs.flatMap((n) => (n.answer?.claims ?? []).map((c) => ({ claimId: c.claimId, primary: p.combination?.[inputs.primary.name], body: c.body ?? c.source?.body, text: c.text }))));
  const records = [...rows("questions.jsonl"), ...rows("research-derived-questions.jsonl"), ...[...rows("search-phrases.jsonl"), ...rows("search-console-exports.jsonl")].filter((x) => x.record_type === "search_phrase")];
  const plan = planPages({ primaries, secondaries: inputs.secondary.values, claims, records });
  const o = guideObligations({ plan, guideOf: (v) => primaries.find((p) => p.value === v)?.page ?? null });
  assert.equal(o.measured, true);
  assert.equal(o.counts.combinations, plan.candidates);
  assert.ok(o.counts.ownPages > 0, "EMPTY real population");
  /* every own page's guide is a page actually published, and every MERGED combination names its target */
  assert.ok(o.rows.filter((r) => r.guide).every((r) => published.some((p) => p.publishedUrl === r.guide)));
  assert.ok(o.rows.filter((r) => r.label === "MERGED").every((r) => r.into && r.action === "ADD SECTION"));
  /* pins — re-measured on 18 Oct 2026 (RR-287) */
  assert.deepEqual({ ...plan.counts }, { DEMAND: 11, OPPORTUNITY: 20, MERGED: 29, NOT_MEASURED: 0 });
  assert.deepEqual({ ...o.counts }, PIN_REAL);
  console.log(`  REAL (count-only): ${JSON.stringify(o.counts)} · live guides changed ${o.liveGuidesChanged}`);
});

test("the decision module names no product and the obligations change no live guide", () => {
  assert.deepEqual(scanSource(readFileSync(join(REPO, "src/page/action-decision.mjs"), "utf8")).code, []);
});

test("the production trail was not written by this file", () => { assert.equal(trailSha(), TRAIL_BEFORE); });

/* re-measured on 18 Oct 2026 (RR-287): the 31 own pages (DEMAND 11 + OPPORTUNITY 20) fall under 11 published guides */
const PIN_REAL = { combinations: 60, ownPages: 31, guideSummaries: 31, noGuide: 0, sections: 29, guides: 11 };
