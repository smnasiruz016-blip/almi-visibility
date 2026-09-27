/**
 * 🔴 F08 · AN AUDIT GAP RECORDED AS WHAT IT IS (27 September 2026) — src/audit-trail/gap.mjs, config/audit-gaps.mjs.
 *
 * The event records THAT events were appended and later removed. It never recreates one, never claims the originals
 * exist, and never presents a later census as the record of the lost reads. Each refusal has a control: the real
 * register, which passes.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { AUDIT_GAPS } from "../config/audit-gaps.mjs";
import { AUTHORITY_CORPUS } from "../config/authority/corpus.mjs";
import { EVENT_TYPES, eventFaults } from "../src/audit-trail/event.mjs";
import { createAuditStore, isoSeconds } from "../src/audit-trail/store.mjs";
import { GAP_EVENT, gapEventDraft, gapFaults, gapsNotOnTrail } from "../src/audit-trail/gap.mjs";
import { recordCandidates } from "../src/audit-trail/recorder.mjs";

const F08_AUTHORITY = { propositionId: "OWNER_RULING_F08_ACCEPTANCE", scope: ["ALMIVISIBILITY", "F08"] };
const F08_RECORD = AUTHORITY_CORPUS.find((r) => r.propositionId === F08_AUTHORITY.propositionId);
const at = isoSeconds(Date.now() - 60 * 1000);
const draftOf = (gap) => gapEventDraft({ gap, occurredAt: at, softwareVersion: "engine:test", authorityRef: { ...F08_AUTHORITY, scope: [...F08_AUTHORITY.scope] }, authorityHash: F08_RECORD.contentHash, correlationId: "gap-test" });
const REAL = AUDIT_GAPS[0];

const dirs = [];
test.after(() => { for (const d of dirs) rmSync(d, { recursive: true, force: true }); });

test("GAP-1 · CONTROL — the real register: one gap, no fault, a lawful AUDIT_CORRECTION draft that claims nothing lost is recorded", () => {
  assert.equal(AUDIT_GAPS.length, 1);
  assert.deepEqual(gapFaults(REAL), [], "GAP-CONTROL: the real register was refused");
  assert.ok(EVENT_TYPES.includes(GAP_EVENT.eventType), "GAP-TYPE: AUDIT_CORRECTION is not a declared event type");
  const d = draftOf(REAL);
  assert.equal(d.metadata.lostEventsRecordedHere, false, "GAP-CLAIM: the gap event claims the lost events are recorded here");
  assert.equal(d.metadata.originalRecordsExist, "NO");
  assert.equal(d.metadata.lostEvents, 65);
  assert.equal(d.metadata.lostAccessEvents, 2);
  assert.match(d.metadata.lostEventIds, /^UNRECOVERABLE/);
  assert.match(d.metadata.replacementIsSameReads, /^NO\b/);
  const faults = eventFaults({ ...d, auditVersion: 1, eventId: "0".repeat(32), recordedAt: isoSeconds(Date.now()), previousEventHash: "0".repeat(64), eventHash: null }, { evidenceEntryFor: () => null, isSealedRef: () => false, forbiddenSubstrings: [] });
  assert.deepEqual(faults.map((f) => f.code), [], "GAP-EVENT: the gap draft is not a lawful event");
});

test("GAP-2 · a gap that CLAIMS what it cannot have is refused before a draft exists", () => {
  const cases = [
    [{ originalRecordsExist: "YES" }, "GAP_CLAIMS_RECORDS_EXIST"],
    [{ lostEventBytes: "recovered from memory" }, "GAP_CLAIMS_RECOVERED_BYTES"],
    [{ lostEventIds: "abc,def" }, "GAP_CLAIMS_RECOVERED_IDS"],
    [{ replacementIsSameReads: "YES" }, "GAP_CLAIMS_REPLACEMENT_RECORDS_THE_LOST"],
    [{ lostEvents: 0 }, "GAP_COUNT_INVALID"],
    [{ lostAccessEvents: 99 }, "GAP_COUNT_INVALID"],
    [{ evidenceSha256: "unpinned" }, "GAP_EVIDENCE_UNPINNED"],
    [{ evidenceRecord: "" }, "GAP_FIELD_ABSENT"],
  ];
  for (const [change, code] of cases) {
    const bad = { ...REAL, ...change };
    assert.ok(gapFaults(bad).some((f) => f.code === code), `GAP-REFUSE: ${code} did not fire for ${JSON.stringify(change)}`);
    assert.throws(() => draftOf(bad), /GAP_REFUSED/, `GAP-REFUSE: a draft was built for ${JSON.stringify(change)}`);
  }
});

test("GAP-3 · appended once through the recorder's audit-store-only primitive; a second pass finds it on the trail and records nothing", () => {
  const dir = mkdtempSync(join(tmpdir(), "f08-gap-"));
  dirs.push(dir);
  const store = createAuditStore({ eventsPath: join(dir, "e.jsonl"), headPath: join(dir, "h.json") });
  assert.deepEqual(gapsNotOnTrail(AUDIT_GAPS, store.readAll().events).map((g) => g.gapId), [REAL.gapId]);
  const r = recordCandidates({ store, candidates: [{ family: GAP_EVENT.eventType, sourceId: REAL.gapId, draft: draftOf(REAL) }], corpus: AUTHORITY_CORPUS });
  assert.equal(r.counts.migrated, 1, `the gap was not appended: ${JSON.stringify(r.invalid)} ${JSON.stringify(r.notMigratable)}`);
  assert.equal(r.remainder, 0);
  assert.deepEqual(gapsNotOnTrail(AUDIT_GAPS, store.readAll().events), [], "GAP-ONCE: a recorded gap is offered again");
  assert.equal(store.verify().ok, true);
});
