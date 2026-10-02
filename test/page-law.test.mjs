/**
 * THE OWNER'S PAGE LAW IN THE AUTHORITY REGISTER (RR-128; RR-129 §2).
 *
 * Proved: both records resolve CURRENT; the carried texts ARE the register's records (their hashes); the effective law gives clauses 4 and
 * 6 from Amendment 1 and never the superseded wording; and the reader refuses — rather than serve the superseded words — when the
 * amendment is not CURRENT or a text is not the record. Each control fires.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";

import { AUTHORITY_CORPUS, CORPUS_PROVENANCE } from "../config/authority/corpus.mjs";
import { PAGE_LAW_RECORDS } from "../config/governance/page-law-records.mjs";
import { effectivePageLaw } from "../src/governance/page-law.mjs";
import { resolve, permits } from "../src/authority/register.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const now = CORPUS_PROVENANCE.now;
const law = () => effectivePageLaw({ records: AUTHORITY_CORPUS, now });
/* the SUPERSEDED wording of clauses 4 and 6, as the first record carries it — the control's target */
const SUPERSEDED_4 = /relevant by construction/;
const SUPERSEDED_6 = /serves the reader better than pages that each answer one of them half-way/;

test("page law · both records resolve CURRENT in the register", () => {
  for (const r of Object.values(PAGE_LAW_RECORDS)) assert.ok(permits(resolve({ records: AUTHORITY_CORPUS, propositionId: r.propositionId, scope: [...r.scope], now })), r.propositionId);
});

test("page law · FIRING CONTROL: clauses 4 and 6 are the AMENDED wording — the superseded text is never served", () => {
  const l = law();
  assert.deepEqual([l[4].source, l[6].source], ["OWNER_RULING_PAGE_LAW_AMENDMENT_1", "OWNER_RULING_PAGE_LAW_AMENDMENT_1"]);
  assert.match(l[4].text, /This establishes relevance to that recorded sample, not automatic overall quality/);
  assert.match(l[6].text, /never claim every question worldwide was collected/);
  assert.doesNotMatch(l[4].text, SUPERSEDED_4, "the superseded clause 4 was served");
  assert.doesNotMatch(l[6].text, SUPERSEDED_6, "the superseded clause 6 was served");
  for (const n of [1, 2, 3, 5, 7, 8]) assert.equal(l[n].source, "OWNER_RULING_PAGE_LAW");
  /* the original record is untouched: it still carries the superseded words — the amendment is read BESIDE it, never written into it */
  assert.match(PAGE_LAW_RECORDS.law.text, SUPERSEDED_4);
});

test("page law · FIRING CONTROL: no CURRENT amendment, or a text that is not the record, is REFUSED — never a fall-back to superseded words", () => {
  const withoutAmendment = AUTHORITY_CORPUS.filter((r) => r.propositionId !== "OWNER_RULING_PAGE_LAW_AMENDMENT_1");
  assert.throws(() => effectivePageLaw({ records: withoutAmendment, now }), { code: "PAGE_LAW_AMENDMENT_NOT_CURRENT" });
  const tampered = { ...PAGE_LAW_RECORDS, amendment1: { ...PAGE_LAW_RECORDS.amendment1, text: PAGE_LAW_RECORDS.amendment1.text.replace("not automatic overall quality", "automatic overall quality") } };
  assert.throws(() => effectivePageLaw({ records: AUTHORITY_CORPUS, now, carried: tampered }), { code: "PAGE_LAW_TEXT_NOT_THE_RECORD" });
  const noClause = { ...PAGE_LAW_RECORDS, amendment1: { ...PAGE_LAW_RECORDS.amendment1, replaces: [4, 6, 7] } };
  assert.throws(() => effectivePageLaw({ records: AUTHORITY_CORPUS, now, carried: noClause }), { code: "PAGE_LAW_CLAUSE_MISSING" });
});

test("page law · the entry point prints the effective law with each clause's source, and appends nothing", () => {
  const r = spawnSync(process.execPath, ["bin/page-law.mjs"], { cwd: REPO, encoding: "utf8" });
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /4\. \[OWNER_RULING_PAGE_LAW_AMENDMENT_1\] Quality begins with a real, verified question sample/);
  assert.doesNotMatch(r.stdout, SUPERSEDED_4);
});
