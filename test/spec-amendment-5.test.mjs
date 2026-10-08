/**
 * 🔴 SPECIFICATION AMENDMENT 5 (RR-182; the owner's approval of the RR-181 draft, sha256 a5ec2a78…f3c8, admitted byte-identical as
 * AlmiVisibility_OWNER_RULING_2026-10-06_SPECIFICATION_AMENDMENT_5.md; applied mechanically at _handoffs 7acd99c) — the SEO gaps G1–G12.
 * FIVE rows appended after F91 (F92–F96, UNASSESSED); ONE sentence appended to each of F17 F38 F58 F62 F76 F81, every earlier word kept.
 *
 * Proves (RR-182 §3): (1) F92–F96 exist EXACTLY as written — each line carried here as TEXT and hashed here; (2) each extended row is its
 * amended_4 line with its sentence APPENDED, byte for byte, the earlier text kept; (3) F97 does not exist — the control "one past the last row",
 * restated from F92 — and renaming the last row F97 is refused by each guard; (4) no passed row moved: exactly the 35 VERIFIED-PASS rows of
 * main 2fc76540 are VERIFIED-PASS, F62 and F81 stay IN-PROGRESS, the new rows and F17 F38 F58 F76 are UNASSESSED with no events, no
 * acceptance, not implementable (no acceptance frozen, no feature built); (5) the amendment's text did not change: the admitted record's
 * bytes hash to the approved draft's sha256; (6) the denominator: 96 rows, 95 required, 35/95.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";

import { CAPABILITIES, EXTRACT_PROVENANCE } from "../config/fboard/capabilities.mjs";
import { EXTRACT_PROVENANCE as DERIVE_PROVENANCE } from "../bin/fboard-derive.mjs";
import { ACCEPTANCES } from "../config/fboard/acceptances.mjs";
import { DECLARED } from "../config/fboard/f-board.mjs";
import { CROSSWALK } from "../config/fboard/crosswalk.mjs";
import { AUTHORITY_CORPUS } from "../config/authority/corpus.mjs";
import { buildBoard, boardErrors, progress, DENOMINATOR, mayImplement } from "../src/fboard/board.mjs";

const NEW_ROWS = [
  "F92 | Advanced | Image and video visibility | Check that the images and videos a page relies on are discoverable and described: alt text present and truthful to the image, image and video sitemap entries or structured media metadata consistent with the visible media, and quality media recommended only where it serves the page's need; whether a description is adequate is a recorded judgement, never guessed.",
  "F93 | Core intelligence | Trust and identity signals | Check and plan the trust signals a page shows: who is responsible for it (author or organisation identity), reachable about and contact pages, a visible last-updated date that matches the page's recorded changes, and transparent sources; a missing signal is a finding and is never invented.",
  "F94 | Core intelligence | Site architecture and internal-linking plan | Plan where a new or improved page sits in the existing site — its URL within a consistent structure, its breadcrumb trail, its place in a topic cluster (hub and spoke) and the existing pages that will link to it and from it — from the recorded inventory and coverage, so that a page is linked into the site and not only checked for broken links; no hub is created without a verified need.",
  "F95 | Core intelligence | Client-received question intake | Take in the questions real people put to the client, through forms, emails, messages or call notes the client supplies under a recorded consent, as their own kind with original wording and date, counted and kept apart from public, research-derived and owned search evidence and never reported as public demand.",
  "F96 | Advanced | E-commerce visibility | For a client that sells products, check product feeds and merchant listings against the product's verified facts, and paginated and faceted (filter) pages for crawl, canonical and index control; for a client that sells no product the row is NOT APPLICABLE, never filled in."
];
/* [id, the amended_4 line, the appended sentence] */
const EXTENDED = [
  [
    "F17",
    "F17 | Core intelligence | Second-search and information-gap detection | Find unanswered follow-up needs rather than treating competitor absence as opportunity.",
    "Where a lawful, authorised source holds them, observed next-question sequences are read as their own evidence, with source, date and bound, and kept apart from inferred follow-ups; where none exists the sequence evidence is NOT MEASURED, never inferred into an observation."
  ],
  [
    "F38",
    "F38 | Core intelligence | Answer-first content specification | Place the useful answer early while remaining naturally keyword-aware and non-repetitive; wording is useful and engaging but truthful, never stating or implying more than its verified claims support and never promising indexing, ranking or AI citation.",
    "Every page, new or existing, carries exactly one title and one meta description, each truthful to the page's verified content and unique among the client's pages; an absent, empty, duplicated or overstating title or description is a finding, never silently rewritten."
  ],
  [
    "F58",
    "F58 | Core intelligence | Competitor discovery and coverage comparison | Identify real competitors by query, audience and result surface; compare coverage and useful resources.",
    "For each query in hand it states how hard the query is to win, from the observed competitors and result surface, as an INFERRED estimate printing its method, inputs and bound, never a guarantee and never a reason by itself to create or reject a page."
  ],
  [
    "F62",
    "F62 | Core intelligence | International and locale intelligence | Research genuine language, regulatory, cultural and search differences across the subject's relevant countries and languages without doorway-page multiplication; country-name substitution alone never justifies a separate URL.",
    "Where a page genuinely exists in more than one language or country version, the versions declare one another reciprocally (hreflang, with an x-default where one applies) and link to one another, and a missing, one-way or contradictory declaration is a finding."
  ],
  [
    "F76",
    "F76 | Advanced | Controlled draft and publishing workflow | Support preview, approval, small cohorts, rollback and explicit publication authority; no generate-all path.",
    "After an owner-approved publication, its sitemap or new URL is submitted only through the client's own authorised Search Console or an equivalent channel (such as Bing Webmaster Tools or IndexNow), each submission approved by the owner, never automatic, recorded with its date and response, and never taken as indexation."
  ],
  [
    "F81",
    "F81 | Core intelligence | Search performance and rank tracking | Track query, page, country, device, impressions, clicks, CTR, positions and supported rank measures.",
    "Where the client's authorised Search Console property provides a generative-AI performance report, it is read through the same governed connector as its own line, kept apart from other performance data and never summed with it; where the property provides none it is NOT MEASURED."
  ]
];
/* RR-184: F40 joined by its OWN acceptance and proof after Amendment 5 (rr184-sabotage-2026-10-06T0301); the amendment itself moved none */
const PASSED_AT_2FC76540 = ["F01","F02","F03","F04","F05","F06","F08","F09","F13","F19","F20","F21","F26","F29","F31","F32","F33","F34","F35","F36","F37","F38","F39","F40","F41","F43","F45","F46","F47","F48","F55","F73","F75","F77","F79","F82","F90","F94"]; /* RR-210: F38 joined by its OWN first acceptance (96ae49e) and proof after Amendment 5 (rr210-sabotage-2026-10-07T2305) */ /* RR-206: F94 joined by its OWN acceptance (959ae05) and proof after Amendment 5 (rr206-sabotage-2026-10-07T1855); the amendment itself moved none */
const APPROVED_DRAFT_SHA256 = "a5ec2a78432643c432dfe24d2083e2c9a2eca064deb26fddbd1538d81efef3c8";
const sha = (s) => createHash("sha256").update(s, "utf8").digest("hex");
const board = () => buildBoard(CAPABILITIES, DECLARED);
const ids = (n) => Array.from({ length: n }, (_, i) => `F${String(i + 1).padStart(2, "0")}`);

test("A5·1 · F92–F96 exist exactly as written — class, capability and required outcome, byte for byte, appended after F91 in order", () => {
  assert.deepEqual(NEW_ROWS.map((l) => l.slice(0, 3)), ["F92", "F93", "F94", "F95", "F96"]);
  for (const line of NEW_ROWS) {
    const [id, domain, name] = line.split(" | ");
    const row = CAPABILITIES.find((c) => c.id === id);
    assert.ok(row, `${id} missing`);
    assert.equal(row.lineSha256, sha(line), `${id} is not the amendment's row as written`);
    assert.deepEqual([row.domain, row.name], [domain, name]);
  }
  assert.deepEqual(CAPABILITIES.slice(91).map((c) => c.id), ["F92", "F93", "F94", "F95", "F96"]);
  assert.deepEqual(NEW_ROWS.map((l) => l.split(" | ")[1]), ["Advanced", "Core intelligence", "Core intelligence", "Core intelligence", "Advanced"]);
  // CONTROL: one changed word in a new row is seen
  assert.notEqual(CAPABILITIES.find((c) => c.id === "F96").lineSha256, sha(NEW_ROWS[4].replace("NOT APPLICABLE", "APPLICABLE")));
  /* the owner's exclusions (RR-181 §1): no paid-ads or social-media tooling, no AI file presented as a ranking factor */
  for (const line of NEW_ROWS) assert.doesNotMatch(line, /llms\.txt|paid ads|social[- ]media/i);
});

test("A5·2 · F17 F38 F58 F62 F76 F81 each gained ONE appended sentence — the amended_4 line kept as its opening, byte for byte", () => {
  assert.deepEqual(EXTENDED.map(([id]) => id), ["F17", "F38", "F58", "F62", "F76", "F81"]);
  for (const [id, before, sentence] of EXTENDED) {
    const row = CAPABILITIES.find((c) => c.id === id);
    assert.equal(row.lineSha256, sha(`${before} ${sentence}`), `${id} is not its amended_4 line with Amendment 5's sentence appended`);
    assert.notEqual(row.lineSha256, sha(before), `${id}: the sentence was not appended`);
    const [, domain, name] = before.split(" | ");
    assert.deepEqual([row.domain, row.name], [domain, name], `${id}: its class or name moved`);
  }
  // CONTROL: a sentence that REPLACED the old outcome instead of following it is seen
  const [id, before, sentence] = EXTENDED[0];
  assert.notEqual(CAPABILITIES.find((c) => c.id === id).lineSha256, sha(`${before.split(" | ").slice(0, 3).join(" | ")} | ${sentence}`));
});

test("A5·3 · F97 does not exist — the control one past the last row (F91 → F92 → F97) — and renaming the last row F97 is refused by each guard", () => {
  assert.equal(DENOMINATOR, 96);
  assert.deepEqual(CAPABILITIES.map((c) => c.id), ids(96));
  for (const absent of ["F00", "F97", "F99"]) {
    assert.equal(CAPABILITIES.some((c) => c.id === absent), false, `${absent} is a capability`);
    assert.equal(absent in DECLARED, false, `${absent} is declared on the board`);
    assert.equal(CROSSWALK.entries.some((e) => e.featureId === absent), false, `${absent} is in the crosswalk`);
  }
  const renamed = board(); renamed[DENOMINATOR - 1] = { ...renamed[DENOMINATOR - 1], featureId: "F97" };
  assert.ok(boardErrors(renamed, { acceptances: ACCEPTANCES }).some((e) => e.code === "DENOMINATOR"), "the id-range guard accepted a phantom F97");
  assert.ok(boardErrors(renamed, { capabilities: CAPABILITIES, acceptances: ACCEPTANCES }).some((e) => e.code === "NOT_THE_SPECIFICATION"), "the specification guard accepted a phantom F97");
  assert.ok(boardErrors(board().slice(0, 95), { capabilities: CAPABILITIES, acceptances: ACCEPTANCES }).some((e) => e.code === "DENOMINATOR"), "a 95-row board was accepted");
  assert.deepEqual(boardErrors(board(), { capabilities: CAPABILITIES, acceptances: ACCEPTANCES }), [], "the real board is not lawful");
});

test("A5·4 · no passed row moved, F62 and F81 stay IN-PROGRESS, and the amendment froze nothing and built nothing — every touched row's state is what it was", () => {
  const b = board();
  /* RR-186: a listed row may leave VERIFIED-PASS later only by its OWN act — an acceptance amendment frozen alone, with an explicit REOPENED
   * on AUTHORITATIVE_REQUIREMENT_CHANGE as its last event (F37 on 6 Oct 2026); the amendment itself moved none, and nothing else moved */
  const ownReopen = (id) => { const ev = b.find((r) => r.featureId === id).events; const last = ev.at(-1);
    return last?.kind === "REOPENED" && last.reason === "AUTHORITATIVE_REQUIREMENT_CHANGE" && ev.at(-2)?.kind === "ACCEPTANCE_AMENDED" && last.on >= "2026-10-06"; };
  const passedNow = b.filter((r) => r.state === "VERIFIED-PASS").map((r) => r.featureId);
  assert.deepEqual(passedNow, PASSED_AT_2FC76540.filter((id) => passedNow.includes(id) || !ownReopen(id)), "a passed row moved, or a row became passed");
  assert.ok(PASSED_AT_2FC76540.filter((id) => !passedNow.includes(id)).every(ownReopen), "a passed row left VERIFIED-PASS other than by its own amendment and reopen");
  assert.deepEqual(["F62", "F81"].map((id) => b.find((r) => r.featureId === id).state), ["IN-PROGRESS", "IN-PROGRESS"]);
  /* RR-206: F94 left UNASSESSED later only by its OWN act — its first acceptance frozen alone (_handoffs 959ae05, 7 Oct 2026), then
   * IMPLEMENTATION from UNASSESSED; the amendment itself froze and built nothing for it. Any other movement fires. */
  {
    const r = b.find((x) => x.featureId === "F94");
    assert.deepEqual(r.events.slice(0, 2).map((e) => [e.kind, e.on]), [["ACCEPTANCE_FROZEN", "2026-10-07"], ["IMPLEMENTATION", "2026-10-07"]], "F94 moved other than by its own frozen acceptance");
    assert.equal(r.events[1].from, "UNASSESSED");
    assert.equal(r.events[0].ruling.commit, "959ae05cfb056c3cc22c2fedf70a5542bfeb281c");
    assert.ok(["IN-PROGRESS", "VERIFIED-PASS"].includes(r.state), r.state);
  }
  /* RR-210: F38 left UNASSESSED later only by its OWN act — its first acceptance frozen alone (_handoffs 96ae49e, 7 Oct 2026), then
   * IMPLEMENTATION from UNASSESSED; the amendment itself froze and built nothing for it. Any other movement fires. */
  {
    const r = b.find((x) => x.featureId === "F38");
    assert.deepEqual(r.events.slice(0, 2).map((e) => [e.kind, e.on]), [["ACCEPTANCE_FROZEN", "2026-10-07"], ["IMPLEMENTATION", "2026-10-07"]], "F38 moved other than by its own frozen acceptance");
    assert.equal(r.events[1].from, "UNASSESSED");
    assert.equal(r.events[0].ruling.commit, "96ae49ef487c0f80d0acfff28fb37030e0e7559c");
    assert.ok(["IN-PROGRESS", "VERIFIED-PASS"].includes(r.state), r.state);
  }
  /* RR-214: F93 left UNASSESSED later only by its OWN act — its first acceptance frozen alone (_handoffs 4938f07, 8 Oct 2026), then
   * IMPLEMENTATION from UNASSESSED; the amendment itself froze and built nothing for it. Any other movement fires. */
  {
    const r = b.find((x) => x.featureId === "F93");
    assert.deepEqual(r.events.slice(0, 2).map((e) => [e.kind, e.on]), [["ACCEPTANCE_FROZEN", "2026-10-08"], ["IMPLEMENTATION", "2026-10-08"]], "F93 moved other than by its own frozen acceptance");
    assert.equal(r.events[1].from, "UNASSESSED");
    assert.equal(r.events[0].ruling.commit, "4938f071a5823c42a25730a073436e795a39c244");
    assert.ok(["IN-PROGRESS", "VERIFIED-PASS"].includes(r.state), r.state);
  }
  for (const id of ["F92", "F95", "F96", "F17", "F58", "F76"]) {
    const r = b.find((x) => x.featureId === id);
    assert.equal(r.state, "UNASSESSED", `${id} moved`);
    assert.deepEqual(r.events, [], `${id} carries an event`);
    assert.equal(id in ACCEPTANCES, false, `${id} has an acceptance — none may be frozen by this amendment`);
    assert.equal(id in DECLARED, false, `${id} is declared on the board`);
    assert.equal(mayImplement(b, id, ACCEPTANCES), false, `${id} is implementable`);
    assert.equal(CROSSWALK.entries.find((e) => e.featureId === id).acceptanceRelation, "UNASSESSED");
  }
  /* F62's and F81's frozen acceptances are unchanged; each needs its own acceptance amendment before its next step (RR-182 §3) — recorded, not done */
  for (const id of ["F62", "F81"]) assert.ok(!DECLARED[id].events.some((e) => e.on === "2026-10-06"), `${id} gained an event today`);
});

test("A5·5 · the amendment's text did not change: the admitted record's bytes hash to the approved draft; the derivation names amended_5", () => {
  const rec = AUTHORITY_CORPUS.find((r) => r.propositionId === "OWNER_RULING_SPECIFICATION_AMENDMENT_5");
  assert.ok(rec, "Specification Amendment 5 is not admitted");
  assert.equal(rec.status, "CURRENT");
  assert.equal(rec.contentHash, APPROVED_DRAFT_SHA256, "the admitted amendment is not the approved draft, byte for byte");
  assert.deepEqual({ ...EXTRACT_PROVENANCE }, { ...DERIVE_PROVENANCE });
  assert.match(EXTRACT_PROVENANCE.path, /amended_5\.extract\.txt$/);
  assert.equal(EXTRACT_PROVENANCE.commit, "7acd99cadc1af60e0a2757bdb02601303a00ffce");
  assert.equal(EXTRACT_PROVENANCE.sha256, "526c8e5de1e7c56c061f08ef24afdc65118891fe7f277c97e2ce2910a035583f");
});

test("A5·6 · the denominator: 96 rows, 95 required (F25 NOT REQUIRED) — 35/95 at the amendment, 36/95 since F40 was PROVED (RR-184), 37/95 since F94 was PROVED (RR-206), 38/95 since F38 was PROVED (RR-210); the split sums to 96", () => {
  const p = progress(board());
  /* RR-186: this test's job is the DENOMINATOR; the passed figure moves with lawful later movements and is pinned by the board-figure tests */
  assert.deepEqual([p.denominator, p.total, p.required.denominator], [96, 96, 95]);
  assert.equal(p.passed, board().filter((r) => r.state === "VERIFIED-PASS").length);
  assert.equal(p.required.passed, p.passed, "F25 (NOT REQUIRED) is not passed, so both figures count the same rows");
  assert.equal(Object.values(p.split).reduce((a, x) => a + x, 0), 96);
  assert.equal(p.split.UNASSESSED, 45); /* RR-214: F93 frozen under its own first acceptance (_handoffs 4938f07) and started — UNASSESSED -> IN-PROGRESS (46 -> 45, IN-PROGRESS 12 -> 13) */ /* RR-210: F38 frozen under its own first acceptance (_handoffs 96ae49e) and started — UNASSESSED -> IN-PROGRESS (47 -> 46, IN-PROGRESS 12 -> 13) */ /* RR-206: F94 frozen under its own acceptance (_handoffs 959ae05) and started — UNASSESSED -> IN-PROGRESS (48 -> 47, IN-PROGRESS 12 -> 13) */ /* RR-184: F40 frozen under its own acceptance (_handoffs 6d64c27) and started — UNASSESSED -> IN-PROGRESS, after its lift */ /* 49 at the amendment */
  assert.equal(CROSSWALK.entries.length, 96);
});
