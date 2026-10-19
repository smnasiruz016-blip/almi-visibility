/**
 * 🔴 RR-233 · ADMISSIBLE NAMES FOR A SPECIFICATION AMENDMENT AND A TENANT CONSENT RECORD (RR-231 Q3 = (a), technical ruling beta-g).
 *
 * N1  the two rules admit their lawful names, issuer OWNER by pattern, with a proposition of their own.
 * N2  a near-miss SPECIFICATION AMENDMENT name is not admitted by its rule (prefix, number, product, extension, a suffix, RULING/DECISION).
 * N3  a near-miss TENANT CONSENT name is not admitted by its rule (the same near-misses, and a client name for the tenant label).
 * N4  the admitted set is unchanged (CI-safe): every one of the 421 committed corpus records is admitted by the SAME rule as before;
 *     no name the earlier rules admit is taken by a new rule; the committed names with these prefixes stay NOT admitted — and a
 *     POSITIVE CONTROL: the plain "\d+" pattern (Q3 (a) as first written) WOULD have admitted three of them.
 * N5  the full census over the governance repository, where it is checked out (CI has none): before → after moves ONLY names that
 *     nothing admitted before and one of the two RR-233 rules admits now (RR-243: RR-239's T1/T2 consent records); any other move is
 *     RED, proved by a planted older-rule admission; and the pinned never-admitted prefix population of N4 is the real one.
 *
 * "Before" is the rule list WITHOUT the two RR-233 rules — the same code, the same order, so the comparison holds on any later head.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { execFileSync } from "node:child_process";

import { GOVERNANCE_RULES, ENGINE_RULES, EXCLUDE, SCOPE_ROOT } from "../config/authority/inclusion.mjs";
import { ruleFor, recordFromFile, propositionOf, admissionChanges } from "../src/authority/corpus.mjs";
import { AUTHORITY_CORPUS, CORPUS_PROVENANCE } from "../config/authority/corpus.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const NEW = Object.freeze(["specification-amendment", "tenant-consent-record"]);
const BEFORE = GOVERNANCE_RULES.filter((r) => !NEW.includes(r.id));
const idOf = (name, rules = GOVERNANCE_RULES) => ruleFor(rules, name, EXCLUDE)?.id ?? null;
/* every committed _handoffs name, ever, that starts with one of the two prefixes AND was never admitted (measured 9 Oct 2026: four;
 * 12 Oct 2026: five — the held draft of Amendment 6 joined; the adopted Amendment 6 itself is admitted and is not in this list) */
const PREFIX_POPULATION = Object.freeze([
  "AlmiVisibility_SPECIFICATION_AMENDMENT_2_2026-09-28.md",
  "AlmiVisibility_SPECIFICATION_AMENDMENT_3_2026-09-30.md",
  "AlmiVisibility_SPECIFICATION_AMENDMENT_4_2026-10-04.md",
  "AlmiVisibility_SPECIFICATION_AMENDMENT_5_2026-10-06_SEO_GAPS_G1-G12_FOR_OWNER_APPROVAL.md",
  "AlmiVisibility_SPECIFICATION_AMENDMENT_6_2026-10-12_FOR_OWNER_APPROVAL.md", /* RR-251: the held draft of Amendment 6 — a suffix after the date, never admitted */
]);
const PREFIX = /^AlmiVisibility_(SPECIFICATION_AMENDMENT|TENANT_CONSENT)_/;

test("N1 · the two rules admit their lawful names — issuer OWNER by pattern, a proposition of their own, the root scope", () => {
  for (const [name, id, prop] of [
    ["AlmiVisibility_SPECIFICATION_AMENDMENT_6_2026-10-09.md", "specification-amendment", "SPECIFICATION_AMENDMENT_6"],
    ["AlmiVisibility_SPECIFICATION_AMENDMENT_12_2027-01-31.md", "specification-amendment", "SPECIFICATION_AMENDMENT_12"],
    ["AlmiVisibility_TENANT_CONSENT_T1_2026-10-08.md", "tenant-consent-record", "TENANT_CONSENT_T1"],
    ["AlmiVisibility_TENANT_CONSENT_T14_2026-11-02.md", "tenant-consent-record", "TENANT_CONSENT_T14"],
  ]) {
    const rule = ruleFor(GOVERNANCE_RULES, name, EXCLUDE);
    assert.equal(rule?.id ?? null, id, `${name} is not admitted by ${id}`);
    const rec = recordFromFile({ rule, repo: "_handoffs", path: name, name, prefix: "(AlmiVisibility_)?", commit: "c", blob: "b", text: "x", firstCommitAt: null, root: SCOPE_ROOT });
    assert.deepEqual([rec.issuer.class, rec.propositionId, rec.scope, rec.issuedAtSource], ["OWNER", prop, [SCOPE_ROOT], "FILE_NAME"], `${name}: issuer, proposition or scope`);
    assert.equal(propositionOf(name, "(AlmiVisibility_)?"), prop);
  }
});

const NEAR = (base, rule) => test(`${rule === NEW[0] ? "N2" : "N3"} · a near-miss ${rule === NEW[0] ? "SPECIFICATION AMENDMENT" : "TENANT CONSENT"} name is NOT admitted by its rule`, () => {
  assert.equal(idOf(base.lawful), rule, "CONTROL: the lawful name must be admitted, or every refusal below is vacuous");
  for (const [why, name] of base.misses) assert.notEqual(idOf(name), rule, `${why}: ${name} was admitted by ${rule}`);
  /* a RULING/DECISION token takes the name out of this rule — any other rule that takes it is the earlier law, unchanged */
  for (const name of base.tokened) { assert.notEqual(idOf(name), rule); assert.equal(idOf(name), idOf(name, BEFORE), `${name}: its admission moved`); }
});
NEAR({
  lawful: "AlmiVisibility_SPECIFICATION_AMENDMENT_6_2026-10-09.md",
  misses: [
    ["wrong prefix", "AlmiVisibilitySPECIFICATION_AMENDMENT_6_2026-10-09.md"],
    ["no product prefix", "SPECIFICATION_AMENDMENT_6_2026-10-09.md"],
    ["wrong product", "AlmiOET_SPECIFICATION_AMENDMENT_6_2026-10-09.md"],
    ["wrong word", "AlmiVisibility_SPEC_AMENDMENT_6_2026-10-09.md"],
    ["missing number", "AlmiVisibility_SPECIFICATION_AMENDMENT_2026-10-09.md"],
    ["number not a number", "AlmiVisibility_SPECIFICATION_AMENDMENT_SIX_2026-10-09.md"],
    ["leading zero", "AlmiVisibility_SPECIFICATION_AMENDMENT_06_2026-10-09.md"],
    ["an amendment 1-5 (already routed, or never admitted)", "AlmiVisibility_SPECIFICATION_AMENDMENT_5_2026-10-06.md"],
    ["amendment 2, committed and never admitted", "AlmiVisibility_SPECIFICATION_AMENDMENT_2_2026-09-28.md"],
    ["missing date", "AlmiVisibility_SPECIFICATION_AMENDMENT_6.md"],
    ["malformed date", "AlmiVisibility_SPECIFICATION_AMENDMENT_6_2026-1-09.md"],
    ["a suffix after the date (a held draft)", "AlmiVisibility_SPECIFICATION_AMENDMENT_6_2026-10-08_YOUTUBE_FOR_OWNER_APPROVAL.md"],
    ["wrong extension", "AlmiVisibility_SPECIFICATION_AMENDMENT_6_2026-10-09.txt"],
    ["upper-case extension", "AlmiVisibility_SPECIFICATION_AMENDMENT_6_2026-10-09.MD"],
    ["lower-case words", "AlmiVisibility_specification_amendment_6_2026-10-09.md"],
  ],
  tokened: ["AlmiVisibility_SPECIFICATION_AMENDMENT_6_RULING_2026-10-09.md", "AlmiVisibility_OWNER_DECISION_SPECIFICATION_AMENDMENT_6_2026-10-09.md", "AlmiVisibility_SPECIFICATION_AMENDMENT_6_2026-10-09_DECISION.md"],
}, NEW[0]);
NEAR({
  lawful: "AlmiVisibility_TENANT_CONSENT_T1_2026-10-08.md",
  misses: [
    ["wrong prefix", "AlmiVisibilityTENANT_CONSENT_T1_2026-10-08.md"],
    ["no product prefix", "TENANT_CONSENT_T1_2026-10-08.md"],
    ["wrong product", "AlmiOET_TENANT_CONSENT_T1_2026-10-08.md"],
    ["the RR-231 draft word", "AlmiVisibility_CHANNEL_CONSENT_2026-10-08_T1_PUBLIC_DATA_NOW_OAUTH_LATER.md"],
    ["missing tenant number", "AlmiVisibility_TENANT_CONSENT_T_2026-10-08.md"],
    ["missing tenant label", "AlmiVisibility_TENANT_CONSENT_2026-10-08.md"],
    ["tenant zero", "AlmiVisibility_TENANT_CONSENT_T0_2026-10-08.md"],
    ["a client name for the tenant label", "AlmiVisibility_TENANT_CONSENT_ACME_2026-10-08.md"],
    ["missing date", "AlmiVisibility_TENANT_CONSENT_T1.md"],
    ["a suffix after the date", "AlmiVisibility_TENANT_CONSENT_T1_2026-10-08_PUBLIC_DATA_NOW.md"],
    ["wrong extension", "AlmiVisibility_TENANT_CONSENT_T1_2026-10-08.txt"],
    ["upper-case extension", "AlmiVisibility_TENANT_CONSENT_T1_2026-10-08.MD"],
  ],
  tokened: ["AlmiVisibility_TENANT_CONSENT_T1_RULING_2026-10-08.md", "AlmiVisibility_OWNER_DECISION_2026-10-08_TENANT_CONSENT_T1.md", "AlmiVisibility_TENANT_CONSENT_T1_2026-10-08_DECISION.md"],
}, NEW[1]);

/* RR-243 (restated): the RR-243 migration at _handoffs d2bfd22 admitted three records — F78's Acceptance Amendment 1 (an earlier rule) and
 * the T1/T2 consent records (the RR-233 tenant-consent rule) — 421 -> 424. A record a new rule admits must be one NO earlier rule admits.
 * RR-244 (restated): the RR-244 migration at _handoffs 2e623ff admitted one record — F78's Acceptance Amendment 2 (an earlier rule, the
 * f-row acceptance amendment rule) — 424 -> 425; the two RR-233 rules still admit exactly the two consent records. */
/* RR-251 (restated): the RR-251 migrations admitted six records, 426 -> 432 — the RR-250 and RR-251 command records and owner decisions and
 * F44's Acceptance Amendment 1 (earlier rules), and Specification Amendment 6, the FIRST record the RR-233 specification-amendment rule
 * admits (the owner's approval of it: the RR-251 decision record). The two RR-233 rules now admit exactly three records. */
test("N4 · the admitted set is unchanged: 432 corpus records by the same rule; no earlier admission moves; the committed prefix names stay out", () => {
  /* RR-259 (re-measured): 432 -> 453 — the first migration since RR-251 admitted the 21 records of RR-252 to RR-259 (_handoffs d941e18) */
  /* RR-260 (re-measured): 453 -> 458 — the 5 records of RR-260 (_handoffs d960fa8) */
  /* RR-261 (re-measured): 458 -> 464 — the 6 records admitted at _handoffs c063d3b (two RR-260 sample answers, the RR-261 command, two RR-261 owner decisions, F10's Amendment 4) */
  /* RR-263 (re-measured): 464 -> 471 — the 7 records admitted at _handoffs 24df018 (the RR-262 command and owner answers, the RR-263 command and its continue command, the owner's decision, beta-g's technical decisions, F23's Amendment 1) */
  /* RR-263, second migration (re-measured): 471 -> 474 — the 3 records of the owner's principle admitted at _handoffs eeb7245 */
  /* RR-268 migration (re-measured): 474 -> 488 — the 14 records admitted at _handoffs a3f512a (8 commands, 5 owner decisions, F44 Amendment 2) */
  /* F27 Amendment 3 migration (re-measured, 16 Oct 2026): 488 -> 494 — the 6 records admitted at _handoffs 71988eb (the owner's RR-269,
   * RR-270 and RR-271 decisions, his overnight GREEN, beta-g's header baseline, F27's Amendment 3) */
  /* F22 Amendment 1 migration (re-measured, 16 Oct 2026): 494 -> 495 — the 1 record admitted at _handoffs df82cbe (F22's Amendment 1) */
  /* RR-283 migrations (re-measured, 17 Oct 2026): 495 -> 507 — the 12 records admitted since 16 Oct (_handoffs 6c5545c): the owner decisions of RR-272 to RR-277 and
   * RR-283, the RR-283 command, F46's Amendment 1 and its plain-words decision-3 record, the F54 and F87 acceptances; the RR-276 record under its neutral name */
  /* RR-283 item 6 migration: 507 -> 508 — F42's acceptance (_handoffs 1fcee4a) */
  /* RR-283 item 8 migration: 508 -> 509 — F86's acceptance (_handoffs 903f361) */
  /* RR-283 item 9 migration: 509 -> 510 — F62's Amendment 1 (_handoffs 94a6d17) */
  /* RR-283 item 10 migration: 510 -> 511 — F91's Amendment 5 (_handoffs c9c1e0c) */
  /* RR-284 migration: 511 -> 517 — the RR-284 command and owner decision, beta-g decision B's F87 supersession record, and the F74, F50 and F18 acceptances (_handoffs 2815f25) */
  /* RR-285 migration: 517 -> 522 — the RR-285 command and owner decision, F18's Amendment 1, and the F49 and F88 acceptances (_handoffs 38cf14d) */
  /* RR-286 migration: 522 -> 526 — the RR-286 command and owner decision, F18's Amendment 2 and F91's Amendment 6 (_handoffs c808ce5) */
  /* RR-287 migration: 526 -> 534 — the RR-287 owner decision; F62 A2, F35 A2 and F88 A1; F60, F59, F61 and F96's frozen acceptances */
  /* RR-288 migration: 534 -> 535 — the RR-288 owner and beta-g decisions */
  /* RR-289 migration: 535 -> 538 — the RR-289 decision, the light-proof decision, F91 Amendment 7 */
  /* RR-290 migration: 538 -> 539 — the RR-290 decision */
  /* RR-291 migrations: 539 -> 569 — the RR-291 decision and the 29 frozen acceptances (the F89 audit record is a JSON beside its .md and admits nothing) */
  /* RR-292 migration: 569 -> 570 — the RR-292 decision */
  /* RR-293 migration: 570 -> 571 — the RR-293 decision */
  assert.equal(AUTHORITY_CORPUS.length, 571, "the corpus population moved — re-measure");
  for (const r of AUTHORITY_CORPUS) {
    const name = r.sourceRef.path.split("/").pop();
    const rules = r.sourceRef.repo === "engine" ? ENGINE_RULES : GOVERNANCE_RULES;
    assert.equal(idOf(name, rules), r.inclusionRule, `${r.authorityId} is no longer admitted by ${r.inclusionRule}`);
  }
  const byNew = AUTHORITY_CORPUS.filter((r) => NEW.includes(idOf(r.sourceRef.path, GOVERNANCE_RULES)));
  assert.deepEqual(byNew.map((r) => r.sourceRef.path).sort(), ["AlmiVisibility_SPECIFICATION_AMENDMENT_6_2026-10-12.md", "AlmiVisibility_TENANT_CONSENT_T1_2026-10-08.md", "AlmiVisibility_TENANT_CONSENT_T2_2026-10-09.md"], "the records the two RR-233 rules admit are not exactly Specification Amendment 6 and the two consent records");
  assert.ok(byNew.every((r) => idOf(r.sourceRef.path, BEFORE) === null), "a new rule takes a name that was already admitted");
  for (const n of PREFIX_POPULATION) {
    assert.equal(idOf(n), null, `${n} became admitted`);
    assert.equal(idOf(n, BEFORE), null, `${n} was admitted before — the pinned population is wrong`);
  }
  /* POSITIVE CONTROL: the Q3 (a) pattern as first written (any number) WOULD admit three committed, never-admitted amendments */
  const plain = [{ id: "plain", re: /^AlmiVisibility_SPECIFICATION_AMENDMENT_\d+_\d{4}-\d{2}-\d{2}\.md$/ }];
  assert.equal(PREFIX_POPULATION.filter((n) => ruleFor(plain, n, EXCLUDE)).length, 3, "CONTROL: the plain pattern must be seen admitting the three — else N4 could not see a widening");
});

const H = join(REPO, "..", "_handoffs");
const HAVE = existsSync(join(H, ".git"));
/* RR-243: N5 now allows exactly one kind of move — a name nothing admitted before, admitted now by one of the two RR-233 rules (the
 * T1/T2 consent records of RR-239 are the first). Any other move of the admitted set stays RED; both controls below must hold first. */
const changesOf = (names, after = GOVERNANCE_RULES) => admissionChanges(names, { before: BEFORE, after, exclude: EXCLUDE, allowedNew: NEW });
test("N5 · the full census over the governance repository (where checked out): before → after moves only names the two RR-233 rules newly admit; the prefix population is the real one", { skip: HAVE ? false : "no governance checkout here (CI) — N4 holds the CI-safe half; the census evidence is committed under runs/audit" }, () => {
  /* CONTROL 1: a planted name newly admitted under an OLDER rule's id is a change that is not allowed */
  const planted = "AlmiVisibility_RR243_PLANTED_2026-10-09.md";
  const widened = [...GOVERNANCE_RULES, { id: BEFORE[0].id, re: /_RR243_PLANTED_/, issuer: "OWNER" }];
  assert.deepEqual(changesOf([planted], widened).map((c) => [c.after, c.allowed]), [[BEFORE[0].id, false]], "CONTROL: a planted older-rule admission must be refused");
  /* CONTROL 2: the two lawful consent names are allowed moves */
  assert.deepEqual(changesOf(["AlmiVisibility_TENANT_CONSENT_T1_2026-10-08.md", "AlmiVisibility_SPECIFICATION_AMENDMENT_6_2026-10-09.md"]).map((c) => c.allowed), [true, true], "CONTROL: an RR-233 admission must be allowed");
  const git = (...a) => execFileSync("git", a, { cwd: H, encoding: "utf8", maxBuffer: 1 << 28 });
  const all = [...new Set(git("log", "--all", "--format=", "--name-only").split("\n").map((p) => p.split("/").pop()).filter(Boolean))];
  const atCorpus = git("ls-tree", "--name-only", CORPUS_PROVENANCE.governanceCommit).split("\n").filter(Boolean);
  for (const names of [all, atCorpus]) assert.deepEqual(changesOf(names).filter((c) => !c.allowed), [], "the admitted set moved beyond the two RR-233 rules");
  assert.equal(atCorpus.filter((n) => idOf(n)).length, AUTHORITY_CORPUS.filter((r) => r.sourceRef.repo === "_handoffs").length, "the corpus commit's admitted set is not the committed corpus's governance records");
  const newlyAdmitted = changesOf(all).map((c) => c.name);
  assert.deepEqual(all.filter((n) => PREFIX.test(n) && !newlyAdmitted.includes(n)).sort(), [...PREFIX_POPULATION], "the pinned never-admitted prefix population is not the real one");
  for (const n of PREFIX_POPULATION) assert.equal(idOf(n), null, `${n} became admitted`);
});
