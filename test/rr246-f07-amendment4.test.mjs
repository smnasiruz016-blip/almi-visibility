/**
 * 🔴 RR-246 · F07 ACCEPTANCE AMENDMENT 4 (_handoffs 5afaae5, contract e5b88fd0…; owner ruling RR-80 §5, bba3446) — the three conditions
 * before F07 may be re-verified: every known out-of-band read REPRESENTED (one audit correction), the read guard INSTALLED in the
 * operator's tooling and shown refusing a planted read, and every existing F07 proof and sabotage re-run. Plus the technical ruling
 * of 10 Oct 2026: the two sets the known reads reached are RETIRED and may never evaluate again. Every expected answer is written by
 * hand. Spawned runs write only a confined audit store, each its own, read here and then removed. No sealed set is ever read.
 *
 *   KR-1  the register: ONE correction naming the 8 known reads, count-only — no sealed value, no store location, no file in a store
 *   KR-2  FIRING CONTROLS: a correction that claims an ACCESS record, claims a repair, miscounts, or names a path is refused
 *   KR-3  THE RECORDER PATH (in-process, CONFINED store): the correction is appended ONCE, under F07 Amendment 4's authority, and a
 *         second offer finds it already on the trail. 🔴 It never spawns bin/audit-trail.mjs: that entry point writes the PRODUCTION
 *         trail even inside a test run (RR-246: a first draft of this test did exactly that — the real correction, +2, recorded by a test)
 *   KR-4  REAL: the production trail holds exactly one such correction, naming 8 reads and both sets
 */
import test from "node:test";
import assert from "node:assert/strict";
import { createHash, randomBytes } from "node:crypto";
import { existsSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { join } from "node:path";

import { KNOWN_OUT_OF_BAND_READS } from "../config/known-out-of-band-reads.mjs";
import { knownReadsFaults, knownReadsEventDraft, KNOWN_READS_EVENT } from "../src/audit-trail/known-reads.mjs";
import { metadataFaults } from "../src/audit-trail/event.mjs";
import { recordCandidates } from "../src/audit-trail/recorder.mjs";
import { productionAuditStore } from "../src/audit-trail/wiring.mjs";
import { resolveAuditStoreLocation } from "../src/governance/governed-run.mjs";
import { AUTHORITY_CORPUS } from "../config/authority/corpus.mjs";
import { correctionsNotOnTrail } from "../src/audit-trail/known-reads.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const TRAIL = join(REPO, "audit-trail", "events.jsonl");
const trailSha = () => (existsSync(TRAIL) ? createHash("sha256").update(readFileSync(TRAIL)).digest("hex") : "absent");
const TRAIL_BEFORE = trailSha();
const jsonl = (p) => (existsSync(p) ? readFileSync(p, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l)) : []);
const SETS = ["sealed:f10-c3-selection", "sealed:f10-c7-pairs"];
const AUTH = { propositionId: "F07_ACCEPTANCE_AMENDMENT_4", scope: ["ALMIVISIBILITY", "F07"] };
const draftOf = (c) => knownReadsEventDraft({ correction: c, occurredAt: "2026-10-10T00:00:00Z", softwareVersion: "test", authorityRef: AUTH, authorityHash: "0".repeat(64), correlationId: "run:test" });


/* ================= KR ================= */

test("KR-1 · the register: ONE correction naming the 8 known reads, count-only — no sealed value, no store location, no file inside a store", () => {
  assert.equal(KNOWN_OUT_OF_BAND_READS.length, 1);
  const c = KNOWN_OUT_OF_BAND_READS[0];
  assert.deepEqual([c.correctionId, c.knownReads, c.reads.length, [...c.setsRead]], ["OOB-2026-09-27-A", 8, 8, SETS]);
  assert.deepEqual(knownReadsFaults(c), []);
  assert.deepEqual([c.accessRecorded.slice(0, 2), c.treatment], ["NO", "REPRESENTED_NOT_REPAIRED"]);
  assert.match(c.setsTreatedAs, /^DISCLOSED — both sets retired/);
  /* the eight instants, as classified at _handoffs be583fa §C3 — written here by hand */
  assert.deepEqual(c.reads.map((r) => r.split(" ")[1]), ["2026-09-27T02:19:23Z", "2026-09-27T02:20:23Z", "2026-09-27T03:53:19Z", "2026-09-27T04:08:36Z", "2026-09-27T04:56:02Z", "2026-09-27T06:04:14Z", "2026-09-27T21:35:01Z", "2026-09-27T21:44:19Z"]);
  /* no read names a file or a directory: every read is a count, an instant, a tool class and side words */
  for (const r of c.reads) assert.doesNotMatch(r, /[\\/]|\.txt|\.jsonl|\.json\b/, `a read names a path: ${r.slice(0, 40)}`);
  const d = draftOf(c);
  assert.deepEqual([d.eventType, d.action, d.metadata.knownReads, d.metadata.setsRead], [KNOWN_READS_EVENT.eventType, "RECORD_KNOWN_OUT_OF_BAND_READS", 8, SETS.join(",")]);
  assert.deepEqual(metadataFaults(d.metadata), [], "the correction's metadata is not a lawful audit body");
});

test("KR-2 · FIRING CONTROLS: a correction that claims an ACCESS record, claims a repair, miscounts, names a path or leaves a set undisclosed is refused", () => {
  const c = KNOWN_OUT_OF_BAND_READS[0];
  const codes = (x) => knownReadsFaults(x).map((f) => f.code);
  assert.ok(codes({ ...c, accessRecorded: "YES — recorded" }).includes("CORRECTION_CLAIMS_ACCESS_RECORDED"));
  assert.ok(codes({ ...c, treatment: "REPAIRED" }).includes("CORRECTION_CLAIMS_REPAIR"));
  assert.ok(codes({ ...c, knownReads: 7 }).includes("CORRECTION_COUNT_MISMATCH"));
  assert.ok(codes({ ...c, reads: [...c.reads.slice(0, 7), "8 2026-09-27T21:44:19Z SCRATCH_SEAL_CHECK set/items.txt"] }).includes("CORRECTION_READ_MALFORMED"));
  assert.ok(codes({ ...c, setsTreatedAs: "STILL EVALUABLE" }).includes("CORRECTION_SETS_NOT_DISCLOSED"));
  assert.throws(() => draftOf({ ...c, treatment: "REPAIRED" }), /CORRECTION_REFUSED/);
  /* CONTROL: the real register drafts */
  assert.doesNotThrow(() => draftOf(c));
});

test("KR-3 · THE RECORDER PATH (in-process, CONFINED store): the correction is appended ONCE under F07 Amendment 4's authority; a second offer adds nothing", () => {
  const loc = resolveAuditStoreLocation({ repo: REPO });
  assert.equal(loc.synthetic, true, "not a confined store — the proof would write the production trail");
  const store = productionAuditStore({ repo: REPO, at: { eventsPath: loc.eventsPath, headPath: loc.headPath } });
  const a4 = AUTHORITY_CORPUS.find((r) => r.propositionId === "F07_ACCEPTANCE_AMENDMENT_4");
  assert.ok(a4, "F07 Amendment 4 is not a CURRENT authority record");
  const offer = () => correctionsNotOnTrail(KNOWN_OUT_OF_BAND_READS, store.readAll().events).map((correction) => ({ family: KNOWN_READS_EVENT.eventType, sourceId: correction.correctionId, draft: knownReadsEventDraft({ correction, occurredAt: "2026-10-10T00:00:00Z", softwareVersion: "test", authorityRef: { propositionId: a4.propositionId, scope: [...a4.scope] }, authorityHash: a4.contentHash, correlationId: "run:test:kr3" }) }));
  const first = recordCandidates({ store, candidates: offer(), corpus: AUTHORITY_CORPUS });
  assert.deepEqual([first.counts.migrated, first.counts.invalid, first.remainder], [1, 0, 0], JSON.stringify(first.invalid));
  const mine = store.readAll().events.filter((e) => e.action === "RECORD_KNOWN_OUT_OF_BAND_READS");
  assert.deepEqual([mine.length, mine[0].metadata.knownReads, mine[0].authorityRef], [1, 8, AUTH]);
  assert.deepEqual(offer(), [], "a recorded correction was offered again");
});

test("KR-4 · REAL: the production trail holds exactly one known-read correction, naming 8 reads and both sets, under Amendment 4's authority", () => {
  const real = jsonl(TRAIL).filter((e) => e.action === "RECORD_KNOWN_OUT_OF_BAND_READS");
  assert.equal(real.length, 1);
  assert.deepEqual([real[0].metadata.correctionId, real[0].metadata.knownReads, real[0].metadata.setsRead, real[0].authorityRef], ["OOB-2026-09-27-A", 8, SETS.join(","), AUTH]);
  for (let i = 1; i <= 8; i += 1) assert.ok(real[0].metadata[`read${i}`]?.startsWith(`${i} 2026-09-27T`), `read ${i} missing`);
});

test("the production trail was not written by this file", () => {
  assert.equal(trailSha(), TRAIL_BEFORE);
});
