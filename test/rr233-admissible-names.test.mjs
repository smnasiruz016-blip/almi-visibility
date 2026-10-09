/**
 * 🔴 RR-233 · ADMISSIBLE NAMES FOR A SPECIFICATION AMENDMENT AND A TENANT CONSENT RECORD (RR-231 Q3 = (a), technical ruling beta-g).
 *
 * N1  the two rules admit their lawful names, issuer OWNER by pattern, with a proposition of their own.
 * N2  a near-miss SPECIFICATION AMENDMENT name is not admitted by its rule (prefix, number, product, extension, a suffix, RULING/DECISION).
 * N3  a near-miss TENANT CONSENT name is not admitted by its rule (the same near-misses, and a client name for the tenant label).
 * N4  the admitted set is unchanged (CI-safe): every one of the 421 committed corpus records is admitted by the SAME rule as before;
 *     no name the earlier rules admit is taken by a new rule; the committed names with these prefixes stay NOT admitted — and a
 *     POSITIVE CONTROL: the plain "\d+" pattern (Q3 (a) as first written) WOULD have admitted three of them.
 * N5  the full census over the governance repository, where it is checked out (CI has none): the admitted set before = after, and
 *     the pinned prefix population of N4 is the real one.
 *
 * "Before" is the rule list WITHOUT the two RR-233 rules — the same code, the same order, so the comparison holds on any later head.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { execFileSync } from "node:child_process";

import { GOVERNANCE_RULES, ENGINE_RULES, EXCLUDE, SCOPE_ROOT } from "../config/authority/inclusion.mjs";
import { ruleFor, recordFromFile, propositionOf } from "../src/authority/corpus.mjs";
import { AUTHORITY_CORPUS, CORPUS_PROVENANCE } from "../config/authority/corpus.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const NEW = Object.freeze(["specification-amendment", "tenant-consent-record"]);
const BEFORE = GOVERNANCE_RULES.filter((r) => !NEW.includes(r.id));
const idOf = (name, rules = GOVERNANCE_RULES) => ruleFor(rules, name, EXCLUDE)?.id ?? null;
/* every committed _handoffs name, ever, that starts with one of the two prefixes (measured 9 Oct 2026: four, none admitted) */
const PREFIX_POPULATION = Object.freeze([
  "AlmiVisibility_SPECIFICATION_AMENDMENT_2_2026-09-28.md",
  "AlmiVisibility_SPECIFICATION_AMENDMENT_3_2026-09-30.md",
  "AlmiVisibility_SPECIFICATION_AMENDMENT_4_2026-10-04.md",
  "AlmiVisibility_SPECIFICATION_AMENDMENT_5_2026-10-06_SEO_GAPS_G1-G12_FOR_OWNER_APPROVAL.md",
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

test("N4 · the admitted set is unchanged: 421 corpus records by the same rule; no earlier admission moves; the committed prefix names stay out", () => {
  assert.equal(AUTHORITY_CORPUS.length, 421, "the corpus population moved — re-measure");
  for (const r of AUTHORITY_CORPUS) {
    const name = r.sourceRef.path.split("/").pop();
    const rules = r.sourceRef.repo === "engine" ? ENGINE_RULES : GOVERNANCE_RULES;
    assert.equal(idOf(name, rules), r.inclusionRule, `${r.authorityId} is no longer admitted by ${r.inclusionRule}`);
  }
  assert.ok(!AUTHORITY_CORPUS.some((r) => NEW.includes(idOf(r.sourceRef.path, GOVERNANCE_RULES))), "a new rule takes a name that was already admitted");
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
test("N5 · the full census over the governance repository (where checked out): admitted before = after over every name ever committed; the prefix population is the real one", { skip: HAVE ? false : "no governance checkout here (CI) — N4 holds the CI-safe half; the census evidence is committed under runs/audit" }, () => {
  const git = (...a) => execFileSync("git", a, { cwd: H, encoding: "utf8", maxBuffer: 1 << 28 });
  const all = [...new Set(git("log", "--all", "--format=", "--name-only").split("\n").map((p) => p.split("/").pop()).filter(Boolean))];
  const atCorpus = git("ls-tree", "--name-only", CORPUS_PROVENANCE.governanceCommit).split("\n").filter(Boolean);
  for (const names of [all, atCorpus]) {
    const before = names.filter((n) => idOf(n, BEFORE)).sort(), after = names.filter((n) => idOf(n)).sort();
    assert.deepEqual(after, before, "the admitted set changed");
  }
  assert.equal(atCorpus.filter((n) => idOf(n, BEFORE)).length, 413, "the corpus commit's admitted set is not the committed corpus's 413");
  assert.deepEqual(all.filter((n) => PREFIX.test(n)).sort(), [...PREFIX_POPULATION], "the pinned prefix population is not the real one");
});
